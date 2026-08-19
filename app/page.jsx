import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LandingPage from '@/components/LandingPage';

// Nunca estática/ISR: la raíz SIEMPRE evalúa la sesión en servidor y redirige
// a /admin si el usuario está auth. El Cache-Control: no-store efectivo se
// aplica también en middleware.js (ver noStoreResponse).
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Si ya hay una sesión activa, redirigir al panel de control INSTANTÁNEAMENTE
  if (user) {
    redirect('/admin');
  }

  return <LandingPage />;
}