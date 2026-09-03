import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_SETTINGS } from '@/lib/theme/defaults';
import { createServiceClient } from '@/lib/supabase/service-role';
import CatalogView from './CatalogView';

// Generar metadatos dinámicos para SEO
export async function generateMetadata({ params }) {
  try {
    const supabase = createClient();
    // FASE Prom-6: columna-safe vs anon. select columnas públicas concedidas
    // (la REVOKE de PII para anon en migración 13 impide select '*').
    const { data: store } = await supabase
      .from('profiles')
      .select('id, slug, business_name, store_name, full_name, settings, tagline, logo_url')
      .eq('slug', params.slug)
      .single();

    if (!store) {
    return {
      title: 'Tienda no encontrada - HYUK',
      description: 'Esta tienda no existe o ha sido eliminada.',
    };
  }

  const settings = store.settings || DEFAULT_SETTINGS;
  // FASE 0.5: columnas reales de profiles (BD verificada). Antes se usaba
  // store.store_name || store.full_name, pero el nombre del negocio vive en
  // business_name (store_name/full_name existen pero pueden venir null).
  const storeName = store.business_name || store.store_name || store.full_name || 'Mi Tienda';
  const tagline = settings.banner?.tagline || 'Los mejores productos a un clic';
  const bannerImage = settings.banner?.imageUrl || '';
  const storeDescription = store.description || `Catálogo digital de ${storeName}. Realiza tus pedidos fácilmente por WhatsApp.`;

  return {
    title: `${storeName} — Catálogo Digital & Pedidos por WhatsApp`,
    description: storeDescription,
    keywords: [storeName, 'catálogo digital', 'menú digital', 'pedidos whatsapp', 'tienda online', 'pedidos en línea'],
    openGraph: {
      title: `${storeName} — Catálogo Digital & Pedidos por WhatsApp`,
      description: storeDescription,
      type: 'website',
      locale: 'es_DO',
      siteName: 'HYUK',
      url: `https://hyuk.app/${params.slug}`,
      images: bannerImage ? [
        {
          url: bannerImage,
          width: 1200,
          height: 630,
          alt: `${storeName} - Banner`,
        }
      ] : [],
    },
          twitter: {
      card: 'summary_large_image',
      title: `${storeName} — Catálogo Digital & Pedidos por WhatsApp`,
      description: storeDescription,
      images: bannerImage ? [bannerImage] : [],
    },
  };
  } catch {
    // BD no disponible / fila inexistente → no romper build ni SSR.
    return {
      title: 'Tienda no encontrada - HYUK',
      description: 'Esta tienda no existe o ha sido eliminada.',
    };
  }
}

// Revalidar cada 60 segundos para balance entre rendimiento y actualización
export const revalidate = 60;

