'use client';

import { motion } from 'framer-motion';
import { 
  Palette, Package, ShoppingBag, Settings, ExternalLink, LogOut, Store, 
  ClipboardList, Eye, TrendingUp, MousePointer, Copy, CheckCircle,
  Link as LinkIcon
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    visits: 0,
    whatsappClicks: 0,
    activeProducts: 0,
    categories: 0,
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
        .single();

      if (profile?.slug) {
        setStoreUrl(`${profile.slug}.hyuk.app`);
      }

      // Get stats
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('count', { count: 'exact', head: true }).eq('store_id', user.id),
        supabase.from('categories').select('count', { count: 'exact', head: true }).eq('store_id', user.id),
      ]);

      setStats({
        visits: Math.floor(Math.random() * 100) + 10, // Demo data
        whatsappClicks: Math.floor(Math.random() * 50) + 5, // Demo data
        activeProducts: productsRes.count || 0,
        categories: categoriesRes.count || 0,
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
      trend: '+12%',
    },
    {
      label: 'Clics a WhatsApp',
      value: stats.whatsappClicks,
      icon: MousePointer,
      color: 'bg-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-600 dark:text-green-400',
      trend: '+8%',
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
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 p-4 hidden md:flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white">HYUK Admin</h1>
            <p className="text-xs text-gray-500">Panel de control</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <a
            href="/admin/customize"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Palette className="w-4 h-4" />
            Personalizar
          </a>
          <a
            href="/admin/categories"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            Categorías
          </a>
          <a
            href="/admin/products"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Productos
          </a>
          <a
            href="/admin/orders"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Package className="w-4 h-4" />
            Pedidos
          </a>
          <a
            href="/admin/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configuración
          </a>
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>

      {/* Main Content */}
      <div className="md:ml-64 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Header */}
          <div className="md:hidden mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          </div>

          {/* Store Status Banner - Tiendanube Style */}
          {storeUrl && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-white dark:bg-zinc-900 rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-zinc-800 shadow-sm"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Tienda Activa
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">https://{storeUrl}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shrink-0"
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

          {/* KPI Cards - Tiendanube Style */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
            {kpiCards.map((kpi, index) => {
              const Icon = kpi.icon;
              return (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-zinc-900 rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${kpi.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${kpi.textColor}`} />
                    </div>
                    {kpi.trend && (
                      <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                        {kpi.trend}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {kpi.value}
                  </p>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
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
              className="group bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Palette className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Personalizar Catálogo
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Colores, layouts y estilos
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
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
              className="group bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Gestionar Productos
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Agrega y edita productos
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
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