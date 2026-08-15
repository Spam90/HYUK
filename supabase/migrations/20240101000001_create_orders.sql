-- =============================================
-- MIGRACIÓN: TABLA ORDERS (pedidos)
-- Idempotente: seguro ejecutar varias veces.
-- Resuelve el error 404 REST de /rest/v1/orders
-- cuando la tabla no existe en el proyecto Supabase.
-- =============================================

-- Crear tabla orders (si no existe)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  delivery_address TEXT,
  delivery_method TEXT,
  payment_method TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para rendimiento (store_id y status para el dashboard)
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- El dueño puede ver y actualizar sus pedidos
CREATE POLICY IF NOT EXISTS "Owner read orders" ON orders
  FOR SELECT USING (auth.uid() = store_id);
CREATE POLICY IF NOT EXISTS "Owner update orders" ON orders
  FOR UPDATE USING (auth.uid() = store_id);
-- Los clientes (público) pueden crear pedidos y leer (conteos)
CREATE POLICY IF NOT EXISTS "Public insert orders" ON orders
  FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Public read orders" ON orders
  FOR SELECT USING (true);

-- Estado 'ready' soportado (misma corrección que schema.sql)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled'));

-- Columnas adicionales de la app
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_zone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;