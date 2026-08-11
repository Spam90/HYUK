-- =============================================
-- ESQUEMA COMPLETO SUPABASE - HYUK Catálogo Digital
-- =============================================

-- =============================================
-- 1. EXTENSIÓN DE TABLA PROFILES
-- =============================================

-- Agregar columnas necesarias a profiles si no existen
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_whatsapp TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "theme": {
    "primaryColor": "#10B981",
    "secondaryColor": "#0F172A",
    "backgroundColor": "#FAFAFA",
    "cardBackgroundColor": "#FFFFFF",
    "textColor": "#0F172A",
    "accentColor": "#F59E0B",
    "borderRadius": "rounded-2xl",
    "fontFamily": "font-sans",
    "mode": "light"
  },
  "layout": {
    "productGrid": "grid-2-col",
    "headerStyle": "banner-large",
    "categoryStyle": "pills-scroll",
    "productCardStyle": "modern-shadow"
  },
  "banner": {
    "imageUrl": "",
    "tagline": "¡Los mejores productos a un clic!",
    "showAnnouncementBar": true,
    "announcementText": "🚚 Envíos gratis en pedidos mayores a $1,000"
  },
  "whatsapp_checkout": {
    "customMessageHeader": "🛒 *¡NUEVO PEDIDO DE CLIENTE!*",
    "askForAddress": true,
    "askForPaymentMethod": true,
    "paymentOptions": ["Efectivo", "Transferencia / Zelle", "Tarjeta al recibir"],
    "requireClientName": true,
    "deliveryMethods": ["A domicilio", "Retiro en local"]
  }
}'::jsonb;

-- Crear índice para búsquedas por slug
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON profiles(slug);

-- =============================================
-- 2. TABLA DE CATEGORÍAS
-- =============================================

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para búsquedas por tienda
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON categories(store_id);

-- =============================================
-- 3. TABLA DE PRODUCTOS
-- =============================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  compare_at_price DECIMAL(10,2),
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  badge TEXT,
  sort_order INTEGER DEFAULT 0,
  options JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- =============================================
-- 4. TABLA DE OPCIONES DE PRODUCTO (Variantes)
-- =============================================

CREATE TABLE IF NOT EXISTS product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  choices JSONB DEFAULT '[]'::jsonb,
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para búsquedas por producto
CREATE INDEX IF NOT EXISTS idx_product_options_product_id ON product_options(product_id);

-- =============================================
-- 5. TRIGGERS PARA UPDATED_AT
-- =============================================

-- Función genérica para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para categories
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para products
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. POLÍTICAS RLS (Row Level Security)
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS PARA PROFILES
-- =============================================

-- Lectura pública de perfiles (para catálogos públicos)
CREATE POLICY "Public read profiles" ON profiles
  FOR SELECT USING (true);

-- El usuario puede actualizar su propio perfil
CREATE POLICY "Owner update profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- El usuario puede insertar su propio perfil
CREATE POLICY "Owner insert profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================
-- POLÍTICAS PARA CATEGORIES
-- =============================================

-- Lectura pública de categorías activas
CREATE POLICY "Public read active categories" ON categories
  FOR SELECT USING (is_active = true);

-- Lectura de todas las categorías para el dueño
CREATE POLICY "Owner read categories" ON categories
  FOR SELECT USING (auth.uid() = store_id);

-- El dueño puede crear categorías
CREATE POLICY "Owner insert categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = store_id);

-- El dueño puede actualizar categorías
CREATE POLICY "Owner update categories" ON categories
  FOR UPDATE USING (auth.uid() = store_id);

-- El dueño puede eliminar categorías
CREATE POLICY "Owner delete categories" ON categories
  FOR DELETE USING (auth.uid() = store_id);

-- =============================================
-- POLÍTICAS PARA PRODUCTS
-- =============================================

-- Lectura pública de productos disponibles
CREATE POLICY "Public read available products" ON products
  FOR SELECT USING (is_available = true);

