-- ============================================================================
-- PRUEBAS FUNCIONALES PROMPT 10 — inventario, idempotencia y precios
-- Ejecutar con: node scripts/run-sql.mjs tests/prompt10-inventory-test.sql
-- TODO corre dentro de BEGIN/ROLLBACK: no deja datos en producción.
-- Casos: D (precio manipulado), cantidades inválidas, E (stock insuficiente),
-- F/idempotencia (doble decremento), restauración idempotente, ownership.
-- ============================================================================
BEGIN;

CREATE TEMP TABLE test_results (id serial, name text, outcome text);

DO $outer$
DECLARE
  v_store  uuid;
  v_prod   uuid;
  v_sku    uuid;
  v_order  uuid;
  v_order2 uuid;
  v_stock  int;
  v_total  numeric;
  v_res    jsonb;
BEGIN
  SELECT id INTO v_store FROM public.profiles ORDER BY id LIMIT 1;
  IF v_store IS NULL THEN
    RAISE NOTICE 'SIN STORES EN BD: pruebas no ejecutables';
    RETURN;
  END IF;

  -- FIXTURE: producto + sku con stock 1
  INSERT INTO public.products (store_id, name, price)
  VALUES (v_store, '__test_prompt10', 100)
  RETURNING id INTO v_prod;

  INSERT INTO public.product_skus (product_id, sku, stock, active)
  VALUES (v_prod, 'TEST-P10', 1, true)
  RETURNING id INTO v_sku;

  ---------------------------------------------------------------------------
  -- CASO D: precio manipulado por el navegador (total=1, price=0.01)
  ---------------------------------------------------------------------------
  INSERT INTO public.orders (store_id, customer_name, status, payment_status, items, total_amount, currency)
  VALUES (v_store, '__test', 'pending', 'pending',
          jsonb_build_array(jsonb_build_object('id', v_prod, 'name', '__test', 'quantity', 1, 'price', 0.01)),
          1, 'DOP')
  RETURNING id INTO v_order;

  SELECT total_amount INTO v_total FROM public.orders WHERE id = v_order;
  INSERT INTO test_results (name, outcome) VALUES ('CASO_D_precio_manipulado',
    CASE WHEN v_total <> 1
         THEN 'OK — servidor recalculó total=' || v_total::text || ' (cliente envió 1)'
         ELSE 'FALLO — total=1 del cliente fue aceptado' END);

  ---------------------------------------------------------------------------
  -- CANTIDAD INVÁLIDA (-5) debe ser rechazada por el trigger de integridad
  ---------------------------------------------------------------------------
  BEGIN
    INSERT INTO public.orders (store_id, customer_name, status, payment_status, items, total_amount, currency)
    VALUES (v_store, '__test', 'pending', 'pending',
            jsonb_build_array(jsonb_build_object('id', v_prod, 'quantity', -5, 'price', 100)),
            0, 'DOP');
    INSERT INTO test_results (name, outcome) VALUES ('CANTIDAD_INVALIDA', 'FALLO — pedido con quantity=-5 aceptado');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results (name, outcome) VALUES ('CANTIDAD_INVALIDA', 'OK — rechazado: ' || SQLERRM);
  END;

  ---------------------------------------------------------------------------
  -- CASO E: stock insuficiente (pide 5, hay 1) → NO se realiza el pedido
  ---------------------------------------------------------------------------
  INSERT INTO public.orders (store_id, customer_name, status, payment_status, items, total_amount, currency)
  VALUES (v_store, '__test', 'pending', 'pending',
          jsonb_build_array(jsonb_build_object('id', v_prod, 'name', '__test', 'quantity', 5, 'price', 100)),
          500, 'DOP')
  RETURNING id INTO v_order2;

  BEGIN
    v_res := public.decrement_order_stock(v_order2);
    INSERT INTO test_results (name, outcome) VALUES ('CASO_E_stock_insuficiente', 'FALLO — decrementó sin stock: ' || v_res::text);
  EXCEPTION WHEN OTHERS THEN
    SELECT stock INTO v_stock FROM public.product_skus WHERE id = v_sku;
    INSERT INTO test_results (name, outcome) VALUES ('CASO_E_stock_insuficiente',
      'OK — rechazado: ' || SQLERRM || ' | stock intacto=' || v_stock::text);
  END;

  ---------------------------------------------------------------------------
  -- CASO F: decremento válido + IDEMPOTENCIA (mismo pedido procesado 2 veces)
  ---------------------------------------------------------------------------
  v_res := public.decrement_order_stock(v_order);
  SELECT stock INTO v_stock FROM public.product_skus WHERE id = v_sku;
  INSERT INTO test_results (name, outcome) VALUES ('CASO_F_decremento',
    CASE WHEN v_stock = 0 THEN 'OK — stock descontado a 0' ELSE 'FALLO — stock=' || v_stock::text END);

  v_res := public.decrement_order_stock(v_order);
  SELECT stock INTO v_stock FROM public.product_skus WHERE id = v_sku;
  INSERT INTO test_results (name, outcome) VALUES ('CASO_F_idempotencia',
    CASE WHEN v_res->>'status' = 'already_processed' AND v_stock = 0
         THEN 'OK — 2ª llamada no volvió a descontar (stock sigue 0)'
         ELSE 'FALLO — status=' || COALESCE(v_res->>'status','?') || ' stock=' || v_stock::text END);

  ---------------------------------------------------------------------------
  -- RESTAURACIÓN IDEMPOTENTE (cancelación repetida no duplica stock)
  ---------------------------------------------------------------------------
  v_res := public.restore_order_stock(v_order);
  SELECT stock INTO v_stock FROM public.product_skus WHERE id = v_sku;
  INSERT INTO test_results (name, outcome) VALUES ('RESTORE_cancelacion',
    CASE WHEN v_stock = 1 THEN 'OK — stock repuesto a 1' ELSE 'FALLO — stock=' || v_stock::text END);

  v_res := public.restore_order_stock(v_order);
  SELECT stock INTO v_stock FROM public.product_skus WHERE id = v_sku;
  INSERT INTO test_results (name, outcome) VALUES ('RESTORE_idempotencia',
    CASE WHEN v_stock = 1
         THEN 'OK — 2ª cancelación no volvió a sumar (stock sigue 1)'
         ELSE 'FALLO — stock=' || v_stock::text || ' (se sumó dos veces)' END);

  ---------------------------------------------------------------------------
  -- OWNERSHIP a nivel función: JWT de otra tienda → order_not_yours
  ---------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  BEGIN
    v_res := public.decrement_order_stock(v_order);
    INSERT INTO test_results (name, outcome) VALUES ('OWNERSHIP_funcion', 'FALLO — tienda ajena pudo descontar');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results (name, outcome) VALUES ('OWNERSHIP_funcion', 'OK — rechazado: ' || SQLERRM);
  END;
  -- Restaurar contexto (sin JWT) para las siguientes pruebas
  PERFORM set_config('request.jwt.claims', '', true);

