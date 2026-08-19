-- =============================================
-- MÓDULO PLANES (GRATIS / PRO)
-- Añade el campo `plan` a profiles ('free' por defecto).
-- Idempotente.
-- =============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';

-- Mantener el campo heredado plan_type en sincronía
UPDATE profiles
SET plan = plan_type
WHERE plan IS NULL OR plan = '' OR plan_type IS NOT NULL AND plan_type IN ('free', 'pro');