// Utilidades para gestión de pedidos

import { createClient } from '@/lib/supabase/client';

/**
 * Crea un nuevo pedido de forma TRANSACCIONAL vía RPC `create_order_with_items`
 * (migración 17). El navegador solo envía IDs y cantidades/selecciones; el
 * servidor (trigger orders_price_integrity + _sync_order_items) recalcula
 * precios, descuento, delivery y total desde la BD y persiste snapshots en
 * order_items. No hay confianza en precios/names/totales del cliente.
 * @param {Object} orderData
 *  - storeId (requerido), customerName/Phone, delivery*, paymentMethod
 *  - items: [{id, quantity, selectedOptions?, skuId|sku?}]
 *  - notes, couponCode, payment_provider, currency
 */
export async function createOrder(orderData) {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();

    const storeId = orderData.storeId;
    if (!storeId) {
      throw new Error('storeId no proporcionado');
    }

    // Sólo identificadores + cantidades + selecciones. Cualquier campo de
    // precio/nombre/total del carrito se descarta aquí (autoridad: la BD).
    const items = (orderData.items || [])
      .map((it) => ({
        id: it?.id || it?.product_id || it?.product?.id || null,
        quantity: it?.quantity,
        skuId: it?.skuId || it?.sku_id || null,
        sku: it?.sku || it?.sku_code || null,
        selectedOptions: it?.selectedOptions || it?.options || [],
      }))
      .filter((i) => i.id);

    const { data, error } = await supabase.rpc('create_order_with_items', {
      p_store_id: storeId,
      p_items: items,
      p_customer_name: orderData.customerName || null,
      p_customer_phone: orderData.customerPhone || null,
      p_delivery_address: orderData.deliveryAddress || null,
      p_delivery_method: orderData.deliveryMethod || null,
      p_delivery_zone: orderData.deliveryZone || null,
      p_payment_method: orderData.paymentMethod || null,
      p_payment_provider: orderData.payment_provider || 'supabase',
      p_currency: orderData.currency || 'DOP',
      p_notes: orderData.notes || null,
      p_coupon_code: orderData.couponCode || null,
    });

    if (error) throw orderRpcError(error, 'Error creando el pedido');
    if (!data?.ok || !data?.order) {
      throw orderRpcError({ code: data?.error, message: data?.error }, 'Error creando el pedido');
    }

    const order = data.order;

    // Registrar/actualizar cliente (dato derivado; no bloquea el pedido).
    if (orderData.customerName) {
      try {
        const { upsertCustomer } = await import('@/lib/customers');
        await upsertCustomer({
          storeId,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          deliveryAddress: orderData.deliveryAddress,
          orderTotal: Number(order.total_amount) || Number(orderData.total) || 0,
        });
      } catch (customerError) {
        console.warn('Cliente no registrado (no crítico):', customerError);
      }
    }

    return { success: true, order };
  } catch (error) {
    console.error('Error creating order:', error);
    // PROMPT 13: mensaje seguro para la UI; el detalle técnico queda en el log.
    return {
      success: false,
      error: translateOrderError(error?.code || error?.message),
      code: error?.code || null,
      status: error?.status || null,
    };
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
    // PROMPT 13: mensaje seguro; detalle técnico solo en logs server-side.
    return { success: false, error: 'No se pudieron cargar los pedidos.', orders: [] };
  }
}

/**
 * Actualiza el estado de un pedido DELEGANDO en la RPC transaccional
 * `set_order_status` (migración 17). La RPC valida ownership + máquina de
 * estados y sincroniza inventario y order_items en la MISMA transacción.
 * Si el inventario falla, el cambio de estado se revierte (nunca queda un
 * pedido "paid" sin stock descontado). Ya no se hace UPDATE directo.
 */
export async function updateOrderStatus(orderId, newStatus) {
  try {
    const supabase = createClient();

    // Obtener usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Debes estar autenticado');
    }

    const { data, error } = await supabase.rpc('set_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus,
    });

    if (error) throw orderRpcError(error, 'Error actualizando el pedido');
    if (!data?.ok) {
      throw orderRpcError(
        { code: data?.error, message: data?.error, status: data?.status },
        'Error actualizando el pedido'
      );
    }

    return { success: true, order: data.order };
  } catch (error) {
    console.error('Error updating order status:', error);
    // PROMPT 13: los errores de RPC ya llegan traducidos vía orderRpcError;
    // cualquier otro error interno se muestra genérico.
    return {
      success: false,
      error: error?.message || 'No se pudo actualizar el pedido.',
      code: error?.code || null,
      status: error?.status || null,
    };
  }
}

/**
 * Convierte el resultado de una RPC de pedidos en un Error con código/estado.
 * Los códigos se traducen a mensajes legibles para el usuario/UI.
 */
export function orderRpcError(err, fallback) {
  const message = translateOrderError(err?.code || err?.message);
  const e = new Error(message || fallback || 'Error en la operación de pedido');
  e.code = err?.code || null;
  e.status = err?.status || (err?.code ? 400 : null);
  return e;
}

/** Traduce códigos de negocio de pedidos a mensajes seguros para UI. */
export function translateOrderError(code) {
  const map = {
    order_not_found: 'El pedido no existe.',
    order_not_yours: 'No tienes permisos sobre este pedido.',
    invalid_status: 'Estado de pedido inválido.',
    invalid_order_transition: 'Transición de estado no permitida.',
    order_insufficient_stock: 'Stock insuficiente para realizar esta operación.',
    invalid_sku: 'El SKU seleccionado no es válido para este producto.',
    order_quantity_invalid: 'Cantidad inválida en el pedido.',
    order_product_invalid: 'El pedido incluye un producto no disponible.',
    order_option_invalid: 'Las opciones seleccionadas ya no están disponibles.',
    order_delivery_zone_invalid: 'La zona de entrega no es válida.',
    order_coupon_invalid: 'El cupón no es válido o ya no está disponible.',
    order_items_empty: 'El pedido no tiene productos.',
    internal_error: 'Error interno al procesar el pedido.',
  };
  return map[code || ''] || (code ? `Error al procesar el pedido (${code}).` : 'No se pudo procesar el pedido.');
}

/**
 * Obtiene un pedido por ID.
 * El parámetro storeId (opcional pero recomendado) añade una capa extra
 * anti-IDOR: se filtra por store_id incluso si RLS fallara.
 */
export async function getOrderById(orderId, storeId = null) {
  try {
    const supabase = createClient();

    let query = supabase
      .from('orders')
      .select('*')
      .eq('id', orderId);

    if (storeId) query = query.eq('store_id', storeId);

    const { data: order, error } = await query.single();

    if (error) throw error;

    return { success: true, order };
  } catch (error) {
    console.error('Error fetching order:', error);
    // PROMPT 13: mensaje seguro; el detalle (PGRST, código Postgres) queda en logs.
    return { success: false, error: 'No se pudo cargar el pedido.' };
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