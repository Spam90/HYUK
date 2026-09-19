/**
 * Tests para lib/config/plans.js — REGLAS DE NEGOCIO de planes (puro, sin I/O).
 *
 * Regla v2: el catálogo público NUNCA oculta productos; el plan solo limita
 * acciones de ADMIN (crear productos / IA). Trial de 28 días = beneficios Pro.
 *
 * Ejecutar: npm test  (node --test)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  TRIAL_DAYS,
  PLAN_LIMITS,
  PLAN_NAME,
  getProductLimit,
  isFree,
  hasProductLimitReached,
  getLockedCount,
} from '../lib/config/plans.js';

describe('PLAN_LIMITS / PLAN_NAME', () => {
  it('Free limita a 6 productos y 4 categorías', () => {
    assert.equal(PLAN_LIMITS.free.maxProducts, 6);
    assert.equal(PLAN_LIMITS.free.maxCategories, 4);
  });
  it('Pro y Enterprise son ilimitados', () => {
    assert.equal(PLAN_LIMITS.pro.maxProducts, Infinity);
    assert.equal(PLAN_LIMITS.enterprise.maxProducts, Infinity);
  });
  it('TRIAL_DAYS = 28', () => {
    assert.equal(TRIAL_DAYS, 28);
  });
  it('todos los planes tienen nombre humano', () => {
    for (const key of Object.keys(PLAN_LIMITS)) {
      assert.equal(typeof PLAN_NAME[key], 'string');
    }
  });
});

describe('getProductLimit', () => {
  it('devuelve el límite del plan indicado', () => {
    assert.equal(getProductLimit('free'), 6);
    assert.equal(getProductLimit('starter'), 50);
  });
  it('normaliza mayúsculas (legacy "Pro")', () => {
    assert.equal(getProductLimit('Pro'), Infinity);
    assert.equal(getProductLimit('FREE'), 6);
  });
  it('plan desconocido/vacío cae a Free', () => {
    assert.equal(getProductLimit('inexistente'), 6);
    assert.equal(getProductLimit(null), 6);
    assert.equal(getProductLimit(undefined), 6);
  });
});

describe('isFree', () => {
  it('true para free / vacío / null', () => {
    assert.equal(isFree('free'), true);
    assert.equal(isFree('Free'), true);
    assert.equal(isFree(''), true);
    assert.equal(isFree(null), true);
  });
  it('false para planes de pago', () => {
    assert.equal(isFree('pro'), false);
    assert.equal(isFree('starter'), false);
    assert.equal(isFree('enterprise'), false);
  });
});

describe('hasProductLimitReached', () => {
  it('Free: alcanza al llegar al límite', () => {
    assert.equal(hasProductLimitReached('free', 5), false);
    assert.equal(hasProductLimitReached('free', 6), true);
    assert.equal(hasProductLimitReached('free', 7), true);
  });
  it('planes de pago nunca alcanzan límite', () => {
    assert.equal(hasProductLimitReached('pro', 100000), false);
  });
});

describe('getLockedCount', () => {
  it('Free: cuenta solo el excedente sobre el límite', () => {
    assert.equal(getLockedCount('free', 4), 0);
    assert.equal(getLockedCount('free', 6), 0);
    assert.equal(getLockedCount('free', 9), 3);
  });
  it('planes de pago siempre 0', () => {
    assert.equal(getLockedCount('pro', 100), 0);
  });
});