'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Clock, CheckCircle, XCircle, ChefHat, Eye, 
  Truck, MessageCircle, User, MapPin, CreditCard,
  ArrowRight, RefreshCw, Printer, Volume2, VolumeX, BellRing
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { openPrintTicket } from '@/lib/print/thermal-ticket';

export const dynamic = 'force-dynamic';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [storeProfile, setStoreProfile] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderToast, setNewOrderToast] = useState(null);
  const router = useRouter();

  // Referencias para detección de pedidos nuevos
  const knownOrderIdsRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);
  const titleTimeoutRef = useRef(null);

  // Lazy load Supabase client
  const [supabase, setSupabase] = useState(null);

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      setSupabase(createClient());
    });
  }, []);

  useEffect(() => {
    if (supabase) {
      loadOrders();
      // Polling cada 12s para detectar nuevos pedidos
      const interval = setInterval(loadOrders, 12000);
      return () => clearInterval(interval);
    }
  }, [supabase]);

  // Reproducir sonido de nuevo pedido (Web Audio API - sin assets)
  const playNewOrderSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextCtor();
      const playNote = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration + 0.05);
      };
      // Melodía distintiva: ding-ding-ding!
      playNote(988, 0, 0.25);    // B5
      playNote(1319, 0.2, 0.25); // E6
      playNote(1568, 0.4, 0.4);  // G6
      setTimeout(() => ctx.close(), 1500);
    } catch (error) {
      console.warn('No se pudo reproducir el sonido:', error);
    }
  };

  // Parpadeo del título de la pestaña
  const flashTitle = () => {
    const original = document.title;
    let flashCount = 0;
    if (titleTimeoutRef.current) clearInterval(titleTimeoutRef.current);
    titleTimeoutRef.current = setInterval(() => {
      document.title = flashCount % 2 === 0 ? '🔔 ¡Nuevo pedido!' : original;
      flashCount++;
      if (flashCount > 6) {
        clearInterval(titleTimeoutRef.current);
        document.title = original;
      }
    }, 800);
  };

  const loadOrders = async () => {
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Cargar perfil de tienda para tickets
      if (!storeProfile) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('business_name, store_name, full_name, phone_whatsapp, phone')
          .eq('id', user.id)
          .maybeSingle();
        if (profile) setStoreProfile(profile);
      }

      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const incoming = ordersData || [];

      // Detectar pedidos nuevos en estado pendiente
      if (!isInitialLoadRef.current && knownOrderIdsRef.current.size > 0) {
        const newPending = incoming.filter(o =>
          o.status === 'pending' && !knownOrderIdsRef.current.has(o.id)
        );
        if (newPending.length > 0) {
          setNewOrderToast(newPending[0]);
          if (soundEnabled) playNewOrderSound();
          flashTitle();
          setTimeout(() => setNewOrderToast(null), 10000);
        }
      }

      // Actualizar set de IDs conocidos
      incoming.forEach(o => knownOrderIdsRef.current.add(o.id));
      isInitialLoadRef.current = false;

      setOrders(incoming);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Recargar pedidos
      loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Error al actualizar el pedido');
    }
  };

  const openWhatsApp = (phone, orderId) => {
    const message = `Hola, quería consultar sobre el pedido #${orderId.slice(0, 8)}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5" />;
      case 'preparing': return <ChefHat className="w-5 h-5" />;
      case 'ready': return <Truck className="w-5 h-5" />;
      case 'completed': return <CheckCircle className="w-5 h-5" />;
      case 'cancelled': return <XCircle className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'preparing': return 'En Preparación';
      case 'ready': return 'Listo / En Camino';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case 'pending': return 'preparing';
      case 'preparing': return 'ready';
      case 'ready': return 'completed';
      default: return null;
    }
  };

  const getNextStatusLabel = (currentStatus) => {
    switch (currentStatus) {
      case 'pending': return 'Iniciar Preparación';
      case 'preparing': return 'Marcar Listo';
      case 'ready': return 'Marcar Completado';
      default: return null;
    }
  };

  const getNextStatusIcon = (currentStatus) => {
    switch (currentStatus) {
      case 'pending': return <ChefHat className="w-4 h-4" />;
      case 'preparing': return <Truck className="w-4 h-4" />;
      case 'ready': return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const filters = [
    { value: 'all', label: 'Todos', icon: Package, color: 'gray' },
    { value: 'pending', label: 'Pendientes', icon: Clock, color: 'yellow' },
    { value: 'preparing', label: 'En Preparación', icon: ChefHat, color: 'blue' },
    { value: 'ready', label: 'Listos', icon: Truck, color: 'purple' },
    { value: 'completed', label: 'Completados', icon: CheckCircle, color: 'green' },
    { value: 'cancelled', label: 'Cancelados', icon: XCircle, color: 'red' },
  ];

  const getOrdersByStatus = (status) => {
    if (status === 'all') return orders;
    return orders.filter(order => order.status === status);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Toast de nuevo pedido */}
      <AnimatePresence>
        {newOrderToast && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
          >
            <div className="bg-emerald-500 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 animate-pulse">
                <BellRing className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">🔔 ¡Nuevo pedido!</p>
                <p className="text-xs text-emerald-50 truncate">
                  #{newOrderToast.id.slice(0, 8)} · {newOrderToast.customer_name} · $
                  {parseFloat(newOrderToast.total_amount).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => setNewOrderToast(null)}
                className="text-white/70 hover:text-white text-xs font-semibold shrink-0"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Gestión de Pedidos</h1>
            <p className="text-text/60">Administra y da seguimiento a los pedidos de tu tienda</p>
          </div>
          
          {/* Acciones: sonido + vista */}
          <div className="flex items-center gap-2">
            {/* Toggle de sonido */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Desactivar sonido de nuevos pedidos' : 'Activar sonido de nuevos pedidos'}
              className={`w-11 h-11 rounded-theme-lg border flex items-center justify-center transition-colors ${
                soundEnabled
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-card text-text/40 border-secondary/10 hover:text-text'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-card rounded-theme-lg p-1 border border-secondary/10">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-4 py-2 rounded-theme-md font-medium transition-all ${
                  viewMode === 'kanban'
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-text/60 hover:text-text'
                }`}
              >
                <Package className="w-4 h-4 inline mr-2" />
                Kanban
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-theme-md font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-text/60 hover:text-text'
                }`}
              >
                <Eye className="w-4 h-4 inline mr-2" />
                Lista
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'kanban' ? (
          /* KANBAN BOARD */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filters.slice(1).map(({ value, label, icon: Icon, color }) => {
              const statusOrders = getOrdersByStatus(value);
              return (
                <div key={value} className="flex flex-col">
                  {/* Column Header */}
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-t-xl bg-${color}-50 dark:bg-${color}-900/20 border-b-2 border-${color}-200`}>
                    <Icon className={`w-5 h-5 text-${color}-600`} />
                    <h3 className="font-bold text-${color}-900 dark:text-${color}-100">
                      {label}
                    </h3>
                    <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-${color}-200 dark:bg-${color}-800 text-${color}-900 dark:text-${color}-100`}>
                      {statusOrders.length}
                    </span>
                  </div>

                  {/* Orders in this status */}
                  <div className="flex-1 bg-gray-50 dark:bg-zinc-900/50 rounded-b-xl p-3 space-y-3 min-h-[500px]">
                    <AnimatePresence mode="popLayout">
                      {statusOrders.map((order, index) => (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-zinc-700 hover:shadow-md transition-all cursor-pointer"
                          onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                        >
                          {/* Order Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-bold text-text text-sm">
                                #{order.id.slice(0, 8)}
                              </h4>
                              <p className="text-xs text-text/60 mt-0.5">
                                {formatDate(order.created_at)}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${getStatusColor(order.status)}`}>
                              {getStatusLabel(order.status)}
                            </span>
                          </div>

                          {/* Customer Info */}
                          <div className="space-y-1.5 mb-3">
                            <p className="text-sm font-medium text-text flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-text/40" />
                              {order.customer_name}
                            </p>
                            {order.customer_phone && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openWhatsApp(order.customer_phone, order.id);
                                }}
                                className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                {order.customer_phone}
                              </button>
                            )}
                            {order.delivery_address && (
                              <p className="text-xs text-text/60 flex items-start gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-text/40 mt-0.5 shrink-0" />
                                {order.delivery_address}
                              </p>
                            )}
                          </div>

                          {/* Total */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-700">
                            <span className="text-xs text-text/60">Total</span>
                            <span className="text-lg font-bold text-primary">
                              ${parseFloat(order.total_amount).toFixed(2)}
                            </span>
                          </div>

                          {/* Imprimir Ticket Térmico */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openPrintTicket(order, storeProfile);
                            }}
                            className="w-full mt-3 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Imprimir Ticket
                          </button>

                          {/* Quick Actions */}
                          {getNextStatus(order.status) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateOrderStatus(order.id, getNextStatus(order.status));
                              }}
                              className={`w-full mt-3 px-3 py-2 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity ${
                                order.status === 'pending' ? 'bg-blue-500' :
                                order.status === 'preparing' ? 'bg-purple-500' :
                                'bg-green-500'
                              }`}
                            >
                              {getNextStatusIcon(order.status)}
                              {getNextStatusLabel(order.status)}
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {(order.status === 'pending' || order.status === 'preparing') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('¿Estás seguro de cancelar este pedido?')) {
                                  updateOrderStatus(order.id, 'cancelled');
                                }
                              }}
                              className="w-full mt-2 px-3 py-2 rounded-lg bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-red-600 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Cancelar
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {statusOrders.length === 0 && (
                      <div className="text-center py-12 text-text/40">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Sin pedidos</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-card rounded-theme-xl p-12 border border-secondary/10 text-center">
                <Package className="w-16 h-16 text-text/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-text mb-2">No hay pedidos</h3>
                <p className="text-text/60">
                  Los pedidos aparecerán aquí cuando los clientes realicen compras
                </p>
              </div>
            ) : (
              orders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-theme-xl p-6 border border-secondary/10 hover:border-primary/20 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Información del pedido */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-bold text-text text-lg">
                          Pedido #{order.id.slice(0, 8)}
                        </h3>
                        <span className={`
                          px-3 py-1 rounded-full text-xs font-medium border
                          flex items-center gap-1
                          ${getStatusColor(order.status)}
                        `}>
                          {getStatusIcon(order.status)}
                          {getStatusLabel(order.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-text/50">Cliente:</span>
                          <p className="font-medium text-text">{order.customer_name}</p>
                        </div>
                        {order.customer_phone && (
                          <div>
                            <span className="text-text/50">Teléfono:</span>
                            <button
                              onClick={() => openWhatsApp(order.customer_phone, order.id)}
                              className="font-medium text-green-600 hover:text-green-700 flex items-center gap-1"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              {order.customer_phone}
                            </button>
                          </div>
                        )}
                        {order.delivery_address && (
                          <div>
                            <span className="text-text/50">Dirección:</span>
                            <p className="font-medium text-text">{order.delivery_address}</p>
                          </div>
                        )}
                        {order.delivery_method && (
                          <div>
                            <span className="text-text/50">Entrega:</span>
                            <p className="font-medium text-text">{order.delivery_method}</p>
                          </div>
                        )}
                        {order.payment_method && (
                          <div>
                            <span className="text-text/50">Pago:</span>
                            <p className="font-medium text-text">{order.payment_method}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-text/50">Total:</span>
                          <p className="font-bold text-primary text-lg">
                            ${parseFloat(order.total_amount).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <span className="text-text/50">Fecha:</span>
                          <p className="font-medium text-text">{formatDate(order.created_at)}</p>
                        </div>
                      </div>

                      {order.notes && (
                        <div className="mt-3 p-3 bg-secondary/5 rounded-theme-lg">
                          <span className="text-text/50 text-sm">Notas:</span>
                          <p className="text-sm text-text mt-1">{order.notes}</p>
                        </div>
                      )}

                      {/* Items del pedido */}
                      <div className="mt-4">
                        <button
                          onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                          className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          {selectedOrder?.id === order.id ? 'Ocultar' : 'Ver'} detalles del pedido
                        </button>

                        {selectedOrder?.id === order.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-3 p-4 bg-secondary/5 rounded-theme-lg"
                          >
                            <h4 className="font-bold text-text mb-3">Productos:</h4>
                            <div className="space-y-2">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start text-sm">
                                  <div className="flex-1">
                                    <p className="font-medium text-text">{item.name}</p>
                                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                                      <p className="text-text/60 text-xs">
                                        {item.selectedOptions.map(opt => opt.label).join(', ')}
                                      </p>
                                    )}
                                    <p className="text-text/50 text-xs">
                                      Cantidad: {item.quantity} × ${item.price.toFixed(2)}
                                    </p>
                                  </div>
                                  <p className="font-bold text-text">
                                    ${(item.price * item.quantity).toFixed(2)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col gap-2 lg:min-w-[200px]">
                      {/* Imprimir Ticket Térmico */}
                      <button
                        onClick={() => openPrintTicket(order, storeProfile)}
                        className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-theme-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Imprimir Ticket
                      </button>
                      {getNextStatus(order.status) && (
                        <button
                          onClick={() => updateOrderStatus(order.id, getNextStatus(order.status))}
                          className={`w-full px-4 py-2 text-white rounded-theme-lg hover:opacity-90 transition-opacity font-medium flex items-center justify-center gap-2 ${
                            order.status === 'pending' ? 'bg-blue-500' :
                            order.status === 'preparing' ? 'bg-purple-500' :
                            'bg-green-500'
                          }`}
                        >
                          {getNextStatusIcon(order.status)}
                          {getNextStatusLabel(order.status)}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                      {(order.status === 'pending' || order.status === 'preparing') && (
                        <button
                          onClick={() => {
                            if (confirm('¿Estás seguro de cancelar este pedido?')) {
                              updateOrderStatus(order.id, 'cancelled');
                            }
                          }}
                          className="w-full px-4 py-2 bg-red-500 text-white rounded-theme-lg hover:bg-red-600 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancelar Pedido
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
