'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store, Link2, Phone, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [slugAvailable, setSlugAvailable] = useState(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const router = useRouter();

  // Autogenerar slug desde el nombre del negocio
  useEffect(() => {
    if (businessName && !slug) {
      const generatedSlug = businessName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^a-z0-9]+/g, '-') // Reemplazar espacios y especiales con -
        .replace(/^-+|-+$/g, ''); // Remover - al inicio y final
      setSlug(generatedSlug);
    }
  }, [businessName, slug]);

  // Verificar disponibilidad del slug
  useEffect(() => {
    if (slug && slug.length >= 3) {
      checkSlugAvailability();
    }
  }, [slug]);

  const checkSlugAvailability = async () => {
    setCheckingSlug(true);
    setSlugAvailable(null);
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      
      setSlugAvailable(!data); // true si está disponible, false si ya existe
    } catch (error) {
      console.error('Error checking slug:', error);
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/signup');
        return;
      }

      if (!slugAvailable) {
        setError('Este slug ya está en uso. Por favor elige otro.');
        setIsLoading(false);
        return;
      }

      // Actualizar perfil con datos del negocio
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          business_name: businessName,
          slug: slug,
          phone_whatsapp: whatsappNumber,
          plan_type: 'free',
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Crear categorías de ejemplo
      const categories = [
        { name: 'Productos Destacados', icon: '⭐', sort_order: 1 },
        { name: 'Categoría Ejemplo 1', icon: '📦', sort_order: 2 },
        { name: 'Categoría Ejemplo 2', icon: '🎁', sort_order: 3 },
      ];

      const { data: createdCategories, error: categoriesError } = await supabase
        .from('categories')
        .insert(
          categories.map(cat => ({
            store_id: user.id,
            name: cat.name,
            slug: cat.name.toLowerCase().replace(/\s+/g, '-'),
            icon: cat.icon,
            sort_order: cat.sort_order,
            is_active: true,
          }))
        )
        .select();

      if (categoriesError) throw categoriesError;

      // Crear productos de ejemplo
      const sampleProducts = [
        {
          name: 'Producto de Ejemplo 1',
          description: 'Este es un producto de ejemplo para que veas cómo funciona tu catálogo',
          price: 99.00,
          original_price: 120.00,
          category_id: createdCategories?.[0]?.id,
          is_available: true,
          is_featured: true,
          badge: 'Popular',
          sort_order: 1,
        },
        {
          name: 'Producto de Ejemplo 2',
          description: 'Otro producto de ejemplo con descuento',
          price: 150.00,
          original_price: null,
          category_id: createdCategories?.[0]?.id,
          is_available: true,
          is_featured: false,
          badge: 'Nuevo',
          sort_order: 2,
        },
        {
          name: 'Producto de Ejemplo 3',
          description: 'Tercer producto de ejemplo',
          price: 75.50,
          original_price: 100.00,
          category_id: createdCategories?.[1]?.id,
          is_available: true,
          is_featured: false,
          badge: null,
          sort_order: 3,
        },
      ];

      const { error: productsError } = await supabase
        .from('products')
        .insert(
          sampleProducts.map(product => ({
            ...product,
            store_id: user.id,
          }))
        );

      if (productsError) throw productsError;

      // Redirigir al dashboard
      router.push('/admin/customize');
    } catch (error) {
      console.error('Error in onboarding:', error);
      setError('Error al completar el registro. Por favor intenta de nuevo.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-500/5" />
      <div className="absolute top-20 left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md mx-4"
      >
        <div className="bg-zinc-900/60 backdrop-blur-xl rounded-2xl p-8 border border-zinc-800 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 mb-4">
              <Store className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">
              Crea tu tienda
            </h1>
            <p className="text-sm text-zinc-400">
              Completa estos datos para comenzar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Nombre del Negocio
              </label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ej: Tacos El Rey"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                URL de tu Tienda
              </label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="tacos-el-rey"
                  required
                  minLength={3}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
                {checkingSlug && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                  </div>
                )}
                {!checkingSlug && slugAvailable === true && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
                {!checkingSlug && slugAvailable === false && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✕</span>
                  </div>
                )}
              </div>
              {slugAvailable === false && (
                <p className="text-xs text-red-400 mt-1">
                  Este slug ya está en uso
                </p>
              )}
              {slugAvailable === true && (
                <p className="text-xs text-green-400 mt-1">
                  ✓ Slug disponible
                </p>
              )}
              <p className="text-xs text-zinc-500 mt-1">
                Tu tienda estará en: hyuk.app/{slug || 'tu-slug'}
              </p>
            </div>

            {/* WhatsApp Number */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                WhatsApp del Negocio
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+1 809 123 4567"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Recibirás los pedidos en este número
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading || checkingSlug || slugAvailable === false}
              className="w-full py-3.5 rounded-xl bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creando tu tienda...
                </>
              ) : (
                <>
                  Comenzar
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-500">
              Al continuar, aceptas nuestros términos y condiciones
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}