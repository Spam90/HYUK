-- ============================================================================
-- PRUEBAS NEGATIVAS — CHECK constraints de product_skus (migración 16)
-- Ejecutar: node scripts/run-sql.mjs tests/neg-sku-check.sql
-- Todo corre dentro de la transacción implícita del script: si algo inserta,
-- el error aborta la transacción y NO quedan datos.
-- ============================================================================

DO $$
DECLARE
  v_pid uuid;
BEGIN
  SELECT p.id INTO v_pid FROM public.products p LIMIT 1;
  IF v_pid IS NULL THEN
    RAISE NOTICE 'SKIP: no hay productos para probar';
    RETURN;
  END IF;

  -- TEST 1: stock negativo debe ser rechazado (check_violation 23514)
  BEGIN
    INSERT INTO public.product_skus (product_id, sku, stock) VALUES (v_pid, '__TEST__', -1);
    RAISE EXCEPTION 'FAIL: stock negativo aceptado';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: stock=-1 rechazado (23514)';
  END;

  -- TEST 2: price_override negativo debe ser rechazado
  BEGIN
    INSERT INTO public.product_skus (product_id, sku, price_override) VALUES (v_pid, '__TEST__', -5);
    RAISE EXCEPTION 'FAIL: precio negativo aceptado';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: price_override=-5 rechazado (23514)';
  END;

  -- TEST 3: sku absurdamente largo debe ser rechazado (>100)
  BEGIN
    INSERT INTO public.product_skus (product_id, sku, stock)
    VALUES (v_pid, repeat('x', 150), 1);
    RAISE EXCEPTION 'FAIL: sku de 150 chars aceptado';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: sku>100 chars rechazado (23514)';
  END;

  -- TEST 4: stock = 0 y price_override = 0 DEBEN ser válidos (no sobre-restringir)
  BEGIN
    INSERT INTO public.product_skus (product_id, sku, stock, price_override)
    VALUES (v_pid, '__TEST_OK__', 0, 0);
    RAISE NOTICE 'PASS: stock=0 y price=0 aceptados (sin sobre-restricción)';
    DELETE FROM public.product_skus WHERE sku = '__TEST_OK__';
  END;
END $$;
