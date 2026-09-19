/**
 * Tests para lib/coupons.js — funciones PURAS de cupones/descuentos.
 * (fetchCouponByCode hace I/O a Supabase y NO se testea aquí.)
 *
 * Ejecutar: npm test  (node --test)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeCode, calculateDiscount, formatDiscountLabel } from '../lib/coupons.js';

describe('normalizeCode', () => {
  it('recorta y pasa a mayúsculas', () => {
    assert.equal(normalizeCode('  promo10 '), 'PROMO10');
  });
  it('tolera null/undefined', () => {
    assert.equal(normalizeCode(null), '');
    assert.equal(normalizeCode(undefined), '');
  });
});

describe('calculateDiscount', () => {
  it('percent: subtotal * value / 100 (redondeado a 2 decimales)', () => {
    assert.equal(calculateDiscount({ discount_type: 'percent', discount_value: 10 }, 200), 20);
    assert.equal(calculateDiscount({ discount_type: 'percent', discount_value: 33.33 }, 3), 1);
  });
  it('fixed: nunca descuenta más que el subtotal', () => {
    assert.equal(calculateDiscount({ discount_type: 'fixed', discount_value: 500 }, 100), 100);
    assert.equal(calculateDiscount({ discount_type: 'fixed', discount_value: 30 }, 100), 30);
  });
  it('sin cupón → 0', () => {
    assert.equal(calculateDiscount(null, 100), 0);
  });
});

describe('formatDiscountLabel', () => {
  it('percent → "N% de descuento"', () => {
    assert.equal(
      formatDiscountLabel({ discount_type: 'percent', discount_value: 15 }),
      '15% de descuento'
    );
  });
  it('fixed → "$N.NN de descuento"', () => {
    assert.equal(
      formatDiscountLabel({ discount_type: 'fixed', discount_value: 12.5 }),
      '$12.50 de descuento'
    );
  });
  it('sin cupón → cadena vacía', () => {
    assert.equal(formatDiscountLabel(null), '');
  });
});
