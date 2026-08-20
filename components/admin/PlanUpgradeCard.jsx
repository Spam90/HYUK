'use client';

import { Crown } from 'lucide-react';

/**
 * PlanUpgradeCard - Muestra el plan actual en /admin y la CTA de upgrade.
 * Se persiste en profiles.plan_type (ver lib/config/plans.js).
 */
export default function PlanUpgradeCard({ plan = 'free' }) {
  const planName = plan === 'free' ? 'Free'
    : plan === 'starter' ? 'Starter'
    : plan === 'pro' ? 'Pro'
    : plan === 'enterprise' ? 'Enterprise'
    : 'Free';

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between bg-zinc-900/60 backdrop-blur-xl rounded-2xl p-5 border border-zinc-800 shadow-sm">
      <div className="min-w-0">
        <h3 className="font-semibold text-zinc-100 mb-1">Plan actual</h3>
        <p className="text-sm text-zinc-400 capitalize">{planName}</p>
        {plan === 'free' ? (
          <p className="text-xs text-amber-400 mt-0.5">Límite: 6 productos visibles en tu catálogo gratuito.</p>
        ) : null}
      </div>
      <a
        href="/pricing?ref=admin-dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold shadow-lg hover:scale-[1.03] transition-transform focus:outline-none focus:ring-2 focus:ring-amber-400"
      >
        <Crown className="w-4 h-4" />
        {plan === 'free' ? 'Pasar a Pro' : 'Administrar plan'}
      </a>
    </div>
  );
}