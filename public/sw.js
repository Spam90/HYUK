/* =============================================
   HYUK - SERVICE WORKER (PWA)
   Estrategia: cache-first para el app shell con
   fallback a red y actualización en background.
   ============================================= */

const CACHE_NAME = 'hyuk-catalog-v4';
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

  // No interceptar el manifest: el navegador lo gestiona directamente.
  // Evita el fallo CORS cuando Vercel lo redirige al SSO en previews protegidos.
  if (url.pathname === '/manifest.json') return;

  // No cachear API, Supabase o rutas de autenticación
  if (url.pathname.startsWith('/api/') ||
      url.hostname.includes('supabase') ||
      url.pathname.startsWith('/auth/') ||
      url.pathname.startsWith('/_next/static')) {
    return;
  }

    // --- NAVEGACIÓN (modo navigate) ---
  if (request.mode === 'navigate') {
    const path = url.pathname;

    // Rutas de autenticación, admin y API: NetworkOnly.
    // Se fuerza la red SIEMPRE para reflejar la sesión/carga real del servidor
    // y evitar servir HTML de login obsoleto (problema 408/"No cache").
    const isAuthOrApi =
      path === '/' ||
      path.startsWith('/login') ||
      path.startsWith('/signup') ||
      path.startsWith('/admin') ||
      path.startsWith('/api/');

    if (isAuthOrApi) {
      event.respondWith(
        fetch(request).catch(() =>
          new Response(
            '<!doctype html><html><meta charset="utf-8"><title>HYUK</title><div style="font-family:sans-serif;text-align:center;padding:40px;color:#666">Sin conexión</div></html>',
            { status: 200, headers: { 'Content-Type': 'text/html' } }
          )
        )
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

  // Estáticos: cache-first con actualización en background.
  // El fallback siempre es una Response válida (nunca undefined).
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
        .catch(() =>
          cached ||
          new Response(
            '<!doctype html><html><meta charset="utf-8"><title>HYUK</title><p style="font-family:sans-serif;padding:20px">Sin conexión</p></html>',
            { status: 200, headers: { 'Content-Type': 'text/html' } }
          )
        );

      return cached || network;
    })
  );
});