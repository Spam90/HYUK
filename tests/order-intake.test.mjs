/**
 * Tests de la capa de intake de pedidos (lib/order-intake.mjs).
 *
 * Cubre el contrato de `POST /api/orders` SIN red ni base de datos:
 *  - creación de pedido válido (normalización de campos);
 *  - cantidades manipuladas y límites de items;
 *  - precios/nombres del cliente descartados (la BD es la autoridad);
 *  - tienda requerida y coherencia de slug;
 *  - clave de idempotencia (formato);
 *  - tienda cerrada;
 *  - proyección mínima devuelta al cliente (sin PII ni ids de pago).
 *
 * Ejecutar: npm test  (node --test)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ORDER_LIMITS,
  normalizeOrderRequest,
  normalizeIdempotencyKey,
  normalizeSlug,
  orderErrorStatus,
  pickClientOrder,
  isStoreOpenForOrders,
} from '../lib/order-intake.mjs';

const PRODUCT_ID = '11111111-2222-3333-4444-555555555555';

const validBody = (overrides = {}) => ({
  storeId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  items: [{ id: PRODUCT_ID, quantity: 2 }],
  customerName: 'Ana',
  customerPhone: '8095551234',
  deliveryMethod: 'A domicilio',
  deliveryZone: 'Centro',
  paymentMethod: 'Efectivo',
  couponCode: ' promo10 ',
  currency: 'dop',
  notes: 'sin cebolla',
  ...overrides,
});

describe('normalizeOrderRequest — creación de pedido', () => {
  it('acepta un pedido válido y normaliza los campos', () => {
    const res = normalizeOrderRequest(validBody());
    assert.equal(res.ok, true);
    assert.equal(res.value.storeId, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    assert.equal(res.value.couponCode, 'PROMO10');
    assert.equal(res.value.currency, 'DOP');
    assert.equal(res.value.paymentProvider, 'supabase');
    assert.equal(res.value.customerName, 'Ana');
    assert.equal(res.value.items.length, 1);
    assert.equal(res.value.items[0].quantity, 2);
  });

  it('descarta precios, nombres y totales enviados por el cliente', () => {
    const res = normalizeOrderRequest(validBody({
      total: 1,
      items: [{
        id: PRODUCT_ID,
        quantity: 1,
        price: 99999,
        total_price: 0.01,
        name: 'Producto hackeado',
        selectedOptions: [{ label: 'Grande', priceDelta: -9999 }],
      }],
    }));

    assert.equal(res.ok, true);
    const item = res.value.items[0];
    assert.deepEqual(
      Object.keys(item).sort(),
      ['id', 'quantity', 'selectedOptions', 'sku', 'skuId']
    );
    assert.equal(item.price, undefined);
    assert.equal(item.name, undefined);
    assert.equal(item.total_price, undefined);
    // El priceDelta del cliente no viaja: la BD recalcula con el suyo.
    assert.deepEqual(item.selectedOptions, [{ label: 'Grande', groupLabel: null }]);
    assert.equal(res.value.total, undefined);
  });

  it('rechaza pedidos sin productos', () => {
    for (const items of [undefined, null, [], 'x', {}]) {
      const res = normalizeOrderRequest(validBody({ items }));
      assert.equal(res.ok, false);
      assert.equal(res.code, 'order_items_empty');
      assert.equal(res.status, 400);
    }
  });

  it('rechaza más de MAX_ITEMS productos', () => {
    const items = Array.from({ length: ORDER_LIMITS.MAX_ITEMS + 1 }, () => ({
      id: PRODUCT_ID,
      quantity: 1,
    }));
    const res = normalizeOrderRequest(validBody({ items }));
    assert.equal(res.ok, false);
    assert.equal(res.code, 'order_items_too_many');
  });

  it('rechaza cantidades manipuladas', () => {
    for (const quantity of [0, -1, 1.5, 100, 999999, 'abc', null, undefined, NaN]) {
      const res = normalizeOrderRequest(validBody({ items: [{ id: PRODUCT_ID, quantity }] }));
      assert.equal(res.ok, false, `cantidad aceptada: ${quantity}`);
      assert.equal(res.code, 'order_quantity_invalid');
      assert.equal(res.status, 400);
    }
  });

  it('acepta cantidades válidas en los extremos', () => {
    const low = normalizeOrderRequest(validBody({ items: [{ id: PRODUCT_ID, quantity: 1 }] }));
    const high = normalizeOrderRequest(validBody({ items: [{ id: PRODUCT_ID, quantity: 99 }] }));
    assert.equal(low.ok, true);
    assert.equal(high.ok, true);
  });

  it('rechaza productos sin identificador válido', () => {
    for (const id of [undefined, null, '', '   ', 42, 'a;b', 'x'.repeat(ORDER_LIMITS.MAX_ID + 1)]) {
      const res = normalizeOrderRequest(validBody({ items: [{ id, quantity: 1 }] }));
      assert.equal(res.ok, false, `id aceptado: ${String(id)}`);
      assert.equal(res.code, 'order_items_invalid');
    }
  });

  it('rechaza SKUs y opciones inválidas', () => {
    const badSku = normalizeOrderRequest(validBody({
      items: [{ id: PRODUCT_ID, quantity: 1, skuId: 'sku con espacios' }],
    }));
    assert.equal(badSku.code, 'order_items_invalid');

    const badOption = normalizeOrderRequest(validBody({
      items: [{ id: PRODUCT_ID, quantity: 1, selectedOptions: [{ label: '' }] }],
    }));
    assert.equal(badOption.code, 'order_option_invalid');

    const tooManyOptions = normalizeOrderRequest(validBody({
      items: [{
        id: PRODUCT_ID,
        quantity: 1,
        selectedOptions: Array.from(
          { length: ORDER_LIMITS.MAX_OPTIONS_PER_ITEM + 1 },
          () => ({ label: 'x' })
        ),
      }],
    }));
    assert.equal(tooManyOptions.code, 'order_option_invalid');
  });

  it('exige identificar la tienda (storeId o slug)', () => {
    const noStore = normalizeOrderRequest({ items: [{ id: PRODUCT_ID, quantity: 1 }] });
    assert.equal(noStore.ok, false);
    assert.equal(noStore.code, 'store_required');

    const bySlug = normalizeOrderRequest({
      slug: ' Mi-Tienda ',
      items: [{ id: PRODUCT_ID, quantity: 1 }],
    });
    assert.equal(bySlug.ok, true);
    assert.equal(bySlug.value.slug, 'mi-tienda');
    assert.equal(bySlug.value.storeId, null);
  });

  it('rechaza payloads que no son objeto', () => {
    for (const body of [null, undefined, 'x', 42, []]) {
      const res = normalizeOrderRequest(body);
      assert.equal(res.ok, false);
      assert.equal(res.code, 'order_payload_invalid');
    }
  });

  it('acota la longitud de los textos', () => {
    const res = normalizeOrderRequest(validBody({
      customerName: 'x'.repeat(ORDER_LIMITS.MAX_NAME + 1),
    }));
    assert.equal(res.ok, false);
    assert.equal(res.code, 'order_payload_invalid');
    assert.equal(res.status, 400);
  });

describe('normalizeIdempotencyKey / normalizeSlug', () => {
  it('normaliza una clave válida', () => {
    assert.equal(normalizeIdempotencyKey('  9f8e7d6c-1a2b  '), '9f8e7d6c-1a2b');
    assert.equal(normalizeIdempotencyKey(''), null);
    assert.equal(normalizeIdempotencyKey(null), null);
  });

  it('rechaza claves demasiado cortas, largas o con caracteres raros', () => {
    assert.equal(normalizeIdempotencyKey('abc'), 'invalid');
    assert.equal(normalizeIdempotencyKey('x'.repeat(ORDER_LIMITS.MAX_IDEMPOTENCY + 1)), 'invalid');
    assert.equal(normalizeIdempotencyKey('clave con espacios'), 'invalid');
    assert.equal(normalizeIdempotencyKey(42), 'invalid');
  });

  it('la clave inválida se rechaza en el payload completo', () => {
    const res = normalizeOrderRequest(validBody({ idempotencyKey: 'no vale' }));
    assert.equal(res.ok, false);
    assert.equal(res.code, 'idempotency_key_invalid');
  });

  it('normaliza slug y descarta formatos inválidos', () => {
    assert.equal(normalizeSlug('Mi-Tienda'), 'mi-tienda');
    assert.equal(normalizeSlug('-mal'), null);
    assert.equal(normalizeSlug('con espacios'), null);
    assert.equal(normalizeSlug('MAYUS'), 'mayus');
    assert.equal(normalizeSlug(null), null);
  });
});

describe('isStoreOpenForOrders (validación server-side de tienda cerrada)', () => {
  it('cerrada solo cuando is_open === false', () => {
    assert.equal(isStoreOpenForOrders(false), false);
  });

  it('abierta con true, null o undefined (esquemas sin la columna)', () => {
    assert.equal(isStoreOpenForOrders(true), true);
    assert.equal(isStoreOpenForOrders(null), true);
    assert.equal(isStoreOpenForOrders(undefined), true);
  });
});

describe('orderErrorStatus', () => {
  it('mapea códigos de negocio a HTTP', () => {
    assert.equal(orderErrorStatus('store_closed'), 409);
    assert.equal(orderErrorStatus('order_in_progress'), 409);
    assert.equal(orderErrorStatus('order_coupon_invalid'), 409);
    assert.equal(orderErrorStatus('order_insufficient_stock'), 409);
    assert.equal(orderErrorStatus('store_not_found'), 404);
    assert.equal(orderErrorStatus('store_mismatch'), 403);
    assert.equal(orderErrorStatus('rate_limited'), 429);
    assert.equal(orderErrorStatus('order_quantity_invalid'), 400);
    assert.equal(orderErrorStatus('schema_pending'), 503);
  });

  it('código desconocido → 500', () => {
    assert.equal(orderErrorStatus('lo_que_sea'), 500);
    assert.equal(orderErrorStatus(null), 500);
  });
});

describe('pickClientOrder (proyección mínima)', () => {
  const dbOrder = {
    id: 'order-1',
    created_at: '2026-01-01T00:00:00Z',
    status: 'pending',
    payment_status: 'pending',
    currency: 'DOP',
    total_amount: 350,
    delivery_fee: 100,
    discount_amount: 50,
    delivery_zone: 'Centro',
    coupon_code: 'PROMO10',
    items: [{ id: PRODUCT_ID, name: 'Pizza', quantity: 1, price: 300 }],
    tracking_token: 'tok-123',
    // Campos que NO deben salir al cliente:
    store_id: 'store-secreto',
    customer_phone: '8095551234',
    customer_name: 'Ana',
    delivery_address: 'Calle 1',
    payment_intent_id: 'pi_123',
    stripe_session_id: 'cs_123',
    idempotency_key: 'key-1',
  };

  it('devuelve solo lo necesario', () => {
    const order = pickClientOrder(dbOrder);
    assert.deepEqual(Object.keys(order).sort(), [
      'coupon_code',
      'created_at',
      'currency',
      'delivery_fee',
      'delivery_zone',
      'discount_amount',
      'id',
      'items',
      'payment_status',
      'status',
      'total_amount',
      'tracking_token',
    ]);
    assert.equal(order.total_amount, 350);
    assert.equal(order.tracking_token, 'tok-123');
  });

  it('no filtra PII ni identificadores internos de pago', () => {
    const serialized = JSON.stringify(pickClientOrder(dbOrder));
    assert.equal(serialized.includes('8095551234'), false);
    assert.equal(serialized.includes('pi_123'), false);
    assert.equal(serialized.includes('cs_123'), false);
    assert.equal(serialized.includes('store-secreto'), false);
    assert.equal(serialized.includes('key-1'), false);
  });

  it('tolera pedidos sin items o vacíos', () => {
    assert.deepEqual(pickClientOrder({ id: 'x' }).items, []);
    assert.equal(pickClientOrder(null), null);
  });
});
