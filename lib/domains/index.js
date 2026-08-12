// =============================================
// HYUK - INFRAESTRUCTURA DE DOMINIOS Y SUBDOMINIOS
// =============================================

// Subdominios reservados del sistema (no son tiendas)
export const SYSTEM_SUBDOMAINS = ['www', 'app', 'api', 'admin', 'dashboard', 'blog', 'mail', 'smtp', 'auth'];

// Dominio raíz de la plataforma
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || (process.env.VERCEL_URL ? process.env.VERCEL_URL : 'localhost:3000');

/**
 * Normaliza un host: elimina puerto y va en minúsculas.
 */
export function normalizeHost(host) {
  return (host || '').toLowerCase().split(':')[0];
}

/**
 * Detecta si el host pertenece al dominio raíz de la plataforma.
 * Soporta Vercel (*.vercel.app), localhost y dominios personalizados futuros.
 */
export function isPlatformHost(host) {
  const normalized = normalizeHost(host);
  const root = normalizeHost(ROOT_DOMAIN);

  if (normalized === root) return true;
  if (!root.includes('.')) return false;

  // Dominio de Vercel: mitienda.hyuk-nine.vercel.app
  if (normalized.endsWith(`.${root}`)) return true;

  // localhost en desarrollo
  if (normalized.endsWith('.localhost')) return true;

  return false;
}

/**
 * Extrae el subdominio de tienda de un host, o null si no aplica.
 * Ej: mitienda.hyuk.app -> 'mitienda'
 * Ej: mitienda.localhost -> 'mitienda'
 * Ej: mitienda.com -> null (dominio personalizado, se resuelve aparte)
 */
export function extractSubdomain(host) {
  const normalized = normalizeHost(host);
  const root = normalizeHost(ROOT_DOMAIN);
  const parts = normalized.split('.');

  // Desarrollo local: mitienda.localhost
  if (parts.length === 2 && parts[1] === 'localhost') {
    return isSystemSubdomain(parts[0]) ? null : parts[0];
  }

  // Subdominio de Vercel multinivel
  if (root.includes('.')) {
    const suffix = `.${root}`;
    if (normalized.endsWith(suffix)) {
      const sub = normalized.slice(0, -suffix.length);
      if (sub && !isSystemSubdomain(sub)) return sub;
    }
  }

  // Dominio personalizado (sin subdominio de plataforma)
  if (normalized !== root) {
    const partsCount = parts.length;
    // Dominios de 2 niveles (mitienda.com) o más no son subdominios de la plataforma
    if (partsCount <= 2) return null;
    return null;
  }

  return null;
}

/**
 * ¿Es un subdominio reservado del sistema?
 */
export function isSystemSubdomain(subdomain) {
  return SYSTEM_SUBDOMAINS.includes(String(subdomain || '').toLowerCase());
}

/**
 * Construye la URL pública de una tienda (subdominio si el host lo soporta,
 * de lo contrario ruta directa /slug).
 */
export function buildStoreUrl(slug, rootDomain = ROOT_DOMAIN) {
  if (rootDomain.includes('localhost')) {
    return `${slug}.${rootDomain}`;
  }
  // En Vercel: mitienda.hyuk-nine.vercel.app
  return `${slug}.${rootDomain}`;
}

/**
 * Construye la URL de respaldo (ruta directa /slug).
 */
export function buildFallbackUrl(slug, requestUrl) {
  const url = new URL(`/${slug}`, requestUrl);
  return url;
}