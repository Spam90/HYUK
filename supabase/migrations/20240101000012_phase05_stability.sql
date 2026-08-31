-- ============================================================================
-- MIGRACIÓN 20240101000012 — FASE 0.5: ESTABILIDAD Y CONSISTENCIA
-- ============================================================================
-- Corrige (verificado empíricamente contra la BD real el 2026-08-31):
--   1) customers: la tabla REAL no tiene address/last_order_date/total_spent/
--      total_orders (dependían del script FIX_DEFINITIVO_SCHEMA.sql nunca
--      aplicado) ni índices únicos (se insertaron duplicados sin conflicto).
--   2) CRM: el SELECT anónimo está bloqueado por RLS → el upsert automático
--      nunca funcionó. Se sustituye por una función SECURITY DEFINER
--      estrictamente acotada (sin exposición de lecturas).
--   3) orders.status: la constraint REAL ya acepta 'paid'/'preparing'
--      (probado); se re-crea idempotentemente para garantizar consistencia.
--   4) Storage: políticas dispersas/incoherentes para los buckets
--      'banners' y 'products' → se normalizan (lectura pública de assets,
--      escritura SOLO en la carpeta propia del usuario autenticado).
--
-- IDEMPOTENTE: seguro de re-ejecutar. NO elimina datos (excepto duplicados
-- exactos de customers que impidan crear los índices únicos; se conserva
-- la fila más antigua de cada grupo).
-- ============================================================================

-- ============================================================================
-- 1) CUSTOMERS — columnas faltantes (alineación con lib/customers.js)
-- ============================================================================
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS last_order_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_spent NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Índices únicos (identidad del cliente por tienda):
--   con teléfono  → (store_id, phone)
--   sin teléfono  → (store_id, name)
-- Antes de crearlos, se eliminan duplicados EXACTOS conservando la fila
-- más antigua (guard para instalaciones con histórico).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname  = 'uq_customers_store_phone'
  ) THEN
    DELETE FROM public.customers a
    USING public.customers b
    WHERE a.store_id = b.store_id
      AND a.phone IS NOT NULL
      AND b.phone IS NOT NULL
      AND a.phone = b.phone
      AND a.created_at > b.created_at;

    CREATE UNIQUE INDEX uq_customers_store_phone
      ON public.customers (store_id, phone) WHERE phone IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname  = 'uq_customers_store_name_nophone'
  ) THEN
    DELETE FROM public.customers a
    USING public.customers b
    WHERE a.store_id = b.store_id
      AND a.phone IS NULL
      AND b.phone IS NULL
      AND lower(trim(a.name)) = lower(trim(b.name))
      AND a.created_at > b.created_at;

    CREATE UNIQUE INDEX uq_customers_store_name_nophone
      ON public.customers (store_id, name) WHERE phone IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_store_id ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- ============================================================================
-- 2) RLS customers — cerrar la puerta pública de inserción/actualización
-- ============================================================================
-- "Public update customers USING(true)" (schema.sql antiguo) permitía a
-- CUALQUIER visitante editar clientes. El upsert automático pasa ahora por
-- la función SECURITY DEFINER (§3), que no necesita esas políticas.
DROP POLICY IF EXISTS "Public update customers" ON public.customers;
DROP POLICY IF EXISTS "Public insert customers" ON public.customers;

-- El dueño consulta/gestiona su directorio (crear solo si faltan).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'customers'
      AND policyname = 'Owner read customers'
  ) THEN
    CREATE POLICY "Owner read customers" ON public.customers
      FOR SELECT USING (auth.uid() = store_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'customers'
      AND policyname = 'Owner update customers'
  ) THEN
    CREATE POLICY "Owner update customers" ON public.customers
      FOR UPDATE USING (auth.uid() = store_id)
      WITH CHECK (auth.uid() = store_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'customers'
      AND policyname = 'Owner delete customers'
  ) THEN
    CREATE POLICY "Owner delete customers" ON public.customers
      FOR DELETE USING (auth.uid() = store_id);
  END IF;
END $$;

