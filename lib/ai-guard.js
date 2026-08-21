// lib/ai-gate.js
// Gate server-side para las funciones de IA (generar catálogos/estilos).
// Regla de negocio v2: la IA es beneficio Pro (o trial de 28 días activo).
// Si el esquema aún no tiene las columnas (migración pendiente), NO se bloquea:
// mejor que la función funcione mientras la migración se aplica.

import { canUseAiFeature } from '@/lib/config/plans';

export async function hasAiFeatureAccess(supabase, userId) {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('plan_type, plan, trial_ends_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) return true; // Schema incompleto → no bloquear (la migración lo resolverá)
    return canUseAiFeature(profile || {});
  } catch {
    return true;
  }
}

export function aiUpgradeError() {
  return Response.json(
    {
      error:
        'La generación con IA es una función del plan Pro. Tu prueba de 28 días te da acceso; si ya venció, actualizá tu plan desde el panel.',
    },
    { status: 402 }
  );
}