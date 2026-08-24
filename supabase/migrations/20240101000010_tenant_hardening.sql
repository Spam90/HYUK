-- =====================================================================
-- Migration 10: Tenancy hardening + marcador de onboarding
-- Idempotente: seguro ejecutar varias veces.
-- =====================================================================

-- 1) Bloquea el cambio de store_id en cualquier tabla de negocio.
--    Evita huecos de multi-tenancy (una fila "saltando" de tenant).
CREATE OR REPLACE FUNCTION public.prevent_store_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.store_id IS DISTINCT FROM OLD.store_id THEN
    RAISE EXCEPTION 'store_id no puede modificarse (multi-tenant)';
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'orders_no_store_change') THEN
    CREATE TRIGGER orders_no_store_change
      BEFORE UPDATE ON public.orders
      FOR EACH ROW EXECUTE FUNCTION public.prevent_store_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'products_no_store_change') THEN
    CREATE TRIGGER products_no_store_change
      BEFORE UPDATE ON public.products
      FOR EACH ROW EXECUTE FUNCTION public.prevent_store_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'categories_no_store_change') THEN
    CREATE TRIGGER categories_no_store_change
      BEFORE UPDATE ON public.categories
      FOR EACH ROW EXECUTE FUNCTION public.prevent_store_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'customers_no_store_change') THEN
    CREATE TRIGGER customers_no_store_change
      BEFORE UPDATE ON public.customers
      FOR EACH ROW EXECUTE FUNCTION public.prevent_store_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'coupons_no_store_change') THEN
    CREATE TRIGGER coupons_no_store_change
      BEFORE UPDATE ON public.coupons
      FOR EACH ROW EXECUTE FUNCTION public.prevent_store_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'order_items_no_store_change') THEN
    CREATE TRIGGER order_items_no_store_change
      BEFORE UPDATE ON public.order_items
      FOR EACH ROW EXECUTE FUNCTION public.prevent_store_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'product_skus_no_store_change') THEN
    CREATE TRIGGER product_skus_no_store_change
      BEFORE UPDATE ON public.product_skus
      FOR EACH ROW EXECUTE FUNCTION public.prevent_store_change();
  END IF;
END $$;