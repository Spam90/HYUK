'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Clock, CheckCircle, XCircle, ChefHat, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const router = useRouter();

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
    }
  }, [supabase, filter]);

  const loadOrders = async () => {
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const statusFilter = filter === 'all' ? null : filter;
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const filteredOrders = statusFilter 
        ? ordersData.filter(order => order.status === statusFilter)
        : ordersData;

      setOrders(filteredOrders || []);
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5" />;
      case 'preparing': return <ChefHat className="w-5 h-5" />;
      case 'completed': return <CheckCircle className="w-5 h-5" />;
      case 'cancelled': return <XCircle className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
    { value: 'all', label: 'Todos', icon: Package },
    { value: 'pending', label: 'Pendientes', icon: Clock },
    { value: 'preparing', label: 'En Preparación', icon: ChefHat },
    { value: 'completed', label: 'Completados', icon: CheckCircle },
    { value: 'cancelled', label: 'Cancelados', icon: XCircle },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Gestión de Pedidos</h1>
          <p className="text-text/60">Administra y da seguimiento a los pedidos de tu tienda</p>
        </div>

        {/* Filtros */}
        <div className="bg-card rounded-theme-xl p-2 border border-secondary/10 mb-6">
          <div className="flex flex-wrap gap-2">
            {filters.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-theme-lg font-medium transition-all
                  ${filter === value
                    ? 'bg-primary text-white shadow-lg'
                    : 'bg-transparent text-text/60 hover:bg-secondary/10'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de pedidos */}
        {orders.length === 0 ? (
          <div className="bg-card rounded-theme-xl p-12 border border-secondary/10 text-center">
            <Package className="w-16 h-16 text-text/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-text mb-2">No hay pedidos</h3>
            <p className="text-text/60">
              {filter === 'all' 
                ? 'Los pedidos aparecerán aquí cuando los clientes realicen compras'
                : `No hay pedidos con estado "${filters.find(f => f.value === filter)?.label}"`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => (
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
                        {order.status === 'pending' && 'Pendiente'}
                        {order.status === 'preparing' && 'En Preparación'}
                        {order.status === 'completed' && 'Completado'}
                        {order.status === 'cancelled' && 'Cancelado'}
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
                          <p className="font-medium text-text">{order.customer_phone}</p>
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
                    {order.status === 'pending' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                        className="w-full px-4 py-2 bg-blue-500 text-white rounded-theme-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <ChefHat className="w-4 h-4" />
                        Iniciar Preparación
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                        className="w-full px-4 py-2 bg-green-500 text-white rounded-theme-lg hover:bg-green-600 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Marcar Completado
                      </button>
                    )}
                    {(order.status === 'pending' || order.status === 'preparing') && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        className="w-full px-4 py-2 bg-red-500 text-white rounded-theme-lg hover:bg-red-600 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancelar Pedido
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}