-- Lectura de todos los productos para el dueño
CREATE POLICY "Owner read products" ON products
  FOR SELECT USING (auth.uid() = store_id);

-- El dueño puede crear productos
CREATE POLICY "Owner insert products" ON products
  FOR INSERT WITH CHECK (auth.uid() = store_id);

-- El dueño puede actualizar productos
CREATE POLICY "Owner update products" ON products
  FOR UPDATE USING (auth.uid() = store_id);

-- El dueño puede eliminar productos
CREATE POLICY "Owner delete products" ON products
  FOR DELETE USING (auth.uid() = store_id);

-- =============================================
-- POLÍTICAS PARA PRODUCT_OPTIONS
-- =============================================

-- Lectura pública de opciones de productos
CREATE POLICY "Public read product options" ON product_options
  FOR SELECT USING (true);

-- El dueño puede crear opciones (a través de sus productos)
CREATE POLICY "Owner insert product options" ON product_options
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_options.product_id
      AND p.store_id = auth.uid()
    )
  );

-- El dueño puede actualizar opciones
CREATE POLICY "Owner update product options" ON product_options
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_options.product_id
      AND p.store_id = auth.uid()
    )
  );

-- El dueño puede eliminar opciones
CREATE POLICY "Owner delete product options" ON product_options
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_options.product_id
      AND p.store_id = auth.uid()
    )
  );

-- =============================================
-- 7. SEED DATA (Datos de prueba)
-- =============================================

-- Insertar perfil demo
-- Nota: Esto requiere que exista un usuario en auth.users con este UUID
-- Para propósitos de desarrollo, puedes crear el usuario manualmente en Supabase Auth
-- y luego ejecutar este INSERT, o modificar el UUID para usar uno existente

-- INSERT INTO profiles (id, slug, business_name, tagline, phone_whatsapp, plan_type, settings)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   'demo',
--   'Demo Store',
--   'Los mejores productos a un clic',
--   '+1234567890',
--   'free',
--   '{
--     "theme": {
--       "primaryColor": "#EF4444",
--       "secondaryColor": "#F59E0B",
--       "backgroundColor": "#FFFBEB",
--       "cardBackgroundColor": "#FFFFFF",
--       "textColor": "#1F2937",
--       "accentColor": "#F59E0B",
--       "borderRadius": "rounded-xl",
--       "fontFamily": "font-sans",
--       "mode": "light"
--     },
--     "layout": {
--       "productGrid": "grid-2-col",
--       "headerStyle": "banner-large",
--       "categoryStyle": "pills-scroll",
--       "productCardStyle": "modern-shadow"
--     },
--     "banner": {
--       "imageUrl": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200",
--       "tagline": "¡Los mejores productos a un clic!",
--       "showAnnouncementBar": true,
--       "announcementText": "🚚 Envíos gratis en pedidos mayores a $1,000"
--     },
--     "whatsapp_checkout": {
--       "customMessageHeader": "🛒 *¡NUEVO PEDIDO DE CLIENTE!*",
--       "askForAddress": true,
--       "askForPaymentMethod": true,
--       "paymentOptions": ["Efectivo", "Transferencia / Zelle", "Tarjeta al recibir"],
--       "requireClientName": true,
--       "deliveryMethods": ["A domicilio", "Retiro en local"]
--     }
--   }'::jsonb
-- );

-- =============================================
-- NOTAS PARA DESARROLLO
-- =============================================

-- Para crear el usuario demo:
-- 1. Ir a Supabase Dashboard → Authentication → Users
-- 2. Crear un nuevo usuario con email: demo@hyuk.app
-- 3. Copiar el UUID del usuario creado
-- 4. Reemplazar '00000000-0000-0000-0000-000000000000' en el INSERT anterior con ese UUID
-- 5. Ejecutar el INSERT

