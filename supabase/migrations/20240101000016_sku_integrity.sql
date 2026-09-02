-- ============================================================================
-- MIGRACIÓN 20240101000016 — PROMPT 9: INTEGRIDAD DE SKUs (STOCK Y PRECIOS)
-- ============================================================================
-- Estado verificado en BD real antes de aplicar (FASE 17 de la auditoría):
--   SELECT count(*) FILTER (WHERE stock < 0) FROM product_skus;          → 0
--   SELECT count(*) FILTER (WHERE price_override < 0) FROM product_skus; → 0
--   → sin datos inconsistentes: los CHECK se pueden aplicar sin riesgo.
--
-- Añade a nivel BD lo que la API no puede garantizar sola:
--   1) stock >= 0                (imposible stock negativo, ni vía API ni
--                                 vía SQL directo / service-role)
--   2) price_override >= 0       (sin precios negativos)
--   3) precio con tope razonable (9,999,999.99)
--   4) longitud máxima de sku / variant_label (evita strings absurdos)
-- Idempotente: comprueba pg_constraint antes de crear cada CHECK.
-- ============================================================================

DO $$
BEGIN
  -- 0) La migración 09 diseñaba variant_label, pero nunca llegó a la BD real.
  --    El endpoint la escribe/lee: sin esta columna TODO POST de SKU fallaría
  --    (PGRST204). Alinea la BD con el diseño existente. Idempotente.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='product_skus' AND column_name='variant_label'
  ) THEN
    ALTER TABLE public.product_skus ADD COLUMN variant_label TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.product_skus'::regclass AND conname = 'product_skus_stock_nonneg'
  ) THEN
    ALTER TABLE public.product_skus
      ADD CONSTRAINT product_skus_stock_nonneg CHECK (stock >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.product_skus'::regclass AND conname = 'product_skus_price_override_valid'
  ) THEN
    ALTER TABLE public.product_skus
      ADD CONSTRAINT product_skus_price_override_valid
      CHECK (price_override IS NULL OR (price_override >= 0 AND price_override <= 9999999.99));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.product_skus'::regclass AND conname = 'product_skus_sku_len'
  ) THEN
    ALTER TABLE public.product_skus
      ADD CONSTRAINT product_skus_sku_len CHECK (sku IS NULL OR length(sku) <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.product_skus'::regclass AND conname = 'product_skus_variant_label_len'
  ) THEN
    ALTER TABLE public.product_skus
      ADD CONSTRAINT product_skus_variant_label_len
      CHECK (variant_label IS NULL OR length(variant_label) <= 200);
  END IF;
END $$;

-- ============================================================================
-- VERIFICACIÓN POST-EJECUCIÓN:
--   SELECT conname FROM pg_constraint
--    WHERE conrelid='public.product_skus'::regclass AND contype='c';  -- 4
-- ============================================================================
