'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Login a través de Server Action usando las opciones de cookie emitidas por
 * @supabase/ssr. La duración efectiva sigue las reglas de Supabase Auth.
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
          cookieStore.set(name, value, options)
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