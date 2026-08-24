/**
 * Cliente de Supabase con service_role.
 *
 * Se usa en rutas API que requieren escribir datos sensibles del lado del
 * servidor (webhooks, confirmación de pago, inserción de `order_items`).
 *
 * Es DEFENSIVO: si no hay variables de entorno configuradas devuelve `null`
 * en vez de lanzar. Las rutas que lo consumen comprueban el `null` y fallan
 * con un error limpio (no tostan la consola ni el proceso).
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _client = null;

/**
 * Devuelve una instancia server-side con privilegios de service_role.
 * @returns {object|null} cliente Supabase o `null` si no está configurado.
 */
export function createServiceClient() {
  if (!url || !serviceKey) return null;
  if (_client) return _client;
  _client = createClient(url, serviceKey, {
    // Nunca persiste ni refresca tokens en el servidor.
    auth: {
      persist: false,
      autoRefreshToken: false,
      storage: undefined,
    },
  });
  return _client;
}

/**
 * Indica si el entorno tiene habilitado el acceso de servicio.
 */
export function serviceConfigured() {
  return Boolean(url && serviceKey);
}
