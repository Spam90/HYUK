/**
 * Configuración de pasarelas de pagos + helpers de suscripción.
 *
 * La arquitectura es PROVIDER-AGNÓSTICA: el endpoint de checkout detecta qué
 * variable de entorno está disponible (Stripe o Mercado Pago) y usa la
 * pasarela correspondiente. Si ninguna está configurada la operación
 * devuelve un error limpio (graceful fallback al checkout puro de WhatsApp,
 * gestionado en el cliente).
 */

/** Provider detectado en base al entorno. */
export function detectPaymentProvider() {
  if (process.env.STRIPE_SECRET_KEY) return 'stripe';
  if (process.env.MP_ACCESS_TOKEN) return 'mercadopago';
  return null;
}

/** Precio público por plan (Stripe). Si no está definido el plan, se crea un
 *  Price ad-hoc por el total del carrito. */
export const SUBSCRIPTION_PLANS = {
  pro: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || process.env.STRIPE_PRICE_PRO,
    name: 'Pro',
    price: 999, // DOP centavos
  },
  enterprise: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || process.env.STRIPE_PRICE_ENTERPRISE,
    name: 'Enterprise',
    price: 2499,
  },
};

/** Mapea un priceId de Stripe → nombre de plan (para el webhook). */
export function planFromPriceId(priceId) {
  if (!priceId) return null;
  for (const [plan, cfg] of Object.entries(SUBSCRIPTION_PLANS)) {
    if (cfg.priceId && cfg.priceId === priceId) return plan;
  }
  return null;
}

/**
 * Normaliza la moneda a un código ISO válido para Stripe (3 letras, lowercase).
 * @param {string} [currency]
 * @returns {string}
 */
export function normalizeCurrency(currency) {
  const cur = String(currency || 'DOP').toUpperCase().slice(0, 3);
  // Stripe no admite todas las monedas en todos los países; DOP y USD son seguras.
  const supported = ['USD', 'EUR', 'DOP', 'MXN', 'BRL', 'COP', 'CLP', 'ARS'];
  return supported.includes(cur) ? cur : 'USD';
}
