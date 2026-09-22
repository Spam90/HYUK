/**
 * Tests de endurecimiento del checkout (lib/order-intake.mjs).
 * SIN red ni base de datos ni Stripe real.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeOrderRequest,
  isPaymentEligibleStatus,
  resolveAllowedReturnUrl,
  appendTrackingToken,
} from '../lib/order-intake.mjs';
import { couponDiscountFor, isCouponValidToday } from '../lib/checkout-core.js';

const ORIGINS = { allowedOrigins: ['https://app.hyuk.test'], rootDomain: 'hyuk.test' };

describe('checkout hardening — URLs de retorno (open redirect)', () => {
  it('rechaza URL externa arbitraria', () => {
    assert.equal(resolveAllowedReturnUrl('https://evil.com/pago-ok', ORIGINS), null);
  });

  it('rechaza esquemas peligrosos aunque el host coincida', () => {
    assert.equal(resolveAllowedReturnUrl('javascript:alert(1)', ORIGINS), null);
    assert.equal(resolveAllowedReturnUrl('data:text/html,hola', ORIGINS), null);
    assert.equal(
      resolveAllowedReturnUrl('https://app.hyuk.test.evil.com/x', ORIGINS),
      null
    );
  });

  it('acepta el mismo origen configurado y subdominios de tienda', () => {
    assert.equal(
      resolveAllowedReturnUrl('https://app.hyuk.test/pedido/1?paid=1', ORIGINS),
      'https://app.hyuk.test/pedido/1?paid=1'
    );
    assert.equal(
      resolveAllowedReturnUrl('https://mitienda.hyuk.test/', ORIGINS),
      'https://mitienda.hyuk.test/'
    );
  });

  it('rechaza sub-subdominios y http no local', () => {
    assert.equal(resolveAllowedReturnUrl('https://a.b.hyuk.test/', ORIGINS), null);
    assert.equal(resolveAllowedReturnUrl('http://app.hyuk.test/', ORIGINS), null);
  });

  it('el token de seguimiento se añade sin duplicarlo', () => {
    assert.equal(
      appendTrackingToken('https://app.hyuk.test/pedido/1?paid=1', 'tok'),
      'https://app.hyuk.test/pedido/1?paid=1&t=tok'
    );
    assert.equal(
      appendTrackingToken('https://app.hyuk.test/pedido/1?t=tok', 'tok'),
      'https://app.hyuk.test/pedido/1?t=tok'
    );
  });
});

describe('checkout hardening — orderId inválido / no autorizado', () => {
  it('pedido pagado o cerrado no es elegible para un segundo pago', () => {
    for (const order of [
      { status: 'paid', payment_status: 'paid' },
      { status: 'completed', payment_status: 'paid' },
      { status: 'cancelled', payment_status: 'pending' },
      { status: 'preparing', payment_status: 'pending' },
    ]) {
      const res = isPaymentEligibleStatus(order);
      assert.equal(res.ok, false, JSON.stringify(order));
    }
  });

  it('pedido pendiente impago sí es elegible', () => {
    assert.equal(isPaymentEligibleStatus({ status: 'pending', payment_status: 'pending' }).ok, true);
    assert.equal(isPaymentEligibleStatus({ status: 'pending' }).ok, true);
  });
});

describe('checkout hardening — precio manipulado por el cliente', () => {
  it('el intake descarta precios/totales: la BD es la autoridad', () => {
    const res = normalizeOrderRequest({
      storeId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      total: 1,
      items: [{
        id: '11111111-2222-3333-4444-555555555555',
        quantity: 1,
        price: 0.01,
        total_price: 99999,
        name: 'Producto hackeado',
        selectedOptions: [{ label: 'Grande', priceDelta: -9999 }],
      }],
    });
    assert.equal(res.ok, true);
    assert.deepEqual(Object.keys(res.value.items[0]).sort(), [
      'id', 'quantity', 'selectedOptions', 'sku', 'skuId',
    ]);
    assert.equal(res.value.total, undefined);
  });
});
