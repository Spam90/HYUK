'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente Supabase del navegador.
 * Usa la configuración oficial por defecto de @supabase/ssr, que persiste la
 * sesión en cookies chunked accesibles al middleware SSR.
 *
 * No se configura un storage alternativo ni una duración artificial: Supabase
 * conserva la sesión mientras sus tokens y cookies sigan siendo válidos.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}