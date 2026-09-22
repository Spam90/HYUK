// ============================================================
// HYUK — INTAKE DE PEDIDOS: validación y contratos de la capa
// server-side (POST /api/orders, /api/checkout/create-preference).
// ============================================================
// IMPORTANTE — qué NO hace este módulo:
//   NO calcula precios, descuentos, envío, totales ni stock. Esa sigue
//   siendo la autoridad EXCLUSIVA de la base de datos (trigger
//   `orders_price_integrity` + RPC `create_order_with_items`).
//   Aquí solo se normaliza/valida la FORMA del payload (identificadores,
//   cantidades, textos acotados, idempotencia) y se resuelven decisiones
//   de UI/HTTP que deben ser idénticas en cliente y servidor.
//
// Sin imports con alias (@/) a propósito: así el runner nativo de tests
// (node --test) puede importarlo sin resolvers de Next.
import { isValidQuantity, MIN_QTY, MAX_QTY } from './checkout-core.js';

/** Límites del contrato de creación de pedidos (espejo de la BD). */
export const ORDER_LIMITS = {
  MAX_ITEMS: 50, // mismo tope que orders_price_integrity
  MAX_OPTIONS_PER_ITEM: 20,
  MAX_NAME: 120,
  MAX_PHONE: 40,
  MAX_ADDRESS: 300,
  MAX_NOTES: 500,
  MAX_METHOD: 60,
  MAX_ZONE: 120,
  MAX_COUPON: 60,
  MAX_ID: 64,
  MAX_SKU: 100,
  MAX_LABEL: 120,
  MAX_IDEMPOTENCY: 80,
  MIN_IDEMPOTENCY: 8,
};

/** Códigos de negocio → estado HTTP (sin filtrar detalle técnico). */
const ERROR_STATUS = {
  order_payload_invalid: 400,
  store_required: 400,
  idempotency_key_invalid: 400,
  order_items_empty: 400,
  order_items_too_many: 400,
  order_items_invalid: 400,
  order_quantity_invalid: 400,
  order_product_invalid: 400,
  order_option_invalid: 400,
  order_delivery_zone_invalid: 400,
  invalid_sku: 400,
  order_coupon_invalid: 409,
  order_insufficient_stock: 409,
  order_in_progress: 409,
  store_closed: 409,
  order_not_payable: 409,
  order_already_paid: 409,
  store_not_yours: 403,
  store_mismatch: 403,
  order_not_yours: 403,
  store_not_found: 404,
  order_not_found: 404,
  invalid_status: 400,
  invalid_order_transition: 409,
  rate_limited: 429,
  schema_pending: 503,
  service_role_missing: 503,
  internal_error: 500,
};

/** Estado HTTP sugerido para un código de negocio del intake/pedidos. */
export function orderErrorStatus(code) {
  return ERROR_STATUS[String(code || '')] || 500;
}

function fail(code, message) {
  return { ok: false, code, status: orderErrorStatus(code), error: message };
}

function readText(value, max, fieldLabel) {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== 'string') {
    return fail('order_payload_invalid', `El campo ${fieldLabel} no es válido.`);
  }
  const text = value.trim();
  if (!text) return { ok: true, value: null };
  if (text.length > max) {
    return fail('order_payload_invalid', `El campo ${fieldLabel} es demasiado largo.`);
  }
  return { ok: true, value: text };
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * idempotency_key: opcional pero, si viene, debe ser un identificador
 * opaco razonable (no se acepta basura ni texto libre larguísimo).
 * @returns {string|null|'invalid'}
 */
export function normalizeIdempotencyKey(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return 'invalid';
  const key = value.trim();
  if (!key) return null;
  if (key.length < ORDER_LIMITS.MIN_IDEMPOTENCY || key.length > ORDER_LIMITS.MAX_IDEMPOTENCY) {
    return 'invalid';
  }
  return /^[A-Za-z0-9._:-]+$/.test(key) ? key : 'invalid';
}

/** slug de tienda: minúsculas, sin espacios (igual que lib/tenant.js). */
export function normalizeSlug(value) {
  if (typeof value !== 'string') return null;
  const slug = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,59}$/.test(slug) ? slug : null;
}

/**
 * Normaliza los items al contrato mínimo aceptado por la RPC/trigger:
 * SOLO identificadores, cantidades y opciones. Cualquier precio,
 * subtotal o `priceDelta` enviado por el cliente se descarta aquí.
 * @returns {{ok:true, items:Array}|{ok:false, code:string, status:number, error:string}}
 */
