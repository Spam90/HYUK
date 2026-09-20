/**
 * Tests para lib/tenant.js — resolución de tenant (slug -> store_id) y
 * onboarding gate. Multi-tenant / seguridad: aislamiento por tienda, cache
 * best-effort y negativo.
 *
 * getStoreIdBySlug acepta un cliente inyectable, por lo que NO necesita Supabase
 * real (se inyecta un fake). No hay I/O ni secretos.
 *
 * Ejecutar: npm test  (node --test)
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { clearTenantCache, isOnboarded, getStoreIdBySlug } from '../lib/tenant.js';

// Cliente fake encadenable: .from().select().eq(field,value).maybeSingle()
function countingClient({ row = null, captures = {} } = {}) {
  let calls = 0;
  const client = {
    from() {
      return {
        select() {
          return {
            eq(field, value) {
              captures.eq = { field, value };
              return {
                maybeSingle: async () => {
                  calls += 1;
                  return { data: row, error: null };
                },
              };
            },
          };
        },
      };
    },
    _calls: () => calls,
  };
  return client;
}

describe('isOnboarded (gate de onboarding multi-tenant)', () => {
  it('true cuando settings.onboarded', () =>
    assert.equal(isOnboarded({ settings: { onboarded: true } }), true));
  it('false cuando settings sin onboarded', () => assert.equal(isOnboarded({ settings: {} }), false));
  it('false cuando falta settings', () => assert.equal(isOnboarded({}), false));
  it('false con perfil nulo (no lanza)', () => assert.equal(isOnboarded(null), false));
});

describe('getStoreIdBySlug (store-scoped + cache best-effort)', () => {
  beforeEach(() => clearTenantCache());

  it('requiere cliente y slug', async () => {
    assert.equal(await getStoreIdBySlug(null, 'tienda'), null);
    assert.equal(await getStoreIdBySlug(undefined, 'tienda'), null);
    assert.equal(await getStoreIdBySlug(countingClient({}), ''), null);
  });

  it('resuelve slug -> store_id', async () => {
    const c = countingClient({ row: { id: 'store-123' } });
    assert.equal(await getStoreIdBySlug(c, 'Tienda'), 'store-123');
  });

  it('normaliza slug a lowercase+trim (anti inyección de slug)', async () => {
    const captures = {};
    const c = countingClient({ row: { id: 's' }, captures });
    assert.equal(await getStoreIdBySlug(c, '  TIENDA  '), 's');
    assert.equal(captures.eq.value, 'tienda');
  });

  it('tienda inexistente -> null', async () => {
    const c = countingClient({ row: null });
    assert.equal(await getStoreIdBySlug(c, 'nope'), null);
  });

  it('cachea POSITIVO: 2 llamadas -> 1 query', async () => {
    const c = countingClient({ row: { id: 'cached' } });
    await getStoreIdBySlug(c, 'cached-shop');
    await getStoreIdBySlug(c, 'cached-shop');
    assert.equal(c._calls(), 1);
  });

  it('cachea NEGATIVO: missing store -> null sin re-query', async () => {
    const c = countingClient({ row: null });
    assert.equal(await getStoreIdBySlug(c, 'missing'), null);
    assert.equal(await getStoreIdBySlug(c, 'missing'), null);
    assert.equal(c._calls(), 1);
  });
});
