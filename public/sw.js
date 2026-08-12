/* =============================================
   HYUK - SERVICE WORKER (PWA)
   Estrategia: cache-first para el app shell con
   fallback a red y actualización en background.
   ============================================= */

const CACHE_NAME = 'hyuk-catalog-v1';
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg',
];

// Instalación: precachear app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
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

  // No cachear API, Supabase o rutas de autenticación
  if (url.pathname.startsWith('/api/') ||
      url.hostname.includes('supabase') ||
      url.pathname.startsWith('/auth/') ||
      url.pathname.startsWith('/_next/static')) {
    return;
  }

  // Navegación: network-first con fallback a caché (offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/offline', copy));
          return response;
        })
        .catch(() => caches.match('/offline').then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Estáticos: cache-first con actualización en background
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});