'use client';

import { useState, useEffect } from 'react';
import { Loader2, Package } from 'lucide-react';

const STATUS_META = {
  pending: { label: 'Pendiente', desc: 'Recibimos tu pedido, estamos por confirmarlo.', icon: '⏳', color: 'text-yellow-500', step: 0 },
  preparing: { label: 'En preparación', desc: 'El local está preparando tu pedido.', icon: '👨‍🍳', color: 'text-blue-500', step: 1 },
  in_preparation: { label: 'En preparación', desc: 'El local está preparando tu pedido.', icon: '👨‍🍳', color: 'text-blue-500', step: 1 },
  ready: { label: 'Listo', desc: 'Tu pedido está listo para retirar o enviar.', icon: '🚚', color: 'text-purple-500', step: 2 },
  completed: { label: 'Completado', desc: 'Tu pedido fue entregado. ¡Gracias!', icon: '✅', color: 'text-green-500', step: 3 },
  cancelled: { label: 'Cancelado', desc: 'Este pedido fue cancelado.', icon: '❌', color: 'text-red-500', step: -1 },
};

const STEPS = [
  { label: 'Recibido', icon: '📥' },
  { label: 'Preparando', icon: '👨‍🍳' },
  { label: 'Listo', icon: '🚚' },
  { label: 'Entregado', icon: '✅' },
];

export default function OrderTrackingPage({ params }) {
  const orderId = params?.id;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/orders/public/${orderId}${typeof window !== 'undefined' ? window.location.search : ''}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('not_found');
        const data = await res.json();
        if (!cancelled) setOrder(data.order);
      } catch {
        if (!cancelled) setError('No pudimos encontrar este pedido. Verificá el enlace e intentá de nuevo.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-text flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background text-text flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Package className="w-14 h-14 text-text/30 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Pedido no encontrado</h1>
          <p className="text-text/60 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[order.status] || STATUS_META.pending;
  const currency = order.currency || 'USD';
  const items = Array.isArray(order.items) ? order.items : [];
  const fmt = (n) => new Intl.NumberFormat('es-DO', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(n) || 0);

  return (
    <div className="min-h-screen bg-background text-text">
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{meta.icon}</div>
          <p className="text-sm text-text/50 uppercase tracking-wide">Pedido</p>
          <h1 className="text-2xl font-black mb-1">#{String(order.id).slice(-8).toUpperCase()}</h1>
          <p className={`font-semibold ${meta.color}`}>{meta.label}</p>
        </div>

        {meta.step >= 0 && (
          <div className="flex items-center mb-8">
            {STEPS.map((s, i) => (
              <div key={s.label} className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${i <= meta.step ? 'bg-emerald-500 text-white' : 'bg-secondary/15 text-text/40'}`}>
                  {s.icon}
                </div>
                <span className={`text-[11px] mt-1.5 ${i <= meta.step ? 'text-emerald-400' : 'text-text/40'}`}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-text/60 text-sm mb-6">{meta.desc}</p>

        <OrderDetail order={order} items={items} fmt={fmt} />
      </div>
    </div>
  );
}

function OrderDetail({ order, items, fmt }) {
  return (
    <>
      <div className="bg-card border border-secondary/10 rounded-2xl p-5 mb-4">
        <p className="text-text/60 text-xs uppercase tracking-wide mb-3">Detalle del pedido</p>
        {items.length === 0 ? (
          <p className="text-sm text-text/50">Sin detalle disponible.</p>
        ) : (
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-text/50">{it.quantity}×</span>
                  <span>{it.name}</span>
                </div>
                <span className="font-semibold">{fmt(it.price * (it.quantity || 1))}</span>
              </div>
            ))}
            <div className="pt-3 mt-3 border-t border-secondary/10 flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-black text-lg text-emerald-400">{fmt(order.total)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card border border-secondary/10 rounded-2xl p-5 mb-4 space-y-2 text-sm">
        {[
          ['Cliente', order.customer_name || '—'],
          ['Entrega', order.delivery_method],
          ['Pago', order.payment_method],
          ['Fecha', new Date(order.created_at).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
        ].filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-text/60">
            <span>{k}</span>
            <span className="text-text/90 font-medium">{v}</span>
          </div>
        ))}
      </div>

      {order.notes && (
        <div className="bg-card border border-secondary/10 rounded-2xl p-5 mb-6 text-sm">
          <p className="text-text/60 mb-1">Notas</p>
          <p className="text-text/90">{order.notes}</p>
        </div>
      )}
    </>
  );
}