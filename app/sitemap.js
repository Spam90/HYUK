import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Sitemap dinámico: landing + rutas de tiendas públicas por slug
export default async function sitemap() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NEXT_PUBLIC_ROOT_DOMAIN
      ? `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
      : 'https://hyuk.app');

  const routes = [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ];

  try {
    const supabase = createClient();
    const { data: profiles } = await supabase
      .from('profiles')
      .select('slug, updated_at')
      .not('slug', 'is', null);

    (profiles || []).forEach((p) => {
      if (p.slug) {
        routes.push({
          url: `${base}/${p.slug}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
          changeFrequency: 'daily',
          priority: 0.8,
        });
      }
    });
  } catch (err) {
    console.warn('[Sitemap] Error obteniendo slugs:', err.message);
  }

  return routes;
}