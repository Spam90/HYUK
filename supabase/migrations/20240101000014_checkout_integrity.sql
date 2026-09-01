-- ============================================================================
-- MIGRACIÓN 20240101000014 — PROMPT 7: INTEGRIDAD DE CHECKOUT, CUPONES Y STOCK
-- ============================================================================
-- Hallazgos verificados contra la BD real (2026-09-01):
--   * La tabla `coupons` NO EXISTE en producción (el código la usa desde
--     lib/coupons.js y el checkout server-side) → los cupones estaban muertos
--     y no había validación de descuentos a nivel BD.
--   * No existe trigger de uso de cupones → sin control de max_uses.
--   * El INSERT anónimo de orders (diseño del catálogo) confía en
--     discount_amount / delivery_fee / total_amount enviados por el navegador.
--   * product_skus existe (migración 09) pero nada descuenta stock de forma
--     atómica.
--
-- Esta migración:
--   1) Crea `coupons` con RLS (owner total; lectura pública solo de cupones
--      activos de tiendas publicadas).
--   2) Instala trigger `orders_price_integrity` BEFORE INSERT que RECALCULA
--      server-side: subtotal (con ofertas relámpago), opciones validadas por
--      label, cupón (race-safe con FOR UPDATE + condición de cupo), fee de
--      delivery desde settings de la tienda y total final. Sobrescribe lo que
--      envíe el navegador. Rechaza cantidades inválidas, productos ajenos y
--      opciones desconocidas.
--   3) Crea `decrement_sku_stock()` — decremento de stock ATÓMICO
--      (UPDATE ... WHERE stock >= qty), utilidad para webhook/admin.
--
-- IDEMPOTENTE. No elimina datos.
-- ============================================================================

-- ============================================================================
-- 1) TABLA COUPONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coupons (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code           TEXT NOT NULL,
  discount_type  TEXT NOT NULL DEFAULT 'fixed'
                 CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  min_purchase   NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  expires_at     TIMESTAMPTZ,
  max_uses       INTEGER NOT NULL DEFAULT 0,   -- 0 = ilimitado
  used_count     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_coupons_store_code UNIQUE (store_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coupons_store_active
  ON public.coupons (store_id, is_active);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='coupons'
      AND policyname='owner_manage_coupons'
  ) THEN
    CREATE POLICY "owner_manage_coupons" ON public.coupons
      FOR ALL
      USING (auth.uid() = store_id)
      WITH CHECK (auth.uid() = store_id);
  END IF;

  -- El catálogo público necesita validar cupones (lib/coupons.js):
  -- solo cupones ACTIVOS de tiendas PUBLICADAS (con slug).
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='coupons'
      AND policyname='public_read_active_coupons'
  ) THEN
    CREATE POLICY "public_read_active_coupons" ON public.coupons
      FOR SELECT
      USING (
        is_active = true
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = coupons.store_id AND p.slug IS NOT NULL
        )
      );
  END IF;
END $$;

REVOKE ALL ON public.coupons FROM anon, authenticated;
GRANT SELECT ON public.coupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;

-- ============================================================================
-- 2) TRIGGER orders_price_integrity — LA BD ES LA AUTORIDAD DEL PRECIO
-- ============================================================================
-- Última línea de defensa para TODOS los INSERT en orders (incluido el flujo
-- anónimo del catálogo que va directo a la REST de Supabase). Recalcula con
-- datos reales y SOBREESCRIBE lo que envíe el navegador:
--   * items: array no vacío (máx 50 líneas), quantity entera 1..99;
--   * cada producto debe existir, estar disponible y pertenecer a la tienda;
--   * precio vigente (respeta oferta relámpago activa) desde products;
--   * cada opción elegida debe existir en options del producto (el delta se
--     toma de la BD, NO del navegador);
--   * cupón: activo, no expirado y con cupo disponible; uso incrementado
--     ATÓMICAMENTE (race-safe, nunca excede max_uses); descuento server-side;
--   * delivery: fee desde settings.theme.deliveryZones de la tienda; zona
--     inexistente o ajena → pedido rechazado;
--   * total = max(subtotal - descuento, 0) + fee → total_amount y total.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.orders_price_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_items    jsonb;
  v_item     jsonb;
  v_i        int;
  v_num      numeric;
  v_qty      int;
  v_pid      text;
  v_prod     public.products%ROWTYPE;
  v_unit     numeric;
  v_subtotal numeric := 0;
  v_opts     jsonb;
  v_group    jsonb;
  v_delta    numeric;
  v_label    text;
  v_coupon   record;
  v_discount numeric := 0;
  v_zones    jsonb;
  v_zone     jsonb;
  v_fee      numeric := 0;
  v_total    numeric;
