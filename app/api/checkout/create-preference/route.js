import { getStripe, stripeConfigured } from '@/lib/stripe';
import { detectPaymentProvider, normalizeCurrency, SUBSCRIPTION_PLANS } from '@/lib/payments';
import { createServiceClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Endpoint de creación de preferencia de pago.
 *
 * Flujo:
 *  1. Detecta provider (Stripe/MP) por entorno.
 *  2. Si no hay pasarela → 402 graceful (el cliente hace fallback a WhatsApp).
 *  3. La orden ya fue creada cliente-side (orderId) → enlazamos metadata.
 *  4. Devuelve la URL de checkout de Stripe (redirección en cliente).
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      mode = 'payment', // 'payment' | 'subscription'
      storeId,
      orderId,
      items,
      total,
      description,
      currency = 'DOP',
      priceId,
      priceTier = 'pro',
      successUrl,
      cancelUrl,
      customer = {},
    } = body || {};

    const provider = detectPaymentProvider();
    if (!provider) {
      return json(
        { ok: false, error: 'No hay pasarela de pago configurada.', code: 'payment_not_configured' },
        402
      );
    }

    if (!storeId && !orderId) {
      return json({ ok: false, error: 'Falta storeId u orderId.', code: 'missing_context' }, 400);
    }

    // Mercado Pago: driver no implementado (graceful).
    if (provider === 'mercadopago') {
      return json(
        { ok: false, error: 'Mercado Pago no está implementado aún.', code: 'mp_not_implemented' },
        501
      );
    }

    // ---- Stripe ----
    if (!stripeConfigured()) {
      return json({ ok: false, error: 'Stripe no configurado.', code: 'stripe_not_configured' }, 402);
    }
    const stripe = await getStripe();
    if (!stripe) {
      return json({ ok: false, error: 'Error inicializando Stripe.', code: 'stripe_init_error' }, 500);
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NEXT_PUBLIC_SITE_URL) ||
      '';
    const normCurrency = normalizeCurrency(currency);
    const success = successUrl || (orderId ? `${baseUrl}/pedido/${orderId}?paid=1` : `${baseUrl}/`);
    const cancel = cancelUrl || `${baseUrl}/`;
        if (mode === 'subscription') {
      let pid = priceId;
      if (!pid) {
        pid = SUBSCRIPTION_PLANS[priceTier]?.priceId;
      }
      if (!pid) {
        return json(
          { ok: false, error: 'priceId o priceTier inválido para suscripción.', code: 'invalid_price' },
          400
        );
      }

      // Buscar o crear el customer de Stripe vinculado al perfil.
      let customerId = customer?.stripeCustomerId;
      if (!customerId && customer?.email) {
        const existing = await stripe.customers.list({ email: customer.email, limit: 1 });
        customerId = existing.data?.[0]?.id;
        if (!customerId) {
          const created = await stripe.customers.create({
            email: customer.email,
            name: customer?.name || undefined,
            phone: customer?.phone || undefined,
          });
          customerId = created.id;
        }
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer: customerId || undefined,
        customer_email: customerId ? undefined : customer?.email,
        line_items: [{ price: pid, quantity: 1 }],
        metadata: {
          storeId: storeId || '',
          priceTier: priceTier || '',
          email: customer?.email || '',
        },
        success_url: `${success}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel,
        subscription_data: {
          trial_period_days: customer?.trialDays || 28,
        },
        allow_promotion_codes: true,
      });

      return json({ ok: true, provider: 'stripe', url: session.url, sessionId: session.id, mode: 'subscription' });
    }

        // ---- Pago one-time ----
    const computedTotal =
      Number(total) ||
      (Array.isArray(items)
        ? items.reduce((sum, it) => sum + Number(it?.price || 0) * Number(it?.quantity || 1), 0)
        : 0);

    const unitAmount = Math.round(computedTotal * 100);
    if (!unitAmount || unitAmount <= 0) {
      return json({ ok: false, error: 'El total es 0 o inválido.', code: 'empty_cart' }, 400);
    }

    const productName = description || (orderId ? `Pedido #${orderId}` : 'Pedido HYUK');
    const price = await stripe.prices.create({
      currency: normCurrency,
      unit_amount: unitAmount,
      product_data: { name: productName },
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: {
        storeId: storeId || '',
        orderId: orderId || '',
        customerPhone: customer?.phone || '',
        customerName: customer?.name || '',
        customerEmail: customer?.email || '',
        currency: normCurrency,
      },
      success_url: success,
      cancel_url: cancel,
      ...(customer?.email ? { customer_email: customer.email } : {}),
    });

    // Enlazar la sesión a la orden (service role, no bloquea).
    if (orderId) {
      const admin = createServiceClient();
      if (admin) {
        try {
          await admin
            .from('orders')
            .update({
              stripe_session_id: session.id,
              payment_provider: 'stripe',
            })
            .eq('id', orderId);
        } catch (linkErr) {
          console.warn('[checkout] No se pudo enlazar stripe_session_id:', linkErr?.message);
        }
      }
    }

    return json({ ok: true, provider: 'stripe', url: session.url, sessionId: session.id, mode: 'payment' });

  } catch (err) {
    console.error('[checkout] create-preference error:', err?.message);
    return json(
      { ok: false, error: err?.message || 'Error creando preferencia de pago.', code: 'checkout_error' },
      500
    );
  }
}
