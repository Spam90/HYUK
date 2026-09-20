/**
 * Tests para lib/whatsapp/checkout.js — lógica PURA (sin Supabase/Stripe/Auth).
 *
 * Se ejecutan con el runner nativo de Node (no hace falta jest/vitest):
 *   npm run test:ci        # node --test (auto-descubre tests/*.test.mjs)
 *   npm test               # runner legacy: node tests/sku-validation.test.mjs
 *
 * Cobertura: formatPrice, calculateCartTotal, getItemUnitPrice, getItemDescription,
 * buildWhatsAppUrl, generateWhatsAppMessage.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatPrice,
  calculateCartTotal,
  getItemUnitPrice,
  getItemDescription,
  generateWhatsAppMessage,
  buildWhatsAppUrl,
} from '../lib/whatsapp/checkout.js';

// ---- formatPrice ----
describe('formatPrice', () => {
  it('formatea USD con separador de miles y 2 decimales', () => {
    assert.ok(formatPrice(1299.99, 'USD').endsWith('1,299.99'));
  });

  it('redondea a 2 decimales', () => {
    assert.ok(formatPrice(10.456, 'USD').endsWith('10.46'));
  });

  it('null/undefined se tratan como 0', () => {
    assert.ok(formatPrice(null, 'USD').endsWith('0'));
    assert.ok(formatPrice(undefined, 'USD').endsWith('0'));
  });
});

// ---- calculateCartTotal ----
describe('calculateCartTotal', () => {
  it('suma price * quantity de cada ítem', () => {
    const items = [{ price: 100, quantity: 2 }, { price: 50, quantity: 1 }];
    assert.equal(calculateCartTotal(items), 250);
  });

  it('carrito vacío devuelve 0', () => {
    assert.equal(calculateCartTotal([]), 0);
  });
});

// ---- getItemUnitPrice ----
describe('getItemUnitPrice', () => {
  it('precio base sin opciones', () => {
    assert.equal(getItemUnitPrice({ price: 100, selectedOptions: [] }), 100);
  });

  it('usa el precio unitario ya resuelto por el carrito', () => {
    const item = { price: 125, selectedOptions: [{ label: 'Extra', priceDelta: 25 }] };
    assert.equal(getItemUnitPrice(item), 125);
  });

  it('sin selectedOptions devuelve el precio base', () => {
    assert.equal(getItemUnitPrice({ price: 80 }), 80);
  });
});

// ---- getItemDescription ----
describe('getItemDescription', () => {
  it('nombre plano sin opciones', () => {
    assert.equal(getItemDescription({ name: 'Pizza', selectedOptions: [] }), 'Pizza');
  });

  it('concatena opciones entre paréntesis', () => {
    const item = {
      name: 'Pizza',
      selectedOptions: [{ label: 'Grande' }, { label: 'Extra queso' }],
    };
    assert.equal(getItemDescription(item), 'Pizza (Grande, Extra queso)');
  });
});

// ---- buildWhatsAppUrl ----
describe('buildWhatsAppUrl', () => {
  it('limpia caracteres no numéricos del teléfono', () => {
    const url = buildWhatsAppUrl('+1 (555) 123-4567', 'hola');
    assert.equal(url, 'https://wa.me/15551234567?text=hola');
  });

  it('teléfono vacío produce URL válida', () => {
    const url = buildWhatsAppUrl('', 'hola');
    assert.equal(url, 'https://wa.me/?text=hola');
  });
});

// ---- generateWhatsAppMessage ----
describe('generateWhatsAppMessage', () => {
  const base = {
    storeName: 'Mi Tienda',
    storePhone: '123456789',
    cartItems: [
      { name: 'Pizza', quantity: 1, price: 200, selectedOptions: [], notes: '' },
    ],
    checkoutConfig: {
      requireClientName: true,
      askForPaymentMethod: true,
      deliveryMethods: ['A domicilio', 'Retiro en local'],
    },
    customerInfo: {
      name: 'Ana',
      phone: '8095551234',
      address: 'Calle 1',
      deliveryMethod: 'A domicilio',
      paymentMethod: 'Efectivo',
    },
    total: 200,
    currency: 'USD',
  };

  it('incluye el nombre del cliente', () => {
    const msg = decodeURIComponent(generateWhatsAppMessage(base));
    assert.match(msg, /\*Cliente:\* Ana/);
  });

  it('incluye entrega y método de pago', () => {
    const msg = decodeURIComponent(generateWhatsAppMessage(base));
    assert.match(msg, /📍 \*Entrega:\* Calle 1 \(A domicilio\)/);
    assert.match(msg, /💳 \*Método de Pago:\* Efectivo/);
  });

    it('formatea el TOTAL con moneda', () => {
    const msg = decodeURIComponent(generateWhatsAppMessage(base));
    assert.match(msg, /💰 \*TOTAL:\* [^ ]*200/);
  });

    it('incluye subtotal y no vuelve a sumar priceDelta', () => {
      const msg = decodeURIComponent(generateWhatsAppMessage({
        ...base,
        cartItems: [{ name: 'Pizza', quantity: 1, price: 125, selectedOptions: [{ label: 'Extra', priceDelta: 25 }] }],
        subtotal: 125,
        total: 125,
      }));
      assert.match(msg, /SUBTOTAL/);
      assert.match(msg, /TOTAL.*125/);
      assert.doesNotMatch(msg, /150/);
    });
});
