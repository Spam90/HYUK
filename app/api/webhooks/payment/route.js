import { constructWebhookEvent } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/service-role';
import { planFromPriceId } from '@/lib/payments';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Webhook de Stripe.
 *
 * - Verifica firma (raw body).
 * - Idempotente: descarta eventos ya procesados (payment_events.event_id UNIQUE).
 * - `checkout.session.completed`:
 *    * payment  → paga la orden + normaliza order_items.
 *    * subscription → activa el perfil (stripe_customer_id, plan, trial).
 *
 * Cualquier error se registra y responde 200/400 sin tostar consola.
 */
export async function POST(req) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response(JSON.stringify({ error: 'Missing stripe-signature' }), { status: 400 });

  const raw = await req.text();

  try {
    const event = await constructWebhookEvent(raw, sig);

    const admin = createServiceClient();
    if (!admin) {
      return new Response(JSON.stringify({ error: 'Service role no configurado' }), { status: 500 });
    }

    // Idempotencia: el webhook puede reenviarse.
    const { data: existing } = await admin
      .from('payment_events')
      .select('id')
      .eq('event_id', event.id)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.mode === 'subscription') {
        await handleSubscriptionCompleted(session, admin);
      } else {
        await handlePaymentCompleted(session, admin);
      }
    } else if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      await handleSubscriptionRenewal(invoice, admin);
    }

    // Registrar el evento procesado
    try {
      await admin.from('payment_events').insert({
        order_id: event.data.object?.metadata?.orderId || null,
        provider: 'stripe',
        event_type: event.type,
        event_id: event.id,
        payload: event,
      });
    } catch (logErr) {
      console.warn('[webhook] No se pudo registrar payment_events:', logErr?.message);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    const msg = err?.message || 'Webhook error';
    console.error('[webhook] Error procesando evento:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 400 });
  }
}
// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handlePaymentCompleted(session, admin) {
  const orderId = session?.metadata?.orderId;
  if (!orderId) {
    console.warn('[webhook] checkout.session.completed sin orderId; se ignora.');
    return;
  }

  const { data: order, error: fetchErr } = await admin
    .from('orders')
    .select('items, store_id')
    .eq('id', orderId)
    .maybeSingle();

  if (fetchErr) {
    console.warn('[webhook] No se pudo leer la orden:', fetchErr?.message);
    return;
  }
  if (!order) {
    console.warn(`[webhook] Orden ${orderId} no encontrada.`);
    return;
  }

  // Transición ATÓMICA vía RPC set_order_status (migración 17):
  //   - valida ownership (service-role pasa con auth.uid() NULL)
  //   - descuenta stock (idempotente, migración 15) en la MISMA transacción
  //   - reconstruye order_items desde la BD (precios reales, snapshots)
  //   - persiste payment_status='paid', status='paid' y los IDs de Stripe
  // Si el stock falla, la RPC devuelve ok=false con código legible y el
  // pedido permanece en su estado previo. Devolvemos error para que Stripe
  // reintente el webhook más tarde (la idempotencia global de payment_events
  // evita dobles procesamientos cuando el reintento finalmente funciona).
  const { data: rpc, error: rpcErr } = await admin.rpc('set_order_status', {
    p_order_id: orderId,
    p_new_status: 'paid',
    p_payment_provider: 'stripe',
    p_payment_intent_id: session.payment_intent || session.id,
    p_stripe_session_id: session.id,
  });

  if (rpcErr) {
    console.error('[webhook] set_order_status RPC error:', rpcErr?.message);
    throw new Error('No se pudo confirmar el pago de la orden.');
  }
  if (!rpc?.ok) {
    // Código de negocio (order_insufficient_stock, invalid_order_transition…)
    // se registra pero NO se expone en la respuesta al webhook de Stripe.
    console.error('[webhook] set_order_status rechazado:', rpc?.error);
    throw new Error('La orden no pudo pasar a estado pagado.');
  }

  // Notificar al analytics de forma fire-and-forget (REST) — no bloquea.
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: order.store_id,
        event: 'purchase',
        sessionId: '',
        metadata: { orderId, total: session.amount_total, provider: 'stripe' },
      }),
    }).catch(() => {});
  } catch {
    /* noop */
  }
}

async function handleSubscriptionCompleted(session, admin) {
  const storeId = session?.metadata?.storeId;
  const email = session?.metadata?.email;
  const plan = planFromPriceId(session?.metadata?.priceId) || session?.metadata?.priceTier || null;

  const subscription = session.subscription
    ? await stripeGetSubscription(session.subscription)
    : null;
  const trialEnd = subscription?.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;

  let q = admin.from('profiles');
  if (storeId) {
    q = q.eq('id', storeId);
  } else if (email) {
    q = q.eq('email', email);
  }

  const update = {
    stripe_customer_id: session.customer,
    subscription_status: 'active',
    current_plan: plan,
    updated_at: new Date().toISOString(),
  };
  if (trialEnd) update.plan_expires_at = trialEnd;

  await q.update(update).then(() => {}).catch((err) => {
    console.warn('[webhook] No se pudo actualizar perfil de suscripción:', err?.message);
  });
}

async function handleSubscriptionRenewal(invoice, admin) {
  const customerId = invoice?.customer;
  if (!customerId) return;
  const subscription = invoice?.subscription ? await stripeGetSubscription(invoice.subscription) : null;
  if (!subscription) return;

  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
  await admin
    .from('profiles')
    .update({
      subscription_status: 'active',
      plan_expires_at: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)
    .then(() => {})
    .catch((err) => console.warn('[webhook] No se pudo refrescar suscripción:', err?.message));
}

/** Obtiene una suscripción de Stripe (helper aislado para try/catch). */
async function stripeGetSubscription(subscriptionId) {
  const stripe = await getStripeQuiet();
  if (!stripe) return null;
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (err) {
    console.warn('[webhook] stripe.subscriptions.retrieve falló:', err?.message);
    return null;
  }
}

async function getStripeQuiet() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  try {
    const StripeModule = await import('stripe');
    const Stripe = StripeModule.default || StripeModule;
    return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-18' });
  } catch {
    return null;
  }
}

