-- =====================================================================
-- 20240101000007_analytics.sql
-- ANALYTICS: contador de visitas y eventos de conversión.
--
-- Crea `analytics_events` (page_view, view_product, add_to_cart,
-- checkout_start, purchase, whatsapp_click). Cada fila lleva store_id,
-- tipo de evento, metadatos JSON y un id de sesión para agrupar el funnel.
-- RLS: el dueño lee/inserta para su tienda; el público solo puede INSERTAR
-- (para registrar visitas/eventos) con store_id anónimo.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event text NOT NULL,
  session_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_store_id_idx ON public.analytics_events(store_id);
CREATE INDEX IF NOT EXISTS analytics_events_event_idx ON public.analytics_events(event);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON public.analytics_events(created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_analytics_events" ON public.analytics_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "owners_read_analytics_events" ON public.analytics_events
  FOR SELECT USING (auth.uid() = store_id);

-- =====================================================================
-- LECTURA PÚBLICA DE PEDIDOS (seguimiento del cliente /pedido/[id])
-- El cliente final consulta el estado de su pedido sin iniciar sesión.
-- Solo se exponen campos no sensibles desde el endpoint.
-- =====================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='public_read_orders') THEN
    CREATE POLICY "public_read_orders" ON public.orders
      FOR SELECT USING (true);
  END IF;
END $$;