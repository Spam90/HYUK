-- ============================================================================
-- HYUK · MIGRACIÓN 19 — BLINDAJE DEL INTAKE DE PEDIDOS (20260820)
-- ============================================================================
-- Objetivo: que el navegador NO pueda crear pedidos saltándose la capa
-- server-side (`POST /api/orders`) y que el cupón no pueda agotarse con
-- pedidos basura.
--
-- Cambios (todos transaccionales e idempotentes):
--   1) `orders.idempotency_key` + índice único parcial por tienda
--      → reintentos/dobles submits devuelven el MISMO pedido.
--   2) `orders.coupon_consumed_at` → marca cuándo se consumió el cupón.
--   3) `orders_price_integrity()` (trigger de INSERT): sigue VALIDANDO el
--      cupón (activo, expiración, usos, mínimo de compra) pero YA NO lo
--      consume al crear el pedido.
--   4) `set_order_status()`: consume el cupón UNA sola vez en la primera
--      confirmación (paid/preparing/ready/completed) y lo devuelve si el
--      pedido se cancela. Nunca bloquea la transición.
--   5) `create_order_with_items(...)`: acepta `p_idempotency_key` y devuelve
--      el pedido existente si la operación ya se ejecutó.
--   6) GRANTS: se revoca `EXECUTE` a `PUBLIC`/`anon` en las RPC de pedidos e
--      inventario. El checkout anónimo sigue funcionando a través de
--      `POST /api/orders` (service_role en el servidor).
--
-- Dependencias: migraciones 14 (coupons), 15 (inventario), 17 y 18 (pedidos).
-- RLS: NO se toca ninguna política. service_role sigue siendo server-only.
-- ============================================================================

-- ── 1) Idempotencia y consumo de cupón ─────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS idempotency_key text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_consumed_at timestamptz;

-- Índice único parcial: la misma clave de idempotencia no puede crear dos
-- pedidos en la misma tienda (el pedido nace en 'pending').
CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_uidx
  ON public.orders (store_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_coupon_consumed_idx
  ON public.orders (store_id, coupon_code)
  WHERE coupon_code IS NOT NULL;

-- ── 2) Trigger de integridad de precios (misma autoridad, cupón read-only) ──
CREATE OR REPLACE FUNCTION public.orders_price_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item jsonb;
  v_group jsonb;
  v_choice jsonb;
  v_opts jsonb;
  v_i int;
  v_num numeric;
  v_qty int;
  v_pid text;
  v_prod public.products%ROWTYPE;
  v_sku record;
  v_has_skus boolean;
  v_unit numeric;
  v_subtotal numeric := 0;
  v_coupon record;
  v_discount numeric := 0;
  v_zones jsonb;
  v_zone jsonb;
  v_fee numeric := 0;
