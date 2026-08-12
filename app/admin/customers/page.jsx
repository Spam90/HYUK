'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, MessageCircle, Phone, MapPin, X,
  ShoppingBag, CalendarDays, DollarSign, RefreshCw, Clock
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const router = useRouter();

  const [supabase, setSupabase] = useState(null);

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      setSupabase(createClient());
    });
  }, []);

  useEffect(() => {
    if (supabase) {
      loadCustomers();
    }
  }, [supabase]);

  const loadCustomers = async () => {
    if (!supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('store_id', user.id)
        .order('last_order_date', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      alert('Error al cargar clientes. Verifica que el schema SQL (tabla customers) esté ejecutado.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  });

  const openCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setOrdersLoading(true);
    setCustomerOrders([]);
    try {
      const { getCustomerOrders } = await import('@/lib/customers');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const result = await getCustomerOrders(user.id, customer.id);
      if (result.success) {
        setCustomerOrders(result.orders);
      }
    } catch (error) {
      console.error('Error loading customer orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const openWhatsApp = (phone) => {
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    if (!cleanPhone) return;
    const message = '¡Hola! 🎉 Queremos ofrecerte una promoción especial en nuestra tienda. ¿Te interesa?';
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-DO', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency', currency: 'DOP', minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(value || 0);
  };

  const formatOrderDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-DO', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-theme-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text">Directorio de Clientes</h1>
              <p className="text-text/60">
                {customers.length} {customers.length === 1 ? 'cliente registrado' : 'clientes registrados'} automáticamente
              </p>
            </div>
          </div>
          <button
            onClick={loadCustomers}
            className="flex items-center gap-2 px-4 py-2 bg-card text-text rounded-theme-lg border border-secondary/10 font-medium hover:bg-secondary/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refrescar
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text/30" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full pl-12 pr-4 py-3 rounded-theme-xl bg-card border border-secondary/10 text-text placeholder:text-text/30 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
{/* Tabla de clientes */}
        {filteredCustomers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-theme-xl p-12 border-2 border-dashed border-secondary/20 text-center"
          >
            <Users className="w-16 h-16 text-secondary/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-text mb-2">
              {searchTerm ? 'Sin resultados' : 'Aún no tienes clientes'}
            </h3>
            <p className="text-text/60 max-w-md mx-auto">
              Los clientes se registran automáticamente cuando realizan pedidos en tu catálogo.
            </p>
          </motion.div>
        ) : (
          <div className="bg-card rounded-theme-xl border border-secondary/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-secondary/10 text-xs text-text/50 uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Cliente</th>
                    <th className="px-6 py-4 font-semibold hidden md:table-cell">Contacto</th>
                    <th className="px-6 py-4 font-semibold text-center">Pedidos</th>
                    <th className="px-6 py-4 font-semibold text-right">Total Gastado</th>
                    <th className="px-6 py-4 font-semibold hidden sm:table-cell">Último Pedido</th>
                    <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer, index) => (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-secondary/5 hover:bg-secondary/5 transition-colors cursor-pointer"
                      onClick={() => openCustomer(customer)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary font-bold text-sm">
                              {customer.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-text truncate">{customer.name}</p>
                            <p className="text-xs text-text/50 md:hidden">
                              {customer.phone || customer.address || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="space-y-1">
                          {customer.phone && (
                            <p className="text-sm text-text flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-text/40" />
                              {customer.phone}
                            </p>
                          )}
                          {customer.address && (
                            <p className="text-xs text-text/50 flex items-center gap-1.5 max-w-[180px] truncate">
                              <MapPin className="w-3.5 h-3.5 text-text/40 shrink-0" />
                              {customer.address}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/5 text-text font-semibold text-sm">
                          <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                          {customer.total_orders || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-primary">
                        {formatMoney(customer.total_spent)}
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell text-sm text-text/60">
                        {formatDate(customer.last_order_date)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openWhatsApp(customer.phone);
                          }}
                          disabled={!customer.phone}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-theme-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Escribir por WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
{/* Estadísticas rápidas */}
        {customers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-card rounded-theme-xl p-5 border border-secondary/10">
              <p className="text-sm text-text/50 mb-1">Ingresos acumulados</p>
              <p className="text-2xl font-bold text-text">
                {formatMoney(customers.reduce((s, c) => s + (parseFloat(c.total_spent) || 0), 0))}
              </p>
            </div>
            <div className="bg-card rounded-theme-xl p-5 border border-secondary/10">
              <p className="text-sm text-text/50 mb-1">Total pedidos</p>
              <p className="text-2xl font-bold text-text">
                {customers.reduce((s, c) => s + (c.total_orders || 0), 0)}
              </p>
            </div>
            <div className="bg-card rounded-theme-xl p-5 border border-secondary/10">
              <p className="text-sm text-text/50 mb-1">Gasto promedio / cliente</p>
              <p className="text-2xl font-bold text-text">
                {formatMoney(customers.reduce((s, c) => s + (parseFloat(c.total_spent) || 0), 0) / customers.length)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ===== MODAL DETALLE CLIENTE ===== */}
      <AnimatePresence>
        {selectedCustomer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedCustomer(null)}
            />
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-secondary/10 flex items-center justify-between bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-lg">
                      {selectedCustomer.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-text text-lg">{selectedCustomer.name}</h3>
                    <p className="text-xs text-text/50">Cliente desde {formatDate(selectedCustomer.created_at)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 rounded-full hover:bg-secondary/10 transition-colors"
                >
                  <X className="w-5 h-5 text-text/60" />
                </button>
              </div>

              {/* Datos de contacto */}
              <div className="px-6 py-4 space-y-2 border-b border-secondary/10">
                {selectedCustomer.phone && (
                  <p className="text-sm text-text flex items-center gap-2">
                    <Phone className="w-4 h-4 text-text/40" /> {selectedCustomer.phone}
                  </p>
                )}
                {selectedCustomer.address && (
                  <p className="text-sm text-text flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-text/40" /> {selectedCustomer.address}
                  </p>
                )}
                {selectedCustomer.phone && (
                  <button
                    onClick={() => openWhatsApp(selectedCustomer.phone)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-theme-lg font-semibold hover:bg-green-600 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Escribir por WhatsApp
                  </button>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 px-6 py-4 border-b border-secondary/10">
                <div className="bg-secondary/5 rounded-theme-lg p-4">
                  <p className="text-xs text-text/50 flex items-center gap-1 mb-1">
                    <ShoppingBag className="w-3 h-3" /> Pedidos
                  </p>
                  <p className="text-xl font-bold text-text">{selectedCustomer.total_orders || 0}</p>
                </div>
                <div className="bg-secondary/5 rounded-theme-lg p-4">
                  <p className="text-xs text-text/50 flex items-center gap-1 mb-1">
                    <DollarSign className="w-3 h-3" /> Total gastado
                  </p>
                  <p className="text-xl font-bold text-primary">{formatMoney(selectedCustomer.total_spent)}</p>
                </div>
              </div>

              {/* Historial de pedidos */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <h4 className="font-bold text-text mb-4 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-text/40" />
                  Historial de Compras
                </h4>
                {ordersLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : customerOrders.length === 0 ? (
                  <div className="text-center py-10 text-text/40">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sin pedidos registrados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerOrders.map((order) => (
                      <div key={order.id} className="bg-secondary/5 rounded-theme-lg p-4 border border-secondary/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono text-text/50">
                            #{String(order.id).slice(0, 8)}
                          </span>
                          <span className="text-xs text-text/40 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatOrderDate(order.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-sm text-text">
                            <ShoppingBag className="w-3.5 h-3.5 text-text/40" />
                            {Array.isArray(order.items) ? order.items.length : 0} productos
                            {order.coupon_code && (
                              <span className="ml-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                                {order.coupon_code}
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-primary">
                            {formatMoney(order.total_amount)}
                          </span>
                        </div>
                        <p className="text-xs text-text/50 mt-1 truncate">
                          {order.status === 'pending' ? 'Pendiente' :
                           order.status === 'preparing' ? 'En preparación' :
                           order.status === 'ready' ? 'Listo' :
                           order.status === 'completed' ? 'Completado' : 'Cancelado'}
                          {order.delivery_method ? ` · ${order.delivery_method}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}