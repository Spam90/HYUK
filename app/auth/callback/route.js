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
      // Redirigir a la URL de Vercel, no a localhost
      const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || 
                        process.env.VERCEL_URL || 
                        requestUrl.origin;
      
      return NextResponse.redirect(`${vercelUrl}${next}`);
    }
  }

  // Si hay error o no hay código, redirigir al login
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || 
                    process.env.VERCEL_URL || 
                    requestUrl.origin;
  
  return NextResponse.redirect(`${vercelUrl}/login?error=auth_failed`);
}