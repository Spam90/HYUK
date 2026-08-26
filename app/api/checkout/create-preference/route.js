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

// ---------------------------------------------------------------------
// FASE 0 SEGURIDAD — Verificación de precios desde la base de datos.
//
// El cliente NUNCA define el monto a cobrar. El total se recalcula
// íntegramente server-side usando products / coupons / profiles.settings,
// y se contrasta con lo almacenado en la orden (orders.items JSONB y
// orders.total_amount). Cualquier manipulación de precio/subtotal/
// descuento/envío produce un rechazo explícito (400), nunca un cobro.
// ---------------------------------------------------------------------
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Precio base vigente de un producto (respeta oferta relámpago activa). */
function effectiveProductPrice(p = {}) {
  const base = Number(p.price) || 0;
  const end = p.flash_sale_end ? new Date(p.flash_sale_end).getTime() : null;
  const flashActive = end && end > Date.now();
  const flashPrice = Number(p.flash_sale_price);
  return flashActive && flashPrice > 0 ? flashPrice : base;
}

/**
 * Normaliza las opciones de producto aceptando las dos formas usadas por el
 * proyecto:  [{ name, values:[{label, priceDelta}] }]  (seed/admin)
 *        y   [{ name, choices:[{label, priceDelta}] }]  (product_options)
 */
function normalizeOptionGroups(rawOptions) {
  if (!Array.isArray(rawOptions)) return [];
  return rawOptions.map((g) => ({
    label: g?.name || g?.label || '',
    values: Array.isArray(g?.values) ? g.values : Array.isArray(g?.choices) ? g.choices : [],
  }));
}

/**
 * Precio unitario esperado de un ítem recalculado desde BD.
 * Devuelve null si alguna opción elegida no existe o su delta difiere
 * (→ señal de carrito inválido/manipulado).
 */
function expectedUnitPrice(item = {}, product = {}) {
  let unit = effectiveProductPrice(product);
  const groups = normalizeOptionGroups(product.options);

  const sel = Array.isArray(item.selectedOptions) ? item.selectedOptions : [];
  for (const chosen of sel) {
    const chosenLabel = String(chosen?.label ?? '');
    let found = null;
    for (const g of groups) {
      const hit = (g.values || []).find(
        (v) => String(v?.label ?? '') === chosenLabel
      );
      if (hit) { found = hit; break; }
    }
    // Opción desconocida para este producto → manipulación o producto cambió.
    if (!found) return null;
    unit += Number(found.priceDelta) || 0;
  }
  return round2(unit);
}

/**
 * Descuento válido de cupón server-side (misma semántica que lib/coupons.js).
 */
function couponDiscountFor(couponRow, subtotal) {
  if (!couponRow) return 0;
  if (couponRow.discount_type === 'percent') {
    return round2((subtotal * (Number(couponRow.discount_value) || 0)) / 100);
  }
  return Math.min(Number(couponRow.discount_value) || 0, subtotal);
}

/**
 * Recalcula el TOTAL AUTORITATIVO de una orden desde la BD.
 * @returns {Promise<{ok:true,total:number}|{ok:false,status:number,error:string}>}
 */
