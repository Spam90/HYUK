/**
 * Tests para lib/orders.js — lógica PURA de pedidos (status, errores).
 *
 * Se testean SOLO las funciones puras (formatOrderStatus, getNextStatus,
 * translateOrderError, orderRpcError). Las funciones con I/O (createOrder,
 * getOrderById...) usan import lazy del cliente Supabase y no se ejecutan aquí.
 *
 * Ejecutar: npm test  (node --test)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatOrderStatus,
  getNextStatus,
  translateOrderError,
  orderRpcError,
} from '../lib/orders.js';

describe('formatOrderStatus', () => {
  it('mapea estados conocidos con label e icono', () => {
    assert.equal(formatOrderStatus('pending').label, 'Pendiente');
    assert.equal(formatOrderStatus('pending').icon, '⏳');
    assert.equal(formatOrderStatus('paid').label, 'Pagado');
    assert.equal(formatOrderStatus('preparing').label, 'En preparación');
    assert.equal(formatOrderStatus('ready').label, 'Listo para retirar');
    assert.equal(formatOrderStatus('completed').label, 'Completado');
    assert.equal(formatOrderStatus('cancelled').label, 'Cancelado');
  });

  it('estado desconocido -> fallback neutral (no colapsa la UI)', () => {
    const f = formatOrderStatus('status_custom_de_tienda');
    assert.equal(f.label, 'status_custom_de_tienda');
    assert.equal(f.icon, '📋');
  });

  it('null -> fallback neutral', () => {
    assert.equal(formatOrderStatus(null).icon, '📋');
    assert.equal(formatOrderStatus(null).label, null);
  });
});

describe('getNextStatus (máquina de estados)', () => {
  it('pending -> preparing', () => assert.equal(getNextStatus('pending'), 'preparing'));
  it('paid -> preparing', () => assert.equal(getNextStatus('paid'), 'preparing'));
  it('preparing -> completed', () => assert.equal(getNextStatus('preparing'), 'completed'));

  it('estados terminales NO son transitables (fail-fast)', () => {
    assert.equal(getNextStatus('completed'), null);
    assert.equal(getNextStatus('cancelled'), null);
    assert.equal(getNextStatus('ready'), null);
  });

  it('status inexistente/null/undefined -> null (nunca asume)', () => {
    assert.equal(getNextStatus('whatever'), null);
    assert.equal(getNextStatus(null), null);
    assert.equal(getNextStatus(undefined), null);
  });
});

describe('translateOrderError (mensajes seguros para UI)', () => {
  it('traduce códigos de negocio conocidos', () => {
    assert.equal(translateOrderError('order_not_found'), 'El pedido no existe.');
    assert.equal(translateOrderError('order_not_yours'), 'No tienes permisos sobre este pedido.');
    assert.equal(translateOrderError('invalid_order_transition'), 'Transición de estado no permitida.');
    assert.equal(translateOrderError('order_insufficient_stock'), 'Stock insuficiente para realizar esta operación.');
    assert.equal(translateOrderError('order_coupon_invalid'), 'El cupón no es válido o ya no está disponible.');
    assert.equal(translateOrderError('order_items_empty'), 'El pedido no tiene productos.');
  });

  it('código desconocido -> mensaje genérico con el código (no stack interno)', () => {
    const msg = translateOrderError('err_interno_451');
    assert.match(msg, /Error al procesar el pedido/);
    assert.match(msg, /err_interno_451/);
  });

  it('null/undefined -> mensaje genérico', () => {
    assert.equal(translateOrderError(null), 'No se pudo procesar el pedido.');
    assert.equal(translateOrderError(undefined), 'No se pudo procesar el pedido.');
  });
});

describe('orderRpcError', () => {
  it('envuelve el error con code/status y mensaje traducido', () => {
    const err = orderRpcError({ code: 'order_not_found', message: 'raw pgrst detail' }, 'fallback');
    assert.equal(err.code, 'order_not_found');
    assert.equal(err.status, 400);
    assert.equal(err.message, 'El pedido no existe.');
  });

  it('sin code -> status null y code null', () => {
    const err = orderRpcError({ message: 'algo' });
    assert.equal(err.code, null);
    assert.equal(err.status, null);
    assert.match(err.message, /Error al procesar el pedido/);
  });

  it('status explícito se respeta', () => {
    const err = orderRpcError({ code: 'order_insufficient_stock', status: 409 }, 'fallback');
    assert.equal(err.status, 409);
    assert.equal(err.code, 'order_insufficient_stock');
  });
});
