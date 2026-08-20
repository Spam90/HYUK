-- =====================================================================
-- 20240101000005_orders.sql
-- Crea las tablas de pedidos que el código consulta (elimina los 404 del
-- cliente al hacer HEAD/GET a /rest/v1/orders).
-- Aplica este archivo en: Supabase Dashboard → SQL Editor → New query.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_name text,
  customer_phone text,
  items jsonb DEFAULT '[]'::jsonb,
  total numeric(12,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  status text DEFAULT 'pending'
    CHECK (status IN ('pending','in_preparation','ready','completed','cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_store_id_idx ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS: cada dueño solo ve/edita sus pedidos (store_id = auth.uid())
CREATE POLICY "owners_select_orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = store_id);
CREATE POLICY "owners_insert_orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = store_id);
CREATE POLICY "owners_update_orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = store_id);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid,
  product_name text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  options jsonb DEFAULT '{}'::jsonb,
  notes text
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_select_order_items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.store_id = auth.uid()
    )
  );