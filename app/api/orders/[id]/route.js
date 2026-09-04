// =============================================================
// /api/orders/[id] — DETALLE + CICLO DE VIDA DE UN PEDIDO (Prompt 14)
//
// GET  → detalle del pedido + order_items (snapshots de BD).
// PATCH→ transición de estado vía RPC `set_order_status` (NUNCA
//        UPDATE directo de orders.status). La RPC valida ownership,
//        máquina de estados e inventario EN UNA transacción.
//
// Seguridad:
//  - Auth server-side obligatoria.
//  - Owner check: query .eq('store_id', user.id) anti-IDOR además de RLS.
//  - El cliente solo envía { status }; campos sensibles se ignoran.
//  - Errores HTTP: 400 estado inválido · 401 no auth · 403/404 ajeno ·
//    409 transición/stock · 500 interno.
// =============================================================
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Whitelist de estados reales del proyecto (igual que la RPC set_order_status).
const VALID_STATUS = ['pending', 'paid', 'preparing', 'ready', 'completed', 'cancelled'];

const DETAIL_FIELDS = [
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

function json(body, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

function safeStatusFrom(errCode) {
  switch (errCode) {
    case 'order_not_found':
      return 404;
    case 'order_not_yours':
      return 403;
    case 'invalid_order_transition':
    case 'order_insufficient_stock':
      return 409;
    case 'invalid_status':
    case 'invalid_sku':
    case 'order_quantity_invalid':
    case 'order_product_invalid':
    case 'order_option_invalid':
      return 400;
    case 'internal_error':
    default:
      return 500;
  }
}

/** Lee el pedido filtrando por id + store_id del usuario autenticado. */
async function fetchOwnOrder(supabase, orderId, storeId) {
  let selection = DETAIL_FIELDS;
  let data = null;
  let error = null;
  for (let attempt = 0; attempt < 2 && !data; attempt++) {
    ({ data, error } = await supabase
      .from('orders')
      .select(selection)
      .eq('id', orderId)
      .eq('store_id', storeId)
      .maybeSingle());

    const missingCol = error && /Could not find the .* column/i.test(String(error?.message || ''));
    if (!missingCol) break;
    selection = 'id, created_at, status, customer_name, customer_phone, total_amount, currency, items';
  }
  return { data, error };
}

export async function GET(request, { params }) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ ok: false, error: 'No autenticado' }, 401);

    const orderId = params?.id;
    if (!orderId || typeof orderId !== 'string' || orderId.length < 8) {
      return json({ ok: false, error: 'Pedido no encontrado' }, 404);
    }

    const { data: order, error } = await fetchOwnOrder(supabase, orderId, user.id);
    if (error) throw error;
    if (!order) return json({ ok: false, error: 'Pedido no encontrado' }, 404);

    // order_items: snapshots reales de la BD (fuente de verdad histórica).
    const { data: orderItems, error: itemsErr } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
    if (itemsErr) {
      console.warn('[api/orders/id] order_items no disponible:', itemsErr?.message);
    }

    return json({ ok: true, order, orderItems: orderItems || [] });
  } catch (err) {
    console.error('[api/orders/id] GET error:', err?.message);
    return json({ ok: false, error: 'No se pudo cargar el pedido' }, 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ ok: false, error: 'No autenticado' }, 401);

    const orderId = params?.id;
    if (!orderId || typeof orderId !== 'string' || orderId.length < 8) {
      return json({ ok: false, error: 'Pedido no encontrado' }, 404);
    }

    const body = await request.json().catch(() => ({}));
    const newStatus = String(body?.status || '').trim().toLowerCase();
    if (!VALID_STATUS.includes(newStatus)) {
      return json({ ok: false, error: 'invalid_status', message: 'Estado de pedido inválido' }, 400);
    }

    // Capa anti-IDOR adicional además de RLS: el pedido debe ser del usuario.
    const { data: owned } = await supabase
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .eq('store_id', user.id)
      .maybeSingle();
    if (!owned) return json({ ok: false, error: 'Pedido no encontrado' }, 404);

    // RPC TRANSACCIONAL: valida ownership + máquina de estados + inventario
    // + order_items en la misma transacción. Si el stock falla → ROLLBACK
    // (el pedido NO queda en el nuevo estado).
    const { data: rpc, error: rpcErr } = await supabase.rpc('set_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus,
    });

    if (rpcErr) throw rpcErr;

    if (!rpc?.ok) {
      const http = safeStatusFrom(rpc?.error);
      return json(
        { ok: false, error: rpc?.error || 'internal_error', message: 'No se pudo actualizar el pedido' },
        http
      );
    }

    return json({ ok: true, order: rpc?.order || null });
  } catch (err) {
    console.error('[api/orders/id] PATCH error:', err?.message);
    return json({ ok: false, error: 'Error interno al actualizar el pedido' }, 500);
  }
}