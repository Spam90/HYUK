-- ============================================================================
-- MIGRACIÓN 20240101000013 — HARDENING RLS + AISLAMIENTO MULTI-TENANT
-- ============================================================================
-- Correcciones REALES verificadas contra la BD desplegada (2026-08-31):
--
--  ☠️ 1) orders: policy "owners_modify_orders" FOR ALL con USING VACÍO
--        (en DELETE equivale a true). PRUEBA REAL: anon DELETE orders → 204.
--        Cualquier visitante podía BORRAR pedidos de cualquier tienda.
--  ☠️ 2) profiles: "Public read profiles" USING(true) → PRUEBA REAL:
--        anon leía email / whatsapp / plan de todos los usuarios (fuga PII).
--   » 3) products / categories / product_skus: policies públicas con
--        alcance GLOBAL (todas las tiendas) → se escopan a tiendas
--        publicadas (con slug) para cortar la enumeración cross-tenant.
--
-- IDEMPOTENTE: usa DO $$ con checks (Postgres no soporta CREATE POLICY
-- IF NOT EXISTS). NO elimina datos.
-- ============================================================================

-- ============================================================================
-- 1) ORDERS — eliminar el policy FOR ALL con USING vacío y crear policies
--    explícitas por operación, todas con aislamiento por store_id.
-- ============================================================================
DROP POLICY IF EXISTS "owners_modify_orders" ON public.orders;  -- EL PELIGROSO
DROP POLICY IF EXISTS "owners_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "owners_select_orders" ON public.orders;
DROP POLICY IF EXISTS "owners_update_orders" ON public.orders;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='owner_read_orders') THEN
    CREATE POLICY owner_read_orders ON public.orders FOR SELECT USING (auth.uid() = store_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='owner_insert_orders') THEN
    CREATE POLICY owner_insert_orders ON public.orders FOR INSERT WITH CHECK (auth.uid() = store_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='owner_update_orders') THEN
    CREATE POLICY owner_update_orders ON public.orders FOR UPDATE USING (auth.uid() = store_id) WITH CHECK (auth.uid() = store_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='owner_delete_orders') THEN
    CREATE POLICY owner_delete_orders ON public.orders FOR DELETE USING (auth.uid() = store_id);
  END IF;
END $$;

-- public_insert_orders (check true) se MANTIENE: el catálogo público crea
-- pedidos sin login por diseño. Solo INSERT; sin SELECT/UPDATE/DELETE.

-- ============================================================================
-- 2) PROFILES — cerrar la fuga PII.
--     Filas: solo tiendas publicadas (slug no nulo).
--     Columnas sensibles: revocadas para el rol anon (PostgREST las omite
--     en SELECT *; el catálogo sigue leyendo business_name/settings/logo…).
-- ============================================================================
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='public_read_published_stores') THEN
    CREATE POLICY public_read_published_stores ON public.profiles FOR SELECT
      USING (slug IS NOT NULL AND slug <> '');
  END IF;
END $$;

REVOKE SELECT ON public.profiles FROM anon;

-- Concede a anon SOLO las columnas necesarias para el catálogo público
-- (sin email / whatsapp / teléfono / plan / stripe / trial).
GRANT SELECT (
  id, slug, business_name, store_name, full_name, logo_url, settings,
  store_currency, is_open, social_links, primary_color, secondary_color,
  tagline, layout_type, created_at, updated_at
) ON public.profiles TO anon;

-- ============================================================================
-- 3) PRODUCTS — lectura pública limitada a tiendas publicadas.
-- ============================================================================
DROP POLICY IF EXISTS "public_read_products" ON public.products;
DROP POLICY IF EXISTS "Public read products" ON public.products;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='public_read_products_published') THEN
    CREATE POLICY public_read_products_published ON public.products FOR SELECT
      USING (is_available = true AND store_id IN (
        SELECT id FROM public.profiles WHERE slug IS NOT NULL AND slug <> ''
      ));
  END IF;
END $$;

