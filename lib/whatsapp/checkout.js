// Utilidades para el checkout vía WhatsApp

/**
 * Formatea el precio con formato de moneda
 */
export function formatPrice(price) {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Genera el mensaje de WhatsApp estructurado con emojis y detalles
 */
export function generateWhatsAppMessage({
  storeName,
  storePhone,
  cartItems,
  checkoutConfig,
  customerInfo = {},
  total,
}) {
  const {
    customMessageHeader,
    requireClientName,
    askForAddress,
    askForPaymentMethod,
    paymentOptions,
    deliveryMethods,
  } = checkoutConfig;

  // Header del mensaje
  let message = customMessageHeader || '🛒 *¡NUEVO PEDIDO DE CLIENTE!*';
  message += '\n━━━━━━━━━━━━━━━━━━\n\n';

  // Información del cliente
  message += '👤 *Datos del Cliente:*\n';
  if (requireClientName && customerInfo.name) {
    message += `• Nombre: ${customerInfo.name}\n`;
  }
  if (customerInfo.deliveryMethod) {
    message += `• Entrega: ${customerInfo.deliveryMethod}\n`;
  }
  if (askForAddress && customerInfo.address) {
    message += `• Dirección: ${customerInfo.address}\n`;
  }
  if (askForPaymentMethod && customerInfo.paymentMethod) {
    message += `• Pago: ${customerInfo.paymentMethod}\n`;
  }

  message += '\n━━━━━━━━━━━━━━━━━━\n\n';
  message += '🛍️ *DETALLE DEL PEDIDO:*\n';
  message += '------------------------\n';

  // Items del carrito
  cartItems.forEach((item, index) => {
    const itemNumber = index + 1;
    message += `\n*${itemNumber}. ${item.name}*`;
    
    // Variantes seleccionadas
    if (item.selectedOptions && item.selectedOptions.length > 0) {
      message += `\n   └ ${item.selectedOptions.map(opt => opt.label).join(', ')}`;
    }
    
    // Precio y cantidad
    const itemTotal = item.price * item.quantity;
    message += `\n   Cantidad: ${item.quantity} × ${formatPrice(item.price)}`;
    message += `\n   Subtotal: *${formatPrice(itemTotal)}*`;
  });

  message += '\n\n━━━━━━━━━━━━━━━━━━\n';
  message += `💰 *TOTAL DEL PEDIDO: ${formatPrice(total)}*\n`;
  message += '━━━━━━━━━━━━━━━━━━\n';

  // Mensaje de cierre
  message += '\n✅ *Gracias por su pedido!*';
  message += '\n⏰ Tiempo estimado de entrega: 30-45 min';
  message += '\n\n─── 🏪 *' + storeName + '* ───';

  return encodeURIComponent(message);
}

/**
 * Construye la URL de WhatsApp con el mensaje generado
 */
export function buildWhatsAppUrl(storePhone, message) {
  // Limpiar el número - solo dígitos
  const cleanPhone = storePhone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${message}`;
}

/**
 * Calcula el total del carrito
 */
export function calculateCartTotal(cartItems) {
  return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Helper para calcular subtotal de un item con opciones
 */
export function getItemUnitPrice(item) {
  let price = item.price;
  if (item.selectedOptions) {
    item.selectedOptions.forEach(option => {
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
    const optionsText = item.selectedOptions.map(opt => opt.label).join(', ');
    parts.push(`(${optionsText})`);
  }
  return parts.join(' ');
}