// Utilidades para el checkout vía WhatsApp

/**
 * Formatea el precio con formato de moneda
 */
export function formatPrice(price, currency = 'USD') {
  const safe = Number(price || 0);
  try {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `$${safe.toFixed(2)}`;
  }
}

/**
 * Genera el mensaje de WhatsApp formateado como pedido profesional
 * (emojis + saltos de línea; encodeURIComponent convierte los \n a %0A).
 */
export function generateWhatsAppMessage({
  storeName,
  storePhone,
  cartItems,
  checkoutConfig,
  customerInfo = {},
  total,
  coupon,
  couponDiscount = 0,
  currency = 'USD',
}) {
  const {
    requireClientName,
    askForPaymentMethod,
    deliveryMethods,
  } = checkoutConfig;

  const now = new Date();
  const orderNumber = now.getTime().toString().slice(-8);
  const dateTime = now.toLocaleString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Encabezado del pedido
  let message = `🛒 *NUEVO PEDIDO - ${storeName}*\n`;
  message += `📋 Pedido #${orderNumber} · 📅 ${dateTime}\n`;
  message += '━━━━━━━━━━━━━━━━━━━━━━━\n';

  // Datos del cliente
  if (requireClientName && customerInfo.name) {
    message += `👤 *Cliente:* ${customerInfo.name}\n`;
  }
  if (customerInfo.phone) {
    message += `📞 *Teléfono:* ${customerInfo.phone}\n`;
  }

  const deliveryLine = customerInfo.address
    ? `${customerInfo.address}${customerInfo.deliveryMethod ? ` (${customerInfo.deliveryMethod})` : ''}`
    : customerInfo.deliveryMethod || 'Retiro en local';
  message += `📍 *Entrega:* ${deliveryLine}\n`;

  if (askForPaymentMethod && customerInfo.paymentMethod) {
    message += `💳 *Método de Pago:* ${customerInfo.paymentMethod}\n`;
  }

  // Detalle del pedido
  message += '\n📦 *DETALLE DEL PEDIDO:*\n';
  cartItems.forEach((item) => {
    const itemTotal = getItemUnitPrice(item) * item.quantity;
    const optionsText =
      item.selectedOptions && item.selectedOptions.length > 0
        ? ` (${item.selectedOptions.map((opt) => opt.label).join(', ')})`
        : '';
    message += `• ${item.quantity}x ${item.name}${optionsText} — ${formatPrice(itemTotal, currency)}\n`;
    // Nota especial por producto (variantes, "sin cebolla", etc.)
    if (item.notes && item.notes.trim()) {
      message += `    📝 *Nota:* ${item.notes.trim()}\n`;
    }
  });

  message += '\n━━━━━━━━━━━━━━━━━━━━━━━\n';
  message += `💰 *TOTAL:* ${formatPrice(total, currency)}\n`;

  if (coupon && couponDiscount > 0) {
    message += `🏷️ Cupón *${coupon.code}*: -${formatPrice(couponDiscount, currency)}\n`;
  }

  if (customerInfo.notes) {
    message += `📝 *Notas:* ${customerInfo.notes}\n`;
  }

  message += '\n✅ *¡Gracias por tu pedido!* ⏰ 30-45 min';

  return encodeURIComponent(message);
}

/**
 * Construye la URL de WhatsApp con el mensaje generado.
 * Limpia caracteres no numéricos del número configurado por el dueño.
 */
export function buildWhatsAppUrl(storePhone, message) {
  const cleanPhone = String(storePhone || '').replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${message}`;
}

/**
 * Genera la URL completa de WhatsApp en un solo paso
 */
export function generateWhatsAppUrl({
  storeName,
  storePhone,
  cartItems,
  checkoutConfig,
  customerInfo = {},
  total,
  coupon,
  couponDiscount = 0,
  currency = 'USD',
}) {
  const message = generateWhatsAppMessage({
    storeName,
    storePhone,
    cartItems,
    checkoutConfig,
    customerInfo,
    total,
    coupon,
    couponDiscount,
    currency,
  });
  return buildWhatsAppUrl(storePhone, message);
}

/**
 * Calcula el total del carrito
 */
export function calculateCartTotal(cartItems) {
  return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Helper para calcular el precio unitario de un item con opciones
 */
export function getItemUnitPrice(item) {
  let price = item.price;
  if (item.selectedOptions) {
    item.selectedOptions.forEach((option) => {
      if (option.priceDelta) {
        price += option.priceDelta;
      }
    });
  }
  return price;
}

/**
 * Genera la descripción del producto con sus opciones seleccionadas
 */
export function getItemDescription(item) {
  const parts = [item.name];
  if (item.selectedOptions && item.selectedOptions.length > 0) {
    const optionsText = item.selectedOptions.map((opt) => opt.label).join(', ');
    parts.push(`(${optionsText})`);
  }
  return parts.join(' ');
}