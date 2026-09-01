-- ============================================================================
-- MIGRACIÓN 20240101000015 — PROMPT 10: INVENTARIO IDEMPOTENTE POR PEDIDO
-- ============================================================================
-- Estado verificado en BD real antes de escribir esta migración:
--   * product_skus (migración 09) y decrement_sku_stock() (migración 14)
--     existen, pero NADIE invoca la función: el stock nunca se descuenta.
--   * No hay registro de movimientos de inventario → un pedido procesado
--     dos veces (reintento de webhook, doble confirmación) descontaría
--     dos veces, y una cancelación no podría devolver el stock.
--
-- Esta migración (IDEMPOTENTE, incremental, no toca migraciones históricas):
--   1) Tabla `inventory_movements` — bitácora de cada movimiento de stock,
--      con índices UNIQUE parciales que hacen IDEMPOTENTE el proceso.
--   2) `decrement_order_stock(p_order_id)` — descuento atómico e idempotente.
--   3) `restore_order_stock(p_order_id)` — reposición al cancelar, idempotente.
--   4) RLS: solo el dueño de la tienda puede LEER sus movimientos. La
--      escritura ocurre exclusivamente vía las funciones SECURITY DEFINER
--      o service-role (webhook); no hay INSERT/UPDATE/DELETE público.
-- ============================================================================

