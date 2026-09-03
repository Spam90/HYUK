// =============================================================
// /api/billing/portal — Stripe Customer Portal (server-side).
//
// SEGURIDAD (Prompt 13):
//  - Exige sesión autenticada (getUser server-side).
//  - El customer SIEMPRE se resuelve desde profiles del usuario
//    autenticado (auth.uid()); NUNCA se acepta customerId del body.
//  - Sin `stripe_customer_id` → 404 instructivo (no crea customers
//    al azar ni expone datos).
//  - Errores de Stripe quedan en logs; el cliente recibe mensaje
//    seguro y genérico.
// =============================================================
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service-role';
import { getStripe, stripeConfigured } from '@/lib/stripe';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req) {
  try {
    // 1) Autenticación server-side (nunca confiar en el body).
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return json(
        { ok: false, error: 'Debes iniciar sesión para administrar tu suscripción.', code: 'auth_required' },
        401
      );
    }

    // 2) Stripe disponible.
    if (!stripeConfigured()) {
      return json(
        { ok: false, error: 'El portal de pagos aún no está disponible.', code: 'stripe_not_configured' },
        503
      );
    }
    const stripe = await getStripe();
    if (!stripe) {
      return json(
        { ok: false, error: 'No se pudo conectar con el proveedor de pagos.', code: 'stripe_init_error' },
        500
      );
    }

    // 3) Customer REAL del tenant autenticado (service-role tras auth+ownership).
    const admin = createServiceClient();
    if (!admin) {
      return json(
        { ok: false, error: 'Configuración incompleta del servidor.', code: 'service_role_missing' },
        503
      );
    }
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    const customerId = profile?.stripe_customer_id;
    if (!customerId) {
      return json(
        {
          ok: false,
          error: 'Todavía no tenés una suscripción con Stripe. Podés iniciar una desde /pricing.',
          code: 'no_stripe_customer',
        },
        404
      );
    }

    // 4) URL de retorno basada en la configuración real del proyecto.
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
      'http://localhost:3000';

    // 5) Crear la sesión del portal de billing.
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/admin?billing=1`,
    });

    return json({ ok: true, url: session.url });
  } catch (err) {
    console.error('[billing/portal] error:', err?.message || err);
    return json(
      { ok: false, error: 'No se pudo abrir el portal de pagos. Intenta de nuevo más tarde.', code: 'billing_portal_error' },
      500
    );
  }
}