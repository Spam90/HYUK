/**
 * TESTS DE VALIDACIÓN DE ENTRADA — lib/sku-validation.mjs (PROMPT 9, FASE 3/17)
 * Ejecutar: node tests/sku-validation.test.mjs
 * Sin dependencias: usa assert de node y el módulo real que usa la API.
 */
import assert from 'node:assert/strict';
import { parseStock, parsePrice, parseText } from '../lib/sku-validation.mjs';

let pass = 0;
let fail = 0;
const cases = [];

function t(name, fn) {
  cases.push({ name, fn });
}

// ---------------- parseStock ----------------
t('stock: undefined no toca el campo', () => assert.equal(parseStock(undefined), undefined));
t('stock: null/"" no toca el campo', () => {
  assert.equal(parseStock(null), undefined);
  assert.equal(parseStock(''), undefined);
});
t('stock: 0 válido', () => assert.equal(parseStock(0), 0));
t('stock: 7 válido', () => assert.equal(parseStock(7), 7));
t('stock: "5" string numérica válida', () => assert.equal(parseStock('5'), 5));
t('stock: -1 RECHAZADO', () => assert.equal(parseStock(-1), null));
t('stock: NaN RECHAZADO', () => assert.equal(parseStock(NaN), null));
t('stock: Infinity RECHAZADO', () => assert.equal(parseStock(Infinity), null));
t('stock: "abc" RECHAZADO', () => assert.equal(parseStock('abc'), null));
t('stock: "10abc" RECHAZADO', () => assert.equal(parseStock('10abc'), null));
t('stock: 1.5 RECHAZADO', () => assert.equal(parseStock(1.5), null));
t('stock: 1000000 RECHAZADO (fuera de rango)', () => assert.equal(parseStock(1000000), null));

// ---------------- parsePrice ----------------
t('price: undefined no toca el campo', () => assert.equal(parsePrice(undefined), undefined));
t('price: null → explícitamente inválido en update', () => assert.equal(parsePrice(null), null));
t('price: 0 válido', () => assert.equal(parsePrice(0), 0));
t('price: 12.99 válido y redondeado', () => assert.equal(parsePrice(12.99), 12.99));
t('price: -5 RECHAZADO', () => assert.equal(parsePrice(-5), null));
t('price: NaN RECHAZADO', () => assert.equal(parsePrice(NaN), null));
t('price: Infinity RECHAZADO', () => assert.equal(parsePrice(Infinity), null));
t('price: "abc" RECHAZADO', () => assert.equal(parsePrice('abc'), null));
t('price: 1e10 RECHAZADO (fuera de dominio)', () => assert.equal(parsePrice(1e10), null));

// ---------------- parseText ----------------
t('text: undefined no toca el campo', () => assert.equal(parseText(undefined, 100), undefined));
t('text: null → inválido', () => assert.equal(parseText(null, 100), null));
t('text: "" → inválido', () => assert.equal(parseText('', 100), null));
t('text: "ABC-01" válido y trim', () => assert.equal(parseText('  ABC-01  ', 100), 'ABC-01'));
t('text: 151 chars con límite 100 RECHAZADO', () => assert.equal(parseText('x'.repeat(151), 100), null));
t('text: número (no string) RECHAZADO', () => assert.equal(parseText(123, 100), null));

for (const { name, fn } of cases) {
  try {
    fn();
    pass += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    fail += 1;
    console.error(`  FAIL  ${name} → ${err.message}`);
  }
}

console.log(`\nResultado: ${pass} PASS / ${fail} FAIL de ${cases.length} casos`);
if (fail > 0) process.exit(1);