-- ============================================================================
-- 1) TABLA INVENTORY_MOVEMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id   UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku_id     UUID NOT NULL REFERENCES public.product_skus(id) ON DELETE CASCADE,
  delta      INTEGER NOT NULL CHECK (delta <> 0),
  reason     TEXT NOT NULL DEFAULT 'manual_adjust'
             CHECK (reason IN ('order_paid', 'order_cancelled', 'manual_adjust')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_order
  ON public.inventory_movements (order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_sku
  ON public.inventory_movements (sku_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_store
  ON public.inventory_movements (store_id, created_at DESC);

-- IDEMPOTENCIA DEL DECREMENTO: un mismo pedido no puede descontar el mismo
-- SKU dos veces. (Índice parcial: los ajustes manuales sin pedido no aplican.)
CREATE UNIQUE INDEX IF NOT EXISTS uq_movements_order_paid
  ON public.inventory_movements (order_id, sku_id)
  WHERE reason = 'order_paid' AND order_id IS NOT NULL;

-- IDEMPOTENCIA DE LA REPOSICIÓN: una cancelación no puede devolver stock 2x.
CREATE UNIQUE INDEX IF NOT EXISTS uq_movements_order_cancelled
  ON public.inventory_movements (order_id, sku_id)
  WHERE reason = 'order_cancelled' AND order_id IS NOT NULL;

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'inventory_movements'
      AND policyname = 'owner_read_inventory_movements'
  ) THEN
    -- El dueño consulta su bitácora. La escritura solo vía RPC/service-role.
    CREATE POLICY "owner_read_inventory_movements" ON public.inventory_movements
      FOR SELECT
      USING (auth.uid() = store_id);
  END IF;
END $$;

REVOKE ALL ON public.inventory_movements FROM anon, authenticated;
GRANT SELECT ON public.inventory_movements TO authenticated;

-- ============================================================================
-- 2) DECREMENT_ORDER_STOCK — descuenta stock al confirmarse el pago
-- ============================================================================
-- * Seguridad: SECURITY DEFINER pero valida ownership cuando hay JWT
--   (auth.uid() <> null). El webhook llama con service-role → auth.uid()
--   es null y el flujo de pago ya autenticó el evento (firma Stripe).
-- * Distribución: el carrito no selecciona SKU (migración 14: "el carrito
--   actual no maneja SKUs"), por lo que el descuento se reparte entre los
--   SKUs ACTIVOS del producto (FIFO por created_at) con fila bloqueada
--   (FOR UPDATE) y UPDATE condicional (stock >= delta) → jamás negativo.
-- * Idempotencia: si ya existen movimientos 'order_paid' del pedido, no
--   repite nada y reporta already_processed.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.decrement_order_stock(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_store   uuid;
  v_items   jsonb;
  v_item    jsonb;
  v_pid     text;
  v_qty     int;
  v_total   int;
  v_sku     record;
  v_pend    int;
  v_new     int;
  v_dec     int := 0;
BEGIN
  SELECT store_id, items INTO v_store, v_items
    FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  -- Ownership (solo cuando la llamada lleva JWT de usuario)
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_store THEN
    RAISE EXCEPTION 'order_not_yours';
  END IF;

  -- IDEMPOTENCIA: pedido ya procesado → no tocar stock otra vez
  IF EXISTS (
    SELECT 1 FROM public.inventory_movements
     WHERE order_id = p_order_id AND reason = 'order_paid'
  ) THEN
    RETURN jsonb_build_object('order_id', p_order_id, 'status', 'already_processed');
  END IF;

  IF jsonb_typeof(COALESCE(v_items, 'null'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'order_items_invalid';
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(v_items) LOOP
    v_pid := v_item ->> 'id';
    v_qty := COALESCE((v_item ->> 'quantity')::int, 0);
    IF v_qty < 1 OR v_qty > 99 THEN
      RAISE EXCEPTION 'order_quantity_invalid';
    END IF;
    CONTINUE WHEN v_pid IS NULL;

    -- Stock total activo del producto (validación ANTES de tocar nada)
    SELECT COALESCE(SUM(stock), 0) INTO v_total
      FROM public.product_skus
     WHERE product_id::text = v_pid AND active = true;
    IF v_total < v_qty THEN
      RAISE EXCEPTION 'order_insufficient_stock %', v_pid;
    END IF;

    -- Repartir el descuento entre SKUs activos (FIFO), fila bloqueada
    v_pend := v_qty;
    FOR v_sku IN
      SELECT id, product_id, stock
        FROM public.product_skus
       WHERE product_id::text = v_pid AND active = true AND stock > 0
       ORDER BY created_at, id
         FOR UPDATE
    LOOP
      EXIT WHEN v_pend <= 0;
      v_new := NULL;
      UPDATE public.product_skus
         SET stock = stock - LEAST(stock, v_pend), updated_at = now()
       WHERE id = v_sku.id AND stock >= LEAST(stock, v_pend)
      RETURNING stock INTO v_new;
      IF v_new IS NULL THEN
        CONTINUE;  -- carrera con otra sesión: prueba con el siguiente SKU
      END IF;
      v_dec := LEAST(v_sku.stock, v_pend);
      INSERT INTO public.inventory_movements
        (store_id, order_id, product_id, sku_id, delta, reason)
      VALUES
        (v_store, p_order_id, v_sku.product_id, v_sku.id, -v_dec, 'order_paid')
      ON CONFLICT (order_id, sku_id)
      WHERE reason = 'order_paid' AND order_id IS NOT NULL
      DO NOTHING;
      v_pend := v_pend - v_dec;
    END LOOP;

    IF v_pend > 0 THEN
      -- No se pudo cubrir la cantidad (carrera): aborta TODO el pedido.
      RAISE EXCEPTION 'order_insufficient_stock %', v_pid;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('order_id', p_order_id, 'status', 'decremented');
END;
$$;

-- ============================================================================
-- 3) RESTORE_ORDER_STOCK — devuelve stock al cancelar un pedido pagado
-- ============================================================================
CREATE OR REPLACE FUNCTION public.restore_order_stock(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_store uuid;
  v_m     record;
  v_done  int := 0;
  v_ins_id uuid;
BEGIN
  SELECT store_id INTO v_store FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_store THEN
    RAISE EXCEPTION 'order_not_yours';
  END IF;

  -- Solo movimientos SIN contraparte de cancelación ya aplicada
  -- (idempotencia real: repetir la cancelación NO vuelve a sumar stock).
  FOR v_m IN
    SELECT m.* FROM public.inventory_movements m
     WHERE m.order_id = p_order_id AND m.reason = 'order_paid' AND m.delta < 0
       AND NOT EXISTS (
         SELECT 1 FROM public.inventory_movements c
          WHERE c.order_id = m.order_id AND c.sku_id = m.sku_id
            AND c.reason = 'order_cancelled')
       FOR UPDATE OF m
  LOOP
    UPDATE public.product_skus
       SET stock = stock + (-v_m.delta), updated_at = now()
     WHERE id = v_m.sku_id;

    INSERT INTO public.inventory_movements
      (store_id, order_id, product_id, sku_id, delta, reason)
    VALUES
      (v_m.store_id, p_order_id, v_m.product_id, v_m.sku_id, -v_m.delta, 'order_cancelled')
    ON CONFLICT (order_id, sku_id)
    WHERE reason = 'order_cancelled' AND order_id IS NOT NULL
    DO NOTHING
    RETURNING id INTO v_ins_id;
    IF v_ins_id IS NOT NULL THEN
      v_done := v_done + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'status', 'restored',
    'lines', v_done
  );
END;
$$;

-- El dueño puede reponer stock al cancelar SU pedido desde el panel
-- (lib/orders.js::updateOrderStatus → 'cancelled').
-- El webhook usa service-role (bypassa RLS; ownership verificado por firma).
GRANT EXECUTE ON FUNCTION public.decrement_order_stock(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_order_stock(uuid) TO authenticated;

-- ============================================================================
-- VERIFICACIÓN POST-EJECUCIÓN:
--   SELECT tablename FROM pg_tables WHERE tablename='inventory_movements'; -- 1
--   SELECT indexname FROM pg_indexes WHERE tablename='inventory_movements'
--     AND indexname LIKE 'uq_%';                                           -- 2
--   SELECT proname FROM pg_proc WHERE proname IN
--     ('decrement_order_stock','restore_order_stock');                     -- 2
--   SELECT policyname FROM pg_policies WHERE tablename='inventory_movements'; -- 1
-- ============================================================================


