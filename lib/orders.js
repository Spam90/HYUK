// Utilidades para gestión de pedidos

import { createClient } from '@/lib/supabase/client';

/**
 * Crea un nuevo pedido en la base de datos
 */
export async function createOrder(orderData) {
  try {
    const supabase = createClient();

    // Obtener usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Debes estar autenticado para crear un pedido');
    }

    // Obtener el store_id del perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Perfil de tienda no encontrado');
    }

    // Crear el pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        store_id: profile.id,
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        delivery_address: orderData.deliveryAddress,
        delivery_method: orderData.deliveryMethod,
        payment_method: orderData.paymentMethod,
        items: orderData.items,
        total_amount: orderData.total,
        notes: orderData.notes || '',
        status: 'pending',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    return { success: true, order };
  } catch (error) {
    console.error('Error creating order:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene todos los pedidos de una tienda
 */
export async function getOrders(storeId, statusFilter = null) {
  try {
    const supabase = createClient();

    let query = supabase
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    // Filtrar por estado si se proporciona
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    return { success: true, orders: orders || [] };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return { success: false, error: error.message, orders: [] };
  }
}

/**
 * Actualiza el estado de un pedido
 */
export async function updateOrderStatus(orderId, newStatus) {
  try {
    const supabase = createClient();

    // Obtener usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Debes estar autenticado');
    }

    // Actualizar el pedido
    const { data: order, error } = await supabase
      .from('orders')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('store_id', user.id) // Asegurar que el pedido pertenece al usuario
      .select()
      .single();

    if (error) throw error;

    return { success: true, order };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene un pedido por ID
 */
export async function getOrderById(orderId) {
  try {
    const supabase = createClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) throw error;

    return { success: true, order };
  } catch (error) {
    console.error('Error fetching order:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Formatea el estado del pedido para mostrar
 */
export function formatOrderStatus(status) {
  const statusMap = {
    pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
    preparing: { label: 'En preparación', color: 'bg-blue-100 text-blue-800', icon: '👨‍🍳' },
    completed: { label: 'Completado', color: 'bg-green-100 text-green-800', icon: '✅' },
    cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: '❌' },
  };

  return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: '📋' };
}

/**
 * Obtiene el siguiente estado disponible
 */
export function getNextStatus(currentStatus) {
  const statusFlow = {
    pending: 'preparing',
    preparing: 'completed',
  };

  return statusFlow[currentStatus] || null;
}