/**
 * Tests para lib/rate-limit.js — rate limiter de ventana deslizante y helpers.
 * Puro, determinista (usa Date.now internamente pero en un tight loop dentro de
 * la misma ventana), sin I/O ni secretos.
 *
 * Ejecutar: npm test  (node --test)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter, clientIp, rateLimitResponse } from '../lib/rate-limit.js';

describe('createRateLimiter (ventana deslizante)', () => {
  it('permite hasta `limit` y rechaza el exceso (429 lógico)', () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 60000 });
    assert.equal(rl.check('a').ok, true);
    assert.equal(rl.check('a').ok, true);
    const third = rl.check('a');
    assert.equal(third.ok, true);
    assert.equal(third.remaining, 0);
    const over = rl.check('a');
    assert.equal(over.ok, false);
    assert.equal(over.remaining, 0);
    assert.ok(over.retryAfter > 0);
  });

  it('reset libera el cupo', () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 60000 });
    rl.check('x');
    rl.check('x');
    assert.equal(rl.check('x').ok, false);
    rl.reset('x');
    assert.equal(rl.check('x').ok, true);
  });

  it('claves independientes', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60000 });
    assert.equal(rl.check('a').ok, true);
    assert.equal(rl.check('a').ok, false);
    assert.equal(rl.check('b').ok, true);
  });

  it('valores por defecto (limit 30) toleran un uso normal', () => {
    const rl = createRateLimiter();
    let ok = true;
    for (let i = 0; i < 30; i++) {
      if (!rl.check('default-ip').ok) ok = false;
    }
    assert.equal(ok, true);
    assert.equal(rl.check('default-ip').ok, false);
  });
});

describe('clientIp (respetando proxies)', () => {
  const req = (headers) => ({ headers: { get: (k) => headers[k] ?? null } });

  it('toma el primer salto de x-forwarded-for', () => {
    assert.equal(clientIp(req({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })), '1.2.3.4');
  });

  it('usa x-real-ip como fallback', () => {
    assert.equal(clientIp(req({ 'x-real-ip': '9.9.9.9' })), '9.9.9.9');
  });

  it('unknown sin headers', () => {
    assert.equal(clientIp(req({})), 'unknown');
  });
});

describe('rateLimitResponse', () => {
  it('devuelve 429 con Retry-After y Content-Type JSON', () => {
    const res = rateLimitResponse(42);
    assert.equal(res.status, 429);
    assert.equal(res.headers.get('Retry-After'), '42');
    assert.equal(res.headers.get('Content-Type'), 'application/json');
  });
});
