/**
 * Tests para lib/checkout-core.js — NÚCLEO DE CÁLCULO DE CHECKOUT (puro, sin I/O).
 *
 * Es la fuente de autoridad de precios del servidor (api/orders y checkout).
 * No toca Supabase/Stripe/Auth: solo reglas monetarias.
 *
 * Ejecutar: npm test  (node --test)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  round2,
  isValidQuantity,
  effectiveProductPrice,
  normalizeOptionGroups,
  expectedUnitPrice,
  couponDiscountFor,
  isCouponValidToday,
  MIN_QTY,
  MAX_QTY,
} from '../lib/checkout-core.js';

describe('round2', () => {
  it('redondea a 2 decimales', () => {
    assert.equal(round2(2.345), 2.35);
    assert.equal(round2('3.14159'), 3.14);
  });
  it('tolera valores no numéricos', () => {
    assert.equal(round2(null), 0);
    assert.equal(round2(undefined), 0);
    assert.equal(round2('abc'), 0);
  });
});

describe('isValidQuantity', () => {
  it('acepta el rango [MIN_QTY, MAX_QTY]', () => {
    assert.equal(isValidQuantity(MIN_QTY), true);
    assert.equal(isValidQuantity(MAX_QTY), true);
    assert.equal(isValidQuantity('5'), true);
  });
  it('rechaza fuera de rango o no entero', () => {
    assert.equal(isValidQuantity(0), false);
    assert.equal(isValidQuantity(MAX_QTY + 1), false);
    assert.equal(isValidQuantity(1.5), false);
    assert.equal(isValidQuantity(-3), false);
    assert.equal(isValidQuantity('abc'), false);
  });
});

describe('effectiveProductPrice', () => {
  it('sin oferta usa el precio base', () => {
    assert.equal(effectiveProductPrice({ price: 100 }), 100);
  });
  it('respeta la oferta relámpago activa', () => {
    const p = { price: 100, flash_sale_price: 50, flash_sale_end: '2999-01-01T00:00:00Z' };
    assert.equal(effectiveProductPrice(p), 50);
  });
  it('ignora la oferta expirada', () => {
    const p = { price: 100, flash_sale_price: 50, flash_sale_end: '2000-01-01T00:00:00Z' };
    assert.equal(effectiveProductPrice(p), 100);
  });
  it('maneja producto vacío', () => {
    assert.equal(effectiveProductPrice(), 0);
  });
});

describe('normalizeOptionGroups', () => {
  it('acepta la forma `values` (seed/admin)', () => {
    const groups = normalizeOptionGroups([{ name: 'Tamaño', values: [{ label: 'L' }] }]);
    assert.equal(groups[0].label, 'Tamaño');
    assert.equal(groups[0].values.length, 1);
  });
  it('acepta la forma `choices` (product_options)', () => {
    const groups = normalizeOptionGroups([{ name: 'Tamaño', choices: [{ label: 'L' }] }]);
    assert.equal(groups[0].values.length, 1);
  });
  it('no-array devuelve []', () => {
    assert.deepEqual(normalizeOptionGroups(null), []);
    assert.deepEqual(normalizeOptionGroups('x'), []);
  });
});

describe('expectedUnitPrice', () => {
  it('precio base sin opciones', () => {
    assert.equal(expectedUnitPrice({}, { price: 100 }), 100);
  });
  it('suma priceDelta de la opción elegida (forma values)', () => {
    const product = { price: 100, options: [{ name: 'S', values: [{ label: 'L', priceDelta: 10 }] }] };
    assert.equal(expectedUnitPrice({ selectedOptions: [{ label: 'L' }] }, product), 110);
  });
  it('suma priceDelta (forma choices)', () => {
    const product = { price: 100, options: [{ name: 'S', choices: [{ label: 'L', priceDelta: 5 }] }] };
    assert.equal(expectedUnitPrice({ selectedOptions: [{ label: 'L' }] }, product), 105);
  });
  it('opción desconocida → null (carrito manipulado)', () => {
    const product = { price: 100, options: [{ name: 'S', values: [{ label: 'L', priceDelta: 10 }] }] };
    assert.equal(expectedUnitPrice({ selectedOptions: [{ label: 'X' }] }, product), null);
  });
  it('aplica oferta relámpago activa al precio base', () => {
    const product = { price: 100, flash_sale_price: 80, flash_sale_end: '2999-01-01T00:00:00Z' };
    assert.equal(expectedUnitPrice({}, product), 80);
  });
});

describe('couponDiscountFor', () => {
  it('percent: subtotal * value / 100', () => {
    assert.equal(couponDiscountFor({ discount_type: 'percent', discount_value: 10 }, 100), 10);
  });
  it('fixed nunca supera el subtotal', () => {
    assert.equal(couponDiscountFor({ discount_type: 'fixed', discount_value: 500 }, 100), 100);
  });
  it('fixed normal', () => {
    assert.equal(couponDiscountFor({ discount_type: 'fixed', discount_value: 30 }, 100), 30);
  });
  it('sin cupón → 0', () => {
    assert.equal(couponDiscountFor(null, 100), 0);
  });

  it('no aplica cupón bajo el mínimo de compra', () => {
    assert.equal(couponDiscountFor({ discount_type: 'percent', discount_value: 10, min_purchase: 200 }, 100), 0);
  });
});

describe('isCouponValidToday', () => {
  it('cupón activo sin límites → true', () => {
    assert.equal(isCouponValidToday({ is_active: true }), true);
  });
  it('inactivo → false', () => {
    assert.equal(isCouponValidToday({ is_active: false }), false);
  });
  it('expirado → false', () => {
    assert.equal(isCouponValidToday({ is_active: true, expires_at: '2000-01-01T00:00:00Z' }), false);
  });
  it('límite de usos alcanzado → false', () => {
    assert.equal(isCouponValidToday({ is_active: true, max_uses: 5, used_count: 5 }), false);
  });
  it('límite no alcanzado → true', () => {
    assert.equal(isCouponValidToday({ is_active: true, max_uses: 5, used_count: 4 }), true);
  });
  it('null → false', () => {
    assert.equal(isCouponValidToday(null), false);
  });
});
