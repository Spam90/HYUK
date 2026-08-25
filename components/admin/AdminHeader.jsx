'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, ExternalLink, LogOut, Settings, Home, ChevronRight } from 'lucide-react';
import { getDbStatus } from '@/lib/db-status';
import { isTrialActive } from '@/lib/config/plans';

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
  const [trialActive, setTrialActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userInitials, setUserInitials] = useState('U');

  useEffect(() => {
    let cancelled = false;
        import('@/lib/supabase/client')
      .then(({ createClient }) => {
        const supabase = createClient();
        supabase.auth.getUser()
          .then(async ({ data }) => {
            const user = data?.user;
            if (!user || cancelled) return;
            try {
              if (user.email) setUserInitials(user.email.slice(0, 2).toUpperCase());
            } catch {
              /* ignorible: estado del header no disponible */
            }
            // slug/plan/trial del perfil: sondeamos primero (server-side) qué columnas
            // existen para NO pedir columnas inexistentes (evita 400 en consola).
            const db = await getDbStatus();
            if (cancelled) return;
            try {
              const cols = ['slug'];
              if (db.planColumn) cols.push(db.planColumn);
              if (db.trialEnds) cols.push('trial_ends_at');
              const { data: p } = await supabase
                .from('profiles')
                .select(cols.join(', '))
                .eq('id', user.id)
                .maybeSingle();
              if (cancelled) return;
              if (p?.slug) setSlug(p.slug);
              setTrialActive(isTrialActive(p?.trial_ends_at));
              // Sin columna de plan → mostramos 'free' (el CTA de upsell funciona igual).
              setPlan(
                (db.planColumn && p?.[db.planColumn]) ||
                p?.plan ||
                p?.plan_type ||
                'free'
              );
            } catch (err) {
              console.warn('[AdminHeader] No se pudieron cargar slug/plan del perfil:', err?.message);
            }
          })
          .catch((err) => {
            console.warn('[AdminHeader] getUser falló:', err?.message);
          });
      })
      .catch((err) => {
        console.warn('[AdminHeader] Cliente Supabase no disponible:', err?.message);
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
          {trialActive && (
            <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-black uppercase tracking-wide">
              ✨ Prueba Pro
            </span>
          )}
          {plan === 'free' && !trialActive && (
            <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[11px] font-black uppercase tracking-wide">
              ⚡ Plan Gratuito
            </span>
          )}
          {plan === 'free' && !trialActive && (
            <a
              href="/admin/settings"
              className="hidden md:inline-flex items-center px-2.5 py-2 rounded-lg text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/10 transition-colors"
              title="Mejorar a Pro"
            >
              Mejorar a Pro
            </a>
          )}
          {plan === 'pro' && !trialActive && (
            <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-black uppercase tracking-wide">
              ✦ Plan Pro
            </span>
          )}
          {slug ? (
            <a
              href={typeof window !== 'undefined' && window.location.hostname.includes('localhost')
                ? `/${slug}`
                : `https://${slug}.hyuk.app`}
              target={typeof window !== 'undefined' && window.location.hostname.includes('localhost') ? undefined : '_blank'}
              rel="noopener noreferrer"
              title="Ver mi tienda"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden md:inline">Ver mi tienda</span>
            </a>
          ) : (
            <a
              href="/admin/settings"
              title="Configura el slug de tu tienda para poder publicarla"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/90 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden md:inline">Configurar tienda</span>
            </a>
          )}
          {/* Menú de usuario: Ajustes + Cerrar sesión (único lugar) */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              title="Menú de usuario"
              className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-bold flex items-center justify-center hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            >
              {userInitials}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-50 w-44 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-xl p-1.5">
                <a
                  href="/admin/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Settings className="w-4 h-4" /> Ajustes
                </a>
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}