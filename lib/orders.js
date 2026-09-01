// Utilidades para gestión de pedidos

import { createClient } from '@/lib/supabase/client';

/**
 * Crea un nuevo pedido en la base de datos y registra/actualiza al cliente.
 * @param {Object} orderData
 *  - storeId: ID del perfil de la tienda (requerido)
 *  - customerName, customerPhone, deliveryAddress, deliveryMethod, paymentMethod
 *  - items, total, notes, couponCode, discountAmount
 */
export async function createOrder(orderData) {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();

    const storeId = orderData.storeId;
    if (!storeId) {
      throw new Error('storeId no proporcionado');
    }

    // Crear el pedido (RLS pública permite inserción)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        store_id: storeId,
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone || null,
        delivery_address: orderData.deliveryAddress || null,
        delivery_method: orderData.deliveryMethod || null,
        delivery_zone: orderData.deliveryZone || null,
        delivery_fee: orderData.deliveryFee || 0,
        payment_method: orderData.paymentMethod || null,
        items: orderData.items,
        total_amount: orderData.total,
        notes: orderData.notes || '',
        coupon_code: orderData.couponCode || null,
        discount_amount: orderData.discountAmount || 0,
                status: 'pending',
        payment_status: orderData.payment_status || 'pending',
        payment_provider: orderData.payment_provider || 'supabase',
        currency: orderData.currency || 'DOP',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Registrar/actualizar cliente automáticamente (no bloquea el flujo)
    if (orderData.customerName) {
      try {
        const { upsertCustomer } = await import('@/lib/customers');
        await upsertCustomer({
          storeId,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          deliveryAddress: orderData.deliveryAddress,
          orderTotal: orderData.total,
        });
      } catch (customerError) {
        console.warn('Cliente no registrado (no crítico):', customerError);
      }
    }

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
 * Actualiza el estado de un pedido.
 * Además sincroniza el inventario (migración 15):
 *   - pasa a 'paid'      → decrement_order_stock (atómico e idempotente)
 *   - pasa a 'cancelled' → restore_order_stock (devuelve unidades, idempotente)
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

    // Sincronizar inventario según el nuevo estado (no bloquea el flujo).
    // Las funciones SECURITY DEFINER revalidan ownership (auth.uid = store).
    try {
      if (newStatus === 'paid') {
        const { data, error: rpcErr } = await supabase.rpc('decrement_order_stock', {
          p_order_id: orderId,
        });
        if (rpcErr) throw rpcErr;
        console.log('[inventario]', data?.status || 'ok');
      } else if (newStatus === 'cancelled') {
        const { data, error: rpcErr } = await supabase.rpc('restore_order_stock', {
          p_order_id: orderId,
        });
        if (rpcErr) throw rpcErr;
        console.log('[inventario]', data?.status || 'ok');
      }
    } catch (invErr) {
      // Stock insuficiente u otro fallo: se reporta pero no revierte el cambio
      // de estado (el dueño puede ajustar stock manualmente).
      console.warn('[inventario] No se pudo sincronizar el stock:', invErr?.message);
    }

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
    paid: { label: 'Pagado', color: 'bg-emerald-100 text-emerald-800', icon: '💳' },
    preparing: { label: 'En preparación', color: 'bg-blue-100 text-blue-800', icon: '👨‍🍳' },
    ready: { label: 'Listo para retirar', color: 'bg-purple-100 text-purple-800', icon: '🏪' },
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
    paid: 'preparing',
    preparing: 'completed',
  };

  return statusFlow[currentStatus] || null;
}