export default async function StorePage({ params }) {
  const supabase = createClient();
  // service_role bypassea las políticas RLS rotas (request.store_slug).
  // Fallback al cliente anónimo si la key no está configurada.
  const db = createServiceClient() || supabase;

    // Obtener datos de la tienda (con fallback seguro)
  let store = null;
  try {
    // FASE La tienda necesita columnas completas (whatsapp, plan, trial…):
    // se lee con service_role (igual que categorías/productos), nunca con
    // el cliente anónimo (que en migración 13 quedó sin acceso a PII).
    const res = await db
      .from('profiles')
      .select('*')
      .eq('slug', params.slug)
      .single();
    store = res.data;
    if (!store) notFound();
  } catch {
    // BD no disponible o tabla inexistente: 404 limpio en vez de excepción roja.
    notFound();
  }

  // Obtener categorías de la tienda con revalidación
  let categories = [];
  try {
    const { data, error } = await db
      .from('categories')
      .select('*')
      .eq('store_id', store.id)
      .eq('is_active', true)
      .order('sort_order');
    categories = data || [];
    if (error) throw error;
  } catch (e) {
    console.warn('[Catalog] Error cargando categorías:', e?.message);
    categories = [];
  }

  // Obtener productos de la tienda con revalidación
  let products = [];
  try {
    const { data, error } = await db
      .from('products')
      .select('*')
      .eq('store_id', store.id)
      .eq('is_available', true)
      .order('sort_order');
    products = data || [];
    if (error) throw error;
  } catch (e) {
    console.warn('[Catalog] Error cargando productos:', e?.message);
    products = [];
  }

  // Obtener opciones de productos (solo si hay productos)
  const productIds = products.map((p) => p.id) || [];
  let productOptions = [];
  if (productIds.length > 0) {
    try {
      const { data, error } = await db
        .from('product_options')
        .select('*')
        .in('product_id', productIds)
        .order('sort_order');
      productOptions = data || [];
      if (error) throw error;
    } catch (e) {
      console.warn('[Catalog] Error cargando opciones de producto:', e?.message);
      productOptions = [];
    }
  }

  // Agrupar opciones por producto
  const optionsByProduct = {};
  (productOptions || []).forEach(opt => {
    if (!optionsByProduct[opt.product_id]) {
      optionsByProduct[opt.product_id] = [];
    }
    optionsByProduct[opt.product_id].push(opt);
  });

  // Adjuntar opciones a los productos
  const productsWithOptions = (products || []).map(product => ({
    ...product,
    options: optionsByProduct[product.id] || [],
  }));

  // Configuración de la tienda
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(store.settings || {}),
  };

    // Normalizar a minúscula: la BD pudo tener valores legacy "Pro" (capitalizado).
    const storePlan = String(store.plan_type || store.plan || 'free').toLowerCase();
    // Trial vigente → la tienda opera con beneficios Pro (sin límites ni watermark).
    const trialActive = !!store.trial_ends_at && new Date(store.trial_ends_at).getTime() > Date.now();
    const effectivePlan = trialActive && storePlan === 'free' ? 'pro' : storePlan;

  // ─────────────────────────────────────────────────────────────────────────
  // PROMPT 12 — AUDITORÍA DE PRODUCCIÓN (PII LEAK):
  // Antes se pasaba `store` (select('*') con service_role) al componente
  // cliente, lo que serializaba TODO el perfil en el payload RSC del navegador:
  // email, plan_type, trial_ends_at, stripe_customer_id, subscription_status,
  // current_plan... a TODOS los visitantes anónimos del catálogo.
  //
  // Ahora solo se exponen las columnas públicas que el catálogo necesita
  // (mismo allowlist del GRANT SELECT para anon de la migración 13 + los
  // campos usados por los componentes del catálogo).
  // ─────────────────────────────────────────────────────────────────────────
  const publicStore = {
    id: store.id,
    slug: store.slug,
    business_name: store.business_name,
    store_name: store.store_name,
    full_name: store.full_name,
    tagline: store.tagline,
    logo_url: store.logo_url,
    phone_whatsapp: store.phone_whatsapp,
    whatsapp_number: store.whatsapp_number,
    phone: store.phone,
    social_links: store.social_links,
    store_currency: store.store_currency,
    is_open: store.is_open,
    settings: store.settings,
    primary_color: store.primary_color,
    secondary_color: store.secondary_color,
    layout_type: store.layout_type,
    created_at: store.created_at,
    updated_at: store.updated_at,
  };

  return (
    <div>
            <CatalogView
        store={publicStore}
        categories={categories || []}
        products={productsWithOptions}
        settings={settings}
        plan={effectivePlan}
      />

      {/* Marca de agua: solo cuentas Free fuera de trial (el trial tiene beneficios Pro) */}
      {effectivePlan === 'free' && (
        <a
          href="https://hyuk.app"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center py-3 px-4 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-gray-50 dark:bg-zinc-900"
        >
          ⚡ Creado gratis con HYUK
        </a>
      )}
    </div>
  );
}