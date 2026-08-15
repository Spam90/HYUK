import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LandingPage from '@/components/LandingPage';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Si ya hay una sesión activa, redirigir al panel de control
  if (user) {
    redirect('/admin');
  }

  return <LandingPage />;
}