'use client';

import { useState } from 'react';
import { Crown, Sparkles, CreditCard, Loader2 } from 'lucide-react';
import { isTrialActive, getTrialDaysLeft } from '@/lib/config/plans';

/**
 * PlanUpgradeCard - Muestra el plan actual en /admin, el estado de la
 * suscripción Stripe y conecta la administración del billing real:
 *  - "Administrar suscripción" abre el Stripe Customer Portal vía el
 *    endpoint server-side /api/billing/portal (nunca confía en el cliente).
 *  - "Pasar a Pro" apunta a /pricing (checkout autenticado).
 *  - Estados: loading, error, suscripción activa/pendiente/cancelada.
 */
export default function PlanUpgradeCard({
  plan = 'free',
  trialEndsAt = null,
  subscriptionStatus = 'inactive',
  hasStripeCustomer = false,
}) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState('');

  // Normalización defensiva: el valor puede venir crudo de la BD ("Pro", " PRO ").
  plan = String(plan || 'free').trim().toLowerCase();
  const isPaid = plan === 'starter' || plan === 'pro' || plan === 'enterprise';
  const trialActive = isTrialActive(trialEndsAt);
  const trialDays = getTrialDaysLeft(trialEndsAt);
  const planName = plan === 'free' ? 'Free'
    : plan === 'starter' ? 'Starter'
    : plan === 'pro' ? 'Pro'
    : plan === 'enterprise' ? 'Enterprise'
    : 'Free';

  // Estados de suscripción Stripe que ya soporta el webhook (migración 08+).
  const statusNorm = String(subscriptionStatus || 'inactive').toLowerCase();
  const subLabel =
    statusNorm === 'active' ? 'Suscripción activa'
    : statusNorm === 'trialing' ? 'Prueba activa'
    : statusNorm === 'past_due' ? 'Pago pendiente'
    : statusNorm === 'canceled' || statusNorm === 'unpaid' ? 'Suscripción cancelada'
    : 'Sin suscripción activa';
  const subTone =
    statusNorm === 'active' || statusNorm === 'trialing' ? 'text-emerald-400'
    : statusNorm === 'past_due' ? 'text-amber-400'
    : statusNorm === 'canceled' || statusNorm === 'unpaid' ? 'text-red-400'
    : 'text-zinc-500';

  const openPortal = async () => {
    if (portalLoading) return;
    setPortalError('');
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.url) {
        setPortalError(
          res.status === 404
            ? data?.error || 'Todavía no tenés una suscripción con Stripe.'
            : data?.error || 'No se pudo abrir el portal de pagos. Intenta de nuevo.'
        );
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error('[PlanUpgradeCard] portal error:', err?.message || err);
      setPortalError('No se pudo abrir el portal de pagos. Intenta de nuevo.');
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between bg-zinc-900/60 backdrop-blur-xl rounded-2xl p-5 border border-zinc-800 shadow-sm">
      <div className="min-w-0">
        <h3 className="font-semibold text-zinc-100 mb-1">Plan actual</h3>
        {trialActive ? (
          <p className="text-sm text-emerald-400 capitalize flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            {isPaid
              ? `${planName} — prueba activa, quedan ${trialDays} ${trialDays === 1 ? 'día' : 'días'}`
              : `Prueba Pro — quedan ${trialDays} ${trialDays === 1 ? 'día' : 'días'}`}
          </p>
        ) : (
          <p className="text-sm text-zinc-400 capitalize">{planName}</p>
        )}
        {!trialActive && statusNorm !== 'inactive' && (
          <p className={`text-xs mt-0.5 ${subTone}`}>{subLabel}</p>
        )}
        {!trialActive && plan === 'free' && statusNorm === 'inactive' ? (
          <p className="text-xs text-amber-400 mt-0.5">
            Durante la prueba disfrutás Pro. Al vencerse, podés seguir vendiendo con el plan gratuito (límite al crear nuevos productos).
          </p>
        ) : null}
        {portalError && (
          <p className="text-xs text-red-400 mt-1" role="alert">{portalError}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3 md:mt-0">
        {/* Cuando ya existe un customer Stripe, administrar billing es real. */}
        {hasStripeCustomer ? (
          <button
            type="button"
            onClick={openPortal}
            disabled={portalLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-zinc-400"
          >
            <CreditCard className="w-4 h-4" />
            {portalLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Abriendo…
              </>
            ) : (
              'Administrar suscripción'
            )}
          </button>
        ) : null}

        <a
          href="/pricing?ref=admin-dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold shadow-lg hover:scale-[1.03] transition-transform focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <Crown className="w-4 h-4" />
          {trialActive ? 'Ver planes' : plan === 'free' ? 'Pasar a Pro' : 'Ver planes'}
        </a>
      </div>
    </div>
  );
}