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
 * Genera el mensaje de WhatsApp estructurado como ticket de compra profesional
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
}) {
  const {
    customMessageHeader,
    requireClientName,
    askForAddress,
    askForPaymentMethod,
    paymentOptions,
    deliveryMethods,
  } = checkoutConfig;

  // Obtener fecha y hora actual
  const now = new Date();
  const orderNumber = now.getTime().toString().slice(-8);
  const dateTime = now.toLocaleString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Encabezado del ticket
  let message = '╔══════════════════════════════════╗\n';
  message += '║     🧾 *TICKET DE PEDIDO*         ║\n';
  message += '╚══════════════════════════════════╝\n\n';
  message += `🏪 *${storeName}*\n`;
  message += `📋 Pedido #${orderNumber}\n`;
  message += `📅 ${dateTime}\n`;
  message += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  // Sección de items del pedido
  message += '📦 *PRODUCTOS:*\n\n';
  
  cartItems.forEach((item, index) => {
    const itemNumber = index + 1;
    const itemTotal = item.price * item.quantity;
    
    // Número y nombre del producto
    message += `${itemNumber}. *${item.name}*\n`;
    message += `   Cantidad: ${item.quantity} × ${formatPrice(item.price)}\n`;
    message += `   → Subtotal: *${formatPrice(itemTotal)}*\n`;
    
    // Variantes seleccionadas (sangrado adicional)
    if (item.selectedOptions && item.selectedOptions.length > 0) {
      message += `   📝 Opciones:\n`;
      item.selectedOptions.forEach(opt => {
        const priceInfo = opt.priceDelta ? ` (+${formatPrice(opt.priceDelta)})` : '';
        message += `      • ${opt.label}${priceInfo}\n`;
      });
    }
    
    message += '\n';
  });

  message += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  // Resumen de totales
  const subtotal = cartItems.reduce((sum, item) => {
    let itemPrice = item.price;
    if (item.selectedOptions) {
      item.selectedOptions.forEach(opt => {
        if (opt.priceDelta) itemPrice += opt.priceDelta;
      });
    }
    return sum + (itemPrice * item.quantity);
  }, 0);

  message += `\n💰 *RESUMEN DE PAGO:*\n\n`;
  message += `   Subtotal: ${formatPrice(subtotal)}\n`;

  // Envío: si hay zona de delivery seleccionada, mostrar su tarifa; si no, regla genérica
  const deliveryFeeNum = parseFloat(customerInfo.deliveryFee) || 0;
  if (deliveryFeeNum > 0) {
    message += `   🛵 Envío (${customerInfo.deliveryZone || 'a domicilio'}): ${formatPrice(deliveryFeeNum)}\n`;
  } else {
    message += `   Envío: ${subtotal > 1000 ? 'GRATIS' : 'A calcular'}\n`;
  }

  // Línea de descuento por cupón
  if (coupon && couponDiscount > 0) {
    message += `   🏷️ Cupón *${coupon.code}*: -${formatPrice(couponDiscount)}\n`;
  }

  message += `\n   *TOTAL: ${formatPrice(total)}*\n`;
  message += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  // Datos del cliente
  message += '\n👤 *DATOS DEL CLIENTE:*\n\n';
  
  if (requireClientName && customerInfo.name) {
    message += `   Nombre: ${customerInfo.name}\n`;
  }
  
  if (customerInfo.deliveryMethod) {
    message += `   📍 Tipo de entrega: ${customerInfo.deliveryMethod}\n`;
  }

  if (customerInfo.deliveryZone) {
    message += `   📍 Zona de envío: ${customerInfo.deliveryZone}\n`;
  }
  
  if (askForAddress && customerInfo.address) {
    message += `   📍 Dirección: ${customerInfo.address}\n`;
  }
  
  if (askForPaymentMethod && customerInfo.paymentMethod) {
    message += `   💳 Método de pago: ${customerInfo.paymentMethod}\n`;
  }

  // Notas adicionales
  if (customerInfo.notes) {
    message += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    message += '\n📝 *NOTAS ADICIONALES:*\n\n';
    message += `   ${customerInfo.notes}\n`;
  }

  // Pie del ticket
  message += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  message += '\n✅ *¡Gracias por tu pedido!*\n';
  message += '⏰ Tiempo estimado: 30-45 min\n';
  message += `\n🏪 ${storeName}\n`;
  message += '📞 Responderemos pronto por WhatsApp';

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
 * Genera la URL completa de WhatsApp en un solo paso
 * Combina generateWhatsAppMessage + buildWhatsAppUrl
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