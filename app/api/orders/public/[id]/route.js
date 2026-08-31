// =============================================================
// /api/orders/public/[id] — SEGUIMIENTO PÚBLICO de un pedido
// para la página /pedido/[id].
//
// FASE 0 SEGURIDAD:
//  - La lectura ya NO depende de la política RLS pública eliminada
//    en la migración 11 (antes USING(true) exponía TODA la tabla
//    por REST). Esta ruta usa service_role pero SOLO devuelve la
//    proyección mínima de abajo (nunca dirección/teléfono/dueño).
//  - Anti-enumeración: si el pedido tiene tracking_token, exige
//    coincidir con ?t=<token>; si no coincide → 404 genérico.
//  - Compatibilidad: pedidos creados antes de aplicar la migración
//    11 (o creados entre deploy y migración, cuyo token quedó NULL)
//    siguen accesibles solo por su UUID v4 (impredecible). Queda
//    documentado como ventana legada hasta el backfill.
// =============================================================
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-role';
import { RateLimiters, clientIp, rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const UUIDISH = /^[0-9a-fA-F-]{10,64}$/;

const FULL_FIELDS =
  'id, created_at, status, customer_name, items, total_amount, currency, notes, delivery_method, payment_method, tracking_token';

/**
 * Lee la orden tolerando que `tracking_token` aún no exista
 * (migración 11 pendiente). Reintenta una vez con proyección legacy.
 */
async function fetchOrderTolerant(admin, id) {
  let selection = FULL_FIELDS;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await admin
      .from('orders')
      .select(selection)
      .eq('id', id)
      .maybeSingle();

    const missingTokenCol =
      error && String(error?.message || '').includes('tracking_token');
    if (!missingTokenCol) return { data, error };
    // Columna aún no existe → repetir sin ella.
    selection = FULL_FIELDS.replace(', tracking_token', '');
  }
  return { data: null, error: null };
}

function notFound() {
  return NextResponse.json(
    { error: 'Pedido no encontrado' },
    { status: 404, headers: { 'Cache-Control': 'private, no-store' } }
  );
}

export async function GET(request, { params }) {
  try {
    // Rate limit por IP (ráfagas de scraping / enumeración de tracking).
    const rl = RateLimiters.tracking.check(`ip:${clientIp(request)}`);
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);

    const id = params?.id;
    if (!id || typeof id !== 'string' || !UUIDISH.test(id)) return notFound();

    const admin = createServiceClient();
    if (!admin) return notFound(); // Sin service key no hay vía segura de lectura.

    const { data: order } = await fetchOrderTolerant(admin, id);
    if (!order) return notFound();

    // ── Token anti-enumeración ──────────────────────────────────
    const url = new URL(request.url);
    const providedToken = url.searchParams.get('t');

    if (order.tracking_token) {
      // Pedido "moderno": exige token exacto; mismatches = 404 idéntico.
      if (!providedToken || providedToken !== order.tracking_token) return notFound();
    }
    // Pedidos legacy (sin token): se permiten por UUID impredecible.

    // Proyección MÍNIMA publicable (sin dirección/teléfono/interno).
    return NextResponse.json(
      {
        order: {
          id: order.id,
          created_at: order.created_at,
          status: order.status,
          customer_name: order.customer_name,
          items: order.items || [],
          total: order.total_amount,
          currency: order.currency || 'USD',
          notes: order.notes,
          delivery_method: order.delivery_method,
          payment_method: order.payment_method,
        },
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch {
    return notFound();
  }
}