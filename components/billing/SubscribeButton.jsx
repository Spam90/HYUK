'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * SubscribeButton — Inicia un Checkout de suscripción REAL contra
 * /api/checkout/create-preference (mode: 'subscription').
 *
 * - Si el usuario no está autenticado → redirige a /signup (con redirect).
 * - Si está autenticado → pide la sesión de Stripe al servidor y navega.
 * - El servidor es la autoridad del priceId (nunca se envía desde aquí).
 * - Loading/error controlados; doble click bloqueado.
 */
export default function SubscribeButton({
  priceTier = 'pro',
  label = 'Empezar con Pro',
  className = '',
  variant = 'primary',
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();

      if (authErr || !user) {
        router.push('/signup?redirect=/pricing');
        return;
      }

      const res = await fetch('/api/checkout/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'subscription', priceTier }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok || !data?.url) {
        let msg = data?.error;
        if (!msg) {
          msg =
            data?.code === 'invalid_price_tier'
              ? 'El plan no está disponible para pago online todavía.'
              : 'No se pudo iniciar el pago. Intenta de nuevo.';
        }
        setError(msg);
        return;
      }

      // Redirigir al Checkout de Stripe.
      window.location.href = data.url;
    } catch (err) {
      console.error('[SubscribeButton]', err?.message || err);
      setError('Ocurrió un error al iniciar el pago. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const base =
    variant === 'ghost'
      ? 'border border-zinc-700 text-zinc-200 hover:bg-zinc-800/60'
      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30';
  const disabledCls = loading ? 'opacity-60 cursor-not-allowed' : '';

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={loading}
        className={`w-full px-4 py-3 rounded-xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 flex items-center justify-center gap-2 ${base} ${disabledCls} ${className}`}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Preparando pago…' : label}
      </button>
      {error && (
        <p className="text-xs text-amber-400 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}