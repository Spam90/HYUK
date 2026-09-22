// Utilidades para gestión de pedidos
// El cliente Supabase se importa de forma perezosa (lazy) dentro de cada función
// (igual que ya hace coupons.js). Así se evita construir un cliente browser en
// import-time y este módulo es importable por el runner nativo de tests
// (node --test) sin necesidad de resolvers de alias de Next.
//
// PROMPT 19 (blindaje del checkout):
//   La creación de pedidos YA NO se hace con la RPC desde el navegador. Pasa
//   siempre por `POST /api/orders` (autoridad server-side: validación, rate
//   limit, tienda abierta, idempotencia) que a su vez delega los precios en la
//   BD. La RPC `create_order_with_items` ya no es ejecutable por `anon`.
import { orderAttemptSignature, createIdempotencyKey } from './order-intake.mjs';


// ============================================================
// INTENTO DE PEDIDO — idempotencia de reintentos en el cliente
// ============================================================
// Guarda la clave de idempotencia de la operación EN CURSO solo mientras no
// tengamos confirmación del pedido. Si la respuesta se pierde (timeout, error
// de red, usuario que recarga y reintenta), el reintento reutiliza la MISMA
// clave y la BD devuelve el pedido ya creado en lugar de duplicarlo.
// En cuanto la operación se resuelve (llega el pedido) o falla con un error
// definitivo (4xx), se limpia: el siguiente pedido es una operación nueva.
const ATTEMPT_PREFIX = 'hyuk-order-attempt:';

function attemptStorageKey(storeId) {
  return `${ATTEMPT_PREFIX}${storeId}`;
}

function readOrderAttempt(storeId, signature) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(attemptStorageKey(storeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.signature !== signature || typeof parsed.key !== 'string') return null;
    return parsed.key || null;
  } catch {
    return null;
  }
}

function writeOrderAttempt(storeId, signature, key) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(attemptStorageKey(storeId), JSON.stringify({ signature, key }));
  } catch {
    // Storage bloqueado: el pedido sigue funcionando (sin dedupe de reintentos).
  }
}

function clearOrderAttempt(storeId) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(attemptStorageKey(storeId));
  } catch {
    /* noop */
  }
}

/**
 * Crea un nuevo pedido a través de la capa server-side `POST /api/orders`
 * (validación + rate limit + tienda abierta + idempotencia) que delega los
 * precios en la BD (trigger orders_price_integrity + RPC
 * create_order_with_items). El navegador solo envía IDs, cantidades y
 * selecciones; nunca precios, subtotales ni totales.
 *
 * Reintentos: la clave de idempotencia se conserva mientras la operación no
 * se resuelva, de modo que un reintento (o un error de red posterior a la
 * creación) devuelve el MISMO pedido en lugar de duplicarlo.
 * @param {Object} orderData
 *  - storeId (requerido), customerName/Phone, delivery*, paymentMethod
 *  - items: [{id, quantity, selectedOptions?, skuId|sku?}]
 *  - notes, couponCode, payment_provider, currency, idempotencyKey (opcional)
 * @returns {Promise<{success:boolean, order?:object, duplicate?:boolean, error?:string, code?:?string, status?:?number}>}
 */
