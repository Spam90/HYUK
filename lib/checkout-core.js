// ============================================================
// HYUK — NUCLEO DE CALCULO DE CHECKOUT (compartido server-side)
// ============================================================
// Fuente de autoridad unica para calcular precios. Reutilizado por:
//   - app/api/checkout/create-preference/route.js (Stripe)
//   - app/api/orders/route.js (creacion de pedidos)
//
// REGLA: NUNCA se confia en precios/cantidades enviados por el
// navegador. Solo se aceptan IDs + cantidades; el servidor mira
// en BD y recalcula.
//
// NOTA: estos helpers son PUROS (sin I/O). La carga desde BD la
// hacen las rutas; aqui viven las reglas.

// Redondeo monetario a 2 decimales (evita flotantes).
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Limites de cantidad por item (entero positivo).
export const MIN_QTY = 1;
export const MAX_QTY = 99;

/** Valida que una cantidad sea entero en [MIN_QTY, MAX_QTY]. */
export function isValidQuantity(qty) {
  const n = Number(qty);
  return Number.isInteger(n) && n >= MIN_QTY && n <= MAX_QTY;
}

/**
 * Precio base vigente de un producto (respeta oferta relampago activa).
 */
export function effectiveProductPrice(p = {}) {
  const base = Number(p.price) || 0;
  const end = p.flash_sale_end ? new Date(p.flash_sale_end).getTime() : null;
  const flashActive = end && end > Date.now();
  const flashPrice = Number(p.flash_sale_price);
  return flashActive && flashPrice > 0 ? flashPrice : base;
}

/**
 * Normaliza las opciones de producto aceptando las dos formas usadas por el
 * proyecto:  [{ name, values:[{label, priceDelta}] }]  (seed/admin)
 *        y   [{ name, choices:[{label, priceDelta}] }]  (product_options)
 */
export function normalizeOptionGroups(rawOptions) {
  if (!Array.isArray(rawOptions)) return [];
  return rawOptions.map((g) => ({
    label: g?.name || g?.label || '',
    values: Array.isArray(g?.values) ? g.values : Array.isArray(g?.choices) ? g.choices : [],
  }));
}

/**
 * Precio unitario esperado de un item recalculado desde BD.
 * Devuelve null si alguna opcion elegida no existe o su delta difiere
 * (senal de carrito invalido/manipulado). NO confia en item.price.
 */
export function expectedUnitPrice(item = {}, product = {}) {
  let unit = effectiveProductPrice(product);
  const groups = normalizeOptionGroups(product.options);

  const sel = Array.isArray(item.selectedOptions) ? item.selectedOptions : [];
  for (const chosen of sel) {
    const chosenLabel = String(chosen?.label ?? '');
    let found = null;
    for (const g of groups) {
      const hit = (g.values || []).find(
        (v) => String(v?.label ?? '') === chosenLabel
      );
      if (hit) { found = hit; break; }
    }
    // Opcion desconocida para este producto → manipulacion o producto cambio.
    if (!found) return null;
    unit += Number(found.priceDelta) || 0;
  }
  return round2(unit);
}

/**
 * Descuento valido de cupon (reglas monetarias).
 * - percent: subtotal * value / 100
 * - fixed:   min(value, subtotal) — nunca descuenta mas que el subtotal
 */
export function couponDiscountFor(couponRow, subtotal) {
  if (!couponRow) return 0;
  if (couponRow.discount_type === 'percent') {
    return round2((subtotal * (Number(couponRow.discount_value) || 0)) / 100);
  }
  return Math.min(Number(couponRow.discount_value) || 0, subtotal);
}

/**
 * ?El cupon es valido HOY para esta tienda? (reglas de negocio).
 * No consulta BD: usa la fila ya cargada.
 */
export function isCouponValidToday(coupon) {
  if (!coupon) return false;
  if (coupon.is_active === false) return false;
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) return false;
  const max = Number(coupon.max_uses);
  const used = Number(coupon.used_count) || 0;
  if (max > 0 && used >= max) return false;
  return true;
}