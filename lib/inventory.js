/**
 * Helpers de inventario / SKU.
 *
 * Todos los métodos son DEFENSIVOS: si supabase no está configurado o la tabla
 * `product_skus` no existe todavía, devuelven valores seguros (0 / []) en vez
 * de lanzar. Así el catálogo sigue funcionando aunque la migración 09 no se
 * haya aplicado todavía.
 */
import { createServiceClient } from '@/lib/supabase/service-role';

/** Umbral por debajo del cual un producto se considera "stock bajo". */
export const STOCK_LOW_THRESHOLD = 5;

/**
 * Devuelve un Map `productId -> { total, low, priceOverride }` para los SKUs
 * activos de un store.
 *
 * @param {string} storeId
 * @param {object} [supabase] cliente server opcional (inyectable para tests)
 * @returns {Promise<Map<string, {total:number, low:boolean, priceOverride:?number}>>}
 */
export async function getStockLevels(storeId, supabase) {
  const map = new Map();
  if (!storeId) return map;

  let client = supabase;
  if (!client) {
    // Fallback server-side con service-role (sin cookies/next-headers).
    client = createServiceClient();
    if (!client) return map;
  }

      try {
    const { data, error } = await client
      .from('product_skus')
      .select('product_id, stock, active, price_override, products!inner(store_id)')
      .eq('active', true)
      .eq('products.store_id', storeId);

    if (error) {
      // La tabla puede no existir todavía → tolerante (404 / PGRST 200-206).
      const msg = (error?.message || '').toLowerCase();
      const code = error?.code || '';
      const missing =
        error?.status === 404 ||
        code === 'PGRST200' ||
        code === 'PGRST205' ||
        msg.includes('does not exist') ||
        msg.includes('not found') ||
        msg.includes('relation') && msg.includes('does not exist');
      if (missing) return map;
      return map;
    }

    for (const sku of data || []) {
      const prev = map.get(sku.product_id) || { total: 0, low: false, priceOverride: null };
      const inc = sku.active ? Number(sku.stock) || 0 : 0;
      prev.total += inc;
      if (inc <= STOCK_LOW_THRESHOLD) prev.low = true;
      if (prev.priceOverride == null && sku.price_override != null) {
        prev.priceOverride = Number(sku.price_override);
      }
      map.set(sku.product_id, prev);
    }
  } catch {
    return map;
  }

  // Marcar low según el umbral global
  for (const [pid, v] of map) {
    v.low = v.total <= STOCK_LOW_THRESHOLD;
    map.set(pid, v);
  }
  return map;
}

/**
 * Productos con stock bajo para alertas de admin.
 * @returns {Promise<Array<{product_id, stock}>?>}
 */
export async function getLowStockItems(storeId) {
  let client = createServiceClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('product_skus')
      .select('product_id, stock')
      .eq('active', true)
      .lte('stock', STOCK_LOW_THRESHOLD);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

// ============================================================================
// OPERACIONES DE ESCRITURA (server-side únicamente)
// ============================================================================
// Autoridad final del stock: la BD. Estas funciones delegan en las RPC de la
// migración 15 (atómicas, idempotentes, con ownership revalidado por la
// propia función vía auth.uid()). NINGÚN componente debe hacer UPDATE de
// stock por su cuenta: usar siempre estos wrappers o las RPC directamente.
// ============================================================================

/**
 * Decrementa el stock de los SKUs de un pedido al confirmarse el pago.
 * Atómico (FOR UPDATE + UPDATE condicional) e idempotente (si el pedido ya
 * fue procesado devuelve { status: 'already_processed' } y no repite nada).
 *
 * @param {string} orderId
 * @param {object} [supabase] cliente server inyectable; por defecto service-role
 * @returns {Promise<{ok: boolean, status?: string, error?: string}>}
 */
export async function decrementOrderStock(orderId, supabase) {
  if (!orderId) return { ok: false, error: 'orderId requerido' };
  const client = supabase || createServiceClient();
  if (!client) return { ok: false, error: 'cliente supabase no disponible' };
  try {
    const { data, error } = await client.rpc('decrement_order_stock', {
      p_order_id: orderId,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, status: data?.status || 'decremented' };
  } catch (err) {
    return { ok: false, error: err?.message || 'error inesperado' };
  }
}

/**
 * Repone el stock de un pedido (cancelación). Idempotente: una segunda
 * cancelación no devuelve unidades dos veces.
 *
 * @param {string} orderId
 * @param {object} [supabase] cliente server inyectable; por defecto service-role
 * @returns {Promise<{ok: boolean, status?: string, lines?: number, error?: string}>}
 */
export async function restoreOrderStock(orderId, supabase) {
  if (!orderId) return { ok: false, error: 'orderId requerido' };
  const client = supabase || createServiceClient();
  if (!client) return { ok: false, error: 'cliente supabase no disponible' };
  try {
    const { data, error } = await client.rpc('restore_order_stock', {
      p_order_id: orderId,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, status: data?.status || 'restored', lines: data?.lines ?? 0 };
  } catch (err) {
    return { ok: false, error: err?.message || 'error inesperado' };
  }
}

