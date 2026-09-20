/**
 * Tests para lib/payments.js — detección de provider, normalización de moneda
 * (server-side price safety) y ruteo de priceId a plan.
 *
 * Pagos/security: el cliente NUNCA define currency ni montos; el servidor
 * normaliza/reautentica. detectPaymentProvider elige Stripe o Mercado Pago
 * según las vars de entorno y devuelve null si ninguna está configurada
 * (graceful fallback al checkout de WhatsApp).
 *
 * Ejecutar: npm test  (node --test)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Fijar entorno ANTES del import: payments.js lee process.env al cargar el módulo.
// (node --test aísla cada archivo en su propio worker: estos cambios de env no
// escapan a las otras suites.)
process.env.STRIPE_PRICE_PRO = 'price_pro';
process.env.STRIPE_PRICE_ENTERPRISE = 'price_ent';
process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO = 'price_pro';
process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE = 'price_ent';

const { detectPaymentProvider, normalizeCurrency, planFromPriceId, SUBSCRIPTION_PLANS } = await import('../lib/payments.js');

describe('detectPaymentProvider', () => {
  it('null sin secretos de pasarela (fallback a WhatsApp)', () => {
    assert.equal(detectPaymentProvider(), null);
  });

  it('stripe cuando STRIPE_SECRET_KEY está', () => {
    // Valor dummy: solo se comprueba la PRESENCIA de la variable, nunca se usa una key real.
    process.env.STRIPE_SECRET_KEY = 'dummy-stripe-key-not-real';
    assert.equal(detectPaymentProvider(), 'stripe');
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('mercadopago cuando solo MP_ACCESS_TOKEN está (y no stripe)', () => {
    // Valor dummy: solo se comprueba la PRESENCIA de la variable, nunca se usa un token real.
    process.env.MP_ACCESS_TOKEN = 'dummy-mp-token-not-real';
    assert.equal(detectPaymentProvider(), 'mercadopago');
    delete process.env.MP_ACCESS_TOKEN;
  });
});

describe('normalizeCurrency (server-side price safety)', () => {
  it('normaliza a mayúsculas y valida monedas soportadas', () => {
    assert.equal(normalizeCurrency('dop'), 'DOP');
    assert.equal(normalizeCurrency('USD'), 'USD');
    assert.equal(normalizeCurrency('mxn'), 'MXN');
    assert.equal(normalizeCurrency('brl'), 'BRL');
  });

  it('corta a 3 letras', () => assert.equal(normalizeCurrency('usd'), 'USD'));

  it('garbage -> USD (nunca moneda arbitraria del cliente)', () => {
    assert.equal(normalizeCurrency('XXX'), 'USD');
    assert.equal(normalizeCurrency('BITCOIN'), 'USD');
    assert.equal(normalizeCurrency(''), 'DOP');
  });

  it('null/undefined -> DOP', () => {
    assert.equal(normalizeCurrency(null), 'DOP');
    assert.equal(normalizeCurrency(undefined), 'DOP');
  });
});

describe('planFromPriceId', () => {
  it('mapea price_pro -> pro', () => assert.equal(planFromPriceId('price_pro'), 'pro'));
  it('mapea price_ent -> enterprise', () => assert.equal(planFromPriceId('price_ent'), 'enterprise'));
  it('priceId desconocido -> null (no asume plan por defecto)', () => assert.equal(planFromPriceId('price_zzz'), null));
  it('null -> null', () => assert.equal(planFromPriceId(null), null));
});

describe('SUBSCRIPTION_PLANS', () => {
  it('expone pro y enterprise con priceId y monto en centavos', () => {
    assert.equal(SUBSCRIPTION_PLANS.pro.priceId, 'price_pro');
    assert.equal(SUBSCRIPTION_PLANS.pro.name, 'Pro');
    assert.equal(typeof SUBSCRIPTION_PLANS.pro.price, 'number');
    assert.equal(SUBSCRIPTION_PLANS.enterprise.priceId, 'price_ent');
    assert.equal(SUBSCRIPTION_PLANS.enterprise.name, 'Enterprise');
  });
});
