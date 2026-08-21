// =============================================================
// /api/db/status — SONDEO DESDE EL SERVIDOR de qué columnas y
// tablas existen REALMENTE en el proyecto Supabase.
//
// Por qué existe: si el cliente pide una columna/tabla que no
// existe, PostgREST responde 400/404 y el navegador lo pinta en
// rojo ("Failed to load resource"). Estas probaturas se hacen
// aquí (server) para que esos fallos NUNCA lleguen a la consola
// del navegador; el cliente consulta este JSON y ajusta sus
// queries a lo que de verdad existe.
// =============================================================
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Devuelve true si la columna existe en `profiles` (server-side).
// Cualquier 400/42P01/42703 se queda en el servidor.
async function probeColumn(supabase, column) {
  try {
    const { error } = await supabase
      .from('profiles')
      .select(column, { head: true })
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

// Devuelve true si la tabla existe y es consultable por este usuario.
async function probeTable(supabase, table) {
  try {
    const { error } = await supabase
      .from(table)
      .select('*', { head: true })
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

const FALLBACK_STATUS = {
  ok: false,
  authed: false,
  planColumn: null,
  isOpen: false,
  socialLinks: false,
  trialEnds: false,
  ordersTable: false,
  analyticsTable: false,
};

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(FALLBACK_STATUS, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const [planType, plan, isOpen, socialLinks, trialEnds, ordersTable, analyticsTable] = await Promise.all([
      probeColumn(supabase, 'plan_type'),
      probeColumn(supabase, 'plan'),
      probeColumn(supabase, 'is_open'),
      probeColumn(supabase, 'social_links'),
      probeColumn(supabase, 'trial_ends_at'),
      probeTable(supabase, 'orders'),
      probeTable(supabase, 'analytics_events'),
    ]);

    return NextResponse.json(
      {
        ok: true,
        authed: true,
        planColumn: planType ? 'plan_type' : plan ? 'plan' : null,
        isOpen,
        socialLinks,
        trialEnds,
        ordersTable,
        analyticsTable,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(FALLBACK_STATUS, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}