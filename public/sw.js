/* =============================================
   HYUK - SERVICE WORKER (PWA)
   Estrategia: cache-first para el app shell con
   fallback a red y actualización en background.
   ============================================= */

const CACHE_NAME = 'hyuk-catalog-v6';
// '/' NO se precachea. Las rutas de autenticación y admin (/, /login, /signup,
// /admin) y las de API (/api/*) usan estrategia NetworkOnly: NUNCA se sirven
// páginas de sesión/login/admin antiguas desde el caché del Service Worker.
const APP_SHELL = [
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg',
];

// Instalación: precachear app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          APP_SHELL.map((url) =>
            cache.add(url).catch(() => {
              // No bloquear la instalación si un recurso falla
              // (p. ej. un asset redirigido por el SSO de Vercel en preview)
              console.warn('[SW] No se pudo precachear:', url);
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// Activación: limpiar cachés viejas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first para estáticos, network-first para navegación
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo manejar GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // A service worker must never proxy another origin. In particular, auth
  // cookies belong to the current app origin and Supabase handles its own
  // network requests.
  if (url.origin !== self.location.origin) return;

  // Let the browser handle font preloads directly. A failed font request
  // should not become a Service Worker FetchEvent network error.
  if (request.destination === 'font') return;

  // No interceptar el manifest: el navegador lo gestiona directamente.
  // Evita el fallo CORS cuando Vercel lo redirige al SSO en previews protegidos.
  if (url.pathname === '/manifest.json') return;

  // No cachear API, Supabase ni rutas de autenticación.
  //
  // `_next/` COMPLETO (no solo `_next/static`): static, image, data y
  // webpack-hmr. El build de Next lo sirve el servidor/Vercel con sus propias
  // cabeceras inmutables; interceptarlo solo puede degradarlo o devolver una
  // respuesta con el Content-Type equivocado.
  if (url.pathname.startsWith('/api/') ||
      url.hostname.includes('supabase') ||
      url.pathname.startsWith('/auth/') ||
      url.pathname.startsWith('/_next/')) {
    return;
  }

    // --- NAVEGACIÓN (modo navigate) ---
  if (request.mode === 'navigate') {
    const path = url.pathname;

    // Rutas de autenticación, admin y API: NetworkOnly.
    // Si no hay red, devolver un error de red real evita presentar HTML
    // offline como si fuera una respuesta autenticada o un login actualizado.
    const isAuthOrApi =
      path === '/' ||
      path.startsWith('/login') ||
      path.startsWith('/signup') ||
      path.startsWith('/admin') ||
      path.startsWith('/api/');

    if (isAuthOrApi) {
      event.respondWith(
        fetch(request).catch(() => Response.error())
      );
      return;
    }

    // Resto de navegaciones (p. ej. /demo, /[slug]): network-first con fallback
    // offline. Nunca devolver undefined.
    // NOTA: NO se sirve caches.match('/') como fallback (evitaría HTML de / viejo).
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/offline', copy)).catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.match('/offline').then((cached) => {
            if (cached) return cached;
            // Respuesta real de respaldo: nunca undefined
            return new Response(
              '<!doctype html><meta charset="utf-8"><title>HYUK</title><div style="font-family:sans-serif;text-align:center;padding:40px">Sin conexión</div>',
              { status: 200, headers: { 'Content-Type': 'text/html' } }
            );
          })
        )
    );
    return;
  }

  // Estáticos (imágenes, fuentes, SVG...): cache-first con actualización en
  // background (stale-while-revalidate).
  //
  // IMPORTANTE — aquí NUNCA se devuelve un HTML de respaldo.
  // Antes, el catch hacía `new Response('<!doctype html>...', { status: 200,
  // 'Content-Type': 'text/html' })`. Consecuencia: si fallaba la descarga de un
  // `.css`, `.js` o una fuente, el navegador recibía **HTML 200 en su lugar** y
  // lo rechazaba con el error MIME reportado:
  //   "Refused to apply style ... MIME type ('text/html') is not a supported
  //    stylesheet MIME type, and strict MIME checking is enabled."
  // Un fallo de red debe seguir siendo un fallo de red -> `Response.error()`.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        // Sin caché y sin red -> error de red real (nunca HTML falseado).
        .catch(() => Response.error());

      return cached || network;
    })
  );
});