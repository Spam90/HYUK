'use client';

import { Instagram, Music2 } from 'lucide-react';
import { memo } from 'react';

/**
 * SocialFooter - Renderiza los botones de redes sociales del *catálogo público*.
 * Lee `profiles.social_links` (JSONB), que la sección /admin/customize escribe.
 *
 * Formato esperado de `social_links`:
 *   { instagram: '@mi.tienda', tiktok: 'https://tiktok.com/@mi.tienda' }
 *   ó [{ platform: 'instagram', url: '...' }]  (formato legacy/array)
 *   ó string JSON (fallback de clientes legacy)
 *
 * Zero-error: si falta o está malformado, no renderiza nada.
 */

// Normaliza distintas formas de `social_links` → { instagram, tiktok }
const normalizeLinks = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (Array.isArray(raw)) {
    return raw.reduce((acc, item) => {
      if (item && typeof item === 'object' && item.platform && item.url) {
        acc[String(item.platform).toLowerCase()] = item.url;
      }
      return acc;
    }, {});
  }
  if (raw && typeof raw === 'object') return raw;
  return {};
};

// Convierte una entrada (usuario / @usuario / url) en URL absoluta
const toUrl = (platform, value) => {
  if (!value) return null;
  const v = String(value).trim();
  if (/^https?:\/\//i.test(v)) return v;
  const user = v.replace(/^@/, '');
  switch (platform) {
    case 'instagram':
      return `https://instagram.com/${user}`;
    case 'tiktok':
      return `https://tiktok.com/@${user}`;
    default:
      return null;
  }
};

const ICONS = {
  instagram: Instagram,
  tiktok: Music2,
};

const SocialFooter = memo(({ store, settings }) => {
  const links = normalizeLinks(store?.social_links);
  const primary = settings?.theme?.primaryColor || '#10B981';

  const items = Object.entries(links)
    .map(([platform, value]) => ({ platform, href: toUrl(platform, value) }))
    .filter((i) => i.href && ICONS[i.platform]);

  if (items.length === 0) return null;

  return (
    <div className="mt-6 sm:mt-8">
      <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-center gap-6 sm:gap-8">
        <span className="text-xs text-gray-500 dark:text-zinc-500 hidden sm:inline">Sígueme</span>
        {items.map(({ platform, href }) => {
          const Icon = ICONS[platform];
          return (
            <a
              key={platform}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={platform}
              title={`${platform}: ${href}`}
              className="group inline-flex items-center justify-center w-11 h-11 rounded-full border transition-all duration-200 hover:scale-105 hover:text-white focus:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[color:var(--focus-ring)]"
              style={{ borderColor: primary, color: primary }}
            >
              <Icon className="w-5 h-5" />
            </a>
          );
        })}
            </div>
    </div>
  );
});

SocialFooter.displayName = 'SocialFooter';
export default SocialFooter;
