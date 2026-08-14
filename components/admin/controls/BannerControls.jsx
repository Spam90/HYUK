'use client';

import { Image as ImageIcon, Megaphone, Type, Upload, X } from 'lucide-react';

export default function BannerControls({ settings, updateSettings }) {
  const { banner } = settings;

    // Subida de imagen: persiste en Supabase Storage (bucket 'banners').
  // Mantiene preview local inmediato vía dataURL como fallback visible.
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('El archivo debe ser una imagen (PNG, JPG, WEBP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Máximo 5MB.');
      return;
    }

    // Preview local inmediato
    const reader = new FileReader();
    reader.onload = (event) => {
      updateSettings('banner', { imageUrl: event.target.result });
    };
    reader.readAsDataURL(file);

    // Persistir la imagen en Supabase Storage
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileName = `banners/${user.id}_${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('banners').getPublicUrl(fileName);
      const url = data?.publicUrl;
      if (url) {
        updateSettings('banner', { imageUrl: url });
      }
    } catch (err) {
      // El preview dataURL local ya está aplicado; no interrumpimos la UX.
      console.warn('Upload a Supabase Storage falló, se mantiene preview local:', err?.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de imagen */}
      <div>
        <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Banner Superior
        </h4>
        
        {/* Preview del banner */}
        {banner.imageUrl ? (
          <div className="relative rounded-theme-lg overflow-hidden mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={banner.imageUrl}
              alt="Banner"
              className="w-full h-32 object-cover"
            />
            <button
              onClick={() => updateSettings('banner', { imageUrl: '' })}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-secondary/20 rounded-theme-lg cursor-pointer hover:border-primary/40 transition-colors">
            <Upload className="w-8 h-8 text-text/30 mb-2" />
            <span className="text-sm text-text/50">Subir imagen de banner</span>
            <span className="text-xs text-text/30 mt-1">PNG, JPG o GIF</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Lema del negocio */}
      <div>
        <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <Type className="w-4 h-4" />
          Lema del Negocio
        </h4>
        <input
          type="text"
          value={banner.tagline}
          onChange={(e) => updateSettings('banner', { tagline: e.target.value })}
          placeholder="¡Los mejores productos a un clic!"
          className="w-full px-4 py-3 rounded-theme-lg border border-secondary/10 bg-card text-sm text-text placeholder:text-text/30 focus:outline-none focus:border-primary/50 transition-colors"
        />
        <p className="text-xs text-text/40 mt-1.5">
          Este texto aparecerá debajo del nombre de tu negocio
        </p>
      </div>

      {/* Barra de anuncios */}
      <div>
        <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <Megaphone className="w-4 h-4" />
          Barra de Anuncios
        </h4>
        
        {/* Toggle para mostrar/ocultar */}
        <label className="flex items-center justify-between p-3 bg-card rounded-theme-lg border border-secondary/10 mb-3 cursor-pointer">
          <div>
            <p className="text-sm font-medium text-text">Mostrar barra de anuncios</p>
            <p className="text-xs text-text/40">Aparece en la parte superior del catálogo</p>
          </div>
          <button
            onClick={() => updateSettings('banner', { showAnnouncementBar: !banner.showAnnouncementBar })}
            className={`relative w-12 h-6 rounded-full transition-colors ${banner.showAnnouncementBar ? 'bg-primary' : 'bg-secondary/20'}`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                banner.showAnnouncementBar ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>

        {/* Texto del anuncio */}
        {banner.showAnnouncementBar && (
          <textarea
            value={banner.announcementText}
            onChange={(e) => updateSettings('banner', { announcementText: e.target.value })}
            placeholder="🚚 Envíos gratis en pedidos mayores a $1,000"
            rows={2}
            className="w-full px-4 py-3 rounded-theme-lg border border-secondary/10 bg-card text-sm text-text placeholder:text-text/30 focus:outline-none focus:border-primary/50 transition-colors resize-none"
          />
        )}
      </div>
    </div>
  );
}