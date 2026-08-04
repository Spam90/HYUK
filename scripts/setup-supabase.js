// Script para ejecutar el esquema SQL en Supabase
// Uso: node scripts/setup-supabase.js
// Requiere: SUPABASE_ACCESS_TOKEN y PROJECT_REF como variables de entorno
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;

if (!SUPABASE_ACCESS_TOKEN || !PROJECT_REF) {
  console.error('❌ Error: Se requieren las variables de entorno SUPABASE_ACCESS_TOKEN y SUPABASE_PROJECT_REF');
  console.error('');
  console.error('Ejemplo:');
  console.error('  SET SUPABASE_ACCESS_TOKEN=sbp_...');
  console.error('  SET SUPABASE_PROJECT_REF=tu-project-ref');
  console.error('  node scripts/setup-supabase.js');
  process.exit(1);
}

// Construir el SQL completo desde cero
const fullSql = [
  '-- =============================================',
  '-- ESQUEMA COMPLETO SUPABASE - Catálogo Digital',
  '-- =============================================',
  '',
  '-- Crear tabla profiles si no existe (requerida por Supabase Auth)',
  'CREATE TABLE IF NOT EXISTS public.profiles (',
  '  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,',
  '  full_name TEXT,',
  '  email TEXT,',
  '  store_name TEXT,',
  '  slug TEXT UNIQUE,',
  '  logo_url TEXT,',
  '  whatsapp_number TEXT,',
  '  phone TEXT,',
  '  settings JSONB DEFAULT $json$',
  '{',
  '  "theme": {',
  '    "primaryColor": "#10B981",',
  '    "secondaryColor": "#0F172A",',
  '    "backgroundColor": "#FAFAFA",',
  '    "cardBackgroundColor": "#FFFFFF",',
  '    "textColor": "#0F172A",',
  '    "accentColor": "#F59E0B",',
  '    "borderRadius": "rounded-2xl",',
  '    "fontFamily": "font-sans",',
  '    "mode": "light"',
  '  },',
  '  "layout": {',
  '    "productGrid": "grid-2-col",',
  '    "headerStyle": "banner-large",',
  '    "categoryStyle": "pills-scroll",',
  '    "productCardStyle": "modern-shadow"',
  '  },',
  '  "banner": {',
  '    "imageUrl": "",',
  '    "tagline": "¡Los mejores productos a un clic!",',
  '    "showAnnouncementBar": true,',
  '    "announcementText": "🚚 Envíos gratis en pedidos mayores a $1,000"',
  '  },',
  '  "whatsapp_checkout": {',
  '    "customMessageHeader": "🛒 *¡NUEVO PEDIDO DE CLIENTE!*",',
  '    "askForAddress": true,',
  '    "askForPaymentMethod": true,',
  '    "paymentOptions": ["Efectivo", "Transferencia / Zelle", "Tarjeta al recibir"],',
  '    "requireClientName": true,',
  '    "deliveryMethods": ["A domicilio", "Retiro en local"]',
  '  }',
  '}$json$::jsonb,',
  '  created_at TIMESTAMPTZ DEFAULT now(),',
  '  updated_at TIMESTAMPTZ DEFAULT now()',
  ');',
  '',
  '-- Trigger para actualizar updated_at en profiles',
  'CREATE OR REPLACE FUNCTION update_profiles_updated_at()',
  'RETURNS TRIGGER AS $func$',
  'BEGIN',
  '  NEW.updated_at = now();',
  '  RETURN NEW;',
  'END;',
  '$func$ LANGUAGE plpgsql;',
  '',
  'DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;',
  'CREATE TRIGGER update_profiles_updated_at',
  '  BEFORE UPDATE ON profiles',
  '  FOR EACH ROW EXECUTE FUNCTION update_profiles_updated_at();',
  '',
  '-- RLS para profiles',
  'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;',
  '',
  '-- Políticas para profiles',
  'DROP POLICY IF EXISTS "Public read profiles" ON profiles;',
  'CREATE POLICY "Public read profiles" ON profiles',
  '  FOR SELECT USING (true);',
  '',
  'DROP POLICY IF EXISTS "Owner manage profiles" ON profiles;',
  'CREATE POLICY "Owner manage profiles" ON profiles',
  '  FOR ALL USING (auth.uid() = id);',
  '',
  '-- =============================================',
  '-- Tabla de categorías',
  '-- =============================================',
  'CREATE TABLE IF NOT EXISTS categories (',
  '  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
  '  store_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,',
  '  name TEXT NOT NULL,',
  '  slug TEXT NOT NULL,',
  '  icon TEXT,',
  '  image_url TEXT,',
  '  sort_order INTEGER DEFAULT 0,',
  '  is_active BOOLEAN DEFAULT true,',
  '  created_at TIMESTAMPTZ DEFAULT now(),',
  '  updated_at TIMESTAMPTZ DEFAULT now()',
  ');',
  '',
  '-- Tabla de productos',
  'CREATE TABLE IF NOT EXISTS products (',
  '  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
  '  store_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,',
  '  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,',
  '  name TEXT NOT NULL,',
  '  description TEXT,',
  '  price DECIMAL(10,2) NOT NULL DEFAULT 0,',
  '  compare_at_price DECIMAL(10,2),',
  '  image_url TEXT,',
  '  is_available BOOLEAN DEFAULT true,',
  '  is_featured BOOLEAN DEFAULT false,',
  '  badge TEXT,',
  '  sort_order INTEGER DEFAULT 0,',
  '  options JSONB DEFAULT $json$[]$json$::jsonb,',
  '  created_at TIMESTAMPTZ DEFAULT now(),',
  '  updated_at TIMESTAMPTZ DEFAULT now()',
  ');',
  '',
  '-- Tabla de variantes/opciones de producto',
  'CREATE TABLE IF NOT EXISTS product_options (',
  '  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
  '  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,',
  '  name TEXT NOT NULL,',
  '  choices JSONB DEFAULT $json$[]$json$::jsonb,',
  '  is_required BOOLEAN DEFAULT false,',
  '  sort_order INTEGER DEFAULT 0',
  ');',
  '',
  '-- Índices para rendimiento',
  'CREATE INDEX IF NOT EXISTS idx_categories_store ON categories(store_id);',
  'CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);',
  'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);',
  'CREATE INDEX IF NOT EXISTS idx_product_options_product ON product_options(product_id);',
  '',
  '-- Trigger para actualizar updated_at',
  'CREATE OR REPLACE FUNCTION update_updated_at()',
  'RETURNS TRIGGER AS $func$',
  'BEGIN',
  '  NEW.updated_at = now();',
  '  RETURN NEW;',
  'END;',
  '$func$ LANGUAGE plpgsql;',
  '',
  'DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;',
  'CREATE TRIGGER update_categories_updated_at',
  '  BEFORE UPDATE ON categories',
  '  FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
  '',
  'DROP TRIGGER IF EXISTS update_products_updated_at ON products;',
  'CREATE TRIGGER update_products_updated_at',
  '  BEFORE UPDATE ON products',
  '  FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
  '',
  '-- Políticas RLS (Row Level Security)',
  'ALTER TABLE categories ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE products ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;',
  '',
  '-- Políticas para categorías',
  'DROP POLICY IF EXISTS "Public read categories" ON categories;',
  'CREATE POLICY "Public read categories" ON categories',
  '  FOR SELECT USING (is_active = true);',
  '',
  'DROP POLICY IF EXISTS "Owner manage categories" ON categories;',
  'CREATE POLICY "Owner manage categories" ON categories',
  '  FOR ALL USING (auth.uid() = store_id);',
  '',
  '-- Políticas para productos',
  'DROP POLICY IF EXISTS "Public read products" ON products;',
  'CREATE POLICY "Public read products" ON products',
  '  FOR SELECT USING (is_available = true);',
  '',
  'DROP POLICY IF EXISTS "Owner manage products" ON products;',
  'CREATE POLICY "Owner manage products" ON products',
  '  FOR ALL USING (auth.uid() = store_id);',
  '',
  '-- Políticas para opciones de producto',
  'DROP POLICY IF EXISTS "Public read product options" ON product_options;',
  'CREATE POLICY "Public read product options" ON product_options',
  '  FOR SELECT USING (true);',
  '',
  'DROP POLICY IF EXISTS "Owner manage product options" ON product_options;',
  'CREATE POLICY "Owner manage product options" ON product_options',
  '  FOR ALL USING (',
  '    EXISTS (',
  '      SELECT 1 FROM products p',
  '      WHERE p.id = product_options.product_id',
  '      AND p.store_id = auth.uid()',
  '    )',
  '  );'
].join('\n');