export async function createOrder(orderData) {
  const storeId = orderData?.storeId;
  if (!storeId) {
    return {
      success: false,
      error: translateOrderError('store_required'),
      code: 'store_required',
      status: null,
      duplicate: false,
    };
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

  if (!items.length) {
    return {
      success: false,
      error: translateOrderError('order_items_empty'),
      code: 'order_items_empty',
      status: null,
      duplicate: false,
    };
  }

  // Clave de idempotencia: reutiliza la del intento en curso si la firma del
  // pedido no cambió (mismo carrito/cupón/entrega) y genera una nueva si se
  // trata de una operación distinta.
  const signature = orderAttemptSignature(items, {
    couponCode: orderData.couponCode,
    deliveryMethod: orderData.deliveryMethod,
    deliveryZone: orderData.deliveryZone,
  });
  const idempotencyKey = orderData.idempotencyKey
    || readOrderAttempt(storeId, signature)
    || createIdempotencyKey();
  writeOrderAttempt(storeId, signature, idempotencyKey);

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        storeId,
        slug: orderData.slug || null,
        items,
        customerName: orderData.customerName || null,
        customerPhone: orderData.customerPhone || null,
        deliveryAddress: orderData.deliveryAddress || null,
        deliveryMethod: orderData.deliveryMethod || null,
        deliveryZone: orderData.deliveryZone || null,
        paymentMethod: orderData.paymentMethod || null,
        paymentProvider: orderData.payment_provider || 'supabase',
        currency: orderData.currency || 'DOP',
        notes: orderData.notes || null,
        couponCode: orderData.couponCode || null,
        idempotencyKey,
      }),
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok || !payload?.ok || !payload?.order) {
      const code = payload?.code || (res.status === 429 ? 'rate_limited' : null);
      // 4xx (salvo 429) = error definitivo: el reintento será otra operación.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        clearOrderAttempt(storeId);
      }
      return {
        success: false,
        error: payload?.error || translateOrderError(code),
        code,
        status: res.status,
        duplicate: false,
      };
    }

    const order = payload.order;
    const duplicate = Boolean(payload.duplicate);
    // El servidor confirmó el pedido: la operación terminó.
    clearOrderAttempt(storeId);

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

    return { success: true, duplicate, order };
  } catch (error) {
    // Error de red/timeout: el intento NO se limpia, así el reintento reutiliza
    // la misma clave y no duplica el pedido aunque el primero sí se creara.
    console.error('Error creating order:', error);
    return {
      success: false,
      error: 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
      code: 'network_error',
      status: null,
      duplicate: false,
    };
  }
}

/**
 * Obtiene todos los pedidos de una tienda
 */
export async function getOrders(storeId, statusFilter = null) {
  try {
    const { createClient } = await import('@/lib/supabase/client');
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
    const { createClient } = await import('@/lib/supabase/client');
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
    store_required: 'No se pudo identificar la tienda.',
    store_not_found: 'La tienda no está disponible.',
    store_not_yours: 'No autorizado para esta tienda.',
    store_mismatch: 'El pedido no pertenece a esa tienda.',
    store_closed: 'La tienda está cerrada en este momento. Vuelve en su horario de atención.',
    order_items_invalid: 'El pedido contiene productos inválidos.',
    order_items_empty: 'El pedido no tiene productos.',
    order_items_too_many: 'El pedido contiene demasiados productos.',
    order_payload_invalid: 'Los datos del pedido no son válidos.',
    idempotency_key_invalid: 'La solicitud de pedido no es válida. Recarga e intenta de nuevo.',
    order_in_progress: 'Tu pedido se está procesando. Espera unos segundos y revisa el estado.',
    order_product_missing: 'Falta un producto en el pedido.',
    order_not_found: 'El pedido no existe.',
    order_not_yours: 'No tienes permisos sobre este pedido.',
    order_not_payable: 'Este pedido ya no está pendiente de pago.',
    order_already_paid: 'Este pedido ya fue pagado.',
    rate_limited: 'Demasiadas solicitudes seguidas. Espera unos segundos e intenta de nuevo.',
    schema_pending: 'El sistema de pedidos no está disponible en este momento.',
    service_role_missing: 'El servidor no está configurado para crear pedidos.',
    invalid_status: 'Estado de pedido inválido.',
    invalid_order_transition: 'Transición de estado no permitida.',
    order_insufficient_stock: 'Stock insuficiente para realizar esta operación.',
    invalid_sku: 'El SKU seleccionado no es válido para este producto.',
    order_quantity_invalid: 'Cantidad inválida en el pedido.',
    order_product_invalid: 'El pedido incluye un producto no disponible.',
    order_option_invalid: 'Las opciones seleccionadas ya no están disponibles.',
    order_delivery_zone_invalid: 'La zona de entrega no es válida.',
    order_coupon_invalid: 'El cupón no es válido o ya no está disponible.',
    sku_quantity_invalid: 'La cantidad de la variante no es válida.',
    internal_error: 'Error interno al procesar el pedido.',
  };
  return map[code || ''] || 'No se pudo procesar el pedido.';
}

/**
 * Obtiene un pedido por ID.
 * El parámetro storeId (opcional pero recomendado) añade una capa extra
 * anti-IDOR: se filtra por store_id incluso si RLS fallara.
 */
export async function getOrderById(orderId, storeId = null) {
  try {
    const { createClient } = await import('@/lib/supabase/client');
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