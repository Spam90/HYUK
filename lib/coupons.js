// =============================================
// HYUK - SISTEMA DE CUPONES Y DESCUENTOS
// =============================================

/**
 * Normaliza un código de cupón (mayúsculas, sin espacios)
 */
export function normalizeCode(code) {
  return (code || '').trim().toUpperCase();
}

/**
 * Calcula el descuento aplicable dado un cupón y un subtotal
 * @returns {number} Monto del descuento
 */
export function calculateDiscount(coupon, subtotal) {
  if (!coupon) return 0;

  if (coupon.discount_type === 'percent') {
    return Math.round(subtotal * coupon.discount_value / 100 * 100) / 100;
  }
  // Monto fijo - nunca descuenta más que el subtotal
  return Math.min(parseFloat(coupon.discount_value) || 0, subtotal);
}

/**
 * Genera el mensaje de descuento para mostrar en UI/ticket
 */
export function formatDiscountLabel(coupon) {
  if (!coupon) return '';
  return coupon.discount_type === 'percent'
    ? `${parseFloat(coupon.discount_value).toFixed(0)}% de descuento`
    : `$${parseFloat(coupon.discount_value).toFixed(2)} de descuento`;
}

/**
 * Obtiene un cupón por código validándolo contra la tienda.
 * Se ejecuta en el cliente (catálogo público).
 */
export async function fetchCouponByCode(storeId, code) {
  const postgrest = await getPublicQuery();
  if (!postgrest || !storeId || !code) return { success: false, error: 'Código inválido' };

  try {
    const normalized = normalizeCode(code);
    const { supabase } = await import('@/lib/supabase/client');
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('store_id', storeId)
      .eq('code', normalized)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { success: false, error: 'Cupón no válido o inexistente' };

    // Validar expiración
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { success: false, error: 'Este cupón ha expirado' };
    }

    // Validar límite de usos
    if (data.max_uses && data.used_count >= data.max_uses) {
      return { success: false, error: 'Este cupón ya alcanzó su límite de usos' };
    }

    return { success: true, coupon: data };
  } catch (error) {
    console.error('Error fetching coupon:', error);
    return { success: false, error: 'No se pudo validar el cupón' };
  }
}

/**
 * Helper para inyección perezosa del cliente Supabase (evita fallos en build estático)
 */
async function getPublicQuery() {
  try {
    await import('@/lib/supabase/client');
    return true;
  } catch {
    return null;
  }
}