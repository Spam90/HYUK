'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, DollarSign, ShoppingBag, Award, 
  Calendar, ArrowUpRight, ArrowDownRight, Loader2 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState({
    totalSales: 0,
    totalOrders: 0,
    averageTicket: 0,
    topProduct: null,
    salesByDay: [],
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Obtener todos los pedidos completados
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calcular métricas
      const totalSales = orders?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;
      const totalOrders = orders?.length || 0;
      const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

      // Producto más vendido
      const productCount = {};
      orders?.forEach(order => {
        order.items?.forEach(item => {
          productCount[item.name] = (productCount[item.name] || 0) + item.quantity;
        });
      });

      const topProduct = Object.entries(productCount).sort((a, b) => b[1] - a[1])[0];

      // Ventas por día (últimos 7 días)
      const last7Days = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const daySales = orders?.filter(order => 
          order.created_at.startsWith(dateStr)
        ).reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;

        last7Days.push({
          date: dateStr,
          day: date.toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric' }),
          sales: daySales,
        });
      }

      setAnalytics({
        totalSales,
        totalOrders,
        averageTicket,
        topProduct: topProduct ? { name: topProduct[0], quantity: topProduct[1] } : null,
        salesByDay: last7Days,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxSales = Math.max(...analytics.salesByDay.map(d => d.sales));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Analíticas de Ventas</h1>
          <p className="text-text/60">Métricas y rendimiento de tu tienda</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-theme-xl p-6 border border-secondary/10 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                <ArrowUpRight className="w-3 h-3" />
                +12%
              </span>
            </div>
            <p className="text-sm text-text/60 mb-1">Ventas Totales</p>
            <p className="text-3xl font-bold text-text">${analytics.totalSales.toFixed(2)}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-theme-xl p-6 border border-secondary/10 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                <ArrowUpRight className="w-3 h-3" />
                +8%
              </span>
            </div>
            <p className="text-sm text-text/60 mb-1">Pedidos Totales</p>
            <p className="text-3xl font-bold text-text">{analytics.totalOrders}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-theme-xl p-6 border border-secondary/10 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-lg">
                <ArrowUpRight className="w-3 h-3" />
                +5%
              </span>
            </div>
            <p className="text-sm text-text/60 mb-1">Ticket Promedio</p>
            <p className="text-3xl font-bold text-text">${analytics.averageTicket.toFixed(2)}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-theme-xl p-6 border border-secondary/10 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
                <Award className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-sm text-text/60 mb-1">Producto Top</p>
            <p className="text-lg font-bold text-text line-clamp-2">
              {analytics.topProduct?.name || 'N/A'}
            </p>
            {analytics.topProduct && (
              <p className="text-xs text-text/50 mt-1">
                {analytics.topProduct.quantity} unidades vendidas
              </p>
            )}
          </motion.div>
        </div>

        {/* Sales Chart - Last 7 Days */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-theme-xl p-6 border border-secondary/10 shadow-sm mb-8"
        >
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-text">Ventas de los Últimos 7 Días</h2>
          </div>

          <div className="flex items-end justify-between gap-2 h-64">
            {analytics.salesByDay.map((day, index) => {
              const heightPercentage = maxSales > 0 ? (day.sales / maxSales) * 100 : 0;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center justify-end h-48">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercentage}%` }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className="w-full bg-gradient-to-t from-primary to-accent rounded-t-lg min-h-[4px]"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-text">{day.day}</p>
                    <p className="text-[10px] text-text/50">${day.sales.toFixed(0)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Additional Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card rounded-theme-xl p-6 border border-secondary/10 shadow-sm"
          >
            <h3 className="text-lg font-bold text-text mb-4">Resumen</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-secondary/10">
                <span className="text-sm text-text/60">Total de ventas</span>
                <span className="text-sm font-bold text-text">${analytics.totalSales.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-secondary/10">
                <span className="text-sm text-text/60">Pedidos completados</span>
                <span className="text-sm font-bold text-text">{analytics.totalOrders}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-secondary/10">
                <span className="text-sm text-text/60">Ticket promedio</span>
                <span className="text-sm font-bold text-text">${analytics.averageTicket.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-text/60">Producto más vendido</span>
                <span className="text-sm font-bold text-text line-clamp-1">
                  {analytics.topProduct?.name || 'N/A'}
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-card rounded-theme-xl p-6 border border-secondary/10 shadow-sm"
          >
            <h3 className="text-lg font-bold text-text mb-4">Consejos</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-text">Aumenta tu visibilidad</p>
                  <p className="text-xs text-text/60 mt-1">
                    Comparte tu catálogo en redes sociales para atraer más clientes
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Award className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-text">Optimiza tu menú</p>
                  <p className="text-xs text-text/60 mt-1">
                    Destaca tus productos más populares en la portada
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}