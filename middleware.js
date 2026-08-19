import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { extractSubdomain, isSystemSubdomain } from '@/lib/domains';

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = ['/login', '/signup', '/demo', '/'];

// Rutas que requieren onboarding completado
const ONBOARDING_PATHS = ['/onboarding'];

// Cache-Control de exclusión total para rutas sensibles a sesión.
const NO_STORE = 'no-store, must-revalidate, no-cache, max-age=0, private';

/**
 * Aplica Cache-Control: no-store a la respuesta para impedir que Vercel o el
 * Service Worker sirvan versiones en caché de login/raíz/admin.
 */
function noStoreResponse(response) {
  response.headers.set('Cache-Control', NO_STORE);
  // Fuerza expiración inmediata también en caches HTTP intermedias.
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

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
          // Sesión persistente: cookies de larga duración (1 año)
          const MAX_AGE = 60 * 60 * 24 * 365;
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, maxAge: MAX_AGE })
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

  // =============================================
  // 1b. SESIÓN ACTIVA EN RUTAS PÚBLICAS -> /admin
  // =============================================
  // Si el usuario ya está autenticado y visita la raíz (/), /login o /signup,
  // lo redirigimos al panel de control de inmediato (sin mostrar landing/form).
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log(`[Middleware] Sesión activa en ${pathname || '/'}, redirigiendo a /admin`);
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

    // Rutas que no son admin ni onboarding: devolver con cookies refrescadas.
  // Las rutas de autenticación (/, /login, /signup) NUNCA se cachean: se fuerza
  // no-store para impedir que Vercel o el SW sirvan HTML de login obsoleto.
  if (
    !pathname.startsWith('/admin') &&
    !ONBOARDING_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  ) {
    if (
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/signup' ||
      pathname.startsWith('/login/') ||
      pathname.startsWith('/signup/')
    ) {
      return noStoreResponse(supabaseResponse);
    }
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
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error('[Middleware] Error de autenticación:', authError.message);
  } else {
    console.log(`[Middleware] ruta=${pathname} autenticado=${user?.id ? 'sí' : 'NO'}`);
  }

    if (!user) {
    console.log(`[Middleware] Sin sesión, redirigiendo a /login desde ${pathname}`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin autenticado: NUNCA cachear (debe reflejar la sesión real en cada
  // despliegue/recarga). Redirect a /admin está garantizado arriba.
  return noStoreResponse(supabaseResponse);
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