import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = ['/login', '/signup', '/demo', '/'];

// Dominio base (desde variable de entorno o default para desarrollo)
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // =============================================
  // 1. DETECCIÓN DE SUBDOMINIOS
  // =============================================
  
  // Extraer subdominio del host
  const hostname = host.split(':')[0]; // Remover puerto si existe
  const parts = hostname.split('.');

  // Verificar si hay un subdominio (más de 2 partes en el dominio)
  // Ejemplo: mitienda.hyuk.app -> ['mitienda', 'hyuk', 'app']
  // Ejemplo: mitienda.localhost:3000 -> ['mitienda', 'localhost']
  let subdomain = null;
  
  if (parts.length > 2) {
    // Dominio con múltiples niveles (ej: mitienda.hyuk.app)
    subdomain = parts[0];
  } else if (parts.length === 2 && parts[1] === 'localhost') {
    // Desarrollo local (ej: mitienda.localhost)
    subdomain = parts[0];
  }

  // Verificar que el subdominio no sea una ruta de sistema
  const SYSTEM_SUBDOMAINS = ['www', 'app', 'api', 'admin', 'dashboard'];
  const isValidSubdomain = subdomain && 
                          !SYSTEM_SUBDOMAINS.includes(subdomain.toLowerCase()) &&
                          subdomain !== ROOT_DOMAIN;

  // Si hay un subdominio válido y no estamos en una ruta de admin/auth
  if (isValidSubdomain && !pathname.startsWith('/admin') && 
      !PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    
    // Buscar la tienda por slug
    try {
      const supabase = await createClient();
      const { data: store } = await supabase
        .from('profiles')
        .select('id')
        .eq('slug', subdomain)
        .maybeSingle();

      if (store) {
        // Reescribir la URL a /[slug] manteniendo la URL original en el navegador
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

  // Solo procesar rutas de admin
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Permitir acceso a rutas públicas
  if (PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))) {
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
     * - Archivos estáticos (_next/static, _next/image, favicon.ico, etc.)
     * - API routes (api/*)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
