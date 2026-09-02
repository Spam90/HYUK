-- ============================================================================
-- MIGRACIÓN 20240101000017 — PROMPT 10: TRANSICIONES DE ESTADO ATOMICAS
-- ============================================================================
-- Problemas detectados en el código real:
--   1) app/admin/orders/page.jsx hace UPDATE orders SET status directo
--      SIN tocar inventario ni validar máquina de estados → un pedido puede
--      quedar "paid" sin descontar stock y con transiciones inválidas.
--   2) lib/orders.js::updateOrderStatus hace UPDATE → inventario en catch
--      que "traga" el error → pedido paid + stock sin descontar.
--   3) order_items NO tiene columnas sku / total_price / *snapshot: el
--      webhook intentaba insertarlas y fallaba SILENCIOSAMENTE (catch warn)
--      → los order_items de Stripe nunca se creaban de verdad.
--   4) El webhook normalizaba order_items con it.price del carrito
--      (manipulable), no con el precio real de la BD.
--
-- Solución:
--   A. Ampliar order_items con columnas snapshot históricas.
--   B. `_sync_order_items(order_id)` — recalcula order_items desde products
--      (nunca desde el JSON del navegador) y sobrescribe la línea.
--   C. `set_order_status(order_id, new_status, ...)` — RPC TRANSACCIONAL:
--      estado + inventario + order_items en UNA transacción. Si el stock
--      falla, la transacción revierte (el pedido NO queda "paid" sin stock).
--   D. `create_order_with_items(...)` — creación de pedido TRANSACCIONAL.
-- IDEMPOTENTE. No borra datos existentes.
-- ============================================================================

-- ============================================================================
-- A) ORDER_ITEMS — columnas snapshot para reporting histórico
-- ============================================================================
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_name_snapshot text,
  ADD COLUMN IF NOT EXISTS unit_price_snapshot numeric(12,2),
  ADD COLUMN IF NOT EXISTS total_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS options_snapshot jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sku_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- ============================================================================
