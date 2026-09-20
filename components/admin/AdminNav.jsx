'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Boxes,
  FolderTree,
  Gauge,
  ImageIcon,
  Megaphone,
  Palette,
  QrCode,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const NAV_GROUPS = [
  {
    label: 'Operación',
    items: [
      { href: '/admin', label: 'Resumen', icon: Gauge, exact: true },
      { href: '/admin/orders', label: 'Pedidos', icon: ShoppingBag },
      { href: '/admin/products', label: 'Productos', icon: Boxes },
      { href: '/admin/categories', label: 'Categorías', icon: FolderTree },
      { href: '/admin/customers', label: 'Clientes', icon: Users },
    ],
  },
  {
    label: 'Crecimiento',
    items: [
      { href: '/admin/analytics', label: 'Analíticas', icon: BarChart3 },
      { href: '/admin/marketing', label: 'Marketing', icon: Megaphone },
      { href: '/admin/customize', label: 'Personalizar', icon: Palette },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { href: '/admin/ai-importer', label: 'Importador con IA', icon: Sparkles },
      { href: '/admin/qr-generator', label: 'Generador de QR', icon: QrCode },
      { href: '/admin/flyer-maker', label: 'Creador de Flyers', icon: ImageIcon },
      { href: '/admin/settings', label: 'Configuración', icon: Settings },
    ],
  },
];

function isActive(pathname, item) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavigationLinks({ pathname, onNavigate }) {
  return (
    <nav aria-label="Navegación principal del panel" className="space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-text/40">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-text/60 hover:bg-secondary/10 hover:text-text'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function AdminNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-secondary/10 bg-card md:flex">
        <div className="flex h-16 items-center gap-3 border-b border-secondary/10 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
            <Store className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-text">HYUK</p>
            <p className="truncate text-xs text-text/50">Panel de control</p>
          </div>
        </div>
        <div className="admin-scroll flex-1 overflow-y-auto px-3 py-5">
          <NavigationLinks pathname={pathname} />
        </div>
        <p className="border-t border-secondary/10 px-5 py-4 text-xs text-text/40">
          © {new Date().getFullYear()} HYUK
        </p>
      </aside>

      <div className="border-b border-secondary/10 bg-card px-4 py-2 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-expanded={mobileOpen}
          aria-controls="admin-mobile-navigation"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-text hover:bg-secondary/10 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <Store className="h-4 w-4 text-primary" aria-hidden="true" />
          Abrir navegación
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Navegación del panel">
          <button
            type="button"
            aria-label="Cerrar navegación"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <aside id="admin-mobile-navigation" className="relative flex h-full w-[min(20rem,88vw)] flex-col bg-card shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-secondary/10 px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
                  <Store className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="text-sm font-bold text-text">Navegación</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar navegación"
                className="rounded-lg p-2 text-text/60 hover:bg-secondary/10 hover:text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="admin-scroll flex-1 overflow-y-auto px-3 py-5">
              <NavigationLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
