'use client';

import { Instagram, Music2, LinkIcon } from 'lucide-react';

/**
 * SocialControls - Configuración de enlaces de redes sociales.
 * Se persiste en la columna `profiles.social_links` (JSONB) y se muestran
 * en el footer del catálogo público junto a los botones de Instagram/TikTok.
 */
export default function SocialControls({ social = {}, onChange }) {
  const s = { instagram: social?.instagram || '', tiktok: social?.tiktok || '' };

  const update = (field) => (e) => {
    const value = e.target.value;
    onChange({ ...s, [field]: value });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <LinkIcon className="w-4 h-4 text-text/50" />
        <h3 className="font-bold text-text">Redes Sociales de tu tienda</h3>
      </div>
      <p className="text-xs text-text/50 -mt-2">
        Se mostrarán en el pie de página de tu catálogo público.
      </p>

      <div>
        <label className="block text-xs font-semibold text-text/70 mb-1.5">Instagram</label>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-theme-lg bg-secondary/5 border border-secondary/10 focus-within:border-primary/50 transition-colors">
          <Instagram className="w-4 h-4 text-pink-500 shrink-0" />
          <input
            type="text"
            value={s.instagram}
            onChange={update('instagram')}
            placeholder="@mi.tienda o https://instagram.com/mi.tienda"
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text/30 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-text/70 mb-1.5">TikTok</label>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-theme-lg bg-secondary/5 border border-secondary/10 focus-within:border-primary/50 transition-colors">
          <Music2 className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            value={s.tiktok}
            onChange={update('tiktok')}
            placeholder="@mi.tienda o https://tiktok.com/@mi.tienda"
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text/30 focus:outline-none"
          />
        </div>
      </div>

      <div className="text-xs text-text/40 bg-secondary/5 rounded-theme-lg p-3">
        💡 Escribe el usuario directo (@usuario) o la URL completa. Los botones aparecerán en el pie de página del catálogo.
      </div>
    </div>
  );
}