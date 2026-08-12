// =============================================
// HYUK - IMPRESIÓN DE TICKETS TÉRMICOS (58mm / 80mm)
// =============================================

/**
 * Formatea precio según moneda local
 */
function fmt(value) {
  const num = parseFloat(value) || 0;
  return num.toFixed(2);
}

/**
 * Escapa HTML para evitar inyección en el ticket
 */
function esc(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Genera el HTML de un ticket térmico 80mm para un pedido.
 */
export function buildThermalTicketHTML({ order, storeName, storePhone = '' }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsTotal = items.reduce((sum, item) => {
    const unitPrice = parseFloat(item.price) || 0;
    const optionsDelta = Array.isArray(item.selectedOptions)
      ? item.selectedOptions.reduce((s, opt) => s + (parseFloat(opt.priceDelta) || 0), 0)
      : 0;
    return sum + ((unitPrice + optionsDelta) * (item.quantity || 1));
  }, 0);

  const discount = parseFloat(order.discount_amount) || 0;
  const total = parseFloat(order.total_amount) || itemsTotal;

  const date = new Date(order.created_at);
  const dateStr = date.toLocaleString('es-DO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const itemsHtml = items.map((item) => {
    const unitPrice = parseFloat(item.price) || 0;
    const optionsDelta = Array.isArray(item.selectedOptions)
      ? item.selectedOptions.reduce((s, opt) => s + (parseFloat(opt.priceDelta) || 0), 0)
      : 0;
    const lineTotal = (unitPrice + optionsDelta) * (item.quantity || 1);
    const optionsHtml = Array.isArray(item.selectedOptions) && item.selectedOptions.length > 0
      ? `<div class="sub">${item.selectedOptions.map((o) => `${esc(o.label)}${parseFloat(o.priceDelta) ? ' +' + fmt(o.priceDelta) : ''}`).join(', ')}</div>`
      : '';
    return `
      <div class="item">
        <div class="item-head"><span>${esc(item.name)}</span><span>${fmt(lineTotal)}</span></div>
        <div class="item-qty">${item.quantity} x ${fmt(unitPrice + optionsDelta)}</div>
        ${optionsHtml}
      </div>`;
  }).join('');

  const discountHtml = discount > 0
    ? `
      <div class="line"><span>Cupón (${esc(order.coupon_code)})</span><span>-${fmt(discount)}</span></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Ticket #${String(order.id).slice(0, 8)}</title>
<style>
  @page { margin: 0; size: 80mm auto; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 72mm; /* 80mm - margins */
    margin: 0 auto;
    padding: 4mm 2mm;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: #000;
    background: #fff;
  }
  .center { text-align: center; }
  .store-name { font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
  .muted { color: #444; font-size: 11px; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .divider-solid { border-top: 1px solid #000; margin: 6px 0; }
  .title { font-weight: bold; text-align: center; margin: 2px 0 4px; font-size: 13px; }
  .item { margin-bottom: 6px; }
  .item-head { display: flex; justify-content: space-between; gap: 6px; font-weight: bold; }
  .item-qty { font-size: 11px; }
  .sub { font-size: 10px; color: #333; padding-left: 6px; }
  .info { margin-bottom: 3px; }
  .info b { display: inline-block; min-width: 62px; }
  .line { display: flex; justify-content: space-between; margin-bottom: 2px; }
  .total { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-top: 4px; border-top: 1px dashed #000; padding-top: 4px; }
  .footer { text-align: center; margin-top: 8px; font-size: 11px; }
  .thanks { text-align: center; font-size: 13px; font-weight: bold; margin-top: 8px; }
  .cut { text-align: center; margin-top: 6px; }
</style>
</head>
<body onload="window.print()">
  <div class="center">
    <div class="store-name">${esc(storeName)}</div>
    ${storePhone ? `<div class="muted">Tel: ${esc(storePhone)}</div>` : ''}
  </div>
  <div class="divider-solid"></div>
  <div class="title">TICKET DE PEDIDO</div>
  <div class="center muted">#${esc(String(order.id).slice(0, 8))} — ${esc(dateStr)}</div>
  <div class="divider"></div>

  <div class="info"><b>Cliente:</b> ${esc(order.customer_name)}</div>
  ${order.customer_phone ? `<div class="info"><b>Tel:</b> ${esc(order.customer_phone)}</div>` : ''}
  ${order.delivery_method ? `<div class="info"><b>Entrega:</b> ${esc(order.delivery_method)}</div>` : ''}
  ${order.delivery_address ? `<div class="info"><b>Dirección:</b> ${esc(order.delivery_address)}</div>` : ''}
  ${order.payment_method ? `<div class="info"><b>Pago:</b> ${esc(order.payment_method)}</div>` : ''}

  <div class="divider"></div>
  <div class="title">PRODUCTOS</div>
  ${itemsHtml}

  <div class="divider"></div>
  <div class="line"><span>Subtotal</span><span>${fmt(itemsTotal)}</span></div>
  ${discountHtml}
  <div class="total"><span>TOTAL</span><span>$${fmt(total)}</span></div>

  ${order.notes ? `<div class="divider"></div><div class="info"><b>Notas:</b> ${esc(order.notes)}</div>` : ''}

  <div class="divider"></div>
  <div class="thanks">¡Gracias por tu compra!</div>
  <div class="footer">${esc(storeName)}<br/>Pedidos por WhatsApp: ${esc(storePhone || '-')}</div>
  <div class="cut">- - - - - - - - - - - - - - - - -</div>
</body>
</html>`;
}

/**
 * Abre una ventana con el ticket térmico y dispara la impresión.
 */
export function openPrintTicket(order, store) {
  const storeName = store?.business_name || store?.store_name || store?.full_name || 'Mi Tienda';
  const storePhone = store?.phone_whatsapp || store?.phone || '';

  const html = buildThermalTicketHTML({ order, storeName, storePhone });

  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) {
    alert('Por favor permite ventanas emergentes para imprimir el ticket');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  // Fallback para algunos navegadores
  setTimeout(() => {
    try { win.focus(); } catch (e) { /* noop */ }
  }, 500);
}