export function normalizeOrderItems(raw) {
  if (raw === undefined || raw === null) {
    return fail('order_items_empty', 'El pedido no tiene productos.');
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    return fail('order_items_empty', 'El pedido no tiene productos.');
  }
  if (raw.length > ORDER_LIMITS.MAX_ITEMS) {
    return fail('order_items_too_many', 'El pedido tiene demasiados productos.');
  }

  const items = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return fail('order_items_invalid', 'El pedido contiene un producto inválido.');
    }

    const id = typeof entry.id === 'string' ? entry.id.trim() : '';
    if (!id || id.length > ORDER_LIMITS.MAX_ID || !ID_PATTERN.test(id)) {
      return fail('order_items_invalid', 'El pedido contiene un producto inválido.');
    }
    if (!isValidQuantity(entry.quantity)) {
      return fail('order_quantity_invalid', 'Cantidad inválida en el pedido.');
    }

    let skuId = null;
    if (entry.skuId !== undefined && entry.skuId !== null) {
      skuId = typeof entry.skuId === 'string' ? entry.skuId.trim() : '';
      if (!skuId || skuId.length > ORDER_LIMITS.MAX_ID || !ID_PATTERN.test(skuId)) {
        return fail('order_items_invalid', 'El pedido contiene una variante inválida.');
      }
    }

    let sku = null;
    if (entry.sku !== undefined && entry.sku !== null) {
      sku = typeof entry.sku === 'string' ? entry.sku.trim() : '';
      if (!sku || sku.length > ORDER_LIMITS.MAX_SKU) {
        return fail('order_items_invalid', 'El pedido contiene una variante inválida.');
      }
    }

    const rawOptions = entry.selectedOptions === undefined || entry.selectedOptions === null
      ? []
      : entry.selectedOptions;
    if (!Array.isArray(rawOptions) || rawOptions.length > ORDER_LIMITS.MAX_OPTIONS_PER_ITEM) {
      return fail('order_option_invalid', 'Las opciones seleccionadas no son válidas.');
    }

    const selectedOptions = [];
    for (const option of rawOptions) {
      if (!option || typeof option !== 'object' || Array.isArray(option)) {
        return fail('order_option_invalid', 'Las opciones seleccionadas no son válidas.');
      }
      const label = typeof option.label === 'string' ? option.label.trim() : '';
      if (!label || label.length > ORDER_LIMITS.MAX_LABEL) {
        return fail('order_option_invalid', 'Las opciones seleccionadas no son válidas.');
      }
      const groupLabel = typeof option.groupLabel === 'string' ? option.groupLabel.trim() : '';
      if (groupLabel.length > ORDER_LIMITS.MAX_LABEL) {
        return fail('order_option_invalid', 'Las opciones seleccionadas no son válidas.');
      }
      // El priceDelta del cliente se DESCARTA: la BD recalcula con el suyo.
      selectedOptions.push({ label, groupLabel: groupLabel || null });
    }

    items.push({
      id,
      quantity: Number(entry.quantity),
      skuId,
      sku,
      selectedOptions,
    });
  }

  return { ok: true, items };
}

/**
 * Normaliza y valida el body de POST /api/orders.
 * @returns {{ok:true, value:object}|{ok:false, code:string, status:number, error:string}}
 */
export function normalizeOrderRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return fail('order_payload_invalid', 'No se recibió un pedido válido.');
  }

  const storeId = typeof body.storeId === 'string' && body.storeId.trim()
    ? body.storeId.trim()
    : null;
  if (storeId && storeId.length > ORDER_LIMITS.MAX_ID) {
    return fail('store_required', 'No se pudo identificar la tienda.');
  }
  const slug = normalizeSlug(body.slug);
  if (!storeId && !slug) {
    return fail('store_required', 'No se pudo identificar la tienda.');
  }

  const items = normalizeOrderItems(body.items);
  if (!items.ok) return items;

  const key = normalizeIdempotencyKey(body.idempotencyKey);
  if (key === 'invalid') {
    return fail(
      'idempotency_key_invalid',
      'La solicitud de pedido no es válida. Recarga la página e intenta de nuevo.'
    );
  }

  const fields = {
    customerName: readText(body.customerName, ORDER_LIMITS.MAX_NAME, 'nombre'),
    customerPhone: readText(body.customerPhone, ORDER_LIMITS.MAX_PHONE, 'teléfono'),
    deliveryAddress: readText(body.deliveryAddress, ORDER_LIMITS.MAX_ADDRESS, 'dirección'),
    deliveryMethod: readText(body.deliveryMethod, ORDER_LIMITS.MAX_METHOD, 'método de entrega'),
    deliveryZone: readText(body.deliveryZone, ORDER_LIMITS.MAX_ZONE, 'zona de entrega'),
    paymentMethod: readText(body.paymentMethod, ORDER_LIMITS.MAX_METHOD, 'método de pago'),
    notes: readText(body.notes, ORDER_LIMITS.MAX_NOTES, 'notas'),
  };
  for (const field of Object.values(fields)) {
    if (!field.ok) return field;
  }

  // Cupón: solo forma (trim + mayúsculas, misma regla que lib/coupons.js).
  // La validez real (activo, expiración, usos, mínimo) la resuelve la BD.
  const couponCode = typeof body.couponCode === 'string' && body.couponCode.trim()
    ? body.couponCode.trim().toUpperCase().slice(0, ORDER_LIMITS.MAX_COUPON)
    : null;

  // Moneda: se valida la forma ISO-3; la normalización canónica la hace
  // lib/payments.js (normalizeCurrency) en la ruta.
  const currency = typeof body.currency === 'string' && /^[A-Za-z]{3}$/.test(body.currency.trim())
    ? body.currency.trim().toUpperCase()
    : null;

  const paymentProvider = typeof body.paymentProvider === 'string'
    && /^[a-z0-9_]{1,20}$/.test(body.paymentProvider.trim().toLowerCase())
    ? body.paymentProvider.trim().toLowerCase()
    : 'supabase';

  return {
    ok: true,
    value: {
      storeId,
      slug,
      items: items.items,
      idempotencyKey: key,
      customerName: fields.customerName.value,
      customerPhone: fields.customerPhone.value,
      deliveryAddress: fields.deliveryAddress.value,
      deliveryMethod: fields.deliveryMethod.value,
      deliveryZone: fields.deliveryZone.value,
      paymentMethod: fields.paymentMethod.value,
      notes: fields.notes.value,
      couponCode,
      currency,
      paymentProvider,
    },
  };
}