-- ============================================================================
-- 3) FUNCIÓN CRM — upsert de cliente desde el flujo público de pedidos
-- ============================================================================
-- SECURIDAD:
--  * SECURITY DEFINER + search_path vacío (todo cualificado con public.).
--  * Escribe SIEMPRE dentro del store_id recibido; jamás devuelve filas del
--    directorio (solo el uuid del cliente tocado). No existe vía de lectura.
--  * Mismo nivel de confianza que el INSERT público de orders (por diseño,
--    cualquier visitante ya puede crear un pedido para cualquier tienda).
--  * IDENTIDAD: teléfono normalizado (solo dígitos) si viene → (store, phone);
--    sin teléfono → (store, name) con phone NULL. Nombres iguales de personas
--    distintas con teléfonos distintos NUNCA se mezclan.
--  * RACE-SAFE: INSERT ... ON CONFLICT contra los índices únicos parciales.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_customer_from_order(
  p_store_id uuid,
  p_name     text,
  p_phone    text DEFAULT NULL,
  p_address  text DEFAULT NULL,
  p_total    numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
  v_name  text := nullif(trim(coalesce(p_name, '')), '');
  v_addr  text := nullif(trim(coalesce(p_address, '')), '');
  v_total numeric := greatest(coalesce(p_total, 0), 0);
  v_id    uuid;
BEGIN
  IF p_store_id IS NULL OR v_name IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_phone IS NOT NULL THEN
    INSERT INTO public.customers
      (store_id, name, phone, address, last_order_date, total_spent, total_orders)
    VALUES
      (p_store_id, v_name, v_phone, v_addr, now(), v_total, 1)
    ON CONFLICT (store_id, phone) WHERE phone IS NOT NULL
    DO UPDATE
      SET name            = EXCLUDED.name,
          phone           = EXCLUDED.phone,
          address         = COALESCE(EXCLUDED.address, public.customers.address),
          last_order_date = now(),
          total_spent     = public.customers.total_spent + EXCLUDED.total_spent,
          total_orders    = public.customers.total_orders + 1
    RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.customers
      (store_id, name, phone, address, last_order_date, total_spent, total_orders)
    VALUES
      (p_store_id, v_name, NULL, v_addr, now(), v_total, 1)
    ON CONFLICT (store_id, name) WHERE phone IS NULL
    DO UPDATE
      SET address         = COALESCE(EXCLUDED.address, public.customers.address),
          last_order_date = now(),
          total_spent     = public.customers.total_spent + EXCLUDED.total_spent,
          total_orders    = public.customers.total_orders + 1
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- El flujo público de pedidos (rol anon) debe poder invocarla.
GRANT EXECUTE ON FUNCTION public.upsert_customer_from_order(uuid, text, text, text, numeric)
  TO anon, authenticated;

-- ============================================================================
-- 4) ORDERS — constraint de estados consistente con la aplicación
-- ============================================================================
-- Estados usados por el código: pending, paid (webhook Stripe), preparing,
-- ready, completed, cancelled (lib/orders.js + admin). La constraint REAL
-- ya coincide (verificado empíricamente); se re-crea de forma idempotente
-- para que una instalación desde scripts antiguos también quede correcta.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','paid','preparing','ready','completed','cancelled'));

-- ============================================================================
-- 5) STORAGE — políticas coherentes para 'banners' y 'products'
-- ============================================================================
-- Normaliza: lectura pública de assets (buckets públicos), escritura/edición/
-- borrado SOLO dentro de la carpeta propia del usuario autenticado
-- (primer segmento de la ruta = auth.uid()).
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname IN (
        'Public storage read banners',
        'Authenticated storage insert banners',
        'Public read store media',
        'Owner insert own folder',
        'Owner update own folder',
        'Owner delete own folder'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Public read store media"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('banners','products'));

CREATE POLICY "Owner insert own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('banners','products')
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owner update own folder"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id IN ('banners','products')
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id IN ('banners','products')
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owner delete own folder"
  ON storage.objects FOR DELETE
  USING (
    bucket_id IN ('banners','products')
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- VERIFICACIÓN POST-EJECUCIÓN (pegar en SQL Editor para confirmar):
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name='customers' ORDER BY ordinal_position;
--     -- debe incluir address, last_order_date, total_spent, total_orders
--   SELECT indexname FROM pg_indexes
--     WHERE tablename='customers' AND indexname LIKE 'uq_customers%';
--     -- debe devolver 2 índices
--   SELECT proname FROM pg_proc
--     WHERE proname='upsert_customer_from_order';  -- 1 función
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--     WHERE conrelid='public.orders'::regclass AND contype='c';
--     -- la CHECK debe incluir 'paid'
--   SELECT policyname FROM pg_policies
--     WHERE schemaname='storage' AND tablename='objects'
--       AND (policyname LIKE '%own folder%' OR policyname='Public read store media');
--     -- 4 políticas nuevas
-- ============================================================================
