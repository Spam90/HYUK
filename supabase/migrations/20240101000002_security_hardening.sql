-- =============================================
-- HARDENING DE SEGURIDAD PARA PRODUCCIÓN
-- Idempotente (seguro de re-ejecutar).
-- =============================================

-- 1. Función para updated_at (requerida por los triggers)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. ORDERS: eliminar la lectura pública TOTAL de pedidos (privacidad)
--    El listado/conteo queda restringido al dueño ("Owner read orders").
DROP POLICY IF EXISTS "Public read orders" ON orders;

-- 3. CUSTOMERS: eliminar UPDATE/lectura pública (cualquiera podía editarlos)
DROP POLICY IF EXISTS "Public update customers" ON customers;
DROP POLICY IF EXISTS "Public read customers" ON customers;

-- 4. BUCKETS: banners/products (store-assets ya está en schema.sql)
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true)
  ON CONFLICT (id) DO NOTHING;

-- Lectura pública (imágenes visibles en el catálogo)
CREATE POLICY IF NOT EXISTS "Public read banners" ON storage.objects
  FOR SELECT USING (bucket_id = 'banners');
CREATE POLICY IF NOT EXISTS "Public read products" ON storage.objects
  FOR SELECT USING (bucket_id = 'products');

-- Subida: el dueño solo en su carpeta (auth.uid() = carpeta)
CREATE POLICY IF NOT EXISTS "Owner upload banners" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY IF NOT EXISTS "Owner upload products" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY IF NOT EXISTS "Owner upload store-assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'store-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Actualizar/eliminar: solo el dueño del archivo
CREATE POLICY IF NOT EXISTS "Owner update storage objects" ON storage.objects
  FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY IF NOT EXISTS "Owner delete storage objects" ON storage.objects
  FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);