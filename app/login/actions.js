'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Duración de la cookie de sesión: 1 año (en segundos)
const MAX_AGE = 60 * 60 * 24 * 365; // 31536000

/**
 * Login a través de Server Action.
 * Las cookies de sesión se escriben aquí mismo con `cookies()` de next/headers
 * y `maxAge: 1 año`, garantizando que la sesión sea persistente desde el momento
 * exacto en que el usuario inicia sesión (no solo en el middleware).
 */
export async function login(email, password) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, { ...options, maxAge: MAX_AGE })
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('[Login] Error de autenticación:', error.message);
    return { error: error.message };
  }

  return { success: true };
}