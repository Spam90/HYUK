import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';

// Nunca estática/ISR: /login SIEMPRE evalúa la sesión en servidor. Si ya hay
// usuario auth, redirige a /admin y no sirve el formulario en caché.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LoginPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Si ya hay una sesión activa, no mostrar el formulario: ir al panel de control
  if (user) {
    redirect('/admin');
  }

  return <LoginForm />;
}