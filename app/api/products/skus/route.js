// =============================================================
// /api/products/skus — CRUD de SKUs con AUTORIZACIÓN OBLIGATORIA.
//
// FASE 0 SEGURIDAD (corrige IDOR crítico de la auditoría):
//  - Antes: se usaba service_role confiando en storeId/id del
//    cliente SIN verificar sesión → acceso cross-tenant total.
//  - Ahora: 401 sin sesión; el store_id efectivo SIEMPRE es el
//    usuario autenticado (modelo auth.users.id = profiles.id =
//    store_id). storeId ajeno enviado por el cliente → 403.
//    PUT/DELETE verifican propiedad del SKU antes de escribir.
//  - service_role SOLO tras autenticar+autorizar (nunca como
//    sustituto de la autorización).
// =============================================================
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Sesión obligatoria. Devuelve user o null (la ruta responde 401). */
async function requireUser() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
  } catch {
    return null;
  }
}

/**
 * Trae el SKU junto al store_id de su producto (service_role).
 * SOLO invocar después de validar la sesión del usuario.
 */
async function getSkuWithStore(admin, id) {
  const { data } = await admin
    .from('product_skus')
    .select('*, products!inner(store_id)')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  return { sku: data, storeId: data?.products?.store_id };
}

/** ¿El cliente intenta operar una tienda distinta a la suya? */
function rejectsForeignStore(user, storeIdFromClient) {
  return Boolean(storeIdFromClient && String(storeIdFromClient) !== String(user.id));
}

export async function GET(req) {
  try {
    const user = await requireUser();
    if (!user) return json({ ok: false, error: 'No autenticado' }, 401);

    const { searchParams } = new URL(req.url);
    if (rejectsForeignStore(user, searchParams.get('storeId'))) {
      return json({ ok: false, error: 'No autorizado para esta tienda' }, 403);
    }

    const admin = createServiceClient();
    if (!admin) return json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' }, 503);

    let query = admin
      .from('product_skus')
      .select('*, products!inner(store_id, name, price)')
      .eq('products.store_id', user.id);

    // Filtro opcional por producto (scoped siempre a la tienda del dueño).
    const productId = searchParams.get('productId');
    if (productId) query = query.eq('product_id', productId);

    const { data, error } = await query;
    if (error) {
      // Tabla aún no migrada → graceful igual que antes.
      const msg = error?.message || '';
      if (msg.includes('does not exist') || error?.code === 'PGRST205' || error?.code === 'PGRST200') {
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
    const user = await requireUser();
    if (!user) return json({ ok: false, error: 'No autenticado' }, 401);

    const body = await req.json().catch(() => ({}));
    const { storeId, productId, sku, variant_label, stock = 0, price_override, active = true } = body || {};

    if (!productId) return json({ ok: false, error: 'productId requerido' }, 400);
    if (rejectsForeignStore(user, storeId)) {
      return json({ ok: false, error: 'No autorizado para esta tienda' }, 403);
    }

    const admin = createServiceClient();
    if (!admin) return json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' }, 503);

    // Autorización previa: el producto debe pertenecer al usuario.
    const { data: product } = await admin
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('store_id', user.id)
      .maybeSingle();
    if (!product) return json({ ok: false, error: 'Producto no encontrado' }, 404);

    const { data, error } = await admin
      .from('product_skus')
      .insert({
        product_id: productId,
        sku: sku || null,
        variant_label: variant_label || null,
        stock: Number(stock) || 0,
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
    const user = await requireUser();
    if (!user) return json({ ok: false, error: 'No autenticado' }, 401);

    const body = await req.json().catch(() => ({}));
    const { id, storeId, sku, variant_label, stock, price_override, active } = body || {};
    if (!id) return json({ ok: false, error: 'id requerido' }, 400);
    if (rejectsForeignStore(user, storeId)) {
      return json({ ok: false, error: 'No autorizado para esta tienda' }, 403);
    }

    const admin = createServiceClient();
    if (!admin) return json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' }, 503);

    // Autorización: existencia + propiedad del SKU ANTES de escribir.
    const found = await getSkuWithStore(admin, id);
    if (!found) return json({ ok: false, error: 'SKU no encontrado' }, 404);
    if (String(found.storeId) !== String(user.id)) {
      return json({ ok: false, error: 'SKU pertenece a otra tienda' }, 403);
    }

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
    const user = await requireUser();
    if (!user) return json({ ok: false, error: 'No autenticado' }, 401);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return json({ ok: false, error: 'id requerido' }, 400);
    if (rejectsForeignStore(user, searchParams.get('storeId'))) {
      return json({ ok: false, error: 'No autorizado para esta tienda' }, 403);
    }

    const admin = createServiceClient();
    if (!admin) return json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' }, 503);

    // Autorización: existencia + propiedad del SKU ANTES de borrar.
    const found = await getSkuWithStore(admin, id);
    if (!found) return json({ ok: false, error: 'SKU no encontrado' }, 404);
    if (String(found.storeId) !== String(user.id)) {
      return json({ ok: false, error: 'SKU pertenece a otra tienda' }, 403);
    }

    const { error } = await admin.from('product_skus').delete().eq('id', id);
    if (error) throw error;
    return json({ ok: true });
  } catch (err) {
    console.error('[skus] DELETE error:', err?.message);
    return json({ ok: false, error: err?.message }, 500);
  }
}