-- ============================================================================
-- 4) CATEGORIES — ídem.
-- ============================================================================
DROP POLICY IF EXISTS "public_read_categories" ON public.categories;
DROP POLICY IF EXISTS "Public read categories" ON public.categories;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='public_read_categories_published') THEN
    CREATE POLICY public_read_categories_published ON public.categories FOR SELECT
      USING (is_active = true AND store_id IN (
        SELECT id FROM public.profiles WHERE slug IS NOT NULL AND slug <> ''
      ));
  END IF;
END $$;

-- ============================================================================
-- 5) PRODUCT_SKUS — ídem.
-- ============================================================================
DROP POLICY IF EXISTS "public_read_product_skus" ON public.product_skus;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_skus' AND policyname='public_read_product_skus_published') THEN
    CREATE POLICY public_read_product_skus_published ON public.product_skus FOR SELECT
      USING (active = true AND product_id IN (
        SELECT p.id FROM public.products p
        WHERE p.store_id IN (SELECT id FROM public.profiles WHERE slug IS NOT NULL AND slug <> '')
      ));
  END IF;
END $$;

-- ============================================================================
-- 5b) PRODUCT_OPTIONS — ídem (antes "Public read product options" USING true
--     exponía opciones/precios de TODAS las tiendas).
-- ============================================================================
DROP POLICY IF EXISTS "Public read product options" ON public.product_options;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_options' AND policyname='public_read_product_options_published') THEN
    CREATE POLICY public_read_product_options_published ON public.product_options FOR SELECT
      USING (product_id IN (
        SELECT p.id FROM public.products p
        WHERE p.store_id IN (SELECT id FROM public.profiles WHERE slug IS NOT NULL AND slug <> '')
      ));
  END IF;
END $$;

-- ============================================================================
-- 6) ORDER_ITEMS — antes: public_read USING true (anon leía ítems de TODOS los
--    pedidos) + service_insert/update USING true (escritura anónima).
--    Estas tablas SOLO las escribe el webhook con service_role (bypass RLS),
--    así que NO se necesita INSERT público. Acceso: dueño vía orders.store_id.
-- ============================================================================
DROP POLICY IF EXISTS "owners_modify_order_items" ON public.order_items;
DROP POLICY IF EXISTS "public_read_order_items"    ON public.order_items;
DROP POLICY IF EXISTS "service_insert_order_items" ON public.order_items;
DROP POLICY IF EXISTS "service_update_order_items" ON public.order_items;
DROP POLICY IF EXISTS "owners_select_order_items"  ON public.order_items;
DROP POLICY IF EXISTS "owner_read_order_items"     ON public.order_items;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='owner_read_order_items_v2') THEN
    CREATE POLICY owner_read_order_items_v2 ON public.order_items FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.store_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='owner_delete_order_items') THEN
    CREATE POLICY owner_delete_order_items ON public.order_items FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.store_id = auth.uid())
    );
  END IF;
END $$;

-- ============================================================================
-- 7) PAYMENT_EVENTS — antes: owner_read USING true (LECTURA ANÓNIMA del
--    payload de pagos Stripe) + service_upsert/update USING true (escritura
--    anónima). Mismo tratamiento: service_role para escribir, dueño vía join.
-- ============================================================================
DROP POLICY IF EXISTS "service_upsert_payment_events" ON public.payment_events;
DROP POLICY IF EXISTS "owner_read_payment_events"     ON public.payment_events;
DROP POLICY IF EXISTS "service_update_payment_events" ON public.payment_events;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_events' AND policyname='owner_read_payment_events_v2') THEN
    CREATE POLICY owner_read_payment_events_v2 ON public.payment_events FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.store_id = auth.uid())
    );
  END IF;
END $$;

-- ============================================================================
-- VERIFICACIÓN POST-EJECUCIÓN (pegar en SQL Editor):
--   SELECT policyname, cmd, qual FROM pg_policies WHERE tablename='orders';
--   -- debe existir owner_delete_orders y NO debe existir owners_modify_orders
--   SELECT policyname, qual FROM pg_policies WHERE tablename='profiles';
--   -- debe existir public_read_published_stores (no "Public read profiles")
--   SELECT has_column_privilege('anon','public.profiles','email','SELECT') AS email_anon;
--   -- debe devolver false
--   SELECT policyname, qual FROM pg_policies WHERE tablename='products';
--   -- public_read_products_published escopado a stores con slug
-- ============================================================================