// ============================================================
// TIENDA ABIERTA / CERRADA
// ============================================================
// Semántica EXACTA del catálogo (app/[slug]/CatalogView.jsx):
// cerrada solo cuando `is_open === false`. La columna puede no existir en
// esquemas antiguos: en ese caso NO se bloquea el checkout (fail-open),
// igual que hace el cliente (`is_open !== false`).
export function isStoreOpenForOrders(isOpen) {
  return isOpen !== false;
}

// ============================================================
// ZONAS DE ENTREGA — PARIDAD CLIENTE/SERVIDOR
// ============================================================
// Fuente ÚNICA de verdad: `profiles.settings.theme.deliveryZones`
// (la misma ruta que lee el trigger `orders_price_integrity`).
// El cliente NO debe inventar zonas ni tarifas por defecto.
//
// `deliveryZoneFee` replica literalmente el COALESCE del trigger:
//   GREATEST(COALESCE(zone->>'fee', zone->>'price', 0), 0)

/** Tarifa de una zona: `fee` o, en su defecto, `price` (misma regla que SQL). */
export function deliveryZoneFee(zone) {
  if (!zone || typeof zone !== 'object') return 0;
  const raw = zone.fee !== undefined && zone.fee !== null ? zone.fee : zone.price;
  const fee = Number(raw);
  if (!Number.isFinite(fee) || fee < 0) return 0;
  return fee;
}

/** Lista saneada de zonas publicables: [{ label, fee }]. */
export function normalizeDeliveryZones(raw) {
  if (!Array.isArray(raw)) return [];
  const zones = [];
  for (const zone of raw) {
    if (!zone || typeof zone !== 'object' || Array.isArray(zone)) continue;
    const label = typeof zone.label === 'string' ? zone.label.trim() : '';
    if (!label || label.length > ORDER_LIMITS.MAX_ZONE) continue;
    zones.push({ label, fee: deliveryZoneFee(zone) });
  }
  return zones;
}

/** Zona seleccionada por etiqueta (case-insensitive, igual que el trigger). */
export function resolveDeliveryZone(rawZones, label) {
  if (typeof label !== 'string' || !label.trim()) return null;
  const key = label.trim().toLowerCase();
  return normalizeDeliveryZones(rawZones).find((z) => z.label.toLowerCase() === key) || null;
}

/**
 * ¿El método de entrega elegido implica envío a domicilio (y por tanto
 * tarifa)? Replica EXACTAMENTE el predicado SQL:
 *   method ILIKE '%domicilio%' OR '%delivery%' OR '%envio%'
 * Se mantiene la paridad (sin normalizar acentos) para que el total que ve
 * el cliente sea el mismo que calcula la base de datos.
 */
export function isHomeDeliveryMethod(method) {
  const value = String(method || '').toLowerCase();
  if (!value) return false;
  return value.includes('domicilio') || value.includes('delivery') || value.includes('envio');
}

/**
 * Proyección MÍNIMA devuelta al cliente que creó el pedido.
 * NUNCA se devuelven datos de otros clientes ni identificadores internos
 * de pago (stripe_session_id, payment_intent_id, customer_*).
 */