-- B) _SYNC_ORDER_ITEMS — recalcula order_items desde BD (no del navegador)
-- ============================================================================
CREATE OR REPLACE FUNCTION public._sync_order_items(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order   RECORD;
  v_item    jsonb;
  v_prod    public.products%ROWTYPE;
  v_qty     int;
  v_unit    numeric;
  v_total   numeric;
  v_name    text;
  v_sku     jsonb;
  v_delta   numeric;
  v_grp     jsonb;
  v_chosen  jsonb;
  v_sel     jsonb;
  v_opts    jsonb;
  v_label   text;
  v_sku_row record;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> v_order.store_id THEN
    RAISE EXCEPTION 'order_not_yours';
  END IF;

  DELETE FROM public.order_items WHERE order_id = p_order_id;

  IF v_order.items IS NULL OR jsonb_typeof(v_order.items) <> 'array' THEN
    RETURN;
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(v_order.items) LOOP
    IF v_item ->> 'id' IS NULL THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_prod
      FROM public.products
     WHERE id::text = v_item ->> 'id' AND store_id = v_order.store_id;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    v_qty  := GREATEST(COALESCE((v_item ->> 'quantity')::int, 1), 1);
    v_unit := COALESCE(v_prod.price, 0);

    -- Oferta relámpago vigente
    IF v_prod.flash_sale_price IS NOT NULL AND v_prod.flash_sale_price > 0
       AND v_prod.flash_sale_end IS NOT NULL AND v_prod.flash_sale_end > now() THEN
      v_unit := v_prod.flash_sale_price;
    END IF;

    -- Opciones: delta desde la BD (label→priceDelta), NUNCA del navegador
    v_sel  := COALESCE(v_item ->> 'selectedOptions', '[]')::jsonb;
    IF jsonb_typeof(v_sel) = 'array' THEN
      v_opts := CASE WHEN jsonb_typeof(v_prod.options) = 'array'
                     THEN v_prod.options ELSE '[]'::jsonb END;
      FOR v_chosen IN SELECT jsonb_array_elements(v_sel) LOOP
        v_label := v_chosen ->> 'label';
        v_delta := NULL;
        FOR v_grp IN SELECT jsonb_array_elements(v_opts) LOOP
          SELECT z INTO v_delta
            FROM jsonb_array_elements(
              CASE WHEN jsonb_typeof(v_grp -> 'values') = 'array' THEN v_grp -> 'values'
                   WHEN jsonb_typeof(v_grp -> 'choices') = 'array' THEN v_grp -> 'choices'
                   ELSE '[]'::jsonb END) z
            WHERE z ->> 'label' = v_label
            LIMIT 1;
          EXIT WHEN v_delta IS NOT NULL;
        END LOOP;
        IF v_delta IS NOT NULL THEN
          v_unit := v_unit + v_delta;
        END IF;
      END LOOP;
    END IF;

    v_unit  := round(v_unit, 2);
    v_total := round(v_unit * v_qty, 2);
    v_name  := COALESCE(v_prod.name, v_item ->> 'name', 'Producto');

    -- SKU: si el carrito manda skuId/sku se debe VALIDAR contra product_skus
    -- real de ESTE producto y ESTA tienda. Nunca se confía en el navegador.
    v_sku := NULL;
    IF v_item ->> 'skuId' IS NOT NULL OR v_item ->> 'sku' IS NOT NULL THEN
      IF v_item ->> 'skuId' IS NOT NULL THEN
        SELECT * INTO v_sku_row
          FROM public.product_skus
         WHERE id::text = v_item ->> 'skuId'
           AND product_id = v_prod.id
           AND active = true;
      ELSE
        SELECT * INTO v_sku_row
          FROM public.product_skus
         WHERE product_id = v_prod.id
           AND sku = v_item ->> 'sku'
           AND active = true
         LIMIT 1;
      END IF;
      IF NOT FOUND THEN
        -- SKU falso / de otro producto / inactivo → error de negocio seguro.
        RAISE EXCEPTION 'invalid_sku';
      END IF;
      v_sku := jsonb_build_object('id', v_sku_row.id, 'sku', v_sku_row.sku);
    END IF;

    INSERT INTO public.order_items
      (order_id, product_id, product_name, product_name_snapshot,
       quantity, unit_price, unit_price_snapshot, total_price,
       options, options_snapshot, sku_snapshot)
    VALUES
      (p_order_id, v_prod.id, v_name, v_name,
       v_qty, v_unit, v_unit, v_total,
       v_sel, v_sel, v_sku);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public._sync_order_items(uuid) TO authenticated;

-- ============================================================================
-- D) CREATE_ORDER_WITH_ITEMS — creación transaccional order + order_items
-- ============================================================================
-- Reemplaza el INSERT directo del catálogo (CartDrawer → lib/orders.js).
-- Solo acepta identificadores y cantidades/selecciones del navegador:
--   * p_items = JSON con {id (producto), quantity, selectedOptions[].label,
--     skuId|sku opcional}. Cualquier otro campo (price/total/name) se ignora.
--   * El trigger orders_price_integrity (migración 14) recalcula precios,
--     descuento, delivery y total desde BD; aquí NO se recibe dinero.
--   * _sync_order_items valida productos/opciones/SKUs contra BD y persiste
--     los snapshots históricos en order_items.
-- Todo dentro de UNA transacción: si algo falla, no queda pedido huérfano.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_store_id uuid,
  p_items jsonb,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_delivery_address text DEFAULT NULL,
  p_delivery_method text DEFAULT NULL,
  p_delivery_zone text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_payment_provider text DEFAULT 'supabase',
  p_currency text DEFAULT 'DOP',
  p_notes text DEFAULT NULL,
  p_coupon_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  -- ---------- tienda: existe + ownership ----------
  IF p_store_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'store_required', 'status', 400);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_store_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'store_not_found', 'status', 404);
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_store_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'store_not_yours', 'status', 403);
  END IF;

  -- ---------- items: array no vacío (el trigger valida 1..99 por línea) ----------
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_items_invalid', 'status', 400);
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_items_empty', 'status', 400);
  END IF;
  IF jsonb_array_length(p_items) > 50 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_items_too_many', 'status', 400);
  END IF;

  -- ---------- crear el pedido: el trigger recalcula todo (precio/dto/envío) ----------
  INSERT INTO public.orders
    (store_id, customer_name, customer_phone, delivery_address,
     delivery_method, delivery_zone, payment_method, payment_provider,
     currency, items, notes, coupon_code, status, payment_status)
  VALUES
    (p_store_id, p_customer_name, p_customer_phone, p_delivery_address,
     p_delivery_method, p_delivery_zone, p_payment_method,
     COALESCE(p_payment_provider, 'supabase'), COALESCE(p_currency, 'DOP'),
     p_items, COALESCE(p_notes, ''), p_coupon_code, 'pending', 'pending')
  RETURNING * INTO v_order;

  -- ---------- order_items con datos reales de BD (snapshots) ----------
  PERFORM public._sync_order_items(v_order.id);

  RETURN jsonb_build_object(
    'ok', true,
    'order', to_jsonb(v_order)
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Clasificación segura; nunca se expone SQLERRM.
    IF    SQLERRM LIKE 'order_quantity_invalid%'  THEN RETURN jsonb_build_object('ok',false,'error','order_quantity_invalid','status',400);
    ELSIF SQLERRM LIKE 'order_product_invalid%'   THEN RETURN jsonb_build_object('ok',false,'error','order_product_invalid','status',400);
    ELSIF SQLERRM LIKE 'order_option_invalid%'    THEN RETURN jsonb_build_object('ok',false,'error','order_option_invalid','status',400);
    ELSIF SQLERRM = 'order_coupon_invalid'        THEN RETURN jsonb_build_object('ok',false,'error','order_coupon_invalid','status',409);
    ELSIF SQLERRM LIKE 'order_delivery%'          THEN RETURN jsonb_build_object('ok',false,'error','order_delivery_zone_invalid','status',400);
    ELSIF SQLERRM = 'invalid_sku'                 THEN RETURN jsonb_build_object('ok',false,'error','invalid_sku','status',400);
    ELSIF SQLERRM LIKE 'order_insufficient_stock%' THEN RETURN jsonb_build_object('ok',false,'error','order_insufficient_stock','status',409);
    ELSE RETURN jsonb_build_object('ok', false, 'error', 'internal_error', 'status', 500);
    END IF;
END;
$$;

-- El flujo público del catálogo (anon) y el admin autenticado ejecutan la RPC.
GRANT EXECUTE ON FUNCTION public.create_order_with_items(uuid, jsonb, text, text, text, text, text, text, text, text, text, text)
  TO anon, authenticated;

-- ============================================================================
-- VERIFICACIÓN POST-EJECUCIÓN:
--   SELECT proname FROM pg_proc WHERE proname IN
--     ('create_order_with_items','set_order_status','_sync_order_items');  -- 3
--   SELECT column_name FROM information_schema.columns WHERE table_name =
--     'order_items' AND column_name LIKE '%snapshot%';                     -- 4
-- ============================================================================

-- ============================================================================
-- C) SET_ORDER_STATUS — transición atómica estado + inventario + items
-- ============================================================================
-- Máquina de estados (whitelist estricta, Prompt 10):
--   pending   → paid | cancelled | preparing
--   paid      → preparing | ready | completed | cancelled
--   preparing → ready | completed | cancelled
--   ready     → completed | cancelled
--   completed → ninguna
--   cancelled → ninguna
--
-- Argumentos opcionales para que el webhook de Stripe persista
-- payment_intent_id / stripe_session_id en la misma transacción atómica.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_order_status(
  p_order_id uuid,
  p_new_status text,
  p_payment_provider text DEFAULT NULL,
  p_payment_intent_id text DEFAULT NULL,
  p_stripe_session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order  RECORD;
  v_ok     boolean := false;
  v_old    text;
  v_stock  jsonb;
  v_row    public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order
    FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_not_found', 'status', 404);
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> v_order.store_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_not_yours', 'status', 403);
  END IF;

  v_old := v_order.status;

  IF p_new_status NOT IN ('pending','paid','preparing','ready','completed','cancelled') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status', 'status', 400);
  END IF;

  IF    (v_old = 'pending'   AND p_new_status IN ('paid','cancelled','preparing'))
     OR (v_old = 'paid'      AND p_new_status IN ('preparing','ready','completed','cancelled'))
     OR (v_old = 'preparing' AND p_new_status IN ('ready','completed','cancelled'))
     OR (v_old = 'ready'     AND p_new_status IN ('completed','cancelled'))
  THEN
    v_ok := true;
  END IF;

  IF NOT v_ok THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'invalid_order_transition',
      'from', v_old, 'to', p_new_status, 'status', 409
    );
  END IF;

  -- Inventario: la transición a / desde pagado o cancelado sincroniza stock.
  IF p_new_status = 'paid' AND v_old <> 'paid' THEN
    -- Descarta stock atómicamente (idempotente). Si falla (stock
    -- insuficiente) la excepción revierte el UPDATE de status posterior.
    SELECT * INTO v_stock FROM public.decrement_order_stock(p_order_id);
  END IF;

  IF p_new_status = 'cancelled' AND v_old <> 'cancelled' THEN
    -- Repone stock (idempotente). También válido si nunca hubo pago
    -- (no hay movimientos; no lanza error).
    SELECT * INTO v_stock FROM public.restore_order_stock(p_order_id);
  END IF;

  -- Normalizar order_items (precios desde BD) en la misma transacción.
  IF p_new_status = 'paid' THEN
    PERFORM public._sync_order_items(p_order_id);
  END IF;

  UPDATE public.orders
     SET status = p_new_status,
         payment_status = CASE
                            WHEN p_new_status = 'paid' THEN 'paid'
                            WHEN p_new_status = 'cancelled' AND v_old = 'paid' THEN 'refunded'
                            ELSE payment_status
                          END,
         payment_provider  = COALESCE(p_payment_provider, payment_provider),
         payment_intent_id = COALESCE(p_payment_intent_id, payment_intent_id),
         stripe_session_id = COALESCE(p_stripe_session_id, stripe_session_id),
         updated_at = now()
   WHERE id = p_order_id
   RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'ok', true,
    'order', to_jsonb(v_row),
    'stock', v_stock
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Traduce a un JSON seguro; la transacción ya revirtió. NUNCA se expone
    -- SQLERRM al cliente (puede contener nombre de tablas/columnas).
    IF SQLERRM LIKE 'order_insufficient_stock%' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'order_insufficient_stock', 'status', 409);
    ELSIF SQLERRM = 'order_not_found' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'order_not_found', 'status', 404);
    ELSIF SQLERRM = 'invalid_sku' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_sku', 'status', 400);
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'internal_error', 'status', 500);
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_order_status(uuid, text, text, text, text) TO authenticated;