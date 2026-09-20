/**
 * Tests de SEGURIDAD para el núcleo de checkout (lib/checkout-core.js +
 * lib/whatsapp/checkout.js): el cliente NUNCA define precios, montos ni
 * teléfonos. El servidor recalcula todo desde la BD.
 *
 * Ejecutar: npm test  (node --test)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expectedUnitPrice, round2, isValidQuantity } from '../lib/checkout-core.js';
import { buildWhatsAppUrl } from '../lib/whatsapp/checkout.js';

describe('seguridad: cliente no define precios (server-side authoritative)', () => {
  const product = {
    price: 100,
    options: [{ name: 'Tamaño', values: [{ label: 'L', priceDelta: 10 }] }],
  };

  it('expectedUnitPrice ignora un priceDelta engañoso enviado por el cliente', () => {
    // El cliente podría enviar priceDelta=99999; el servidor usa el de la BD (10).
    const item = { selectedOptions: [{ label: 'L', priceDelta: 99999 }] };
    assert.equal(expectedUnitPrice(item, product), 110);
  });

  it('expectedUnitPrice ignora un price unitario engañoso enviado por el cliente', () => {
    const item = { price: 99999, selectedOptions: [{ label: 'L' }] };
    assert.equal(expectedUnitPrice(item, product), 110);
  });

  it('expectedUnitPrice rechaza opción inexistente (carrito manipulado)', () => {
    const item = { selectedOptions: [{ label: 'XL', priceDelta: 0 }] };
    assert.equal(expectedUnitPrice(item, product), null);
  });

  it('isValidQuantity rechaza manipulaciones de cantidad', () => {
    assert.equal(isValidQuantity(0), false);
    assert.equal(isValidQuantity(-3), false);
    assert.equal(isValidQuantity(1.5), false);
    assert.equal(isValidQuantity(999999), false);
    assert.equal(isValidQuantity('10; DROP TABLE products;--'), false);
  });

  it('round2 evita drift de coma flotante en totales', () => {
    assert.equal(round2(0.1 + 0.2), 0.3);
    assert.equal(round2(19.99 + 2), 21.99);
  });
});

describe('seguridad: sanitización de teléfono de WhatsApp', () => {
  it('buildWhatsAppUrl limpia todo menos dígitos (anti inyección)', () => {
    assert.equal(buildWhatsAppUrl('123;rm -rf /', 'hola'), 'https://wa.me/123?text=hola');
    assert.equal(buildWhatsAppUrl('+1 (555) 123-4567', 'hola'), 'https://wa.me/15551234567?text=hola');
    assert.equal(buildWhatsAppUrl('not-a-number', 'hola'), 'https://wa.me/?text=hola');
  });
});
