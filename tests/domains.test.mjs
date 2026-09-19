/**
 * Tests para lib/domains/index.js — resolución de subdominios/dominios (puro).
 *
 * ROOT_DOMAIN se lee del entorno al IMPORTAR el módulo, por eso fijamos
 * NEXT_PUBLIC_ROOT_DOMAIN antes del import dinámico (top-level await).
 *
 * Ejecutar: npm test  (node --test)
 */
process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'hyuk.app';

const {
  SYSTEM_SUBDOMAINS,
  normalizeHost,
  isPlatformHost,
  extractSubdomain,
  isSystemSubdomain,
  buildStoreUrl,
  buildFallbackUrl,
} = await import('../lib/domains/index.js');

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('normalizeHost', () => {
  it('quita el puerto y pasa a minúsculas', () => {
    assert.equal(normalizeHost('MiTienda.HYUK.app:3000'), 'mitienda.hyuk.app');
  });
  it('tolera null/undefined', () => {
    assert.equal(normalizeHost(null), '');
    assert.equal(normalizeHost(undefined), '');
  });
});

describe('isSystemSubdomain', () => {
  it('reconoce los reservados del sistema', () => {
    for (const s of SYSTEM_SUBDOMAINS) assert.equal(isSystemSubdomain(s), true);
    assert.equal(isSystemSubdomain('ADMIN'), true);
  });
  it('una tienda normal no es reservada', () => {
    assert.equal(isSystemSubdomain('mitienda'), false);
    assert.equal(isSystemSubdomain(''), false);
  });
});

describe('isPlatformHost', () => {
  it('el dominio raíz es de plataforma', () => {
    assert.equal(isPlatformHost('hyuk.app'), true);
  });
  it('un subdominio del raíz es de plataforma', () => {
    assert.equal(isPlatformHost('mitienda.hyuk.app'), true);
  });
  it('un dominio externo no es de plataforma', () => {
    assert.equal(isPlatformHost('otro.com'), false);
  });
});

describe('extractSubdomain', () => {
  it('extrae el subdominio de tienda', () => {
    assert.equal(extractSubdomain('mitienda.hyuk.app'), 'mitienda');
  });
  it('ignora subdominios del sistema', () => {
    assert.equal(extractSubdomain('admin.hyuk.app'), null);
  });
  it('el dominio raíz no tiene subdominio', () => {
    assert.equal(extractSubdomain('hyuk.app'), null);
  });
  it('soporta desarrollo local (slug.localhost)', () => {
    assert.equal(extractSubdomain('mitienda.localhost'), 'mitienda');
    assert.equal(extractSubdomain('admin.localhost'), null);
  });
  it('dominios personalizados → null', () => {
    assert.equal(extractSubdomain('mitienda.com'), null);
  });
});

describe('buildStoreUrl / buildFallbackUrl', () => {
  it('construye la URL por subdominio', () => {
    assert.equal(buildStoreUrl('mitienda'), 'mitienda.hyuk.app');
  });
  it('construye la URL de respaldo /slug', () => {
    const url = buildFallbackUrl('mitienda', 'http://localhost:3000/x');
    assert.equal(url.pathname, '/mitienda');
  });
});
