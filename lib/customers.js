// =============================================
// HYUK - DIRECTORIO AUTOMÁTICO DE CLIENTES
// =============================================

/**
 * Crea o actualiza el perfil de un cliente en la base de datos.
 * Se invoca automáticamente cada vez que se registra un pedido.
 */
export async function upsertCustomer({
  storeId,
  customerName,
  customerPhone,
  deliveryAddress,
  orderTotal,
}) {
  if (!storeId || !customerName) return { success: false, error: 'Datos insuficientes' };

  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();

    const name = String(customerName).trim();
    const phone = String(customerPhone || '').replace(/\D/g, '') || null;
    const address = String(deliveryAddress || '').trim() || null;
    const amount = parseFloat(orderTotal) || 0;

    // Buscar cliente existente
    let query = supabase
      .from('customers')
      .select('*')
      .eq('store_id', storeId);

    if (phone) {
      query = query.eq('phone', phone);
    } else {
      query = query.eq('name', name).is('phone', null);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      // Actualizar acumulados
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name,
          phone: phone || existing.phone,
          address: address || existing.address,
          last_order_date: new Date().toISOString(),
          total_spent: (parseFloat(existing.total_spent) || 0) + amount,
          total_orders: (existing.total_orders || 0) + 1,
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;
      return { success: true, customerId: existing.id, updated: true };
    }

    // Crear nuevo cliente
    const { data: created, error: insertError } = await supabase
      .from('customers')
      .insert({
        store_id: storeId,
        name,
        phone,
        address,
        last_order_date: new Date().toISOString(),
        total_spent: amount,
        total_orders: 1,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return { success: true, customerId: created.id, updated: false };
  } catch (error) {
    console.error('Error upserting customer:', error);
    // No bloquear el flujo de pedido si falla el registro del cliente
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene el historial de pedidos de un cliente en una tienda.
 */
export async function getCustomerOrders(storeId, customerId) {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();

    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('store_id', storeId)
      .single();

    if (!customer) return { success: false, error: 'Cliente no encontrado', orders: [] };

    // Buscar pedidos por teléfono o nombre
    let query = supabase
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (customer.phone) {
      query = query.eq('customer_phone', customer.phone);
    } else {
      query = query.ilike('customer_name', `%${customer.name}%`);
    }

    const { data: orders, error } = await query;

    if (error) throw error;
    return { success: true, orders: orders || [] };
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return { success: false, error: error.message, orders: [] };
  }
}