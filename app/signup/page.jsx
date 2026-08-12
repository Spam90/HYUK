'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Store, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin/customize`,
          data: {
            full_name: name,
          },
        },
      });

      if (error) throw error;

      // Crear perfil del usuario con settings por defecto
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            full_name: name,
            email: email,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            settings: {
              theme: {
                primaryColor: '#10B981',
                secondaryColor: '#0F172A',
                backgroundColor: '#FAFAFA',
                cardBackgroundColor: '#FFFFFF',
                textColor: '#0F172A',
                accentColor: '#F59E0B',
                borderRadius: 'rounded-2xl',
                fontFamily: 'font-sans',
                mode: 'light'
              },
              layout: {
                productGrid: 'grid-2-col',
                headerStyle: 'banner-large',
                categoryStyle: 'pills-scroll',
                productCardStyle: 'modern-shadow',
                layoutType: 'grid_modern'
              },
              banner: {
                imageUrl: '',
                tagline: '¡Los mejores productos a un clic!',
                showAnnouncementBar: true,
                announcementText: '🚚 Envíos gratis en pedidos mayores a $1,000'
              },
              whatsapp_checkout: {
                customMessageHeader: '🛒 *¡NUEVO PEDIDO DE CLIENTE!*',
                askForAddress: true,
                askForPaymentMethod: true,
                paymentOptions: ['Efectivo', 'Transferencia / Zelle', 'Tarjeta al recibir'],
                requireClientName: true,
                deliveryMethods: ['A domicilio', 'Retiro en local']
              }
            },
          });

        if (profileError) throw profileError;
      }

      // Intentar iniciar sesión para asegurar que la sesión se mantenga
      // (especialmente si la confirmación de email está habilitada)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.warn('Auto-login after signup failed:', signInError.message);
      }

      // Redirigir al onboarding
      window.location.href = '/onboarding';
    } catch (err) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 relative overflow-hidden">
      {/* Decoración de fondo */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-500/5" />
      <div className="absolute top-20 left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md mx-4"
      >
        <div className="bg-zinc-900/60 backdrop-blur-xl rounded-theme-xl shadow-2xl p-8 border border-zinc-800">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-theme-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 mb-4">
              <Store className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">Crea tu cuenta</h1>
            <p className="text-sm text-zinc-400 mt-1">Comienza a personalizar tu catálogo</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Nombre del negocio</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mi Restaurante"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-theme-lg border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-theme-lg border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 rounded-theme-lg border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-theme-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-theme-lg bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  Crear cuenta
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-500">
              ¿Ya tienes cuenta?{' '}
              <a href="/login" className="text-emerald-400 font-medium hover:underline">
                Inicia sesión
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}