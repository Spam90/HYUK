// =============================================================
// /api/orders — LISTA ADMIN DE PEDIDOS (Prompt 14)
//
// SEGURIDAD:
//  - Auth server-side obligatoria vía `supabase.auth.getUser()`.
//  - El tenant SIEMPRE se deriva de `user.id` (store_id); el cliente
//    NUNCA aporta store_id (ignorado).
//  - RLS (auth.uid()=store_id) es la barrera final sobre orders.
//  - Proyección admin mínima: sin tracking_token, stripe_session_id
//    ni payment_intent_id.
//  - Errores sanitizados: el detalle técnico queda en logs.
// =============================================================
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Proyección completa para el dashboard admin (el dueño de la tienda).
const ADMIN_FIELDS = [
  'id',
  'created_at',
  'updated_at',
  'status',
  'payment_status',
  'customer_name',
  'customer_phone',
  'delivery_address',
  'delivery_method',
  'delivery_zone',
  'delivery_fee',
  'total_amount',
  'currency',
  'items',
  'notes',
  'coupon_code',
  'discount_amount',
  'payment_method',
  'payment_provider',
].join(',');

// Fallback tolerante: en caso de columnas ausentes en BD antiguas.
const CORE_FIELDS = [
  'id',
  'created_at',
  'status',
  'customer_name',
  'customer_phone',
  'total_amount',
  'currency',
  'items',
].join(',');

function json(body, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function GET(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ ok: false, error: 'No autenticado' }, 401);

    const storeId = user.id; // tenant derivado server-side. store_id del cliente: IGNORADO.

    // Lectura tolerante: reintenta sin columnas que no existan aún.
    let selection = ADMIN_FIELDS;
    let data = null;
    let error = null;
    for (let attempt = 0; attempt < 2 && !data; attempt++) {
      ({ data, error } = await supabase
        .from('orders')
        .select(selection)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(500));

      const missingCol = error && /Could not find the .* column/i.test(String(error?.message || ''));
      if (!missingCol) break;
      selection = CORE_FIELDS;
    }

    if (error) throw error;

    return json({ ok: true, orders: data || [] });
  } catch (err) {
    console.error('[api/orders] GET error:', err?.message);
    return json({ ok: false, error: 'No se pudieron cargar los pedidos' }, 500);
  }
}