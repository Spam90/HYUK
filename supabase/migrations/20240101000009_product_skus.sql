-- =====================================================================
-- Migration 9: SKU / variantes de productos + stock
-- Idempotent.
-- =====================================================================

CREATE TABLE IF NOT EXISTS product_skus (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku           TEXT,
  variant_label TEXT,          -- ej. "Grande / Extra queso"
  stock         INTEGER NOT NULL DEFAULT 0,
  price_override DECIMAL(10,2), -- null => usa products.price
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_skus_product       ON product_skus(product_id);
CREATE INDEX IF NOT EXISTS idx_product_skus_sku           ON product_skus(sku);
CREATE INDEX IF NOT EXISTS idx_product_skus_active_stock  ON product_skus(active, stock);

ALTER TABLE product_skus ENABLE ROW LEVEL SECURITY;

-- Owner del store administra sus propios SKUs; público lee los activos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_skus' AND policyname='owner_manage_product_skus') THEN
    CREATE POLICY "owner_manage_product_skus" ON product_skus FOR ALL
      USING (auth.uid() = (SELECT store_id FROM products WHERE products.id = product_skus.product_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_skus' AND policyname='public_read_product_skus') THEN
    CREATE POLICY "public_read_product_skus" ON product_skus FOR SELECT USING (active = true);
  END IF;
END $$;

-- Mantenimiento de updated_at
CREATE OR REPLACE FUNCTION _product_skus_touch_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS product_skus_touch_updated ON product_skus;
CREATE TRIGGER product_skus_touch_updated
  BEFORE UPDATE ON product_skus
  FOR EACH ROW EXECUTE FUNCTION _product_skus_touch_updated();

-- Índice agregado de stock por producto (para cálculos rápidos)
-- Se expone a través de vistas; la lógica de "stock bajo" vive en lib/inventory.js.
CREATE OR REPLACE VIEW product_stock_summary AS
SELECT
  product_id,
  SUM(CASE WHEN active THEN stock ELSE 0 END) AS total_stock_available
FROM product_skus
GROUP BY product_id;
CREATE INDEX IF NOT EXISTS idx_product_skus_product_id_low_stock
  ON product_skus(product_id, stock)
  WHERE active = true AND stock <= 5;
