'use client';

import { motion } from 'framer-motion';
import { 
  Palette, Package, ShoppingBag, Settings, ExternalLink, LogOut, Store, 
  ClipboardList, Eye, TrendingUp, MousePointer, Copy, CheckCircle,
  Link as LinkIcon, Megaphone, Users
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    visits: 0,
    whatsappClicks: 0,
    activeProducts: 0,
    categories: 0,
    pendingOrders: 0,
  });
  const [storeUrl, setStoreUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Get store URL
      const { data: profile } = await supabase
        .from('profiles')
        .select('slug')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.slug) {
        setStoreUrl(`${profile.slug}.hyuk.app`);
      }

      // Get stats (cada consulta con fallback defensivo: si una tabla no existe
      // o falla en Supabase, devolvemos 0 en lugar de romper el dashboard)
      const safeCount = async (table, filters = []) => {
        try {
          let query = supabase.from(table).select('count', { count: 'exact', head: true });
          filters.forEach((f) => { query = query.eq(f.column, f.value); });
          const { count, error } = await query;
          if (error) throw error;
          return count || 0;
        } catch (err) {
          console.warn(`[Dashboard] No se pudo contar "${table}", se muestra 0:`, err.message);
          return 0;
        }
      };

      const [ordersCount, activeProducts, categories, pendingOrders] = await Promise.all([
        safeCount('orders', [{ column: 'store_id', value: user.id }]),
        safeCount('products', [{ column: 'store_id', value: user.id }]),
        safeCount('categories', [{ column: 'store_id', value: user.id }]),
        safeCount('orders', [
          { column: 'store_id', value: user.id },
          { column: 'status', value: 'pending' },
        ]),
      ]);

      setStats({
        visits: ordersCount,
        whatsappClicks: ordersCount,
        activeProducts,
        categories,
        pendingOrders,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`https://${storeUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const kpiCards = [
    {
      label: 'Visitas de Hoy',
      value: stats.visits,
      icon: Eye,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      trend: null,
    },
    {
      label: 'Clics a WhatsApp',
      value: stats.whatsappClicks,
      icon: MousePointer,
      color: 'bg-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-600 dark:text-green-400',
      trend: null,
    },
    {
      label: 'Productos Activos',
      value: stats.activeProducts,
      icon: Package,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-600 dark:text-purple-400',
      trend: null,
    },
    {
      label: 'Categorías',
      value: stats.categories,
      icon: ClipboardList,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      textColor: 'text-orange-600 dark:text-orange-400',
      trend: null,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-64 bg-zinc-900/60 backdrop-blur-xl border-r border-zinc-800 p-4 hidden md:flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-zinc-100">HYUK Admin</h1>
            <p className="text-xs text-zinc-400">Panel de control</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <a
            href="/admin/customize"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors"
          >
            <Palette className="w-4 h-4" />
            Personalizar
          </a>
          <a
            href="/admin/categories"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            Categorías
          </a>
          <a
            href="/admin/products"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Productos
          </a>
          <a
            href="/admin/orders"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors"
          >
            <div className="relative">
              <Package className="w-4 h-4" />
              {stats.pendingOrders > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            Pedidos
            {stats.pendingOrders > 0 && (
              <span className="ml-auto px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-bold rounded-full">
                {stats.pendingOrders}
              </span>
            )}
          </a>
          <a
            href="/admin/analytics"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Analíticas
          </a>
          <a
            href="/admin/customers"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors"
          >
            <Users className="w-4 h-4" />
            Clientes
          </a>
          <a
            href="/admin/marketing"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors"
          >
            <Megaphone className="w-4 h-4" />
            Marketing
          </a>
          <a
            href="/admin/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configuración
          </a>
                </nav>

        <div className="pt-2 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} HYUK Admin</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:ml-64 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Header */}
          <div className="md:hidden mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
          </div>

          {/* Store Status Banner */}
          {storeUrl && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-zinc-900/60 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-zinc-800 shadow-sm"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-zinc-100 mb-1">
                      Tienda Activa
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">https://{storeUrl}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors shrink-0 shadow-lg shadow-emerald-500/30"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar Link
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Estado vacío: bienvenida instructiva (sin productos ni pedidos) */}
          {!loading && stats.visits === 0 && stats.activeProducts === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-6 md:p-8 text-center"
            >
              <div className="text-5xl mb-4">👋</div>
              <h2 className="text-xl font-bold text-zinc-100 mb-2">¡Bienvenido a tu panel!</h2>
              <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
                Todavía no hay productos ni pedidos. Seguí estos pasos para poner tu catálogo
                en línea y empezar a recibir pedidos por WhatsApp.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left mb-6">
                <div className="rounded-xl bg-zinc-800/60 p-4">
                  <span className="text-2xl">1️⃣</span>
                  <h3 className="font-semibold text-white mt-2 text-sm">Crea productos</h3>
                  <p className="text-xs text-zinc-400 mt-1">Agrega foto, precio y descripción.</p>
                </div>
                <div className="rounded-xl bg-zinc-800/60 p-4">
                  <span className="text-2xl">2️⃣</span>
                  <h3 className="font-semibold text-white mt-2 text-sm">Personaliza</h3>
                  <p className="text-xs text-zinc-400 mt-1">Colores, logo y banner (con o sin IA).</p>
                </div>
                <div className="rounded-xl bg-zinc-800/60 p-4">
                  <span className="text-2xl">3️⃣</span>
                  <h3 className="font-semibold text-white mt-2 text-sm">Comparte</h3>
                  <p className="text-xs text-zinc-400 mt-1">Envía tu enlace y recibe pedidos.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/admin/products"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30"
                >
                  Agregar mi primer producto
                </a>
                <a
                  href="/admin/ai-importer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 text-zinc-100 text-sm font-semibold hover:bg-zinc-700 transition-colors"
                >
                  Importar menú con IA
                </a>
              </div>
            </motion.div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
            {kpiCards.map((kpi, index) => {
              const Icon = kpi.icon;
              return (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-zinc-900/60 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-zinc-800 shadow-sm hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${kpi.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${kpi.textColor}`} />
                    </div>
                    {kpi.trend && (
                      <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                        {kpi.trend}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-zinc-100 mb-1">
                    {kpi.value}
                  </p>
                  <p className="text-xs md:text-sm text-zinc-400">
                    {kpi.label}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Actions - Mobile First */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.a
              href="/admin/customize"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="group bg-zinc-900/60 backdrop-blur-xl rounded-2xl p-6 border border-zinc-800 shadow-sm hover:border-zinc-700 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Palette className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-zinc-100 mb-1">
                    Personalizar Catálogo
                  </h3>
                  <p className="text-sm text-zinc-400 mb-3">
                    Colores, layouts y estilos
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-400 group-hover:gap-2 transition-all">
                    Ir a personalizar
                    <ExternalLink className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </motion.a>

            <motion.a
              href="/admin/products"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="group bg-zinc-900/60 backdrop-blur-xl rounded-2xl p-6 border border-zinc-800 shadow-sm hover:border-zinc-700 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-zinc-100 mb-1">
                    Gestionar Productos
                  </h3>
                  <p className="text-sm text-zinc-400 mb-3">
                    Agrega y edita productos
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-400 group-hover:gap-2 transition-all">
                    Gestionar productos
                    <ExternalLink className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </motion.a>
          </div>
        </div>
      </div>
    </div>
  );
}