async function recomputeAuthoritativeTotal(admin, order) {
  const rawItems = Array.isArray(order.items) ? order.items : [];
  if (!rawItems.length) {
    return { ok: false, status: 400, error: 'La orden no tiene ítems válidos.' };
  }

  // 1) Productos reales de ESTA tienda
  const ids = [...new Set(rawItems.map((i) => i?.id).filter(Boolean))];
  if (!ids.length) return { ok: false, status: 400, error: 'Ítems sin identificador de producto.' };

  const { data: products, error: pErr } = await admin
    .from('products')
    .select('id, price, options, flash_sale_end, flash_sale_price')
    .in('id', ids)
    .eq('store_id', order.store_id);
  if (pErr) return { ok: false, status: 500, error: 'Error leyendo productos de la orden.' };

  const byId = new Map((products || []).map((p) => [p.id, p]));

  // 2) Verificación línea por línea
  let subtotal = 0;
  for (const it of rawItems) {
    const prod = byId.get(it?.id);
    if (!prod) {
      return { ok: false, status: 400, error: 'El pedido incluye productos inexistentes o de otra tienda. Vuelve a armar tu pedido.' };
    }
    const unit = expectedUnitPrice(it, prod);
    if (unit == null) {
      return { ok: false, status: 400, error: 'Las opciones elegidas ya no coinciden con el catálogo. Vuelve a armar tu pedido.' };
    }
    subtotal += unit * (Number(it?.quantity) || 1);
  }
  subtotal = round2(subtotal);

  // 3) Cupón server-side
  let discount = 0;
  if (order.coupon_code) {
    const { data: coupon } = await admin
      .from('coupons')
      .select('discount_type, discount_value, is_active')
      .eq('store_id', order.store_id)
      .eq('code', String(order.coupon_code).toUpperCase())
      .maybeSingle();
    if (!coupon || !coupon.is_active) {
      discount = 0; // cupón inválido hoy → no aplica
    } else {
      discount = couponDiscountFor(coupon, subtotal);
    }
  }

  // 4) Envío validado contra las zonas configuradas por el dueño
  let fee = 0;
  const method = String(order.delivery_method || '').toLowerCase();
  const isHome = method.includes('domicilio');
  if (isHome) {
    const { data: prof } = await admin
      .from('profiles')
      .select('settings')
      .eq('id', order.store_id)
      .maybeSingle();
    const zones = prof?.settings?.theme?.deliveryZones || [];
    const zone = Array.isArray(zones)
      ? zones.find((z) => z?.label === order.delivery_zone)
      : null;
    if (!zone) {
      return { ok: false, status: 400, error: 'Zona de entrega no válida.' };
    }
    fee = Number(zone.fee) || 0;
  }

  return { ok: true, total: round2(Math.max(0, subtotal - discount + fee)) };
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

        // ---- Pago one-time (PRECIO AUTORITATIVO SERVER-SIDE) ----
    // FASE 0 SEGURIDAD: el `total`/`items` enviados por el cliente se IGNORAN
    // para el cobro. El monto se recalcula desde la BD (products + coupons +
    // zonas de envío) y se valida contra orders.total_amount.
    if (!orderId) {
      return json({ ok: false, error: 'orderId es requerido para pagos.', code: 'missing_order' }, 400);
    }

    const adminClient = createServiceClient();
    if (!adminClient) {
      return json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY no configurada', code: 'service_role_missing' }, 503);
    }

    const { data: orderRow, error: orderErr } = await adminClient
      .from('orders')
      .select('id, store_id, items, total_amount, currency, coupon_code, delivery_method, delivery_zone, delivery_fee')
      .eq('id', orderId)
      .maybeSingle();
    if (orderErr || !orderRow) {
      return json({ ok: false, error: 'Pedido no encontrado.', code: 'order_not_found' }, 404);
    }

    // Coherencia de tenancy: si el cliente declara storeId, debe coincidir
    // con la tienda real de la orden (evita sesiones cruzadas/analytics falsos).
    if (storeId && String(storeId) !== String(orderRow.store_id)) {
      return json({ ok: false, error: 'La orden no pertenece a esa tienda.', code: 'store_mismatch' }, 403);
    }

    const verified = await recomputeAuthoritativeTotal(adminClient, orderRow);
    if (!verified.ok) {
      return json({ ok: false, error: verified.error, code: 'order_validation_failed' }, verified.status);
    }

    // El total confiable es el RECALCULADO; si además difiere del almacenado,
    // se rechaza explícitamente (la orden quedó desactualizada/tamperada).
    const expectedTotal = verified.total;
    const storedTotal = round2(orderRow.total_amount);
    if (Math.abs(expectedTotal - storedTotal) > 0.01) {
      return json(
        { ok: false, error: 'El total del pedido cambió. Vuelve a confirmar tu pedido con los precios actuales.', code: 'order_total_mismatch' },
        400
      );
    }

    const normCurrencyRow = orderRow.currency || currency;

    const unitAmount = Math.round(expectedTotal * 100);
    if (!unitAmount || unitAmount <= 0) {
      return json({ ok: false, error: 'El total es 0 o inválido.', code: 'empty_cart' }, 400);
    }

    const productName = description || (orderId ? `Pedido #${orderId}` : 'Pedido HYUK');
    const price = await stripe.prices.create({
      currency: normalizeCurrency(normCurrencyRow),
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
        currency: normalizeCurrency(normCurrencyRow),
      },
      success_url: success,
      cancel_url: cancel,
      ...(customer?.email ? { customer_email: customer.email } : {}),
    });

    // Enlazar la sesión a la orden (service role, no bloquea).
    if (orderId && adminClient) {
      try {
        await adminClient
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

    return json({ ok: true, provider: 'stripe', url: session.url, sessionId: session.id, mode: 'payment' });

  } catch (err) {
    console.error('[checkout] create-preference error:', err?.message);
    return json(
      { ok: false, error: err?.message || 'Error creando preferencia de pago.', code: 'checkout_error' },
      500
    );
  }
}
