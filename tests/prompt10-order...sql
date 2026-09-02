-- ============================================================================
-- TEST PROMPT 10 — TRANSICIONES ATÓMICAS DE PEDIDOS (migración 17)
-- node scripts/run-sql.mjs tests/prompt10-orders-transitions-test.sql
-- Todo dentro de BEGIN/ROLLBACK: no deja datos en producción.
-- NOTA: se usa concat() en vez de 'literal'|| var para evitar que Postgres
-- resuelva 'literal'||jsonb->>'k' con el operador jsonb||text (parsea JSON).
-- ============================================================================

BEGIN;

CREATE TEMP TABLE tr (id serial, name text, outcome text);

DO $t$
DECLARE
  v_store  uuid;
  v_other  uuid;
  v_prod   uuid;
  v_sku    uuid;
  v_o      uuid;
  v_o2     uuid;
  v_o3     uuid;
  v_r      jsonb;
  v_stock  int;
  v_total  numeric;
  v_status text;
  v_n      int;
BEGIN
  SELECT id INTO v_store FROM public.profiles ORDER BY id LIMIT 1;
  IF v_store IS NULL THEN
    INSERT INTO tr (name,outcome) VALUES ('FIXTURE','SIN STORES: no ejecutables');
    RETURN;
  END IF;
  v_other := '99999999-9999-9999-9999-999999999999';

  INSERT INTO public.products (store_id, name, price)
  VALUES (v_store, '__test_p10_orders', 100)
  RETURNING id INTO v_prod;
  INSERT INTO public.product_skus (product_id, sku, stock, active)
  VALUES (v_prod, 'TEST-P10O', 3, true)
  RETURNING id INTO v_sku;

  ----------------------------------------------------------------------------
  -- 1) create_order_with_items ignora price del navegador (total=BD)
  ----------------------------------------------------------------------------
  v_r := public.create_order_with_items(
    v_store,
    jsonb_build_array(jsonb_build_object('id', v_prod::text, 'quantity', 2, 'price', 0.01)),
    '__test', NULL, NULL, NULL, NULL, NULL, 'supabase', 'DOP', NULL, NULL);
  IF (v_r->>'ok') <> 'true' THEN
    INSERT INTO tr VALUES (default,'CREAR_ATOMICO', concat('FALLO - ', v_r::text));
    RETURN;
  END IF;
  SELECT (v_r->'order'->>'id')::uuid INTO v_o;
  SELECT total_amount INTO v_total FROM public.orders WHERE id = v_o;
  INSERT INTO tr VALUES (default,'PRECIO_REAL',
    CASE WHEN v_total = 200 THEN concat('OK - total=', v_total, ' (nav envió 0.01)')
         ELSE concat('FALLO - total=', v_total) END);

  -- 2) order_items con snapshots desde BD
  SELECT count(*) INTO v_n FROM public.order_items WHERE order_id = v_o;
  INSERT INTO tr VALUES (default,'ORDER_ITEMS_SNAPSHOT',
    CASE WHEN v_n >= 1 THEN concat('OK - ', v_n, ' linea(s)') ELSE 'FALLO - 0 order_items' END);

  ----------------------------------------------------------------------------
  -- 3) Transiciones válidas
  ----------------------------------------------------------------------------
  v_r := public.set_order_status(v_o, 'preparing');
  INSERT INTO tr VALUES (default,'T_pending_preparing',
    CASE WHEN v_r->>'ok'='true' THEN 'OK' ELSE concat('FALLO - ', v_r->>'error') END);
  v_r := public.set_order_status(v_o, 'completed');
  INSERT INTO tr VALUES (default,'T_preparing_completed',
    CASE WHEN v_r->>'ok'='true' THEN 'OK' ELSE concat('FALLO - ', v_r->>'error') END);

  ----------------------------------------------------------------------------
  -- 4) Transiciones inválidas: completed→cancelled y pending→completed → 409
  ----------------------------------------------------------------------------
  v_r := public.set_order_status(v_o, 'cancelled');
  INSERT INTO tr VALUES (default,'T_completed_cancelled_DENY',
    CASE WHEN v_r->>'ok'='false' AND v_r->>'error'='invalid_order_transition'
         THEN 'OK - denegada' ELSE concat('FALLO - ', v_r::text) END);

  v_r := public.create_order_with_items(v_store,
    jsonb_build_array(jsonb_build_object('id', v_prod::text, 'quantity', 1)),
    '__test',NULL,NULL,NULL,NULL,NULL,'supabase','DOP',NULL,NULL);
  SELECT (v_r->'order'->>'id')::uuid INTO v_o2;
  v_r := public.set_order_status(v_o2, 'completed');
  -- pending→completed DENY
  INSERT INTO tr VALUES (default,'T_pending_completed_DENY', -- placeholder
  NULL);