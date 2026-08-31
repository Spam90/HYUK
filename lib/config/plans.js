// lib/config/plans.js
// Límites y helpers de planes multi-tenant. La columna de Supabase es `profiles.plan_type`.
//
// REGLAS DE NEGOCIO (v2):
// 1. El catálogo público NUNCA oculta productos. El plan solo controla acciones de
//    ADMIN: crear productos (límite del plan) y generador con IA.
// 2. Todo usuario nuevo recibe un TRIAL de 28 días (profiles.trial_ends_at).
//    Mientras el trial esté activo, la tienda disfruta de beneficios Pro temporales
//    (creación ilimitada + IA) sin restricciones.
// 3. Fuera de trial, una cuenta Free solo se topa con el límite al CREAR productos
//    y al usar IA, mostrando banners de upgrade — jamás escondiendo lo ya creado.

export const TRIAL_DAYS = 28;

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
  // Normalizar defensivamente: la BD pudo guardar valores legacy "Pro" (capitalizado),
  // que no existen como clave de PLAN_LIMITS y caerían al fallback de Free.
  const key = String(plan || 'free').toLowerCase();
  return PLAN_LIMITS[key]?.maxProducts ?? PLAN_LIMITS.free.maxProducts;
}

/** True si el plan NO tiene límite ilimitado (es Free). */
export function isFree(plan) {
  const key = plan == null ? '' : String(plan).trim().toLowerCase();
  return !key || key === 'free';
}

/** True si un plan Free superó su límite con `count` productos. */
export function hasProductLimitReached(plan, count) {
  if (!isFree(plan)) return false;
  const limit = getProductLimit(plan);
  return count >= limit;
}

/**
 * Devuelve el número de productos que exceden el límite del plan Free.
 * (Se usa en el admin para el contador, NO para ocultar el catálogo.)
 */
export function getLockedCount(plan, count) {
  if (!isFree(plan)) return 0;
  const limit = getProductLimit(plan);
  return count > limit ? count - limit : 0;
}

// ============================================================================
// TRIAL (28 días de prueba con beneficios Pro)
// ============================================================================

/** Fecha de vencimiento del trial: NOW + 28 días. */
export function getTrialEndDate(from = new Date()) {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

/** True si el trial está vigente (trial_ends_at en el futuro). */
export function isTrialActive(trialEndsAt, now = new Date()) {
  if (!trialEndsAt) return false;
  const end = new Date(trialEndsAt);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() > now.getTime();
}

/** Días restantes del trial (0 si vencido/inactivo). */
export function getTrialDaysLeft(trialEndsAt, now = new Date()) {
  if (!isTrialActive(trialEndsAt, now)) return 0;
  return Math.max(1, Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Plan EFECTIVO de un perfil: si el trial está activo, la tienda opera como Pro
 * (acceso completo y sin límites). Solo fuera de trial el Free vuelve a Free.
 */
export function getEffectivePlan(profile = {}) {
  // Fuente de verdad: profiles.plan_type (columna canónica) con fallback a la
  // legacy `plan`. Normalizado SIEMPRE a minúscula y sin espacios: la BD pudo
  // guardar "Pro"/" PRO " y las claves de PLAN_LIMITS son minúsculas.
  const raw = profile?.plan_type ?? profile?.plan ?? 'free';
  const plan = String(raw || 'free').trim().toLowerCase();
  if (isFree(plan) && isTrialActive(profile?.trial_ends_at)) return 'pro';
  return plan;
}

/**
 * ¿Puede este perfil crear un producto NUEVO en este momento?
 * - Planes de pago (Starter/Pro/Enterprise): siempre.
 * - Trial activo: sí (beneficio Pro temporal).
 * - Free fuera de trial: solo si no superó el límite del plan.
 */
export function canCreateProduct(profile = {}, currentCount = 0) {
  const plan = profile?.plan_type || profile?.plan || 'free';
  if (!isFree(plan)) return true;
  if (isTrialActive(profile?.trial_ends_at)) return true;
  return currentCount < getProductLimit('free');
}

/**
 * ¿Puede este usuario usar las funciones de IA (generar catálogos/estilos)?
 * Regla: solo Pro o trial activo (lo mismo que el beneficio temporal).
 */
export function canUseAiFeature(profile = {}) {
  const plan = profile?.plan_type || profile?.plan || 'free';
  if (!isFree(plan)) return true;
  return isTrialActive(profile?.trial_ends_at);
}

export default PLAN_LIMITS;