// Función para ejecutar SQL
async function executeSql(query) {
  const response = await fetch(
    'https://api.supabase.com/v1/projects/' + PROJECT_REF + '/database/query',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + SUPABASE_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error('Error ejecutando SQL (' + response.status + '): ' + errorText);
  }

  return response.json();
}

// Ejecutar el esquema
async function main() {
  console.log('🚀 Configurando Supabase...');
  console.log('📦 Proyecto: ' + PROJECT_REF);
  console.log('');

  try {
    // Ejecutar el esquema completo
    console.log('📝 Ejecutando esquema SQL...');
    const result = await executeSql(fullSql);
    console.log('✅ Esquema ejecutado exitosamente!');
    console.log('');

    // Verificar tablas creadas
    console.log('🔍 Verificando tablas...');
    const tablesQuery = 
      "SELECT table_name " +
      "FROM information_schema.tables " +
      "WHERE table_schema = 'public' " +
      "AND table_name IN ('profiles', 'categories', 'products', 'product_options') " +
      "ORDER BY table_name;";
    const tables = await executeSql(tablesQuery);
    
    if (tables && tables.length > 0) {
      console.log('📋 Tablas encontradas:');
      tables.forEach(t => console.log('  ✅ ' + t.table_name));
    } else {
      console.log('⚠️ No se encontraron tablas. Verificando...');
    }

    console.log('');
    console.log('🎉 Configuración completada!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();