-- Para insertar datos de prueba después de crear el perfil demo:
-- 1. Obtener el store_id del perfil demo
-- 2. Insertar categorías asociadas a ese store_id
-- 3. Insertar productos asociados a esas categorías

-- Ejemplo de inserción de categorías demo:
-- INSERT INTO categories (store_id, name, slug, icon, sort_order)
-- VALUES
--   ('UUID_DEL_PERFIL_DEMO', 'Entradas', 'entradas', '🥗', 1),
--   ('UUID_DEL_PERFIL_DEMO', 'Platos Fuertes', 'platos-fuertes', '🍖', 2),
--   ('UUID_DEL_PERFIL_DEMO', 'Bebidas', 'bebidas', '🥤', 3);

-- Ejemplo de inserción de productos demo:
-- INSERT INTO products (store_id, category_id, name, description, price, image_url, badge, is_available, sort_order)
-- VALUES
--   ('UUID_DEL_PERFIL_DEMO', 'UUID_CATEGORIA_ENTRADAS', 'Ensalada César', 'Lechuga romana, crutones, queso parmesano y aderezo césar', 12.99, 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400', 'Popular', true, 1),
--   ('UUID_DEL_PERFIL_DEMO', 'UUID_CATEGORIA_ENTRADAS', 'Bruschetta', 'Pan tostado con tomate, albahaca y aceite de oliva', 8.99, 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400', null, true, 2),
--   ('UUID_DEL_PERFIL_DEMO', 'UUID_CATEGORIA_PLATOS_FUERTES', 'Hamburguesa Clásica', 'Carne angus, queso cheddar, lechuga, tomate y cebolla', 15.99, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', 'Popular', true, 1),
--   ('UUID_DEL_PERFIL_DEMO', 'UUID_CATEGORIA_PLATOS_FUERTES', 'Pizza Margherita', 'Salsa de tomate, mozzarella fresca y albahaca', 18.99, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400', null, true, 2),
--   ('UUID_DEL_PERFIL_DEMO', 'UUID_CATEGORIA_PLATOS_FUERTES', 'Pasta Carbonara', 'Spaghetti con salsa carbonara, panceta y queso pecorino', 16.99, 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400', 'Nuevo', true, 3),
--   ('UUID_DEL_PERFIL_DEMO', 'UUID_CATEGORIA_BEBIDAS', 'Limonada Fresca', 'Limones frescos exprimidos con hielo y menta', 4.99, 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400', null, true, 1);

-- =============================================
-- 8. TABLA DE PEDIDOS
-- =============================================

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

-- Índice para búsquedas por tienda y estado
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Trigger para actualizar updated_at en orders
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS para orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- El dueño puede ver sus propios pedidos
CREATE POLICY "Owner read orders" ON orders
  FOR SELECT USING (auth.uid() = store_id);

-- El dueño puede actualizar el estado de sus pedidos
CREATE POLICY "Owner update orders" ON orders
  FOR UPDATE USING (auth.uid() = store_id);

-- Cualquier persona puede crear un pedido (público)
CREATE POLICY "Public insert orders" ON orders
  FOR INSERT WITH CHECK (true);

-- Cualquier persona puede leer pedidos (para conteos)
CREATE POLICY "Public read orders" ON orders
  FOR SELECT USING (true);

-- =============================================
-- 9. STORAGE PARA IMÁGENES (Supabase Storage)
-- =============================================

-- Crear bucket para almacenamiento de imágenes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-assets',
  'store-assets',
  true,
  5242880, -- 5MB límite
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
) ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para Storage
-- Lectura pública de objetos
CREATE POLICY "Public read store assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-assets');

-- Usuarios autenticados pueden subir archivos a su propia carpeta
CREATE POLICY "Owner upload store assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'store-assets' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Usuarios autenticados pueden actualizar sus propios archivos
CREATE POLICY "Owner update store assets" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'store-assets' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Usuarios autenticados pueden eliminar sus propios archivos
CREATE POLICY "Owner delete store assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'store-assets' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
