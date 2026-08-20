'use client';

// =============================================================
// Cache del estado real del esquema Supabase (lo entrega el
// server-route /api/db/status). El resultado se comparte entre
// todas las pantallas admin del navegador durante la sesión.
// =============================================================

const DEFAULTS = {
  ok: false,
  authed: false,
  planColumn: null, // 'plan_type' | 'plan' | null
  isOpen: false,
  socialLinks: false,
  ordersTable: false,
};

let cachedPromise = null;

export function getDbStatus({ force } = {}) {
  if (force) cachedPromise = null;
  if (!cachedPromise) {
    cachedPromise = fetch('/api/db/status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : DEFAULTS))
      .catch(() => DEFAULTS);
  }
  return cachedPromise;
}