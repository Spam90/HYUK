'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Phone, ShoppingBag, DollarSign, Trophy, RefreshCw, X, Calendar, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getOrders } from '@/lib/orders';

export const dynamic = 'force-dynamic';

const MEDALLAS = ['🥇', '🥈', '🥉'];
const TIER_BG = ['bg-yellow-400/15 border-l-4 border-yellow-400', 'bg-amber-400/10 border-l-4 border-amber-400', 'bg-orange-400/10 border-l-4 border-orange-400'];

export default function CustomersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [supabase, setSupabase] = useState(null);

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => setSupabase(createClient()));
  }, []);

  const loadOrders = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const result = await getOrders(user.id);
      setOrders(result.success ? result.orders : []);
    } catch (e) {
      console.error('Error cargando clientes:', e);
      setOrders([]);
    } finally { setLoading(false); }
  };
  useEffect(() => { if (supabase) loadOrders(); }, [supabase]);

  const customers = useMemo(() => {
    const map = new Map();
    (orders || []).forEach((o) => {
      const phone = (o.customer_phone || '').trim();
      if (!phone) return;
      const pc = phone.replace(/\D/g, '');
            const cur = map.get(pc) || { phone, pc, name: o.customer_name || '—', orders: 0, spent: 0, lastDate: null };
      cur.orders += 1;
      cur.spent += parseFloat(o.total_amount || 0);
      if (o.created_at && (!cur.lastDate || new Date(o.created_at) > new Date(cur.lastDate))) cur.lastDate = o.created_at;
      if ((o.customer_name || '').trim() && (cur.name === '—' || !cur.name)) cur.name = o.customer_name;
      map.set(pc, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.spent - a.spent);
  }, [orders]);

  const filtered = customers.filter((c) => {
    const q = (searchTerm || '').toLowerCase();
    if (!q) return true;
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  const formatMoney = (v) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v || 0);
  const openWhatsApp = (phone) => {
    const clean = String(phone || '').replace(/\D/g, '');
    if (!clean) return;
    const msg = '¡Hola! 🎉 Tenemos una promoción especial para vosotros. ¿Te interesa?';
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  };
  const customerOrders = (pc) => orders.filter((o) => String(o.customer_phone || '').replace(/\D/g, '') === pc);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700"><X className="w-4 h-4" /></button>
            <Calendar className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Librito de Clientes</h1>
              <p className="text-sm text-gray-500">Clientes agrupados por WhatsApp · ordenados por mayor gasto</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500"><Trophy className="w-5 h-5 text-yellow-400" /><span>{filtered.slice(0, 3).length} destacados</span></div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-4 mb-4 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nombre o WhatsApp..." className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary/50" />
          </div>
          <button onClick={loadOrders} disabled={loading} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50" title="Recargar"><RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>

                {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-gray-300 dark:border-zinc-700">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-zinc-800 dark:to-zinc-800 flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tus mejores clientes aparecerán aquí</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
              Cuando tus clientes hagan pedidos por WhatsApp, los verás agrupados aquí con sus números y cuánto han gastado.
            </p>
            <button onClick={() => router.push('/admin/orders')} className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-lg hover:scale-[1.02] transition-all">
              Ver pedidos entrantes
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-zinc-800/60 text-left">
                  <th className="px-4 py-2.5 text-gray-500">#</th>
                  <th className="px-4 py-2.5 text-gray-500">Cliente</th>
                  <th className="px-4 py-2.5 text-gray-500">WhatsApp</th>
                  <th className="px-4 py-2.5 text-gray-500 text-center">Total Pedidos</th>
                  <th className="px-4 py-2.5 text-gray-500 text-right">Dinero Total Gastado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                {filtered.map((c, idx) => {
                  const isTop3 = idx < 3;
                  return (
                    <tr
                      key={c.pc}
                      onClick={() => setSelectedPhone(c)}
                      className={`cursor-pointer transition-colors ${isTop3 ? TIER_BG[idx] : 'hover:bg-gray-50 dark:hover:bg-zinc-800/40'}`}
                    >
                      <td className="px-4 py-2.5">
                        {isTop3 && (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 dark:bg-zinc-700 text-sm">{MEDALLAS[idx]}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white shrink-0 ${isTop3 ? 'bg-gradient-to-r from-yellow-400 to-yellow-300 text-black' : 'bg-gray-300'}`}>
                            {c.name?.charAt(0)?.toUpperCase() || '—'}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white truncate">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); openWhatsApp(c.phone); }}
                          className="flex items-center gap-1.5 text-sm text-primary hover:underline font-mono"
                        >
                          <Phone className="w-3.5 h-3.5" /> {c.phone}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold">{c.orders}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-bold ${isTop3 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-gray-300'}`}>
                          {formatMoney(c.spent)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

            {selectedPhone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSelectedPhone(null)}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{selectedPhone.name}</h3>
                <p className="text-sm text-gray-500">{selectedPhone.phone}</p>
              </div>
              <button
                onClick={() => setSelectedPhone(null)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-900 dark:text-white">Historial de pedidos</h4>
                <span className="text-xs text-gray-500">{selectedPhone.orders} pedido(s)</span>
              </div>
              {customerOrders(selectedPhone.pc).length === 0 ? (
                <p className="text-sm text-gray-500">No hay pedidos registrados.</p>
              ) : (
                <div className="space-y-3">
                  {customerOrders(selectedPhone.pc).map((o) => (
                    <div
                      key={o.id}
                      className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-800"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs text-gray-500">#{String(o.id).slice(0, 8)}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(o.created_at).toLocaleDateString('es-DO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <ShoppingBag className="w-3.5 h-3.5" />
                          {Array.isArray(o.items) ? o.items.length : 0} productos ·{' '}
                          {o.status === 'completed'
                            ? 'Completado'
                            : o.status === 'pending'
                            ? 'Pendiente'
                            : o.status === 'preparing'
                            ? 'En preparación'
                            : 'Cancelado'}
                        </div>
                        <span className="font-bold text-primary">{formatMoney(o.total_amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