export function pickClientOrder(order) {
  if (!order || typeof order !== 'object') return null;
  return {
    id: order.id,
    created_at: order.created_at,
    status: order.status,
    payment_status: order.payment_status,
    currency: order.currency,
    total_amount: order.total_amount,
    delivery_fee: order.delivery_fee,
    discount_amount: order.discount_amount,
    delivery_zone: order.delivery_zone,
    coupon_code: order.coupon_code,
    items: Array.isArray(order.items) ? order.items : [],
    tracking_token: order.tracking_token || null,
  };
}

// ============================================================
// IDEMPOTENCIA (doble submit / reintentos / error de red)
// ============================================================
// La clave de idempotencia viaja al servidor y a la BD (orders.idempotency_key
// con índice único por tienda). Aquí solo se calcula una FIRMA estable de la
// operación para decidir en el cliente si un reintento es la MISMA operación
// (reutiliza la clave) o una nueva (genera otra).
export function orderAttemptSignature(items, extra = {}) {
  const parts = (Array.isArray(items) ? items : []).map((item) => {
    const options = (Array.isArray(item?.selectedOptions) ? item.selectedOptions : [])
      .map((opt) => String(opt?.label || ''))
      .join(',');
    return `${item?.id}#${item?.skuId || item?.sku || ''}#${Number(item?.quantity) || 0}#${options}`;
  });
  const coupon = String(extra.couponCode || '').trim().toUpperCase();
  const delivery = String(extra.deliveryMethod || '').trim().toLowerCase();
  const zone = String(extra.deliveryZone || '').trim().toLowerCase();
  return [parts.join(';'), coupon, delivery, zone].join('|');
}

/** Clave de idempotencia opaca y aleatoria (formato aceptado por la API). */
export function createIdempotencyKey(randomFn = null) {
  const random = typeof randomFn === 'function'
    ? randomFn
    : (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
      ? () => globalThis.crypto.randomUUID()
      : () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);
  return String(random());
}

// ============================================================
// CHECKOUT DE PAGO — ESTADO Y URLs DE RETORNO
// ============================================================

/** ¿Se puede iniciar un pago para este pedido? (evita doble cobro) */
export function isPaymentEligibleStatus(order) {
  const status = String(order?.status || '').toLowerCase();
  const paymentStatus = String(order?.payment_status || '').toLowerCase();
  if (paymentStatus === 'paid' || paymentStatus === 'refunded') {
    return { ok: false, code: 'order_already_paid', error: 'Este pedido ya fue pagado.' };
  }
  if (status && status !== 'pending') {
    return { ok: false, code: 'order_not_payable', error: 'El pedido ya no está pendiente de pago.' };
  }
  return { ok: true };
}

function normalizeOrigin(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

function isLocalHostname(hostname) {
  const host = String(hostname || '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.localhost');
}

/**
 * Allowlist de URLs de retorno (success/cancel) del checkout.
 * Reglas:
 *  - solo http/https (nunca javascript:, data:, //evil.com…);
 *  - mismo origen que la configuración de la app (NEXT_PUBLIC_APP_URL…);
 *  - o subdominio de tienda del dominio raíz configurado (NEXT_PUBLIC_ROOT_DOMAIN);
 *  - o localhost (solo desarrollo).
 * Devuelve la URL permitida o `null` (en cuyo caso el servidor usa su default).
 */
export function resolveAllowedReturnUrl(candidate, { allowedOrigins = [], rootDomain = '' } = {}) {
  if (typeof candidate !== 'string' || !candidate.trim()) return null;

  let url;
  try {
    url = new URL(candidate.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const hostname = url.hostname.toLowerCase();
  const origin = url.origin.toLowerCase();

  if (url.protocol === 'http:' && !isLocalHostname(hostname)) return null;
  if (isLocalHostname(hostname)) return url.toString();

  const origins = (Array.isArray(allowedOrigins) ? allowedOrigins : [])
    .map(normalizeOrigin)
    .filter(Boolean);
  if (origins.includes(origin)) return url.toString();

  const root = String(rootDomain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[:/].*$/, '');
  if (root) {
    if (hostname === root) return url.toString();
    // Un solo nivel de subdominio (mitienda.hyuk.app), como en lib/domains.
    if (hostname.endsWith(`.${root}`)) {
      const sub = hostname.slice(0, -(root.length + 1));
      if (sub && !sub.includes('.')) return url.toString();
    }
  }

  return null;
}

/**
 * Garantiza que la URL de seguimiento del pedido lleve el token
 * anti-enumeración (`?t=…`) sin duplicarlo.
 */
export function appendTrackingToken(url, token) {
  if (typeof url !== 'string' || !url.trim()) return url || '';
  if (!token) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.get('t')) parsed.searchParams.set('t', String(token));
    return parsed.toString();
  } catch {
    return url;
  }
}


