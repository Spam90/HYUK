// ============================================================
// HYUK — Rate limiter ligero en memoria (ventana deslizante).
//
// Adecuado para el deployment actual (instancia única / lambda
// caliente de Vercel). En un futuro multi-instancia se sustituye
// por Redis/Upstash manteniendo la MISMA firma check()/reset().
//
// No añade dependencias (se evita express-rate-limit, etc.).
// ============================================================

/**
 * Crea un rate limiter de ventana deslizante por proceso.
 * @param {{limit:number, windowMs:number}} opts
 */
export function createRateLimiter({ limit = 30, windowMs = 60_000 } = {}) {
  const hits = new Map(); // key -> number[] (timestamps)

  // Evita crecimiento infinito de la tabla interna con IPs distintas.
  const MAX_KEYS = 10_000;

  const prune = () => {
    if (hits.size > MAX_KEYS) {
      const keys = [...hits.keys()];
      // Elimina la mitad más antigua (iteración aproximada).
      for (let i = 0; i < keys.length / 2; i++) hits.delete(keys[i]);
    }
  };

  return {
    /**
     * Comprueba si `key` supera el límite.
     * @returns {{ok:boolean, remaining:number, retryAfter:number}}
     */
    check(key) {
      const now = Date.now();
      const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);

      if (arr.length >= limit) {
        hits.set(key, arr);
        const oldest = arr[0];
        const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
        return { ok: false, remaining: 0, retryAfter };
      }

      arr.push(now);
      hits.set(key, arr);
      prune();
      return { ok: true, remaining: limit - arr.length, retryAfter: 0 };
    },

    reset(key) {
      hits.delete(key);
    },
  };
}

/** IP real del cliente respetando proxies (Vercel envía x-forwarded-for). */
export function clientIp(request) {
  const fwd = request.headers?.get('x-forwarded-for');
  if (fwd) return String(fwd).split(',')[0].trim() || 'unknown';
  return request.headers?.get('x-real-ip') || 'unknown';
}

/** Una instancia por endpoint para que cada uno tenga su propio cupo. */
export const RateLimiters = {
  analytics: createRateLimiter({ limit: 30, windowMs: 60_000 }),   // ingestión de eventos
  tracking: createRateLimiter({ limit: 20, windowMs: 60_000 }),    // /pedido/[id]
  aiImage: createRateLimiter({ limit: 10, windowMs: 60_000 }),     // scan-menu, generate-theme
  aiText: createRateLimiter({ limit: 20, windowMs: 60_000 }),      // generate-description
  checkout: createRateLimiter({ limit: 10, windowMs: 60_000 }),    // create-preference
  storeData: createRateLimiter({ limit: 60, windowMs: 60_000 }),   // autenticado (luz)
};

/** Respuesta 429 estándar. */
export function rateLimitResponse(retryAfter = 60) {
  return new Response(
    JSON.stringify({ error: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'Cache-Control': 'no-store',
      },
    }
  );
}