BEGIN
  IF jsonb_typeof(COALESCE(NEW.items, 'null'::jsonb)) <> 'array'
     OR jsonb_array_length(NEW.items) = 0
     OR jsonb_array_length(NEW.items) > 50 THEN
    RAISE EXCEPTION 'order_items_invalid';
  END IF;

  FOR v_i IN 0 .. jsonb_array_length(NEW.items) - 1 LOOP
    v_item := NEW.items -> v_i;
    v_num := (v_item ->> 'quantity')::numeric;
    IF v_num <> floor(v_num) OR v_num < 1 OR v_num > 99 THEN
      RAISE EXCEPTION 'order_quantity_invalid';
    END IF;
    v_qty := v_num::int;
    v_pid := v_item ->> 'id';

    SELECT * INTO v_prod FROM public.products
     WHERE id::text = v_pid AND store_id = NEW.store_id;
    IF NOT FOUND OR v_prod.is_available = false THEN
      RAISE EXCEPTION 'order_product_invalid';
    END IF;

    v_unit := v_prod.price;
    IF v_prod.flash_sale_price IS NOT NULL AND v_prod.flash_sale_price > 0
       AND v_prod.flash_sale_end IS NOT NULL AND v_prod.flash_sale_end > now() THEN
      v_unit := v_prod.flash_sale_price;
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM public.product_skus
       WHERE product_id = v_prod.id AND active = true
    ) INTO v_has_skus;

    IF (v_item ->> 'skuId' IS NOT NULL OR v_item ->> 'sku' IS NOT NULL) THEN
      IF v_item ->> 'skuId' IS NOT NULL THEN
        SELECT id, product_id, stock, price_override INTO v_sku
          FROM public.product_skus
         WHERE id::text = v_item ->> 'skuId'
           AND product_id = v_prod.id AND active = true;
      ELSE
        SELECT id, product_id, stock, price_override INTO v_sku
          FROM public.product_skus
         WHERE sku = v_item ->> 'sku'
           AND product_id = v_prod.id AND active = true
         ORDER BY created_at, id LIMIT 1;
      END IF;
      IF NOT FOUND THEN RAISE EXCEPTION 'invalid_sku'; END IF;
      IF v_sku.stock < v_qty THEN RAISE EXCEPTION 'order_insufficient_stock'; END IF;
      v_unit := COALESCE(v_sku.price_override, v_unit);
    ELSIF v_has_skus THEN
      RAISE EXCEPTION 'invalid_sku';
    END IF;

    v_opts := CASE WHEN jsonb_typeof(v_prod.options) = 'array' THEN v_prod.options ELSE '[]'::jsonb END;
    IF jsonb_array_length(v_opts) = 0 THEN
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'choices', choices, 'is_required', is_required) ORDER BY sort_order), '[]'::jsonb)
        INTO v_opts FROM public.product_options WHERE product_id = v_prod.id;
    END IF;

    IF jsonb_typeof(v_item -> 'selectedOptions') = 'array' THEN
      FOR v_group IN SELECT value FROM jsonb_array_elements(v_item -> 'selectedOptions') LOOP
        IF v_group ->> 'label' IS NULL THEN RAISE EXCEPTION 'order_option_invalid'; END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(v_opts) g,
               jsonb_array_elements(CASE
                 WHEN jsonb_typeof(g -> 'values') = 'array' THEN g -> 'values'
                 WHEN jsonb_typeof(g -> 'choices') = 'array' THEN g -> 'choices'
                 ELSE '[]'::jsonb END) c
          WHERE c ->> 'label' = v_group ->> 'label'
            AND (v_group ->> 'groupLabel' IS NULL OR lower(COALESCE(g ->> 'name', g ->> 'label')) = lower(v_group ->> 'groupLabel'))
        ) THEN
          RAISE EXCEPTION 'order_option_invalid';
        END IF;
        FOR v_choice IN SELECT value FROM jsonb_array_elements(v_opts) LOOP
          IF EXISTS (
            SELECT 1 FROM jsonb_array_elements(CASE
              WHEN jsonb_typeof(v_choice -> 'values') = 'array' THEN v_choice -> 'values'
              WHEN jsonb_typeof(v_choice -> 'choices') = 'array' THEN v_choice -> 'choices'
              ELSE '[]'::jsonb END) c
            WHERE c ->> 'label' = v_group ->> 'label'
              AND (v_group ->> 'groupLabel' IS NULL OR lower(COALESCE(v_choice ->> 'name', v_choice ->> 'label')) = lower(v_group ->> 'groupLabel'))
          ) THEN
            SELECT COALESCE((c ->> 'priceDelta')::numeric, 0) INTO v_num
              FROM jsonb_array_elements(CASE
                WHEN jsonb_typeof(v_choice -> 'values') = 'array' THEN v_choice -> 'values'
                WHEN jsonb_typeof(v_choice -> 'choices') = 'array' THEN v_choice -> 'choices'
                ELSE '[]'::jsonb END) c
             WHERE c ->> 'label' = v_group ->> 'label'
               AND (v_group ->> 'groupLabel' IS NULL OR lower(COALESCE(v_choice ->> 'name', v_choice ->> 'label')) = lower(v_group ->> 'groupLabel'))
             LIMIT 1;
            v_unit := v_unit + COALESCE(v_num, 0);
            EXIT;
          END IF;
        END LOOP;
      END LOOP;
    END IF;
    FOR v_choice IN SELECT value FROM jsonb_array_elements(v_opts) LOOP
      IF COALESCE((v_choice ->> 'is_required')::boolean, false)
         AND NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements(COALESCE(v_item -> 'selectedOptions', '[]'::jsonb)) s
            WHERE lower(COALESCE(s ->> 'groupLabel', '')) = lower(COALESCE(v_choice ->> 'name', v_choice ->> 'label', ''))
         ) THEN
        RAISE EXCEPTION 'order_option_invalid';
      END IF;
    END LOOP;
    v_subtotal := v_subtotal + round(v_unit * v_qty, 2);
  END LOOP;

  -- CUPÓN: se VALIDA aquí (activo, expiración, usos y mínimo de compra) pero
  -- NO se consume. `used_count` se incrementa al CONFIRMAR el pedido
  -- (set_order_status), para que nadie agote un cupón creando pedidos basura.
  IF NEW.coupon_code IS NOT NULL AND btrim(NEW.coupon_code) <> '' THEN
    SELECT discount_type, discount_value, min_purchase
      INTO v_coupon
      FROM public.coupons
     WHERE store_id = NEW.store_id
       AND upper(code) = upper(btrim(NEW.coupon_code))
       AND is_active = true
       AND (expires_at IS NULL OR expires_at > now())
       AND (max_uses = 0 OR used_count < max_uses)
     ORDER BY created_at
     LIMIT 1;

    IF NOT FOUND OR v_subtotal < COALESCE(v_coupon.min_purchase, 0) THEN
      RAISE EXCEPTION 'order_coupon_invalid';
    END IF;
    IF v_coupon.discount_type = 'percent' THEN
      v_discount := round(v_subtotal * v_coupon.discount_value / 100.0, 2);
    ELSE
      v_discount := least(v_coupon.discount_value, v_subtotal);
    END IF;
  END IF;

  IF NEW.delivery_method IS NOT NULL
     AND (NEW.delivery_method ILIKE '%domicilio%' OR NEW.delivery_method ILIKE '%delivery%' OR NEW.delivery_method ILIKE '%envio%') THEN
    SELECT jsonb_extract_path(settings, 'theme', 'deliveryZones') INTO v_zones
      FROM public.profiles WHERE id = NEW.store_id;
    IF v_zones IS NOT NULL AND jsonb_typeof(v_zones) = 'array' AND jsonb_array_length(v_zones) > 0 THEN
      SELECT z INTO v_zone FROM jsonb_array_elements(v_zones) z
       WHERE lower(z ->> 'label') = lower(btrim(NEW.delivery_zone)) LIMIT 1;
      IF v_zone IS NULL THEN RAISE EXCEPTION 'order_delivery_zone_invalid'; END IF;
      v_fee := GREATEST(COALESCE((v_zone ->> 'fee')::numeric, (v_zone ->> 'price')::numeric, 0), 0);
    END IF;
  END IF;

  NEW.discount_amount := GREATEST(v_discount, 0);
  NEW.delivery_fee := v_fee;
  NEW.total_amount := round(GREATEST(v_subtotal - v_discount, 0) + v_fee, 2);
  NEW.total := NEW.total_amount;
  RETURN NEW;
