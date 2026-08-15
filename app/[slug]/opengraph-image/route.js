import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const alt = 'HYUK Catálogo Digital';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// OG image dinámica para cada catálogo público /[slug]
export default async function Image({ params }) {
  const { slug } = params;

  let name = 'Mi Tienda';
  let tagline = 'Catálogo digital HYUK';

  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('business_name, tagline')
      .eq('slug', slug)
      .maybeSingle();
    if (data?.business_name) name = data.business_name;
    if (data?.tagline) tagline = data.tagline;
  } catch (err) {
    console.warn('[OG Image]', err.message);
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0F172A 0%, #10B981 100%)',
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 88, fontWeight: 800, maxWidth: '80%', textAlign: 'center' }}>
          {name}
        </div>
        <div style={{ fontSize: 40, opacity: 0.85, marginTop: 20, maxWidth: '75%', textAlign: 'center' }}>
          {tagline}
        </div>
      </div>
    ),
    { ...size }
  );
}