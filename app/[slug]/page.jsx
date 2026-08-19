import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_SETTINGS } from '@/lib/theme/defaults';
import CatalogView from './CatalogView';

// Generar metadatos dinámicos para SEO
export async function generateMetadata({ params }) {
  try {
    const supabase = createClient();
    const { data: store } = await supabase
      .from('profiles')
      .select('*')
      .eq('slug', params.slug)
      .single();

    if (!store) {
    return {
      title: 'Tienda no encontrada - HYUK',
      description: 'Esta tienda no existe o ha sido eliminada.',
    };
  }

  const settings = store.settings || DEFAULT_SETTINGS;
  const storeName = store.store_name || store.full_name || 'Mi Tienda';
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

    // Obtener datos de la tienda (con fallback seguro)
  let store = null;
  try {
    const res = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
      const { data, error } = await supabase
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

  const storePlan = store.plan || 'free';

  return (
    <div>
      <CatalogView
        store={store}
        categories={categories || []}
        products={productsWithOptions}
        settings={settings}
      />

      {/* Marca de agua: solo en plan gratuito */}
      {storePlan === 'free' && (
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