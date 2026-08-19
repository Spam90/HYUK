'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, ExternalLink, LogOut, Settings, Home, ChevronRight } from 'lucide-react';

const ROUTE_LABELS = {
  '/admin': 'Resumen',
  '/admin/customize': 'Personalizar',
  '/admin/ai-importer': 'Importador con IA',
  '/admin/products': 'Productos',
  '/admin/categories': 'Categorías',
  '/admin/orders': 'Pedidos',
  '/admin/analytics': 'Analíticas',
  '/admin/customers': 'Clientes',
  '/admin/marketing': 'Marketing',
  '/admin/qr-generator': 'Generador de QR',
  '/admin/flyer-maker': 'Creador de Flyers',
  '/admin/settings': 'Configuración',
};

/**
 * AdminHeader - barra superior consistente en TODAS las sub-rutas del panel.
 * Breadcrumb + "Volver al panel" + "Ver mi tienda" + Ajustes + Cerrar sesión.
 * Siempre accesible en móvil y desktop.
 */
export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [slug, setSlug] = useState(null);
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    let cancelled = false;
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        const user = data?.user;
        if (!user || cancelled) return;
        supabase
          .from('profiles')
          .select('slug, plan')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data: p }) => {
            if (cancelled) return;
            if (p?.slug) setSlug(p.slug);
            if (p?.plan) setPlan(p.plan);
          });
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const label =
    Object.entries(ROUTE_LABELS)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([k]) => pathname?.startsWith(k))?.[1] ||
    (pathname ? pathname.split('/').filter(Boolean).pop().replace(/-/g, ' ') : 'Panel');

  const isRoot = pathname === '/admin';

  const handleLogout = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      await createClient().auth.signOut();
    } catch (e) {
      console.warn('[Logout]', e);
    }
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3">
        {/* Volver al panel */}
        <button
          onClick={() => router.push('/admin')}
          title="Volver al inicio del panel"
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden lg:inline">Volver al panel</span>
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 min-w-0">
          <Home className="w-4 h-4 shrink-0 hover:text-gray-700 dark:hover:text-gray-200" />
          <ChevronRight className="w-3 h-3 shrink-0 opacity-40" />
          <span className="truncate font-semibold text-gray-800 dark:text-gray-200">
            {isRoot ? 'Panel' : label}
          </span>
        </div>

        {/* Acciones */}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {plan === 'free' && (
            <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[11px] font-black uppercase tracking-wide">
              ⚡ Plan Gratuito
            </span>
          )}
          {plan === 'free' && (
            <a
              href="/admin/settings"
              className="hidden md:inline-flex items-center px-2.5 py-2 rounded-lg text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/10 transition-colors"
              title="Mejorar a Pro"
            >
              Mejorar a Pro
            </a>
          )}
          {plan === 'pro' && (
            <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-black uppercase tracking-wide">
              ✦ Plan Pro
            </span>
          )}
          {slug && (
            <a
              href={`https://${slug}.hyuk.app`}
              target="_blank"
              rel="noopener noreferrer"
              title="Ver mi tienda"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden md:inline">Ver mi tienda</span>
            </a>
          )}
          <a
            href="/admin/settings"
            title="Ajustes"
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Ajustes</span>
          </a>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}