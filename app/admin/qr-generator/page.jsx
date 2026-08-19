'use client';

import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, QrCode, Palette, RefreshCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function QrGeneratorPage() {
  const router = useRouter();
  const [slug, setSlug] = useState('mi-tienda');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [size, setSize] = useState(256);
  const [storeUrl, setStoreUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        const user = data?.user;
        if (user) {
          supabase.from('profiles').select('slug').eq('id', user.id).maybeSingle().then(({ data: profile }) => {
            if (cancelled) return;
            const s = profile?.slug || 'mi-tienda';
            setSlug(s);
            setStoreUrl(`https://${s}.hyuk.app`);
            setLoading(false);
          });
        } else {
          if (cancelled) return;
          setStoreUrl(`https://${slug}.hyuk.app`);
          setLoading(false);
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleDownload = () => {
    const canvas = document.getElementById('qr-canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `qr-${slug}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Generador de QR</h1>
            <p className="text-sm text-gray-500">Código QR de tu catálogo</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 space-y-6">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
              <QRCodeCanvas
                id="qr-canvas"
                value={storeUrl}
                size={size}
                fgColor={fgColor}
                bgColor={bgColor}
                level="H"
                includeMargin
              />
            </div>

            <div className="flex-1 w-full space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  URL del catálogo
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700">
                  <QrCode className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none"
                  />
                  <button
                    onClick={() => setStoreUrl(`https://${slug}.hyuk.app`)}
                    title="Restablecer URL"
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <RefreshCcw className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Palette className="w-4 h-4" /> Colores del QR
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-gray-500">Frente</span>
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="w-full h-10 rounded-lg border border-gray-200 dark:border-zinc-700 cursor-pointer bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Fondo</span>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-full h-10 rounded-lg border border-gray-200 dark:border-zinc-700 cursor-pointer bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Tamaño ({size}px)
                </label>
                <input
                  type="range"
                  min="128"
                  max="512"
                  step="16"
                  value={size}
                  onChange={(e) => setSize(parseInt(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <Download className="w-5 h-5" /> Descargar PNG
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}