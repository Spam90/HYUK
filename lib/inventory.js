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