EXCEPTION
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'order_items_invalid';
END;
$$;

DROP TRIGGER IF EXISTS orders_price_integrity_trg ON public.orders;
CREATE TRIGGER orders_price_integrity_trg
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_price_integrity();

-- ── 3) Ciclo de vida del pedido + consumo del cupón ────────────────────────
-- Se conserva la firma y la máquina de estados de la migración 18. El único
-- cambio es el CUPÓN: se consume una sola vez en la primera confirmación y se
-- devuelve si el pedido se cancela. Nunca bloquea la transición (un pedido ya
-- pagado debe poder confirmarse aunque el cupón se haya agotado mientras
-- tanto: el descuento ya se aplicó y el límite se respetó en la creación).
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
  v_order record;
  v_stock jsonb;
  v_row public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'order_not_found', 'status', 404); END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_order.store_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_not_yours', 'status', 403);
  END IF;
  IF p_new_status NOT IN ('pending','paid','preparing','ready','completed','cancelled') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status', 'status', 400);
  END IF;
  IF NOT ((v_order.status = 'pending' AND p_new_status IN ('paid','cancelled','preparing'))
       OR (v_order.status = 'paid' AND p_new_status IN ('preparing','ready','completed','cancelled'))
       OR (v_order.status = 'preparing' AND p_new_status IN ('ready','completed','cancelled'))
       OR (v_order.status = 'ready' AND p_new_status IN ('completed','cancelled'))) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_order_transition', 'status', 409);
  END IF;

  IF p_new_status IN ('paid', 'preparing') THEN
    SELECT public.decrement_order_stock(p_order_id) INTO v_stock;
  ELSIF p_new_status = 'cancelled' THEN
    SELECT public.restore_order_stock(p_order_id) INTO v_stock;
  END IF;

  IF p_new_status = 'paid' THEN PERFORM public._sync_order_items(p_order_id); END IF;

  -- CUPÓN: consumo único (idempotente por `coupon_consumed_at`).
  IF v_order.coupon_code IS NOT NULL AND btrim(v_order.coupon_code) <> '' THEN
    IF p_new_status IN ('paid', 'preparing', 'ready', 'completed')
       AND v_order.coupon_consumed_at IS NULL THEN
      UPDATE public.coupons
         SET used_count = used_count + 1, updated_at = now()
       WHERE store_id = v_order.store_id
         AND upper(code) = upper(btrim(v_order.coupon_code))
         AND is_active = true
         AND (expires_at IS NULL OR expires_at > now())
         AND (max_uses = 0 OR used_count < max_uses);
      -- Se marca incluso si ya estaba agotado: el descuento de ESTE pedido ya
      -- se aplicó y no debe reintentarse ni descontarse dos veces.
      UPDATE public.orders SET coupon_consumed_at = now() WHERE id = p_order_id;
    ELSIF p_new_status = 'cancelled' AND v_order.coupon_consumed_at IS NOT NULL THEN
      UPDATE public.coupons
         SET used_count = GREATEST(used_count - 1, 0), updated_at = now()
       WHERE store_id = v_order.store_id
         AND upper(code) = upper(btrim(v_order.coupon_code));
      UPDATE public.orders SET coupon_consumed_at = NULL WHERE id = p_order_id;
    END IF;
  END IF;

  UPDATE public.orders SET
    status = p_new_status,
    payment_status = CASE WHEN p_new_status = 'paid' THEN 'paid'
      WHEN p_new_status = 'cancelled' AND v_order.status = 'paid' THEN 'refunded'
      ELSE payment_status END,
    payment_provider = COALESCE(p_payment_provider, payment_provider),
    payment_intent_id = COALESCE(p_payment_intent_id, payment_intent_id),
    stripe_session_id = COALESCE(p_stripe_session_id, stripe_session_id),
    updated_at = now()
  WHERE id = p_order_id RETURNING * INTO v_row;
  RETURN jsonb_build_object('ok', true, 'order', to_jsonb(v_row), 'stock', v_stock);
