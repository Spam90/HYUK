import { NextResponse } from 'next/server';

// Verificar que las variables de entorno de Supabase existan
const hasSupabaseConfig = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Solo proteger rutas de admin
  if (pathname.startsWith('/admin')) {
    // Si no hay configuración de Supabase, permitir acceso (modo demo)
    if (!hasSupabaseConfig()) {
      return NextResponse.next();
    }
  }

  // Para rutas no protegidas, continuar normalmente
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Solo procesar rutas de admin para protección de autenticación.
     * Todas las demás rutas se sirven directamente sin middleware.
     */
    '/admin/:path*',
  ],
};