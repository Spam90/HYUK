/**
 * Driver lazy de Stripe.
 *
 * El paquete `stripe` se importa DINÁMICAMENTE y envuelto en try/catch para
 * que, si no está instalado o la key falta, la API devuelva un error limpio
 * (402/501) en vez de tostar la consola ni romper el build.
 */
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

let _stripe = null;
let _stripeLoadError = null;

export function stripeConfigured() {
  return Boolean(STRIPE_SECRET_KEY);
}

export function stripeWebhookConfigured() {
  return Boolean(STRIPE_SECRET_KEY && STRIPE_WEBHOOK_SECRET);
}

/**
 * Instancia de Stripe lista para usarse.
 * @returns {Promise<object|null>}
 */
export async function getStripe() {
  if (!stripeConfigured()) return null;
  if (_stripe) return _stripe;

  try {
    // Importación dinámica: no se bundlea a menos que se invoque la ruta.
    const StripeModule = await import('stripe');
    const Stripe = StripeModule.default || StripeModule;
    _stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-18',
    });
    return _stripe;
  } catch (err) {
    _stripeLoadError = err;
    console.error('[stripe] No se pudo inicializar Stripe:', err?.message);
    return null;
  }
}

/**
 * Verifica la firma del webhook. Devuelve el evento o lanza Error.
 * @param {string} rawBody
 * @param {string} signature
 */
export async function constructWebhookEvent(rawBody, signature) {
  const stripe = await getStripe();
  if (!stripe) {
    throw new Error('Stripe no está configurado (falta STRIPE_SECRET_KEY).');
  }
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET no está configurado.');
  }
  return stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
}
