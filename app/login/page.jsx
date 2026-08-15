import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Si ya hay una sesión activa, no mostrar el formulario: ir al panel de control
  if (user) {
    redirect('/admin');
  }

  return <LoginForm />;
}