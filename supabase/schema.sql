-- =============================================
-- ESQUEMA COMPLETO SUPABASE - Catálogo Digital
-- =============================================

-- Extensión de la tabla profiles con settings JSONB
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

-- Tabla de categorías
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

-- Tabla de productos
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

-- Tabla de variantes/opciones de producto
CREATE TABLE IF NOT EXISTS product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  choices JSONB DEFAULT '[]'::jsonb,
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_categories_store ON categories(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_options_product ON product_options(product_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Políticas RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;

-- Políticas para categorías
CREATE POLICY "Public read categories" ON categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Owner manage categories" ON categories
  FOR ALL USING (auth.uid() = store_id);

-- Políticas para productos
CREATE POLICY "Public read products" ON products
  FOR SELECT USING (is_available = true);

CREATE POLICY "Owner manage products" ON products
  FOR ALL USING (auth.uid() = store_id);

-- Políticas para opciones de producto
CREATE POLICY "Public read product options" ON product_options
  FOR SELECT USING (true);

CREATE POLICY "Owner manage product options" ON product_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_options.product_id
      AND p.store_id = auth.uid()
    )
  );

-- Política para lectura pública de perfiles (catálogo público)
CREATE POLICY "Public read profiles" ON profiles
  FOR SELECT USING (true);

-- Política para que el usuario pueda actualizar su propio perfil
CREATE POLICY "Owner update profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