EXCEPTION
  WHEN OTHERS THEN
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

-- ── 4) Creación de pedidos con idempotencia ─────────────────────────────────
-- Se elimina la firma antigua (12 parámetros) para que ningún cliente pueda
-- invocarla sin clave de idempotencia. La nueva firma mantiene los DEFAULTS:
-- las llamadas antiguas con 12 argumentos siguen funcionando.
DROP FUNCTION IF EXISTS public.create_order_with_items(
  uuid, jsonb, text, text, text, text, text, text, text, text, text, text
);

CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_store_id uuid, p_items jsonb, p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL, p_delivery_address text DEFAULT NULL,
  p_delivery_method text DEFAULT NULL, p_delivery_zone text DEFAULT NULL,
  p_payment_method text DEFAULT NULL, p_payment_provider text DEFAULT 'supabase',
  p_currency text DEFAULT 'DOP', p_notes text DEFAULT NULL, p_coupon_code text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_items jsonb;
  v_key text := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
BEGIN
  -- IDEMPOTENCIA: la misma operación devuelve el MISMO pedido.
  IF v_key IS NOT NULL THEN
    SELECT * INTO v_order FROM public.orders
     WHERE store_id = p_store_id AND idempotency_key = v_key
     ORDER BY created_at LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object('ok', true, 'duplicate', true, 'order', to_jsonb(v_order));
    END IF;
  END IF;

  IF p_store_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_store_id AND slug IS NOT NULL AND slug <> ''
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'store_not_found', 'status', 404);
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_store_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'store_not_yours', 'status', 403);
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_items_invalid', 'status', 400);
  END IF;

  INSERT INTO public.orders
    (store_id, customer_name, customer_phone, delivery_address, delivery_method,
     delivery_zone, payment_method, payment_provider, currency, items, notes,
     coupon_code, status, payment_status, idempotency_key)
  VALUES
    (p_store_id, p_customer_name, p_customer_phone, p_delivery_address, p_delivery_method,
     p_delivery_zone, p_payment_method, COALESCE(p_payment_provider, 'supabase'),
     COALESCE(p_currency, 'DOP'), p_items, COALESCE(p_notes, ''), p_coupon_code,
     'pending', 'pending', v_key)
  RETURNING * INTO v_order;

  PERFORM public._sync_order_items(v_order.id);
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', oi.product_id, 'name', oi.product_name_snapshot, 'quantity', oi.quantity,
    'price', oi.unit_price_snapshot, 'selectedOptions', oi.options_snapshot,
    'skuId', oi.sku_snapshot ->> 'id'
  ) ORDER BY oi.id), '[]'::jsonb) INTO v_items
    FROM public.order_items oi WHERE oi.order_id = v_order.id;
  UPDATE public.orders SET items = v_items WHERE id = v_order.id RETURNING * INTO v_order;
  RETURN jsonb_build_object('ok', true, 'order', to_jsonb(v_order));
