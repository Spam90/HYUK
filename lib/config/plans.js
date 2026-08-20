// lib/config/plans.js
// Límites y helpers de planes multi-tenant. La columna de Supabase es `profiles.plan_type`.
// La regla de oro: Free siempre limita la cantidad de productos visibles → upsell claro.

export const PLAN_LIMITS = {
  free: { maxProducts: 6, maxCategories: 4 },
  starter: { maxProducts: 50, maxCategories: 20 },
  pro: { maxProducts: Infinity, maxCategories: Infinity },
  enterprise: { maxProducts: Infinity, maxCategories: Infinity },
};

export const PLAN_NAME = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

/** Devuelve el límite de productos del plan indicado (fallback a free). */
export function getProductLimit(plan) {
  return PLAN_LIMITS[plan]?.maxProducts ?? PLAN_LIMITS.free.maxProducts;
}

/** True si el plan NO tiene límite ilimitado (es Free). */
export function isFree(plan) {
  return !plan || plan === 'free';
}

/** True si un plan Free supera su límite con `count` productos. */
export function hasProductLimitReached(plan, count) {
  if (!isFree(plan)) return false;
  const limit = getProductLimit(plan);
  return count > limit;
}

/** Devuelve el número de productos ocultos tras el límite (para el card "lock"). */
export function getLockedCount(plan, count) {
  if (!isFree(plan)) return 0;
  const limit = getProductLimit(plan);
  return count > limit ? count - limit : 0;
}

export default PLAN_LIMITS;
