'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Link2, Phone, ArrowRight, ArrowLeft, CheckCircle, Loader2, Package, Rocket, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getTrialEndDate } from '@/lib/config/plans';

const STEPS = [
  { title: 'Tu negocio', icon: Store },
  { title: 'Primer producto', icon: Package },
  { title: 'Compártelo', icon: Link2 },
];

const DEFAULT_CATEGORIES = [
  { name: 'Productos Destacados', icon: '⭐', sort_order: 1 },
  { name: 'Categoría Ejemplo 1', icon: '📦', sort_order: 2 },
  { name: 'Categoría Ejemplo 2', icon: '🎁', sort_order: 3 },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [slugAvailable, setSlugAvailable] = useState(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [useAi, setUseAi] = useState(false);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [skipProduct, setSkipProduct] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [supabase, setSupabase] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!supabase) setSupabase(createClient());
  }, []);

  useEffect(() => {
    if (businessName && !slug) {
      const generated = businessName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  }, [businessName, slug]);

  useEffect(() => {
    if (slug && slug.length >= 3) checkSlugAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const checkSlugAvailability = async () => {
    setCheckingSlug(true);
    setSlugAvailable(null);
    try {
      const { data, error } = await supabase.from('profiles').select('slug').eq('slug', slug).maybeSingle();
      if (error) throw error;
      setSlugAvailable(!data);
    } catch (err) {
      console.error('Error checking slug:', err);
    } finally {
      setCheckingSlug(false);
    }
  };

  const canNextBrand = () => businessName.trim().length > 0 && slug.trim().length >= 3 && whatsappNumber.trim().length > 5 && slugAvailable === true;

  const getCurrentSettings = async (userId) => {
    try {
      const { data } = await supabase.from('profiles').select('settings').eq('id', userId).maybeSingle();
      return data?.settings || {};
    } catch {
      return {};
    }
  };
const goBack = () => setStep((s) => Math.max(0, s - 1));

  const goNext = async () => {
    setError('');
    if (step === 0 && !canNextBrand()) {
      setError('Completa los campos y asegúrate de que el slug esté disponible.');
      return;
    }
    if (step === 1 && !skipProduct && !productName.trim()) {
      setError('Escribe el nombre del primer producto (o usa "Añadir más tarde").');
      return;
    }
    if (step === 2) {
      await handleComplete();
      return;
    }
    setStep((s) => Math.min(2, s + 1));
  };

  const handleComplete = async () => {
    if (!supabase) return;
    setIsLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/signup'); return; }
      if (!slugAvailable) {
        setError('Este slug ya está en uso. Por favor elige otro.');
        setIsLoading(false);
        return;
      }
      // 1) Perfil: marca + trial explícito (regla de negocio v2)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          business_name: businessName,
          slug,
          phone_whatsapp: whatsappNumber,
          plan_type: 'free',
          trial_ends_at: getTrialEndDate().toISOString(),
        })
        .eq('id', user.id);
      if (profileError) throw profileError;
      // 2) Categorías de ejemplo (idempotente)
      const { error: catError } = await supabase
        .from('categories')
        .insert(
          DEFAULT_CATEGORIES.map((cat) => ({
            store_id: user.id,
            name: cat.name,
            slug: cat.name.toLowerCase().replace(/\s+/g, '-'),
            icon: cat.icon,
            sort_order: cat.sort_order,
          }))
        );
      if (catError && !/duplicate/i.test(catError.message || '')) throw catError;
      // 3) Primer producto (opcional)
      if (!skipProduct && productName.trim()) {
        const catR = await fetch('/api/store-data?type=categories')
          .then((x) => x.json())
          .catch(() => ({}));
        const firstCat = (catR.data || []).find((c) => c.name === 'Productos Destacados') || null;
        const { error: prodError } = await supabase
          .from('products')
          .insert({
            store_id: user.id,
            category_id: firstCat?.id || null,
            name: productName.trim(),
            price: parseFloat(productPrice) || 0,
            description: productDesc.trim() || null,
            is_available: true,
          });
        if (prodError) throw prodError;
      }
      // 4) Marcar onboarding como completado (middleware)
      const current = await getCurrentSettings(user.id);
      const { error: markError } = await supabase
        .from('profiles')
        .update({ settings: { ...current, onboarded: true } })
        .eq('id', user.id);
      if (markError) throw markError;
      router.push('/admin?welcome=1');
    } catch (err) {
      console.error('Error finalizando onboarding:', err);
      setError('Ocurrió un problema guardando tu tienda. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };
const storeUrl = slug ? `${slug}.hyuk.app` : 'tu-slug.hyuk.app';

  const renderStep = () => {
    if (step === 0) {
      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nombre del negocio</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ej: Cafetería El Árbol" className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Tu enlace (slug)</label>
            <div className="relative">
              <input value={slug} onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-')); setSlugAvailable(null); }} placeholder="mi-tienda" className="w-full pl-4 pr-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
              {checkingSlug && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-zinc-500" />}
              {!checkingSlug && slugAvailable === true && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
              {!checkingSlug && slugAvailable === false && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center"><span className="text-white text-xs font-bold">✕</span></div>}
            </div>
            {slugAvailable === false && <p className="text-xs text-red-400 mt-1">Este slug ya está en uso</p>}
            {slugAvailable === true && <p className="text-xs text-green-400 mt-1">✓ Slug disponible</p>}
            <p className="text-xs text-zinc-500 mt-1">Tu tienda estará en: {slug || 'tu-slug'}.hyuk.app</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">WhatsApp del negocio</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input type="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="+1 809 123 4567" className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50" />
            </div>
            <p className="text-xs text-zinc-500 mt-1">Recibirás los pedidos en este número</p>
          </div>
        </div>
      );
    }
if (step === 1) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-zinc-900 border border-zinc-800 p-3">
            <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-400" /><span className="text-sm text-zinc-300">Llenar con IA (probaría tu catálogo)</span></div>
            <button onClick={() => setUseAi((v) => !v)} className={`w-11 h-6 rounded-full transition-colors ${useAi ? 'bg-violet-500' : 'bg-zinc-800'}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nombre del producto</label>
            <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Ej: Empanadas de queso" className="w-full px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Precio</label>
            <input type="number" min="0" step="0.01" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="0.00" className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Descripción (opcional)</label>
            <textarea value={productDesc} onChange={(e) => setProductDesc(e.target.value)} rows="2" placeholder="Descripción breve, ej: recién hechas cada mañana" className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 resize-none" />
          </div>
          <button onClick={() => setSkipProduct(true)} className="text-xs text-zinc-500 hover:text-zinc-300 underline">Añadir más tarde</button>
        </div>
      );
    }
// Paso 2: Compártelo
    return (
      <div className="space-y-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Rocket className="w-10 h-10 text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-zinc-100">¡Tu tienda está lista! 🎉</h3>
        <p className="text-sm text-zinc-400">{businessName || 'Tu negocio'} ya tiene su enlace público. Compártelo con tus clientes:</p>
        <div className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 p-3">
          <Link2 className="w-5 h-5 text-emerald-400 shrink-0" /><code className="text-sm text-emerald-300 flex-1 truncate">{storeUrl}</code>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-zinc-900 text-zinc-400">Pedidos a WhatsApp</span>
          <span className="px-2 py-1 rounded-full bg-zinc-900 text-zinc-400">Catálogo visible</span>
        </div>
        <button
          onClick={() => window.open(`https://wa.me/${String(whatsappNumber).replace(/\D/g, '')}?text=${encodeURIComponent('¡Creamos tu catálogo! Aquí está tu tienda: https://' + (slug || '') + '.hyuk.app')}`, '_blank')}
          className="text-xs text-zinc-500 underline"
        >
          Enviarme el enlace por WhatsApp
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="rounded-xl bg-zinc-800 p-2"><Store className="w-5 h-5 text-emerald-400" /></div>
          <div className="flex-1 text-lg font-bold text-zinc-100">Crea tu tienda</div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? 'bg-emerald-500' : 'bg-zinc-800'} transition-colors`} />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-500 mb-6">
          {STEPS.map((s, i) => (
            <span key={s.title} className={i <= step ? 'text-emerald-400 font-semibold' : ''}>{i + 1}. {s.title}</span>
          ))}
        </div>

        {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 mb-4">{error}</div>}

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {step < 2 && (
          <div className="flex gap-2 mt-6">
            <button onClick={goBack} disabled={step === 0} className="px-4 py-3 rounded-xl border border-zinc-700 text-sm text-zinc-300 disabled:opacity-40"><ArrowLeft className="w-4 h-4" /></button>
            <motion.button whileTap={{ scale: 0.98 }} onClick={goNext} disabled={isLoading} className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-semibold shadow-lg hover:bg-emerald-600 transition-all disabled:opacity-60">
              {step === 1 ? 'Siguiente' : 'Continuar'}
            </motion.button>
          </div>
        )}

        {step === 2 && (
          <motion.button whileTap={{ scale: 0.98 }} onClick={handleComplete} disabled={isLoading} className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold shadow-lg hover:bg-emerald-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Creando tu tienda...</> : <>Ir a mi panel <ArrowRight className="w-5 h-5" /></>}
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}