// =============================================================
// /api/store-data — lectura de products/categories/product_skus
// vía service_role (bypassea las políticas RLS rotas que dependen
// del parámetro inexistente request.store_slug).
//
// SEGURIDAD:
//  - Exige sesión válida (cookie Supabase).
//  - store_id SIEMPRE se fuerza al usuario autenticado; cualquier
//    storeId del query string se ignora → sin fugas cross-tenant.
// =============================================================
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service-role';
import { getStockLevels } from '@/lib/inventory';
import { RateLimiters, rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function GET(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ ok: false, error: 'No autenticado' }, 401);

    // Rate limit por usuario (endpoint autenticado; evita sondeo pesado).
    const rl = RateLimiters.storeData.check(`user:${user.id}`);
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);

    const admin = createServiceClient();
    if (!admin) {
      return json(
        { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY no configurada en el servidor' },
        503
      );
    }

    const storeId = user.id; // SIEMPRE el dueño de la sesión
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    if (type === 'products') {
      const { data, error } = await admin
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .order('sort_order');
      if (error) throw error;
      return json({ ok: true, data });
    }

    if (type === 'categories') {
      const { data, error } = await admin
        .from('categories')
        .select('*')
        .eq('store_id', storeId)
        .order('sort_order');
      if (error) throw error;
      return json({ ok: true, data });
    }

    if (type === 'skus') {
      const levels = await getStockLevels(storeId, admin);
      // Map -> objeto plano serializable
      const out = {};
      levels.forEach((v, k) => { out[k] = v; });
      return json({ ok: true, data: out });
    }

    if (type === 'stats') {
      // Conteos con service_role: bypasea las políticas RLS rotas.
      const countWith = async (table, filters = []) => {
        try {
          let q = admin.from(table).select('*', { count: 'exact', head: true });
          for (const f of filters) q = q.eq(f.column, f.value);
          const { count, error } = await q;
          if (error) throw error;
          return count || 0;
        } catch {
          return 0; // tabla inexistente o error -> 0, sin romper el dashboard
        }
      };
      const [products, categories, orders, pendingOrders, pageViews, whatsappClicks, addToCarts] = await Promise.all([
        countWith('products', [{ column: 'store_id', value: storeId }]),
        countWith('categories', [{ column: 'store_id', value: storeId }]),
        countWith('orders', [{ column: 'store_id', value: storeId }]),
        countWith('orders', [
          { column: 'store_id', value: storeId },
          { column: 'status', value: 'pending' },
        ]),
        // KPIs reales desde analytics_events (visitas / clics WhatsApp / carritos)
        countWith('analytics_events', [
          { column: 'store_id', value: storeId },
          { column: 'event', value: 'page_view' },
        ]),
        countWith('analytics_events', [
          { column: 'store_id', value: storeId },
          { column: 'event', value: 'whatsapp_click' },
        ]),
        countWith('analytics_events', [
          { column: 'store_id', value: storeId },
          { column: 'event', value: 'add_to_cart' },
        ]),
      ]);
      return json({
        ok: true,
        data: { products, categories, orders, pendingOrders, pageViews, whatsappClicks, addToCarts },
      });
    }

    return json({ ok: false, error: `type inválido: ${type}` }, 400);
  } catch (err) {
    console.error('[store-data]', err?.message);
    return json({ ok: false, error: err?.message || 'Error interno' }, 500);
  }
}
