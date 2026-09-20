import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/admin/customize';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/admin/customize';
      return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
    }
  }

  // Si hay error o no hay código, redirigir al login
  return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin));
}