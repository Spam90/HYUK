// =============================================================
// /api/orders/public/[id] — lectura pública de un pedido para la
// página de seguimiento (/pedido/[id]).
//
// La tabla orders tiene RLS: los clientes pueden INSERTAR pedidos y
// los dueños leer los suyos. Esta ruta lee el pedido con el cliente
// de servidor (anon) usando una política de lectura pública por id,
// para que el cliente final pueda consultar su estado sin estar logueado.
// Devolvemos SOLO campos no sensibles (sin la dirección completa ni
// datos del dueño).
// =============================================================
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    const id = params?.id;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const supabase = createClient();
    const { data: order, error } = await supabase
      .from('orders')
      .select(
        'id, created_at, status, customer_name, items, total_amount, currency, notes, delivery_method, payment_method'
      )
      .eq('id', id)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        id: order.id,
        created_at: order.created_at,
        status: order.status,
        customer_name: order.customer_name,
        items: order.items || [],
        total: order.total_amount,
        currency: order.currency || 'USD',
        notes: order.notes,
        delivery_method: order.delivery_method,
        payment_method: order.payment_method,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }
}