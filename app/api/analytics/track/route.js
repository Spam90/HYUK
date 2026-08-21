// =============================================================
// /api/analytics/track — Registra un evento de análisis (visitas,
// vista de producto, add_to_cart, checkout_start, purchase, wa_click).
//
// POST { storeId, event, sessionId?, metadata? }
// Este endpoint usa el cliente del SERVIDOR con RLS pública de INSERT,
// así el visitante anónimo puede registrar eventos sin exponer nada.
// Los errores de esquema/res o de red se tragan silenciosamente para
// NUNCA romper la experiencia ni ensuciar la consola del navegador.
// =============================================================
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ALLOWED_EVENTS = new Set([
  'page_view',
  'view_product',
  'add_to_cart',
  'checkout_start',
  'purchase',
  'whatsapp_click',
]);

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const storeId = body?.storeId;
    const event = body?.event;

    if (!storeId || !event || typeof storeId !== 'string' || !ALLOWED_EVENTS.has(event)) {
      // No es un evento válido: responder 204 sin drama (nunca romper UX).
      return new NextResponse(null, { status: 204 });
    }

    const supabase = createClient();
    const { error } = await supabase.from('analytics_events').insert({
      store_id: storeId,
      event,
      session_id: typeof body?.sessionId === 'string' ? body.sessionId : null,
      metadata: body?.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    });

    if (error) {
      // Tabla no existe / RLS → no romper nada, log en servidor.
      console.warn('[analytics] no se pudo registrar evento:', event, error.message);
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}