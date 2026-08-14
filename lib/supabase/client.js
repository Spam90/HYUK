'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente Supabase del navegador.
 * Usa de forma INTENCIONAL la configuración por defecto de @supabase/ssr,
 * que almacena la sesión en COOKIES (leíbles desde el middleware SSR).
 *
 * IMPORTANTE: NO pasar opciones de `auth.storage` / `auth.storageKey` aquí;
 * eso desvía la sesión a localStorage y el middleware (que lee cookies)
 * no la encuentra -> bucle de login.
 *
 * La persistencia de larga duración (30 días) se aplica en server.js,
 * middleware.js (setAll con maxAge) y en login (persistAuthCookies).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}