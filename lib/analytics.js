// lib/analytics.js
// Cliente de analytics del navegador. Envía eventos al endpoint
// /api/analytics/track de forma fire-and-forget (nunca bloquea la UI
// ni genera errores visibles en consola si falla).

const EVENT_TYPES = {
  pageView: 'page_view',
  viewProduct: 'view_product',
  addToCart: 'add_to_cart',
  checkoutStart: 'checkout_start',
  purchase: 'purchase',
  whatsappClick: 'whatsapp_click',
};

// Sesión por visita al catálogo (para agrupar el funnel).
let sessionId = null;
function getSessionId() {
  if (sessionId) return sessionId;
  try {
    sessionId =
      sessionStorage.getItem('hyuk_session_id') ||
      's-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('hyuk_session_id', sessionId);
  } catch {
    sessionId = 's-' + Math.random().toString(36).slice(2);
  }
  return sessionId;
}

let lastPageViewKey = null;

/**
 * Envía un evento de analytics.
 * @param {string} storeId
 * @param {keyof EVENT_TYPES} type
 * @param {object} [metadata]
 */
export function track(storeId, type, metadata = {}) {
  if (!storeId) return;
  const event = EVENT_TYPES[type];
  if (!event) return;

  // Evitar duplicar page_view en el mismo slug (SSR + cliente pueden dispararlo).
  if (event === 'page_view') {
    const key = storeId;
    if (lastPageViewKey === key) return;
    lastPageViewKey = key;
  }

  try {
    const payload = {
      storeId,
      event,
      sessionId: getSessionId(),
      metadata,
    };
    // fire-and-forget
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // nunca romper la experiencia
  }
}

export { getSessionId };