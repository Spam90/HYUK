'use client';

import { motion } from 'framer-motion';
import {
  Palette, Package, ShoppingBag, ExternalLink, ClipboardList, Eye,
  MousePointer, Copy, Check, CheckCircle, Link as LinkIcon, QrCode,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import PlanUpgradeCard from '@/components/admin/PlanUpgradeCard';
import { getDbStatus } from '@/lib/db-status';
import Skeleton from '@/components/ui/Skeleton';

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
  const [error, setError] = useState('');
    const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [planType, setPlanType] = useState('free');
  const [trialEndsAt, setTrialEndsAt] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive');
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('No pudimos verificar tu sesión. Recarga la página para intentarlo de nuevo.');
        return;
      }

      // Get store URL (solo columnas que existen: evita 400 de plan_type/is_open)
      const db = await getDbStatus();
      // Campos de billing (existen desde migración 08 / enterprise features).
      const profileCols = [
        'slug',
        ...(db.isOpen ? ['is_open'] : []),
        ...(db.planColumn ? [db.planColumn] : []),
        ...(db.trialEnds ? ['trial_ends_at'] : []),
        'subscription_status',
        'stripe_customer_id',
      ].join(', ');
      // Si alguna columna vieja no existe en esta BD, reintentar sin ellas.
      let profile = null;
      let profileErr = null;
      try {
        const res = await supabase.from('profiles').select(profileCols).eq('id', user.id).maybeSingle();
        profile = res.data;
        profileErr = res.error;
      } catch {}
      if (profileErr) {
        const baseCols = ['slug', ...(db.isOpen ? ['is_open'] : []), ...(db.planColumn ? [db.planColumn] : []), ...(db.trialEnds ? ['trial_ends_at'] : [])].join(', ');
        try {
          const res = await supabase.from('profiles').select(baseCols).eq('id', user.id).maybeSingle();
          profile = res.data;
        } catch {}
      }

      if (profile?.slug) {
        setStoreUrl(`${profile.slug}.hyuk.app`);
      }
      setIsStoreOpen(profile?.is_open !== false);
      setTrialEndsAt(profile?.trial_ends_at || null);
      setSubscriptionStatus(String(profile?.subscription_status || 'inactive').toLowerCase());
      setHasStripeCustomer(Boolean(profile?.stripe_customer_id));
      // Normalizar SIEMPRE a minúscula: la BD tuvo valores legacy como "Pro"
      // (capitalizado) que no coinciden con las claves de PLAN_LIMITS/PLAN_NAME
      // y hacían que la UI tratara una cuenta Pro como Free.
      setPlanType(
        String(
          (db.planColumn && profile?.[db.planColumn]) ||
          profile?.plan_type ||
          profile?.plan ||
          'free'
        ).toLowerCase()
      );

      // Stats vía /api/store-data (service_role server-side) — evita las
      // políticas RLS rotas (request.store_slug) del rol autenticado.
      const statsResponse = await fetch('/api/store-data?type=stats', { cache: 'no-store' });
      if (!statsResponse.ok) throw new Error('stats_request_failed');
      const statsRes = await statsResponse.json();
      if (statsRes?.error) throw new Error('stats_request_failed');
      const s = statsRes.data || {};

      setStats({
        // KPIs reales: visitas y clics WhatsApp vienen de analytics_events
        // (endpoint /api/store-data?type=stats). "Pedidos" ya no se usa como
        // visitas; pendingOrders/orders conservan su significado propio.
        visits: s.pageViews || 0,
        whatsappClicks: s.whatsappClicks || 0,
        activeProducts: s.products || 0,
        categories: s.categories || 0,
        pendingOrders: s.pendingOrders || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setError('No pudimos cargar los datos del panel. Revisa tu conexión e inténtalo de nuevo.');
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

  const toggleStoreOpen = async () => {
    setTogglingOpen(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const next = !isStoreOpen;
      const { error } = await supabase
        .from('profiles')
        .update({ is_open: next })
        .eq('id', user.id);
      if (error) throw error;
      setIsStoreOpen(next);
    } catch (e) {
      console.error('Error actualizando estado de la tienda:', e);
      alert('No se pudo actualizar el estado de la tienda. Intenta de nuevo.');
    } finally {
      setTogglingOpen(false);
    }
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
      <div className="min-h-screen bg-background px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-44 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="px-4 py-6 md:px-8 md:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Header */}
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Resumen</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-text md:text-3xl">Tu operación, en un vistazo</h1>
              <p className="mt-1 text-sm text-text/60">Gestiona tu tienda y revisa lo importante del día.</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between" role="alert">
              <p>{error}</p>
              <button
                type="button"
                onClick={loadDashboardData}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-red-600 px-4 font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/40"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Store Status Banner */}
          {storeUrl && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-card backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-secondary/10 shadow-sm"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text mb-1">
                      Tienda Activa
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-text/60">
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
              className="mb-8 rounded-2xl border border-dashed border-secondary/20 bg-card p-6 md:p-8 text-center"
            >
              <div className="text-5xl mb-4">👋</div>
              <h2 className="text-xl font-bold text-text mb-2">¡Bienvenido a tu panel!</h2>
              <p className="text-sm text-text/60 mb-6 max-w-md mx-auto">
                Todavía no hay productos ni pedidos. Seguí estos pasos para poner tu catálogo
                en línea y empezar a recibir pedidos por WhatsApp.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left mb-6">
                <div className="rounded-xl bg-secondary/10 p-4">
                  <span className="text-2xl">1️⃣</span>
                  <h3 className="font-semibold text-text mt-2 text-sm">Crea productos</h3>
                  <p className="text-xs text-text/60 mt-1">Agrega foto, precio y descripción.</p>
                </div>
                <div className="rounded-xl bg-secondary/10 p-4">
                  <span className="text-2xl">2️⃣</span>
                  <h3 className="font-semibold text-text mt-2 text-sm">Personaliza</h3>
                  <p className="text-xs text-text/60 mt-1">Colores, logo y banner (con o sin IA).</p>
                </div>
                <div className="rounded-xl bg-secondary/10 p-4">
                  <span className="text-2xl">3️⃣</span>
                  <h3 className="font-semibold text-text mt-2 text-sm">Comparte</h3>
                  <p className="text-xs text-text/60 mt-1">Envía tu enlace y recibe pedidos.</p>
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary/15 text-text text-sm font-semibold hover:bg-secondary/20 transition-colors"
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
                  className="bg-card backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-secondary/10 shadow-sm hover:border-primary/40 transition-all"
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
                  <p className="text-2xl md:text-3xl font-bold text-text mb-1">
                    {kpi.value}
                  </p>
                  <p className="text-xs md:text-sm text-text/60">
                    {kpi.label}
                  </p>
                </motion.div>
              );
                        })}
          </div>

          <PlanUpgradeCard plan={planType} trialEndsAt={trialEndsAt} subscriptionStatus={subscriptionStatus} hasStripeCustomer={hasStripeCustomer} />

          {/* Control Rápido: Estado de la tienda + QR */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card backdrop-blur-xl rounded-2xl p-6 border border-secondary/10 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-text mb-1">Estado de la tienda</h3>
                  <p className="text-sm text-text/60 mb-3">
                    {isStoreOpen ? 'Abierta: los clientes pueden hacer pedidos' : 'Cerrada: se bloquea el checkout'}
                  </p>
                </div>
                <button
                  onClick={toggleStoreOpen}
                  disabled={togglingOpen}
                  className={`relative w-14 h-8 rounded-full transition-colors shrink-0 disabled:opacity-50 ${isStoreOpen ? 'bg-emerald-500' : 'bg-secondary/30'}`}
                  title={isStoreOpen ? 'Cerrar tienda' : 'Abrir tienda'}
                  aria-label="Alternar estado de la tienda"
                >
                  <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${isStoreOpen ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${isStoreOpen ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {isStoreOpen ? '● Tienda abierta' : '● Tienda cerrada'}
              </span>
            </div>

            <a
              href="/admin/qr-generator"
              className="group bg-card backdrop-blur-xl rounded-2xl p-6 border border-secondary/10 shadow-sm hover:border-primary/40 transition-all flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold text-text mb-1">Código QR de tu tienda</h3>
                <p className="text-sm text-text/60 mb-3">Descárgalo en PNG para imprimir en tu local</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400">Generar QR →</span>
              </div>
              <QrCode className="w-10 h-10 text-text/50 group-hover:text-emerald-400 transition-colors" />
            </a>
          </div>

          {/* Quick Actions - Mobile First */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.a
              href="/admin/customize"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="group bg-card backdrop-blur-xl rounded-2xl p-6 border border-secondary/10 shadow-sm hover:border-primary/40 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Palette className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text mb-1">
                    Personalizar Catálogo
                  </h3>
                  <p className="text-sm text-text/60 mb-3">
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
              className="group bg-card backdrop-blur-xl rounded-2xl p-6 border border-secondary/10 shadow-sm hover:border-primary/40 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text mb-1">
                    Gestionar Productos
                  </h3>
                  <p className="text-sm text-text/60 mb-3">
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
