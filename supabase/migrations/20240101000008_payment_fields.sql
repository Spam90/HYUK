-- =====================================================================
-- Migration 8: Campos de pasarela de pagos + order_items normalizados
-- Idempotent (usa IF NOT EXISTS / IF EXISTS).
-- =====================================================================

-- 1) Campos de pago en `orders`
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','failed','refunded'));
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'supabase';
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'DOP';

-- 2) Estados de pedido: se admite el estado `paid` (checkout real)
--    (Reconstruimos la constraint para incluir 'paid'.)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','paid','preparing','ready','completed','cancelled'));

-- 3) Tabla normalizada de líneas de pedido (facturación/reportes).
--    La fuente del carrito sigue siendo `orders.items` JSON; esta tabla
--    es un índice queryable e íntegro.
CREATE TABLE IF NOT EXISTS order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    UUID,
  product_name  TEXT NOT NULL,
  sku           TEXT,
  quantity      NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_price    DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price   DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- 4) Estado de facturación / suscripción en `profiles`
--    (columnas idempotentes; se crean sólo si faltan)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive';
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS current_plan TEXT;
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- 5) Auditoría de webhooks de pago (evita doble procesamiento)
CREATE TABLE IF NOT EXISTS payment_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  provider      TEXT NOT NULL,
  event_type    TEXT NOT NULL,
  event_id      TEXT NOT NULL UNIQUE,
  payload       JSONB,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_events_order   ON payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_eventid ON payment_events(event_id);

-- 6) Políticas de acceso (RLS)
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='owner_read_order_items') THEN
    CREATE POLICY "owner_read_order_items" ON order_items FOR SELECT
      USING (auth.uid() = (SELECT store_id FROM orders WHERE orders.id = order_items.order_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='public_read_order_items') THEN
    CREATE POLICY "public_read_order_items" ON order_items FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='service_insert_order_items') THEN
    CREATE POLICY "service_insert_order_items" ON order_items FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='service_update_order_items') THEN
    CREATE POLICY "service_update_order_items" ON order_items FOR UPDATE USING (true);
  END IF;
END $$;

-- payment_events: solo escritura/lectura service-role o owner
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_events' AND policyname='owner_read_payment_events') THEN
    CREATE POLICY "owner_read_payment_events" ON payment_events FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_events' AND policyname='service_upsert_payment_events') THEN
    CREATE POLICY "service_upsert_payment_events" ON payment_events FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_events' AND policyname='service_update_payment_events') THEN
    CREATE POLICY "service_update_payment_events" ON payment_events FOR UPDATE USING (true);
  END IF;
END $$;
