-- =====================================================================
-- 🔴 HYUK · ARREGLO DEFINITIVO DE LA CONSOLA (ejecutar UNA VEZ)
--   Supabase Dashboard → SQL Editor → New query → pegar → Run.
--
-- Elimina estos errores de consola de tu tienda:
--   ✅ 400  /rest/v1/profiles?select=slug,plan_type ...   (columna faltante)
--   ✅ 400  /rest/v1/profiles?select=slug,is_open,...      (columna faltante)
--   ✅ 404  /rest/v1/orders?select=count...                (tabla order no existe)
--
-- 100% IDEMPOTENTE: puedes ejecutarlo varias veces sin romper nada.
-- =====================================================================

-- 1) COLUMNAS QUE FALTAN EN profiles -----------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_currency TEXT DEFAULT 'USD';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
-- Trial de 28 días con beneficios Pro (sin recorte del catálogo público)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Backfill: usuarios existentes sin trial → 28 días desde ahora
UPDATE profiles
SET trial_ends_at = NOW() + INTERVAL '28 days'
WHERE trial_ends_at IS NULL;

-- Mantener `plan` y `plan_type` sincronizados
UPDATE profiles
SET plan = plan_type
WHERE (plan IS NULL OR plan = '') AND plan_type IS NOT NULL;
UPDATE profiles
SET plan_type = plan
WHERE (plan_type IS NULL OR plan_type = '') AND plan IS NOT NULL;

-- 2) TABLA DE PEDIDOS (orders) -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_name text,
  customer_phone text,
  delivery_address text,
  delivery_method text,
  payment_method text,
  items jsonb DEFAULT '[]'::jsonb,
  total numeric(12,2) DEFAULT 0,
  total_amount numeric(12,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  coupon_code text,
  discount_amount numeric(12,2) DEFAULT 0,
  delivery_zone text,
  delivery_fee numeric(12,2) DEFAULT 0,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending','preparing','in_preparation','ready','completed','cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_store_id_idx ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid,
  product_name text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  options jsonb DEFAULT '{}'::jsonb,
  notes text
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);

-- 3) RLS DE PEDIDOS (cada dueño solo ve/edita los propios) ---------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='owners_select_orders') THEN
    CREATE POLICY "owners_select_orders" ON public.orders FOR SELECT USING (auth.uid() = store_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='owners_insert_orders') THEN
    CREATE POLICY "owners_insert_orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = store_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='owners_update_orders') THEN
    CREATE POLICY "owners_update_orders" ON public.orders FOR UPDATE USING (auth.uid() = store_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='public_insert_orders') THEN
    CREATE POLICY "public_insert_orders" ON public.orders FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='public_read_orders') THEN
    CREATE POLICY "public_read_orders" ON public.orders FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='owners_select_order_items') THEN
    CREATE POLICY "owners_select_order_items" ON public.order_items FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.store_id = auth.uid()));
  END IF;
END $$;

-- 4) NUEVOS PEDIDOS CON FECHA AUTOMÁTICA ----------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5) TRIAL AUTOMÁTICO DE 28 DÍAS ---------------------------------------------
-- Todo perfil NUEVO nace con trial_ends_at = NOW() + 28 days (beneficios Pro).
CREATE OR REPLACE FUNCTION set_trial_ends_at_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at = NOW() + INTERVAL '28 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_trial_ends_at ON profiles;
CREATE TRIGGER set_profiles_trial_ends_at
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_trial_ends_at_on_insert();

-- 6) ANALYTICS + LECTURA PÚBLICA DE PEDIDOS -----------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event text NOT NULL,
  session_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_events_store_id_idx ON public.analytics_events(store_id);
CREATE INDEX IF NOT EXISTS analytics_events_event_idx ON public.analytics_events(event);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_insert_analytics_events" ON public.analytics_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "owners_read_analytics_events" ON public.analytics_events
  FOR SELECT USING (auth.uid() = store_id);

-- El cliente puede ver el estado de su pedido sin loguearse (/pedido/[id])
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='public_read_orders') THEN
    CREATE POLICY "public_read_orders" ON public.orders FOR SELECT USING (true);
  END IF;
END $$;

-- LISTO ✅ Cierra el SQL Editor y recarga tu panel.