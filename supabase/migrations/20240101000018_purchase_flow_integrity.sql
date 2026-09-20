-- HYUK purchase flow integrity.
-- Keeps create_order_with_items and the existing inventory RPCs as the authority.
-- Applies server-side validation for product options, SKUs, stock and coupons.

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

  IF NEW.coupon_code IS NOT NULL AND btrim(NEW.coupon_code) <> '' THEN
    UPDATE public.coupons
       SET used_count = used_count + 1, updated_at = now()
     WHERE store_id = NEW.store_id
       AND upper(code) = upper(btrim(NEW.coupon_code))
       AND is_active = true
       AND (expires_at IS NULL OR expires_at > now())
       AND (max_uses = 0 OR used_count < max_uses)
    RETURNING discount_type, discount_value, min_purchase INTO v_coupon;
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

-- The existing status RPC is reused; WhatsApp orders consume stock when the
-- store accepts them (pending -> preparing), while paid orders remain idempotent.
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

GRANT EXECUTE ON FUNCTION public.set_order_status(uuid, text, text, text, text) TO authenticated;

-- Rebuild order snapshots from the same product/SKU/options authority.
CREATE OR REPLACE FUNCTION public._sync_order_items(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order record;
  v_item jsonb;
  v_prod public.products%ROWTYPE;
  v_sku record;
  v_opts jsonb;
  v_group jsonb;
  v_choice jsonb;
  v_sel jsonb;
  v_label text;
  v_unit numeric;
  v_delta numeric;
  v_qty int;
  v_sku_snapshot jsonb;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_order.store_id THEN RAISE EXCEPTION 'order_not_yours'; END IF;
  DELETE FROM public.order_items WHERE order_id = p_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(v_order.items, '[]'::jsonb)) LOOP
    SELECT * INTO v_prod FROM public.products
     WHERE id::text = v_item ->> 'id' AND store_id = v_order.store_id AND is_available = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'order_product_invalid'; END IF;
    v_qty := (v_item ->> 'quantity')::int;
    IF v_qty < 1 OR v_qty > 99 THEN RAISE EXCEPTION 'order_quantity_invalid'; END IF;
    v_unit := v_prod.price;
    IF v_prod.flash_sale_price IS NOT NULL AND v_prod.flash_sale_price > 0
       AND v_prod.flash_sale_end IS NOT NULL AND v_prod.flash_sale_end > now() THEN
      v_unit := v_prod.flash_sale_price;
    END IF;

    v_sku_snapshot := NULL;
    IF v_item ->> 'skuId' IS NOT NULL OR v_item ->> 'sku' IS NOT NULL THEN
      IF v_item ->> 'skuId' IS NOT NULL THEN
        SELECT id, sku, price_override INTO v_sku FROM public.product_skus
         WHERE id::text = v_item ->> 'skuId' AND product_id = v_prod.id AND active = true;
      ELSE
        SELECT id, sku, price_override INTO v_sku FROM public.product_skus
         WHERE sku = v_item ->> 'sku' AND product_id = v_prod.id AND active = true
         ORDER BY created_at, id LIMIT 1;
      END IF;
      IF NOT FOUND THEN RAISE EXCEPTION 'invalid_sku'; END IF;
      v_unit := COALESCE(v_sku.price_override, v_unit);
      v_sku_snapshot := jsonb_build_object('id', v_sku.id, 'sku', v_sku.sku);
    ELSIF EXISTS (SELECT 1 FROM public.product_skus WHERE product_id = v_prod.id AND active = true) THEN
      RAISE EXCEPTION 'invalid_sku';
    END IF;

    v_opts := CASE WHEN jsonb_typeof(v_prod.options) = 'array' THEN v_prod.options ELSE '[]'::jsonb END;
    IF jsonb_array_length(v_opts) = 0 THEN
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'choices', choices, 'is_required', is_required) ORDER BY sort_order), '[]'::jsonb)
        INTO v_opts FROM public.product_options WHERE product_id = v_prod.id;
    END IF;
    v_sel := COALESCE(v_item -> 'selectedOptions', '[]'::jsonb);
    IF jsonb_typeof(v_sel) <> 'array' THEN RAISE EXCEPTION 'order_option_invalid'; END IF;
    FOR v_group IN SELECT value FROM jsonb_array_elements(v_sel) LOOP
      v_label := v_group ->> 'label';
      v_delta := NULL;
      FOR v_choice IN SELECT value FROM jsonb_array_elements(v_opts) LOOP
        SELECT COALESCE((c ->> 'priceDelta')::numeric, 0) INTO v_delta
          FROM jsonb_array_elements(CASE
            WHEN jsonb_typeof(v_choice -> 'values') = 'array' THEN v_choice -> 'values'
            WHEN jsonb_typeof(v_choice -> 'choices') = 'array' THEN v_choice -> 'choices'
            ELSE '[]'::jsonb END) c
         WHERE c ->> 'label' = v_label LIMIT 1;
        EXIT WHEN v_delta IS NOT NULL;
      END LOOP;
      IF v_delta IS NULL THEN RAISE EXCEPTION 'order_option_invalid'; END IF;
      v_unit := v_unit + v_delta;
    END LOOP;

    INSERT INTO public.order_items
      (order_id, product_id, product_name, product_name_snapshot, quantity,
       unit_price, unit_price_snapshot, total_price, options, options_snapshot, sku_snapshot)
    VALUES
      (p_order_id, v_prod.id, v_prod.name, v_prod.name, v_qty, round(v_unit, 2),
       round(v_unit, 2), round(v_unit * v_qty, 2), v_sel, v_sel, v_sku_snapshot);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public._sync_order_items(uuid) TO authenticated;

