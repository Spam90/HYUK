import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { extractSubdomain, isSystemSubdomain } from '@/lib/domains';

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = ['/login', '/signup', '/demo', '/'];

// Rutas que requieren onboarding completado
const ONBOARDING_PATHS = ['/onboarding'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // Cliente Supabase con cookies request/response (patrón oficial @supabase/ssr).
  // Esto permite refrescar la cookie de sesión en CADA request, evitando que el
  // usuario tenga que iniciar sesión de nuevo al expirar el token de acceso.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // =============================================
  // 1. DETECCIÓN DE SUBDOMINIOS Y CUSTOM DOMAINS
  // =============================================
  //  - Subdominio genérico:  mitienda.hyuk-nine.vercel.app  -> /mitienda
  //  - Slug directo:         hyuk-nine.vercel.app/mitienda  -> /mitienda
  //  - Desarrollo local:     mitienda.localhost:3000        -> /mitienda

  const subdomain = extractSubdomain(host);

  if (subdomain && !isSystemSubdomain(subdomain) && !pathname.startsWith('/admin')) {
    try {
      const { data: store } = await supabase
        .from('profiles')
        .select('id')
        .eq('slug', subdomain)
        .maybeSingle();

      if (store) {
        const url = request.nextUrl.clone();
        url.pathname = `/${subdomain}`;
        return NextResponse.rewrite(url);
      }
    } catch (error) {
      console.error('Error en middleware de subdominio:', error);
    }
  }

  // Rutas que no son admin ni onboarding: devolver con cookies refrescadas
  if (
    !pathname.startsWith('/admin') &&
    !ONBOARDING_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  ) {
    return supabaseResponse;
  }

  // Permitir acceso a rutas públicas
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return supabaseResponse;
  }

  // =============================================
  // ONBOARDING
  // =============================================
  if (pathname === '/onboarding' || pathname.startsWith('/onboarding/')) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('slug, business_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.slug && profile?.business_name) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    return supabaseResponse;
  }

  // =============================================
  // PROTECCIÓN DE RUTAS DE ADMIN
  // =============================================
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Aplicar middleware a todas las rutas excepto:
     * - Archivos estáticos (_next/static, _next/image, favicon.ico, iconos PWA, manifest, SW)
     * - API routes (api/*)
     */
    '/((?!_next/static|_next/image|favicon.ico|icon-\\d+\\.png|manifest\\.json|sw\\.js|api/).*)',
  ],
};