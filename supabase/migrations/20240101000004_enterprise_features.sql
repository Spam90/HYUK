-- =============================================
-- MÓDULO 0: ENTERPRISE - STOREFRONT AVANZADO
-- Idempotente (seguro de re-ejecutar).
-- Añade al perfil: estado de apertura de tienda,
-- moneda del catálogo y enlaces de redes sociales.
-- =============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_currency TEXT DEFAULT 'USD';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- Normalizar valores heredados
UPDATE profiles
SET store_currency = 'USD'
WHERE store_currency IS NULL OR store_currency = '' OR store_currency NOT IN ('USD', 'ARG', 'ARS');

UPDATE profiles
SET is_open = true
WHERE is_open IS NULL;

-- Índice ligero para consultas de catálogo por slug (ruta /[slug])
CREATE INDEX IF NOT EXISTS idx_profiles_slug_alt ON profiles(slug) WHERE slug IS NOT NULL;