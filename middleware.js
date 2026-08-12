import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractSubdomain, isSystemSubdomain } from '@/lib/domains';

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = ['/login', '/signup', '/demo', '/'];

// Rutas que requieren onboarding completado
const ONBOARDING_PATHS = ['/onboarding'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // =============================================
  // 1. DETECCIÓN DE SUBDOMINIOS Y CUSTOM DOMAINS
  // =============================================
  // Soporte:
  //  - Subdominio genérico:  mitienda.hyuk-nine.vercel.app  → /mitienda
  //  - Slug directo:         hyuk-nine.vercel.app/mitienda  → /mitienda
  //  - Desarrollo local:     mitienda.localhost:3000        → /mitienda
  //  - Dominio personalizado (futuro): mitienda.com         → tabla custom_domains

  const subdomain = extractSubdomain(host);

  // Si hay un subdominio de tienda válido, reescribir a /[slug]
  if (
    subdomain &&
    !isSystemSubdomain(subdomain) &&
    !pathname.startsWith('/admin')
  ) {
    try {
      const supabase = await createClient();
      const { data: store } = await supabase
        .from('profiles')
        .select('id')
        .eq('slug', subdomain)
        .maybeSingle();

      if (store) {
        // Reescribir la URL a /[slug] manteniendo la URL original del navegador
        const url = request.nextUrl.clone();
        url.pathname = `/${subdomain}`;
        return NextResponse.rewrite(url);
      }
    } catch (error) {
      console.error('Error en middleware de subdominio:', error);
    }
  }

  // =============================================
  // 2. PROTECCIÓN DE RUTAS DE ADMIN
  // =============================================

  // Solo procesar rutas de admin y onboarding
  if (!pathname.startsWith('/admin') && !ONBOARDING_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }

  // Permitir acceso a rutas públicas
  if (PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }

  // Verificar si el usuario necesita completar onboarding
  if (pathname === '/onboarding' || pathname.startsWith('/onboarding/')) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verificar si el usuario ya completó el onboarding
    const { data: profile } = await supabase
      .from('profiles')
      .select('slug, business_name')
      .eq('id', user.id)
      .maybeSingle();

    // Si ya tiene slug y nombre de negocio, redirigir al admin
    if (profile?.slug && profile?.business_name) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    // Si no ha completado onboarding, permitir acceso
    return NextResponse.next();
  }

  // Verificar sesión en Supabase
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Redirigir a login si no hay sesión
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Usuario autenticado, permitir acceso
    return NextResponse.next();
  } catch (error) {
    console.error('Error en middleware:', error);
    return NextResponse.next();
  }
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
