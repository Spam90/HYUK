/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'supabase.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    // ---- Hardening de seguridad (Fase 0, punto 10) ----
    // CSP compatible con: Next.js (scripts inline de hidratación),
    // Framer Motion / Tailwind (estilos inline), Supabase (REST+Realtime),
    // Stripe Checkout (js.stripe.com), imágenes remotas (hostname '**').
    // 'unsafe-eval' SOLO en desarrollo (Fast Refresh de Next lo requiere).
    const isDev = process.env.NODE_ENV !== 'production';
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://js.stripe.com`,
      "style-src 'self' 'unsafe-inline'",
      // img-src https: abierto porque next/image acepta hostname '**' (URLs de
      // productos de cualquier tienda). Si se restringe el wildcard, cerrar aquí.
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:", // Inter se auto-hospeda vía next/font
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};

export default nextConfig;
