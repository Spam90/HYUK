-- =====================================================================
-- 🔴 HYUK · ARREGLO DEFINITIVO DE ESQUEMA + RLS  (ejecutar UNA VEZ)
-- Supabase Dashboard → SQL Editor → New query → pegar → Run.
--
-- Basado en diagnóstico real (scripts/diagnose-db.mjs):
--  1) Las políticas RLS de categories/products/product_skus dependían
--     del parámetro inexistente request.store_slug → TODA lectura daba
--     HTTP 400 (error 42704). Se eliminan y se recrean limpias.
--  2) Faltan columnas: profiles(tagline,layout_type),
--     product_options(label,values,price_delta),
--     customers(address,total_spent,total_orders).
--  3) Falta la tabla coupons (módulo de marketing).
--  4) Usuarios registrados sin fila en profiles → al crear productos
--     falla con 409 (FK products_store_id_fkey). Se hace backfill desde
--     auth.users + trigger automático para registros futuros.
--
-- 100% IDEMPOTENTE: puedes ejecutarlo varias veces sin romper nada.
-- =====================================================================


-- =====================================================================
-- 1) REPARAR POLÍTICAS RLS ROTAS (request.store_slug)
-- =====================================================================

-- 1a. Eliminar cualquier política cuya definición mencione store_slug
DO $fix$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('categories','products','product_skus')
      AND COALESCE(polqual,'') || COALESCE(polwithcheck,'') ILIKE '%store_slug%'
  LOOP
    RAISE NOTICE 'Eliminando política rota: %.%', r.tablename, r.policyname;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END
$fix$;

-- 1b. Helper idempotente para crear políticas si no existen
CREATE OR REPLACE FUNCTION public._ensure_policy(tbl text, pol text, stmt text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = tbl AND policyname = pol
  ) THEN
    EXECUTE format('CREATE POLICY %I ON public.%I ', pol, tbl) || stmt;
    RAISE NOTICE 'Política creada: %.%', tbl, pol;
  END IF;
END
$$;

-- 1c. CATEGORIES — lectura pública de activas + CRUD completo del dueño
SELECT public._ensure_policy('categories','cat_public_read',
  'FOR SELECT USING (is_active = true)');
SELECT public._ensure_policy('categories','cat_owner_read',
  'FOR SELECT USING (auth.uid() = store_id)');
SELECT public._ensure_policy('categories','cat_owner_insert',
  'FOR INSERT WITH CHECK (auth.uid() = store_id)');
SELECT public._ensure_policy('categories','cat_owner_update',
  'FOR UPDATE USING (auth.uid() = store_id) WITH CHECK (auth.uid() = store_id)');
SELECT public._ensure_policy('categories','cat_owner_delete',
  'FOR DELETE USING (auth.uid() = store_id)');

-- 1d. PRODUCTS — misma forma
SELECT public._ensure_policy('products','prod_public_read',
  'FOR SELECT USING (is_available = true)');
SELECT public._ensure_policy('products','prod_owner_read',
  'FOR SELECT USING (auth.uid() = store_id)');
SELECT public._ensure_policy('products','prod_owner_insert',
  'FOR INSERT WITH CHECK (auth.uid() = store_id)');
SELECT public._ensure_policy('products','prod_owner_update',
  'FOR UPDATE USING (auth.uid() = store_id) WITH CHECK (auth.uid() = store_id)');
SELECT public._ensure_policy('products','prod_owner_delete',
  'FOR DELETE USING (auth.uid() = store_id)');

-- 1e. PRODUCT_SKUS — dueño vía producto padre + lectura pública de
--     SKUs cuyo producto esté disponible (para badges de stock)
SELECT public._ensure_policy('product_skus','skus_owner_read',
  'FOR SELECT USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_skus.product_id AND p.store_id = auth.uid()))');
SELECT public._ensure_policy('product_skus','skus_owner_insert',
  'FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_skus.product_id AND p.store_id = auth.uid()))');