END $outer$;

-- ============================================================================
-- RLS multi-tenant: usuario autenticado de otra tienda NO modifica SKUs ajenos
-- ============================================================================
DO $rls$
DECLARE
  v_store_a uuid;
  v_store_b uuid;
  v_prod_b  uuid;
  v_sku_b   uuid;
  v_updated int;
BEGIN
  SELECT id INTO v_store_a FROM public.profiles ORDER BY id LIMIT 1;
  SELECT id INTO v_store_b FROM public.profiles ORDER BY id DESC LIMIT 1;
  IF v_store_a IS NULL OR v_store_b IS NULL OR v_store_a = v_store_b THEN
    INSERT INTO test_results (name, outcome) VALUES ('RLS_cross_tenant', 'OMITIDA — se necesita más de una tienda');
    RETURN;
  END IF;

  INSERT INTO public.products (store_id, name, price) VALUES (v_store_b, '__test_b', 10)
  RETURNING id INTO v_prod_b;
  INSERT INTO public.product_skus (product_id, sku, stock, active)
  VALUES (v_prod_b, 'TEST-B', 3, true)
  RETURNING id INTO v_sku_b;

  -- Sesión como usuario de la tienda A con RLS activo
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_store_a, 'role', 'authenticated')::text, true);

  UPDATE public.product_skus SET stock = 999 WHERE id = v_sku_b;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  PERFORM set_config('request.jwt.claims', '', true);
  RESET ROLE;

  INSERT INTO test_results (name, outcome) VALUES ('RLS_cross_tenant',
    CASE WHEN v_updated = 0
         THEN 'OK — tienda A no pudo modificar SKU de tienda B (0 filas)'
         ELSE 'FALLO — tienda A modificó ' || v_updated::text || ' SKU ajeno' END);
END $rls$;

SELECT name, outcome FROM test_results ORDER BY id;

ROLLBACK;

