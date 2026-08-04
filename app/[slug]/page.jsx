import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_SETTINGS } from '@/lib/theme/defaults';
import CatalogView from './CatalogView';

// Generar metadatos dinámicos para SEO
export async function generateMetadata({ params }) {
  const supabase = createClient();
  const { data: store } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (!store) {
    return {
      title: 'Tienda no encontrada',
    };
  }

  const settings = store.settings || DEFAULT_SETTINGS;
  const storeName = store.store_name || store.full_name || 'Mi Tienda';

  return {
    title: `${storeName} - Catálogo Digital`,
    description: settings.banner?.tagline || `Explora el catálogo de ${storeName}`,
    openGraph: {
      title: `${storeName} - Catálogo Digital`,
      description: settings.banner?.tagline || `Explora el catálogo de ${storeName}`,
      images: settings.banner?.imageUrl ? [{ url: settings.banner.imageUrl }] : [],
    },
  };
}

export default async function StorePage({ params }) {
  const supabase = createClient();

  // Obtener datos de la tienda
  const { data: store, error: storeError } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (storeError || !store) {
    notFound();
  }

  // Obtener categorías de la tienda
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', store.id)
    .eq('is_active', true)
    .order('sort_order');

  // Obtener productos de la tienda
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', store.id)
    .eq('is_available', true)
    .order('sort_order');

  // Obtener opciones de productos
  const productIds = products?.map(p => p.id) || [];
  const { data: productOptions } = productIds.length > 0
    ? await supabase
        .from('product_options')
        .select('*')
        .in('product_id', productIds)
        .order('sort_order')
    : { data: [] };

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

  return (
    <CatalogView
      store={store}
      categories={categories || []}
      products={productsWithOptions}
      settings={settings}
    />
  );
}