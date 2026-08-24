import { createClient } from '@supabase/supabase-js';
import { detectPaymentProvider } from '@/lib/payments';

/**
 * CRUD de SKUs para admin (store-scoped).
 *
 * Operaciones:
 *  - GET  ?storeId=  → lista SKUs del store (join a products para nombre).
 *  - POST { storeId, productId, sku, variant_label, stock, price_override, active }
 *  - PUT  id actualización (body: { id, ...campos }).
 *  - DELETE ?id= / ?storeId=
 *
 * Usa service-role internamente (solo admin/server) para bypass RLS propietario.
 */

/** Resuelve una instancia de Supabase admin (service-role) o null. */
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persist: false, autoRefreshToken: false, storage: undefined },
  });
}

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    if (!storeId) return json({ ok: false, error: 'storeId requerido' }, 400);

    const admin = getAdmin();
    if (!admin) return json({ ok: false, error: 'Supabase admin no configurado' }, 500);

    // product_skus may not exist yet (migración 09). Graceful.
    const { data, error } = await admin
      .from('product_skus')
      .select('*, products!inner(store_id, name, price)')
      .eq('products.store_id', storeId);

    if (error) {
      if (error?.message?.includes('does not exist') || error?.code === 'PGRST205') {
        return json({ ok: true, skus: [] });
      }
      throw error;
    }

    const skus = (data || []).map((s) => ({
      id: s.id,
      product_id: s.product_id,
      product_name: s.products?.name,
      product_price: s.products?.price,
      sku: s.sku,
      variant_label: s.variant_label,
      stock: s.stock,
      price_override: s.price_override,
      active: s.active,
      created_at: s.created_at,
    }));

    return json({ ok: true, skus });
  } catch (err) {
    console.error('[skus] GET error:', err?.message);
    return json({ ok: false, error: err?.message }, 500);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { storeId, productId, sku, variant_label, stock = 0, price_override, active = true } = body || {};

    if (!storeId || !productId) return json({ ok: false, error: 'storeId y productId requeridos' }, 400);

    const admin = getAdmin();
    if (!admin) return json({ ok: false, error: 'Supabase admin no configurado' }, 500);

    const { data, error } = await admin
      .from('product_skus')
      .insert({
        product_id: productId,
        sku: sku || null,
        variant_label: variant_label || null,
        stock: Number(stock),
        price_override: price_override != null ? Number(price_override) : null,
        active: Boolean(active),
      })
      .select()
      .single();

    if (error) throw error;
    return json({ ok: true, sku: data });
  } catch (err) {
    console.error('[skus] POST error:', err?.message);
    return json({ ok: false, error: err?.message }, 500);
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, sku, variant_label, stock, price_override, active } = body || {};
    if (!id) return json({ ok: false, error: 'id requerido' }, 400);

    const admin = getAdmin();
    if (!admin) return json({ ok: false, error: 'Supabase admin no configurado' }, 500);

    const updates = {};
    if (sku !== undefined) updates.sku = sku;
    if (variant_label !== undefined) updates.variant_label = variant_label;
    if (stock !== undefined) updates.stock = Number(stock);
    if (price_override !== undefined) updates.price_override = price_override != null ? Number(price_override) : null;
    if (active !== undefined) updates.active = Boolean(active);

    const { data, error } = await admin.from('product_skus').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return json({ ok: true, sku: data });
  } catch (err) {
    console.error('[skus] PUT error:', err?.message);
    return json({ ok: false, error: err?.message }, 500);
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return json({ ok: false, error: 'id requerido' }, 400);

    const admin = getAdmin();
    if (!admin) return json({ ok: false, error: 'Supabase admin no configurado' }, 500);

    const { error } = await admin.from('product_skus').delete().eq('id', id);
    if (error) throw error;
    return json({ ok: true });
  } catch (err) {
    console.error('[skus] DELETE error:', err?.message);
    return json({ ok: false, error: err?.message }, 500);
  }
}
