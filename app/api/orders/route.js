// =============================================================
// /api/orders — PEDIDOS
//
// GET  → LISTA ADMIN DE PEDIDOS (Prompt 14)
// POST → CREACIÓN DE PEDIDOS (Prompt 19, autoridad server-side)
//
// SEGURIDAD (GET):
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
import { createServiceClient } from '@/lib/supabase/service-role';
import { RateLimiters, clientIp, rateLimitResponse } from '@/lib/rate-limit';
import { normalizeCurrency } from '@/lib/payments';
import { translateOrderError } from '@/lib/orders';
import {
  normalizeOrderRequest,
  orderErrorStatus,
  pickClientOrder,
  isStoreOpenForOrders,
} from '@/lib/order-intake.mjs';


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

// =============================================================
// POST /api/orders — CREACIÓN DE PEDIDOS (autoridad server-side)
//
// Es la ÚNICA vía de creación: la RPC `create_order_with_items` ya no es
// ejecutable por `anon` (migración 19), así que el navegador no puede saltarse
// esta capa ni su rate limiting.
//
// Qué resuelve esta capa (y qué NO):
//  - valida la FORMA del payload (ids, cantidades 1..99, textos acotados);
//  - rate limiting por IP y por tienda;
//  - resuelve la tienda server-side (por id o slug) y rechaza si está CERRADA;
//  - deduplica reintentos con `idempotency_key`;
//  - delega precios, cupón, envío, total y stock en la BD (RPC de siempre).
//
// NO recalcula precios ni totales: la base de datos sigue siendo la autoridad.
// La respuesta es una proyección mínima (sin ids de pago ni datos del cliente).
// =============================================================

const STORE_FIELDS = 'id, slug, is_open, settings';
const STORE_FIELDS_MIN = 'id, slug, settings';

// Columnas que se devuelven cuando un pedido ya existía (idempotencia).
const DUPLICATE_FIELDS = [
  'id',
  'created_at',
  'status',
  'payment_status',
  'currency',
  'total_amount',
  'delivery_fee',
  'discount_amount',
  'delivery_zone',
  'coupon_code',
  'payment_method',
  'items',
  'tracking_token',
].join(',');

/**
 * Carga la tienda (perfil) forzando el scope server-side.
 * Tolerante a esquemas antiguos sin `is_open` (fail-open, igual que el
 * catálogo público).
 */
async function loadStoreForOrders(db, { storeId, slug }) {
  let selection = STORE_FIELDS;
  for (let attempt = 0; attempt < 2; attempt++) {
    const base = db.from('profiles').select(selection);
    const query = storeId ? base.eq('id', storeId) : base.eq('slug', slug);
    const { data, error } = await query.maybeSingle();

    const missingCol = error
      && /Could not find the .* column/i.test(String(error?.message || ''));
    if (!missingCol) return { store: data || null, error };
    selection = STORE_FIELDS_MIN;
  }
  return { store: null, error: null };
}

/** Pedido ya creado por esta misma operación (idempotencia). */
async function findOrderByIdempotency(db, storeId, key) {
  if (!key) return null;
  const { data, error } = await db
    .from('orders')
    .select(DUPLICATE_FIELDS)
    .eq('store_id', storeId)
    .eq('idempotency_key', key)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Esquema sin `idempotency_key` (migración 19 pendiente): sin dedupe.
    console.warn('[api/orders] sin dedupe por idempotencia:', error?.message);
    return null;
  }
  return data || null;
}

/** ¿El error de la RPC se debe a que la BD aún no tiene la migración 19? */
function isMissingIdempotencyArg(error) {
  const code = String(error?.code || '');
  const msg = String(error?.message || '').toLowerCase();
  return code === 'PGRST202'
    || msg.includes('p_idempotency_key')
    || msg.includes('could not find the function');
}

/** ¿La RPC no existe (esquema anterior a la migración 17)? */
function isMissingRpc(error) {
  const msg = String(error?.message || '');
  return /function .* does not exist|Could not find the function/i.test(msg);
}

