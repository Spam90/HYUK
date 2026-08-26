-- =====================================================================
-- MIGRATION 11 — FASE 0 DE SEGURIDAD (HYUK)
-- Idempotente: seguro ejecutar varias veces.
--
-- CÓMO APLICARLA:
--   Supabase Dashboard → SQL Editor → pegar y ejecutar este archivo.
--
-- QUÉ HACE:
--   A) Cierra TODA política de lectura pública TOTAL sobre `orders`
--      (cualquier policy SELECT cuyo qual sea literalmente `true`).
--      Restaura la privacidad que la migración 02 había endurecido y
--      que la migración 07 rompió al recrear `public_read_orders`.
--      NO afecta: INSERT público (crear pedidos) ni Owner SELECT/UPDATE.
--      El seguimiento del cliente sigue funcionando vía
--      /api/orders/public/[id], que ahora exige token (ver abajo).
--
--   B) Token de seguimiento impredecible por pedido (`orders.tracking_token`,
--      32 hex chars de CSPRNG). Los pedidos nuevos lo reciben por DEFAULT;
--      los existentes se rellenan en backfill. La URL pública pasa a ser
--      /pedido/<orderId>?t=<token>; sin token válido el endpoint responde 404.
--      COMPATIBILIDAD: los links antiguos /pedido/<orderId> siguen funcionando
--      mientras existan filas con tracking_token NULL (el endpoint lo permite),
--      pero tras el backfill esto solo ocurre para pedidos creados entre el
--      deploy del código y la ejecución de esta migración.
-- =====================================================================

-- ---------- A) Cerrar lectura pública general de orders ----------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'orders'
      AND cmd        = 'SELECT'
      AND COALESCE(qual::text, '') ~ '(^|[[:space:]])true([[:space:]]|$)'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', pol.policyname);
    RAISE NOTICE 'Dropped public-read policy on orders: %', pol.policyname;
  END LOOP;
END $$;

-- Redundancia explícita por si el parser de qual cambiara:
DROP POLICY IF EXISTS "public_read_orders" ON public.orders;
DROP POLICY IF EXISTS "Public read orders" ON public.orders;

-- Seguridad activa requerida (no-op si ya está habilitado).
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ---------- B) Token de seguimiento ----------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_tracking_token_uidx
  ON public.orders(tracking_token);

-- Todo pedido nuevo recibe token CSPRNG automáticamente (32 hex).
ALTER TABLE public.orders
  ALTER COLUMN tracking_token
  SET DEFAULT encode(gen_random_bytes(16), 'hex');

-- Backfill: pedidos ya existentes obtienen su token también.
UPDATE public.orders
SET tracking_token = encode(gen_random_bytes(16), 'hex')
WHERE tracking_token IS NULL;

-- =====================================================================
-- VERIFICACIÓN POST-EJECUCIÓN (opcional, copiar en SQL Editor):
--   -- Ya NO debe existir ninguna policy SELECT pública:
--   SELECT policyname FROM pg_policies
--    WHERE schemaname='public' AND tablename='orders' AND cmd='SELECT';
--   -- Debe listar solo políticas owner (auth.uid() = store_id).
--
--   -- Todos los pedidos deben tener token:
--   SELECT count(*) FROM orders WHERE tracking_token IS NULL;  -- => 0
--
-- TEST F desde consola (ya SIN sesión): debe fallar con 0 filas:
--   anónimo → GET {URL}/rest/v1/orders?select=id&limit=1  ⇒ vacío/denegado
-- =====================================================================