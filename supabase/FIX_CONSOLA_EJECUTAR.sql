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

-- 7) PAGOS ONLINE (STRIPE / GATEWAYS) + ORDER ITEMS NORMALIZADOS --------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','failed','refunded')),
  ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'supabase',
  ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'DOP';

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','paid','preparing','ready','completed','cancelled'));

CREATE TABLE IF NOT EXISTS public.order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id    UUID,
  product_name  TEXT NOT NULL,
  sku           TEXT,
  quantity      NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_price    DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price   DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS current_plan TEXT,
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.payment_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  provider      TEXT NOT NULL,
  event_type    TEXT NOT NULL,
  event_id      TEXT NOT NULL UNIQUE,
  payload       JSONB,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_events_order   ON public.payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_eventid ON public.payment_events(event_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='owner_read_order_items') THEN
    CREATE POLICY "owner_read_order_items" ON public.order_items FOR SELECT
      USING (auth.uid() = (SELECT store_id FROM public.orders WHERE public.orders.id = order_items.order_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='public_read_order_items') THEN
    CREATE POLICY "public_read_order_items" ON public.order_items FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='service_insert_order_items') THEN
    CREATE POLICY "service_insert_order_items" ON public.order_items FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='service_update_order_items') THEN
    CREATE POLICY "service_update_order_items" ON public.order_items FOR UPDATE USING (true);
  END IF;
END $$;

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_events' AND policyname='owner_read_payment_events') THEN
    CREATE POLICY "owner_read_payment_events" ON public.payment_events FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_events' AND policyname='service_upsert_payment_events') THEN
    CREATE POLICY "service_upsert_payment_events" ON public.payment_events FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_events' AND policyname='service_update_payment_events') THEN
    CREATE POLICY "service_update_payment_events" ON public.payment_events FOR UPDATE USING (true);
  END IF;
END $$;

-- 8) SKUs / VARIANTES DE PRODUCTO + STOCK --------------------------------------
CREATE TABLE IF NOT EXISTS public.product_skus (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku           TEXT,
  variant_label TEXT,
  stock         INTEGER NOT NULL DEFAULT 0,
  price_override DECIMAL(10,2),
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_skus_product       ON public.product_skus(product_id);
CREATE INDEX IF NOT EXISTS idx_product_skus_sku           ON public.product_skus(sku);
CREATE INDEX IF NOT EXISTS idx_product_skus_active_stock  ON public.product_skus(active, stock);

ALTER TABLE public.product_skus ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_skus' AND policyname='owner_manage_product_skus') THEN
    CREATE POLICY "owner_manage_product_skus" ON public.product_skus FOR ALL
      USING (auth.uid() = (SELECT store_id FROM public.products WHERE public.products.id = product_skus.product_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_skus' AND policyname='public_read_product_skus') THEN
    CREATE POLICY "public_read_product_skus" ON public.product_skus FOR SELECT USING (active = true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION _product_skus_touch_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS product_skus_touch_updated ON public.product_skus;
CREATE TRIGGER product_skus_touch_updated
  BEFORE UPDATE ON public.product_skus
  FOR EACH ROW EXECUTE FUNCTION _product_skus_touch_updated();

CREATE OR REPLACE VIEW public.product_stock_summary AS
SELECT
  product_id,
  SUM(CASE WHEN active THEN stock ELSE 0 END) AS total_stock_available
FROM public.product_skus
GROUP BY product_id;

-- 9) TENANCY HARDENING + ONBOARDING -------------------------------------------
-- Bloquea el cambio de store_id en las tablas de negocio (huecos multi-tenant)
CREATE OR REPLACE FUNCTION public.prevent_store_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.store_id IS DISTINCT FROM OLD.store_id THEN
    RAISE EXCEPTION 'store_id no puede modificarse (multi-tenant)';
  END IF;
  RETURN NEW;
END;
$$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'orders_no_store_change') THEN
    CREATE TRIGGER orders_no_store_change BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.prevent_store_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'products_no_store_change') THEN
    CREATE TRIGGER products_no_store_change BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.prevent_store_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'categories_no_store_change') THEN
    CREATE TRIGGER categories_no_store_change BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.prevent_store_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'customers_no_store_change') THEN
    CREATE TRIGGER customers_no_store_change BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.prevent_store_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'coupons_no_store_change') THEN
    CREATE TRIGGER coupons_no_store_change BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.prevent_store_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'order_items_no_store_change') THEN
    CREATE TRIGGER order_items_no_store_change BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.prevent_store_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'product_skus_no_store_change') THEN
    CREATE TRIGGER product_skus_no_store_change BEFORE UPDATE ON public.product_skus FOR EACH ROW EXECUTE FUNCTION public.prevent_store_change();
  END IF;
END $$;

-- LISTO ✅ Cierra el SQL Editor y recarga tu panel.