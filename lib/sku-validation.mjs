

/**
 * Stock: entero 0..999999. Devuelve:
 *   undefined → el campo no vino (no tocar)
 *   number    → valor válido
 *   null      → valor inválido (rechazar con 400)
 * Rechaza: NaN, Infinity, -1, "abc", "10abc", 1.5, valores fuera de rango.
 */
export function parseStock(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 999999) return null;
  return n;
}

/**
 * price_override: número finito >= 0 y <= 9,999,999.99 (mismo dominio que el
 * CHECK de la BD). Devuelve undefined / number / null según el caso.
 */
export function parsePrice(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 9999999.99) return null;
  return Math.round(n * 100) / 100;
}

/** Texto acotado (sku ≤ 100, variant_label ≤ 200). null → inválido. */
export function parseText(value, maxLen) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (t.length > maxLen) return null;
  return t === '' ? null : t;
}
