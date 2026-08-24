/**
 * lib/tenant.js
 * Resolución de tenant (slug → store_id) y utilidades multi-tenant.
 *
 * Optimización para el middleware: cache en memoria con TTL corto para no
 * golpear Supabase en cada request público de catálogo/subdominio.
 *
 * IMPORTANTE: al ser un proceso serverless (Vercel) la caché es por-instance.
 * Es un *cache best-effort* — primero se comprueba, y si falla o expira se hace
 * la consulta real. Nunca se cachea un resultado negativo para evitar
 * servir "404" cuando aún no existe.
 */

const CACHE_TTL_MS = 30_000; // 30s

// slug -> { storeId, expiresAt }
const cache = new Map();

/**
 * Devuelve el store_id (profiles.id) para un slug, usando caché en memoria.
 * @param {object} supabase cliente server-side ya configurado
 * @param {string} slug slug de la tienda
 * @returns {Promise<string|null>} store_id o null si no existe
 */
export async function getStoreIdBySlug(client, slug) {
  const key = String(slug || '').toLowerCase().trim();
  if (!key || !client) return null;

  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.storeId;

  // Negativos también se cachean, pero con TTL corto.
  const { data } = await client.from('profiles').select('id').eq('slug', key).maybeSingle();
  const storeId = data?.id || null;

  cache.set(key, {
    storeId,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return storeId;
}

/** Limpia la caché (útil en pruebas o tras un cambio de slug). */
export function clearTenantCache() {
  cache.clear();
}

/**
 * Comprueba si un perfil completó el onboarding (settings.onboarded).
 * @param {object} profile perfil ya cargado (con .settings)
 * @returns {boolean}
 */
export function isOnboarded(profile) {
  return Boolean(profile?.settings?.onboarded);
}