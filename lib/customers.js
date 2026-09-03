// =============================================
// HYUK - DIRECTORIO AUTOMÁTICO DE CLIENTES
// =============================================
// El upsert vive en la BD: función SECURITY DEFINER
// `upsert_customer_from_order` (migración 20240101000012).
// Antes se intentaba SELECT+INSERT con el cliente anónimo, pero la RLS
// bloquea el SELECT → nunca acumulaba y fallaba en silencio.
// La función:
//   - identifica al cliente por teléfono normalizado (solo dígitos) o, si
//     no hay teléfono, por (nombre, phone NULL) dentro de la misma tienda;
//   - acumula total_spent / total_orders de forma atómica (ON CONFLICT);
//   - nunca expone lecturas del directorio (solo devuelve el uuid);
//   - opera siempre dentro del store_id recibido (sin cross-tenant).
// Errores no bloquean el flujo del pedido.

const GENERIC_CUSTOMER_ERROR = 'No se pudo registrar el cliente.';

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

    const { data, error } = await supabase.rpc('upsert_customer_from_order', {
      p_store_id: storeId,
      p_name: String(customerName),
      p_phone: String(customerPhone || ''),
      p_address: String(deliveryAddress || ''),
      p_total: parseFloat(orderTotal) || 0,
    });

    // Migración 12 aún no aplicada / función ausente → no romper el pedido.
    if (error) {
      console.warn('[customers] upsert_customer_from_order:', error.message);
      return { success: false, error: GENERIC_CUSTOMER_ERROR };
    }

    return { success: true, customerId: data || null };
  } catch (error) {
    console.error('Error upserting customer:', error);
    // No bloquear el flujo de pedido si falla el registro del cliente
    return { success: false, error: GENERIC_CUSTOMER_ERROR };
  }
}

/**
 * Obtiene el historial de pedidos de un cliente en una tienda.
 * Pensado para contexto de dueño (RLS owner read) — no para el flujo público.
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
    // PROMPT 13: mensaje seguro para la UI del admin; detalle en logs.
    return { success: false, error: 'No se pudo cargar el historial del cliente.', orders: [] };
  }
}