-- Create and return an authoritative item snapshot, so the public WhatsApp
-- message cannot use a client-supplied name or price.
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_store_id uuid, p_items jsonb, p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL, p_delivery_address text DEFAULT NULL,
  p_delivery_method text DEFAULT NULL, p_delivery_zone text DEFAULT NULL,
  p_payment_method text DEFAULT NULL, p_payment_provider text DEFAULT 'supabase',
  p_currency text DEFAULT 'DOP', p_notes text DEFAULT NULL, p_coupon_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_items jsonb;
BEGIN
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
     coupon_code, status, payment_status)
  VALUES
    (p_store_id, p_customer_name, p_customer_phone, p_delivery_address, p_delivery_method,
     p_delivery_zone, p_payment_method, COALESCE(p_payment_provider, 'supabase'),
     COALESCE(p_currency, 'DOP'), p_items, COALESCE(p_notes, ''), p_coupon_code, 'pending', 'pending')
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
  WHEN OTHERS THEN
    IF SQLERRM LIKE 'order_quantity_invalid%' THEN RETURN jsonb_build_object('ok',false,'error','order_quantity_invalid','status',400);
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

GRANT EXECUTE ON FUNCTION public.create_order_with_items(uuid, jsonb, text, text, text, text, text, text, text, text, text, text)
  TO anon, authenticated;

-- Honor an explicitly selected SKU while preserving atomic FIFO allocation
-- for legacy products that have SKUs but no skuId in historical orders.
CREATE OR REPLACE FUNCTION public.decrement_order_stock(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_store uuid;
  v_items jsonb;
  v_item jsonb;
  v_pid text;
  v_sku_id text;
  v_qty int;
  v_total int;
  v_sku record;
  v_pending int;
  v_dec int;
  v_new int;
BEGIN
  SELECT store_id, items INTO v_store, v_items
    FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_store THEN RAISE EXCEPTION 'order_not_yours'; END IF;
  IF EXISTS (SELECT 1 FROM public.inventory_movements WHERE order_id = p_order_id AND reason = 'order_paid') THEN
    RETURN jsonb_build_object('order_id', p_order_id, 'status', 'already_processed');
  END IF;
  IF jsonb_typeof(COALESCE(v_items, 'null'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'order_items_invalid'; END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) LOOP
    v_pid := v_item ->> 'id';
    v_sku_id := v_item ->> 'skuId';
    v_qty := (v_item ->> 'quantity')::int;
    IF v_pid IS NULL OR v_qty < 1 OR v_qty > 99 THEN RAISE EXCEPTION 'order_quantity_invalid'; END IF;
    SELECT COALESCE(SUM(stock), 0) INTO v_total FROM public.product_skus
     WHERE product_id::text = v_pid AND active = true
       AND (v_sku_id IS NULL OR id::text = v_sku_id);
    IF v_total < v_qty THEN RAISE EXCEPTION 'order_insufficient_stock'; END IF;
    v_pending := v_qty;

    FOR v_sku IN
      SELECT id, product_id, stock FROM public.product_skus
       WHERE product_id::text = v_pid AND active = true AND stock > 0
         AND (v_sku_id IS NULL OR id::text = v_sku_id)
       ORDER BY created_at, id FOR UPDATE
    LOOP
      EXIT WHEN v_pending <= 0;
      UPDATE public.product_skus
         SET stock = stock - LEAST(stock, v_pending), updated_at = now()
       WHERE id = v_sku.id AND stock >= LEAST(stock, v_pending)
       RETURNING stock INTO v_new;
      IF v_new IS NULL THEN CONTINUE; END IF;
      v_dec := LEAST(v_sku.stock, v_pending);
      INSERT INTO public.inventory_movements
        (store_id, order_id, product_id, sku_id, delta, reason)
      VALUES (v_store, p_order_id, v_sku.product_id, v_sku.id, -v_dec, 'order_paid')
      ON CONFLICT (order_id, sku_id) WHERE reason = 'order_paid' AND order_id IS NOT NULL DO NOTHING;
      v_pending := v_pending - v_dec;
    END LOOP;
    IF v_pending > 0 THEN RAISE EXCEPTION 'order_insufficient_stock'; END IF;
  END LOOP;
  RETURN jsonb_build_object('order_id', p_order_id, 'status', 'decremented');
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_order_stock(uuid) TO authenticated;
