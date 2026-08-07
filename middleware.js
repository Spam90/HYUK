import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = ['/login', '/signup', '/demo', '/'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

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
     * Proteger rutas de admin - requiere autenticación.
     * Rutas públicas (/login, /signup, /demo, /) se sirven sin middleware.
     */
    '/admin/:path*',
  ],
};
