'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function FlyerMakerPage() {
  const router = useRouter();
  const canvasRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [slug, setSlug] = useState('mi-tienda');
  const [storeName, setStoreName] = useState('');
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        const user = data?.user;
        if (!user) return;
        Promise.all([
          supabase.from('profiles').select('slug, business_name').eq('id', user.id).maybeSingle(),
          supabase.from('products').select('*').eq('store_id', user.id).order('sort_order'),
        ]).then(([profileRes, productsRes]) => {
          if (cancelled) return;
          const profile = profileRes?.data || {};
          const s = profile?.slug || 'mi-tienda';
          setSlug(s);
          setStoreName(profile?.business_name || 'Mi Tienda');
          setStoreUrl(`https://${s}.hyuk.app`);
          const list = productsRes?.data || [];
          setProducts(list);
          if (list.length > 0) setSelectedId(list[0].id);
        });
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = products.find((p) => p.id === selectedId);

  const drawFlyer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendering(true);
    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0F172A');
    grad.addColorStop(1, '#10B981');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(storeName).toUpperCase().slice(0, 24), W / 2, 130);

    const drawText = (price, name) => {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 64px system-ui, sans-serif';
      ctx.textAlign = 'center';
      const lines = [];
      let line = '';
      for (const word of String(name).split(' ')) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > 920 && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, W / 2, 1320 + i * 72));

      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 120px system-ui, sans-serif';
      ctx.fillText(`$${price}`, W / 2, 1560);

      const qrCanvas = document.getElementById('flyer-qr');
      if (qrCanvas) {
        ctx.drawImage(qrCanvas, W / 2 - 130, 1620, 260, 260);
      }
      setRendering(false);
    };

    const price = parseFloat(selected?.price || 0).toFixed(2);
    const name = selected?.name || 'Producto';

    if (selected?.image_url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(W / 2, 760, 420, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, W / 2 - 420, 340, 840, 840);
        ctx.restore();
        drawText(price, name);
      };
      img.onerror = () => {
        ctx.fillStyle = '#ffffff22';
        ctx.beginPath();
        ctx.arc(W / 2, 760, 420, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '160px sans-serif';
        ctx.fillText('🍽️', W / 2, 830);
        drawText(price, name);
      };
      img.src = selected.image_url;
    } else {
      ctx.fillStyle = '#ffffff22';
      ctx.beginPath();
      ctx.arc(W / 2, 760, 420, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '160px sans-serif';
      ctx.fillText('🍽️', W / 2, 830);
      drawText(price, name);
    }
  };

  const handleDownload = () => {
    drawFlyer();
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `flyer-${slug}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }, 400);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flyer para Stories</h1>
            <p className="text-sm text-gray-500">1080x1920 · listo para Instagram/WhatsApp</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-8">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-5 space-y-5 h-fit">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Selecciona un producto
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
              >
                <option value="">Elegir producto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {selected?.image_url && (
              <button
                onClick={() => window.open(selected.image_url, '_blank')}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <ImageIcon className="w-4 h-4" /> Ver imagen del producto
              </button>
            )}

            <button
              onClick={handleDownload}
              disabled={!selected}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {rendering ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              Generar y descargar PNG
            </button>
          </div>
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              className="rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 max-w-full"
              style={{ width: '360px', aspectRatio: '9/16' }}
            />
          </div>

          <div className="hidden">
            <QRCodeCanvas id="flyer-qr" value={storeUrl || `https://${slug}.hyuk.app`} size={260} level="H" />
          </div>
        </div>
      </div>
    </div>
  );
}