BEGIN
  -- ---------- items: array válido ----------
  IF jsonb_typeof(COALESCE(NEW.items, 'null'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'order_items_invalid';
  END IF;
  v_items := NEW.items;
  IF jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'order_items_empty';
  END IF;
  IF jsonb_array_length(v_items) > 50 THEN
    RAISE EXCEPTION 'order_items_too_many';
  END IF;

  FOR v_i IN 0 .. jsonb_array_length(v_items) - 1 LOOP
    v_item := v_items -> v_i;

    -- ---------- cantidad: entera 1..99 ----------
    IF v_item ->> 'quantity' IS NULL THEN
      RAISE EXCEPTION 'order_quantity_invalid';
    END IF;
    v_num := (v_item ->> 'quantity')::numeric;
    IF v_num <> floor(v_num) OR v_num < 1 OR v_num > 99 THEN
      RAISE EXCEPTION 'order_quantity_invalid';
    END IF;
    v_qty := v_num::int;

    -- ---------- producto: existe, disponible y de ESTA tienda ----------
    v_pid := v_item ->> 'id';
    IF v_pid IS NULL THEN
      RAISE EXCEPTION 'order_product_missing';
    END IF;
    SELECT * INTO v_prod
      FROM public.products
     WHERE id::text = v_pid AND store_id = NEW.store_id;
    IF NOT FOUND OR v_prod.is_available = false THEN
      RAISE EXCEPTION 'order_product_invalid %', v_pid;
    END IF;

    -- ---------- precio vigente (oferta relámpago) ----------
    v_unit := v_prod.price;
    IF v_prod.flash_sale_price IS NOT NULL AND v_prod.flash_sale_price > 0
       AND v_prod.flash_sale_end IS NOT NULL AND v_prod.flash_sale_end > now() THEN
      v_unit := v_prod.flash_sale_price;
    END IF;

    -- ---------- opciones: deben existir en options del producto ----------
    v_opts := CASE WHEN jsonb_typeof(v_prod.options) = 'array'
                   THEN v_prod.options ELSE '[]'::jsonb END;
    IF jsonb_typeof(v_item -> 'selectedOptions') = 'array' THEN
      FOR v_group IN SELECT jsonb_array_elements(v_item -> 'selectedOptions') LOOP
        v_label := v_group ->> 'label';
        IF v_label IS NULL THEN
          RAISE EXCEPTION 'order_option_invalid';
        END IF;
        v_delta := NULL;
        FOR v_zone IN SELECT jsonb_array_elements(
          CASE WHEN jsonb_typeof(v_opts -> 'values') = 'array' THEN v_opts -> 'values'
               WHEN jsonb_typeof(v_opts -> 'choices') = 'array' THEN v_opts -> 'choices'
               ELSE '[]'::jsonb END) LOOP
          IF v_zone ->> 'label' = v_label THEN
            v_delta := COALESCE((v_zone ->> 'priceDelta')::numeric, 0);
            EXIT;
          END IF;
        END LOOP;
        -- Opción desconocida para este producto (o de OTRA tienda: solo se
        -- miran las options del producto ya validado) → rechazar.
        IF v_delta IS NULL THEN
          RAISE EXCEPTION 'order_option_invalid %', v_label;
        END IF;
        v_unit := v_unit + v_delta;
      END LOOP;
    END IF;

    v_subtotal := v_subtotal + round(v_unit * v_qty, 2);
  END LOOP;

  -- ---------- cupón: validación + uso atómico ----------
  IF NEW.coupon_code IS NOT NULL AND btrim(NEW.coupon_code) <> '' THEN
    UPDATE public.coupons
       SET used_count = used_count + 1, updated_at = now()
     WHERE store_id = NEW.store_id
       AND upper(code) = upper(btrim(NEW.coupon_code))
       AND is_active = true
       AND (expires_at IS NULL OR expires_at > now())
       AND (max_uses = 0 OR used_count < max_uses)
    RETURNING discount_type, discount_value INTO v_coupon;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'order_coupon_invalid';
    END IF;
    IF v_coupon.discount_type = 'percent' THEN
      v_discount := round(v_subtotal * v_coupon.discount_value / 100.0, 2);
    ELSE
      v_discount := least(v_coupon.discount_value, v_subtotal);
    END IF;
    IF v_discount < 0 THEN v_discount := 0; END IF;
  END IF;

  -- ---------- delivery: fee desde la configuración REAL de la tienda ----------
  IF NEW.delivery_method IS NOT NULL
     AND (NEW.delivery_method ILIKE '%domicilio%'
          OR NEW.delivery_method ILIKE '%delivery%'
          OR NEW.delivery_method ILIKE '%envio%') THEN
    SELECT jsonb_extract_path(settings, 'theme', 'deliveryZones') INTO v_zones
      FROM public.profiles WHERE id = NEW.store_id;
    IF v_zones IS NOT NULL AND jsonb_typeof(v_zones) = 'array'
       AND jsonb_array_length(v_zones) > 0 THEN
      v_zone := NULL;
      IF NEW.delivery_zone IS NOT NULL AND btrim(NEW.delivery_zone) <> '' THEN
        SELECT z INTO v_zone
          FROM jsonb_array_elements(v_zones) z
         WHERE lower(z ->> 'label') = lower(btrim(NEW.delivery_zone))
         LIMIT 1;
      END IF;
      IF v_zone IS NULL THEN
        RAISE EXCEPTION 'order_delivery_zone_invalid';
      END IF;
      v_fee := COALESCE((v_zone ->> 'fee')::numeric, (v_zone ->> 'price')::numeric, 0);
      IF v_fee < 0 THEN v_fee := 0; END IF;
    END IF;
  END IF;

  -- ---------- total final ----------
  v_total := round(GREATEST(v_subtotal - v_discount, 0) + v_fee, 2);
  NEW.discount_amount := v_discount;
  NEW.delivery_fee    := v_fee;
  NEW.total_amount    := v_total;
  NEW.total           := v_total;   -- columna legacy: mantener consistencia
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_price_integrity_trg ON public.orders;
CREATE TRIGGER orders_price_integrity_trg
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_price_integrity();

-- ============================================================================
-- 3) STOCK DE SKU — DECREMENTO ATÓMICO
-- ============================================================================
-- UPDATE condicional en una sola sentencia (WHERE stock >= qty): imposible
-- vender más unidades de las disponibles aunque dos pedidos compitan.
-- Devuelve el stock restante, o NULL si el SKU no existe / está inactivo /
-- no hay stock suficiente. Pensado para webhook de pago confirmado y flujos
-- administrativos. (El carrito actual no maneja SKUs; esta es la primitiva
-- atómica lista para integrarse.)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.decrement_sku_stock(p_sku_id uuid, p_qty int)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_stock int;
BEGIN
  IF p_qty IS NULL OR p_qty < 1 OR p_qty > 99 THEN
    RAISE EXCEPTION 'sku_quantity_invalid';
  END IF;
  UPDATE public.product_skus
     SET stock = stock - p_qty, updated_at = now()
   WHERE id = p_sku_id AND active = true AND stock >= p_qty
  RETURNING stock INTO v_stock;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN v_stock;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_sku_stock(uuid, int) TO authenticated;

-- ============================================================================
-- VERIFICACIÓN POST-EJECUCIÓN (pegar en SQL Editor para confirmar):
--   SELECT count(*) FROM pg_tables WHERE tablename='coupons';            -- 1
--   SELECT count(*) FROM pg_policies WHERE tablename='coupons';          -- 2
--   SELECT tgname FROM pg_trigger
--     WHERE tgrelid='public.orders'::regclass AND NOT tgisinternal;      -- price integrity
--   SELECT proname FROM pg_proc
--     WHERE proname IN ('orders_price_integrity','decrement_sku_stock'); -- 2
--   -- Prueba de manipulación (debe fallar con order_quantity_invalid):
--   -- INSERT INTO public.orders (store_id, customer_name, status, payment_status,
--   --   items, total_amount, currency)
--   -- VALUES ('<store>', 'test', 'pending', 'pending',
--   --   '[{"id":"<uuid>","quantity":-5,"price":0.01}]'::jsonb, 1, 'DOP');
-- ============================================================================

-- ============================================================================
-- 6) FIX prevent_store_change — tolerante a tablas sin columna store_id
-- ============================================================================
-- BUG DETECTADO EN PRUEBAS (2026-09-01): la versión original hacía
-- `NEW.store_id IS DISTINCT FROM OLD.store_id` sin verificar que la tabla
-- tuviera esa columna. `product_skus` hereda la tienda vía products.store_id
-- y NO tiene store_id propia → TODO UPDATE sobre product_skus fallaba con
--   'record "new" has no field "store_id"'
-- (incluido decrement_sku_stock: el stock era inactualizable).
-- Versión corregida: usa to_jsonb() y solo compara cuando la columna existe.
-- Aplicada en producción el 2026-09-01 y verificada (decremento atómico OK).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_store_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF to_jsonb(NEW) ? 'store_id' AND to_jsonb(OLD) ? 'store_id' THEN
    IF (to_jsonb(NEW)->>'store_id') IS DISTINCT FROM (to_jsonb(OLD)->>'store_id') THEN
      RAISE EXCEPTION 'store_id no puede modificarse (multi-tenant)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