export async function POST(request) {
  try {
    // 1) Rate limit por IP (endpoint público: checkout anónimo).
    const rl = RateLimiters.orders.check(`ip:${clientIp(request)}`);
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);

    // 2) Validación de FORMA (nunca de precios: eso es la BD).
    const body = await request.json().catch(() => null);
    const parsed = normalizeOrderRequest(body);
    if (!parsed.ok) {
      return json({ ok: false, code: parsed.code, error: parsed.error }, parsed.status);
    }
    const input = parsed.value;

    // 3) Cliente server-side. service_role (server-only) porque la RPC ya no
    //    es ejecutable por `anon`; si no está configurado se degrada al cliente
    //    SSR de cookies (funciona solo con esquemas previos a la migración 19).
    const db = createServiceClient() || createClient();

    // 4) Tienda resuelta server-side + tienda ABIERTA (nunca solo en cliente).
    const { store, error: storeError } = await loadStoreForOrders(db, input);
    if (storeError) throw storeError;
    if (!store || !store.slug) {
      return json({ ok: false, code: 'store_not_found', error: translateOrderError('store_not_found') }, 404);
    }
    if (input.storeId && String(store.id) !== String(input.storeId)) {
      return json({ ok: false, code: 'store_mismatch', error: translateOrderError('store_mismatch') }, 403);
    }
    if (!isStoreOpenForOrders(store.is_open)) {
      return json({ ok: false, code: 'store_closed', error: translateOrderError('store_closed') }, 409);
    }

    // 5) Rate limit por tienda (techo de abuso distribuido).
    const storeLimit = RateLimiters.orderStore.check(`store:${store.id}`);
    if (!storeLimit.ok) return rateLimitResponse(storeLimit.retryAfter);

    // 6) Idempotencia: misma operación → mismo pedido (no se duplica).
    const existing = await findOrderByIdempotency(db, store.id, input.idempotencyKey);
    if (existing) {
      return json({ ok: true, duplicate: true, order: pickClientOrder(existing) }, 200);
    }

    // 7) Creación transaccional: la BD calcula precios, cupón, envío, total y
    //    valida stock/SKU/opciones. No se duplica ninguna regla aquí.
    const rpcArgs = {
      p_store_id: store.id,
      p_items: input.items,
      p_customer_name: input.customerName,
      p_customer_phone: input.customerPhone,
      p_delivery_address: input.deliveryAddress,
      p_delivery_method: input.deliveryMethod,
      p_delivery_zone: input.deliveryZone,
      p_payment_method: input.paymentMethod,
      p_payment_provider: input.paymentProvider,
      p_currency: normalizeCurrency(input.currency || 'DOP'),
      p_notes: input.notes,
      p_coupon_code: input.couponCode,
    };

    let { data, error } = await db.rpc('create_order_with_items', {
      ...rpcArgs,
      p_idempotency_key: input.idempotencyKey,
    });

    if (error && isMissingIdempotencyArg(error) && !isMissingRpc(error)) {
      // BD sin migración 19 (función de 12 parámetros): se sigue creando el
      // pedido, sin dedupe en BD (el filtro previo sigue aplicando).
      console.warn('[api/orders] RPC sin p_idempotency_key (migración 19 pendiente).');
      ({ data, error } = await db.rpc('create_order_with_items', rpcArgs));
    }

    if (error) {
      if (isMissingRpc(error)) {
        return json(
          { ok: false, code: 'schema_pending', error: translateOrderError('schema_pending') },
          503
        );
      }
      throw error;
    }

    if (!data?.ok || !data?.order) {
      const code = data?.error || 'internal_error';
      return json({ ok: false, code, error: translateOrderError(code) }, orderErrorStatus(code));
    }

    return json(
      { ok: true, duplicate: Boolean(data.duplicate), order: pickClientOrder(data.order) },
      data.duplicate ? 200 : 201
    );
  } catch (err) {
    console.error('[api/orders] POST error:', err?.message);
    return json(
      { ok: false, code: 'internal_error', error: 'No se pudo crear el pedido. Intenta de nuevo.' },
      500
    );
  }
}

