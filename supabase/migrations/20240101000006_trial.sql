-- =====================================================================
-- 20240101000006_trial.sql
-- TRIAL DE 28 DÍAS CON BENEFICIOS PRO
--
-- 1) Añade `profiles.trial_ends_at` (timestamp de vencimiento del trial).
-- 2) Backfill: los perfiles existentes sin trial reciben 28 días desde ahora.
-- 3) Trigger: TODO perfil nuevo recibe trial_ends_at = NOW() + 28 days
--    automáticamente (idempotente: puedes ejecutarlo varias veces).
-- =====================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Beneficio de cortesía para cuentas ya existentes: 28 días desde que se migra.
UPDATE profiles
SET trial_ends_at = NOW() + INTERVAL '28 days'
WHERE trial_ends_at IS NULL;

-- Trigger: cada nueva tienda arranca con su trial activo (regla de negocio v2).
CREATE OR REPLACE FUNCTION set_trial_ends_at_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at = NOW() + INTERVAL '28 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_trial_ends_at ON profiles;
CREATE TRIGGER set_profiles_trial_ends_at
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_trial_ends_at_on_insert();