SELECT public._ensure_policy('product_skus','skus_owner_update',
  'FOR UPDATE USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_skus.product_id AND p.store_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_skus.product_id AND p.store_id = auth.uid()))');
SELECT public._ensure_policy('product_skus','skus_owner_delete',
  'FOR DELETE USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_skus.product_id AND p.store_id = auth.uid()))');
SELECT public._ensure_policy('product_skus','skus_public_read',
  'FOR SELECT USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_skus.product_id AND p.is_available = true))');

-- 1f. Garantizar RLS activado
ALTER TABLE public.categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_skus  ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 2) COLUMNAS FALTANTES (detectadas por diagnose-db.mjs)
-- =====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS layout_type TEXT DEFAULT 'grid_modern';

ALTER TABLE public.product_options
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS "values" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price_delta NUMERIC(10,2) DEFAULT 0;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS total_spent NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 1;

-- =====================================================================
-- 3) TABLA COUPONS (no existía) — módulo de marketing
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  description     TEXT,
  discount_type   TEXT NOT NULL DEFAULT 'percent'
                    CHECK (discount_type IN ('percent','fixed')),
  discount_value  NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_order_amount NUMERIC(12,2) DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  expires_at      TIMESTAMPTZ,
  max_uses        INTEGER,
  used_count      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (store_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coupons_store ON public.coupons(store_id);

-- updated_at helper (por si el trigger genérico aún no existe)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_coupons_updated_at ON public.coupons;
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

SELECT public._ensure_policy('coupons','coupons_public_read',
  'FOR SELECT USING (is_active = true)');
SELECT public._ensure_policy('coupons','coupons_owner_read',
  'FOR SELECT USING (auth.uid() = store_id)');
SELECT public._ensure_policy('coupons','coupons_owner_insert',
  'FOR INSERT WITH CHECK (auth.uid() = store_id)');
SELECT public._ensure_policy('coupons','coupons_owner_update',
  'FOR UPDATE USING (auth.uid() = store_id) WITH CHECK (auth.uid() = store_id)');
SELECT public._ensure_policy('coupons','coupons_owner_delete',
  'FOR DELETE USING (auth.uid() = store_id)');

-- =====================================================================
-- 4) BACKFILL DE PERFILES — arregla el 409 (FK products_store_id_fkey)
--    Crea la fila en profiles para TODO usuario de auth que no tenga una.
-- =====================================================================

INSERT INTO public.profiles (id, email, full_name, plan_type, trial_ends_at)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'business_name',
    'Mi Tienda'
  ),
  'free',
  NOW() + INTERVAL '28 days'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- Asegurar plan por defecto coherente (plan <-> plan_type sincronizados)
UPDATE public.profiles
SET plan_type = COALESCE(NULLIF(plan_type, ''), plan, 'free')
WHERE plan_type IS NULL OR plan_type = '';

-- =====================================================================
-- 5) TRIGGER AUTOMÁTICO: crear perfil en cada registro futuro
--    (para que este problema NUNCA vuelva a ocurrir)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, plan_type, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'Mi Tienda'
    ),
    'free',
    NOW() + INTERVAL '28 days'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- 6) STORAGE BUCKETS (banners / products) — idempotente
-- =====================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('banners','banners', true), ('products','products', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 7) LIMPIEZA — eliminar el helper temporal _ensure_policy
--    (ya se usó arriba para todas las políticas)
-- =====================================================================
DROP FUNCTION IF EXISTS public._ensure_policy(text, text, text);

-- =====================================================================
-- ✅ LISTO. Verificación posterior:
--    1) node scripts/diagnose-db.mjs   → debe salir todo ✅ (coupons ✅)
--    2) Recarga /admin/products        → desaparecen los 400 y el 409
--    3) Crea un producto de prueba     → se guarda sin conflicto
--
-- NOTA: si en Dashboard → Settings → API tienes configurada una función
-- "Pre-request" tipo set_store_slug(), puedes dejarla tal cual: ya nada
-- depende del parámetro request.store_slug.
-- =====================================================================
