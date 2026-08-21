'use client';

import { Crown, Sparkles } from 'lucide-react';
import { isTrialActive, getTrialDaysLeft } from '@/lib/config/plans';

/**
 * PlanUpgradeCard - Muestra el plan actual en /admin y la CTA de upgrade.
 * Persistencia en profiles.plan_type; el trial de 28 días otorga beneficios Pro
 * temporales (profiles.trial_ends_at). El catálogo público NUNCA se recorta.
 */
export default function PlanUpgradeCard({ plan = 'free', trialEndsAt = null }) {
  const trialActive = isTrialActive(trialEndsAt);
  const trialDays = getTrialDaysLeft(trialEndsAt);
  const planName = plan === 'free' ? 'Free'
    : plan === 'starter' ? 'Starter'
    : plan === 'pro' ? 'Pro'
    : plan === 'enterprise' ? 'Enterprise'
    : 'Free';

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between bg-zinc-900/60 backdrop-blur-xl rounded-2xl p-5 border border-zinc-800 shadow-sm">
      <div className="min-w-0">
        <h3 className="font-semibold text-zinc-100 mb-1">Plan actual</h3>
        {trialActive ? (
          <p className="text-sm text-emerald-400 capitalize flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Prueba Pro — quedan {trialDays} {trialDays === 1 ? 'día' : 'días'}
          </p>
        ) : (
          <p className="text-sm text-zinc-400 capitalize">{planName}</p>
        )}
        {!trialActive && plan === 'free' ? (
          <p className="text-xs text-amber-400 mt-0.5">
            Durante la prueba disfrutás Pro. Al vencerse, podés seguir vendiendo con el plan gratuito (límite al crear nuevos productos).
          </p>
        ) : null}
      </div>
      <a
        href="/pricing?ref=admin-dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold shadow-lg hover:scale-[1.03] transition-transform focus:outline-none focus:ring-2 focus:ring-amber-400"
      >
        <Crown className="w-4 h-4" />
        {trialActive ? 'Ver planes' : plan === 'free' ? 'Pasar a Pro' : 'Administrar plan'}
      </a>
    </div>
  );
}