EXCEPTION
  -- Carrera de idempotencia: otra petición idéntica ganó el índice único.
  WHEN unique_violation THEN
    IF v_key IS NOT NULL THEN
      SELECT * INTO v_order FROM public.orders
       WHERE store_id = p_store_id AND idempotency_key = v_key
       ORDER BY created_at LIMIT 1;
      IF FOUND THEN
        RETURN jsonb_build_object('ok', true, 'duplicate', true, 'order', to_jsonb(v_order));
      END IF;
      RETURN jsonb_build_object('ok', false, 'error', 'order_in_progress', 'status', 409);
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'internal_error', 'status', 500);
  WHEN OTHERS THEN
    IF SQLERRM LIKE 'order_items_invalid%' THEN RETURN jsonb_build_object('ok',false,'error','order_items_invalid','status',400);
    ELSIF SQLERRM LIKE 'order_quantity_invalid%' THEN RETURN jsonb_build_object('ok',false,'error','order_quantity_invalid','status',400);
    ELSIF SQLERRM LIKE 'order_product_invalid%' THEN RETURN jsonb_build_object('ok',false,'error','order_product_invalid','status',400);
    ELSIF SQLERRM LIKE 'order_option_invalid%' THEN RETURN jsonb_build_object('ok',false,'error','order_option_invalid','status',400);
    ELSIF SQLERRM = 'order_coupon_invalid' THEN RETURN jsonb_build_object('ok',false,'error','order_coupon_invalid','status',409);
    ELSIF SQLERRM LIKE 'order_delivery%' THEN RETURN jsonb_build_object('ok',false,'error','order_delivery_zone_invalid','status',400);
    ELSIF SQLERRM = 'invalid_sku' THEN RETURN jsonb_build_object('ok',false,'error','invalid_sku','status',400);
    ELSIF SQLERRM LIKE 'order_insufficient_stock%' THEN RETURN jsonb_build_object('ok',false,'error','order_insufficient_stock','status',409);
    ELSE RETURN jsonb_build_object('ok', false, 'error', 'internal_error', 'status', 500);
    END IF;
END;
$$;

-- ── 5) GRANTS: el navegador (anon) ya no puede invocar las RPC de pedidos ───
-- El checkout anónimo SIGUE funcionando: `POST /api/orders` las ejecuta con
-- service_role desde el servidor (nunca desde el navegador).
-- `authenticated` conserva el acceso que necesita el panel admin para las
-- transiciones de estado; el webhook de Stripe usa service_role.
-- NOTA: requiere las migraciones 15/17/18 aplicadas (de ahí vienen las
-- funciones de inventario y de transición).

-- Creación de pedidos
REVOKE ALL ON FUNCTION public.create_order_with_items(
  uuid, jsonb, text, text, text, text, text, text, text, text, text, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order_with_items(
  uuid, jsonb, text, text, text, text, text, text, text, text, text, text, text
) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_order_with_items(
  uuid, jsonb, text, text, text, text, text, text, text, text, text, text, text
) TO authenticated;

-- Transición de estado (panel admin / webhook)
REVOKE ALL ON FUNCTION public.set_order_status(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_order_status(uuid, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_order_status(uuid, text, text, text, text) TO authenticated;

-- Snapshots de items (interno)
REVOKE ALL ON FUNCTION public._sync_order_items(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._sync_order_items(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public._sync_order_items(uuid) TO authenticated;

-- Inventario (interno: se invoca desde las rutas server-side)
REVOKE ALL ON FUNCTION public.decrement_order_stock(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_order_stock(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.decrement_order_stock(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.restore_order_stock(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_order_stock(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.restore_order_stock(uuid) TO authenticated;

-- service_role (server-only) necesita EXECUTE para las rutas de API.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_order_with_items(uuid, jsonb, text, text, text, text, text, text, text, text, text, text, text) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.set_order_status(uuid, text, text, text, text) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public._sync_order_items(uuid) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.decrement_order_stock(uuid) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.restore_order_stock(uuid) TO service_role';
  END IF;
END $$;
