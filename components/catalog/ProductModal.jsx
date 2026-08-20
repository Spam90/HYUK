'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ShoppingBag, StickyNote } from 'lucide-react';
import { formatPrice } from '@/lib/whatsapp/checkout';

/**
 * ProductModal / Bottom-Sheet de producto.
 * Permite seleccionar hasta 2 variantes (grupos de opciones) y añadir
 * "Notas especiales" que viajan con el ítem hasta el checkout de WhatsApp.
 */
export default function ProductModal({
  product,
  isOpen,
  onClose,
  onAdd,
  settings,
  currency = 'USD',
}) {
  const theme = settings?.theme || {};
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState({}); // { índiceGrupo: índiceValor }
  const [notes, setNotes] = useState('');

  // Reset al cambiar de producto
  useEffect(() => {
    if (product) {
      setQuantity(1);
      setNotes('');
      setSelected({});
    }
  }, [product?.id, isOpen]);

  // Normalizar opciones: soporta [{name, values:[{label, priceDelta}]}]
  // y [{label}] simple (agrupado en un solo grupo "Opciones").
  const optionGroups = useMemo(() => {
    const raw = product?.options || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((group, gi) => {
      if (Array.isArray(group.values) && group.values.length > 0) {
        return { key: gi, label: group.name || group.label || `Opción ${gi + 1}`, values: group.values };
      }
      return { key: gi, label: group.name || `Opción ${gi + 1}`, values: [group] };
    });
  }, [product?.options]);

  const priceDelta = useMemo(() => {
    let total = 0;
    optionGroups.forEach((g, gi) => {
      const vi = selected[gi];
      if (vi !== undefined && g.values[vi]?.priceDelta) {
        total += Number(g.values[vi].priceDelta) || 0;
      }
    });
    return total;
  }, [optionGroups, selected]);

  const unitPrice = (Number(product?.price) || 0) + priceDelta;
  const lineTotal = unitPrice * quantity;

  if (!product) return null;

  const pickOption = (gi, vi) => {
    setSelected((prev) => ({ ...prev, [gi]: vi }));
  };

  const handleAdd = () => {
    const selectedOptions = optionGroups
      .map((g, gi) => {
        const vi = selected[gi];
        if (vi === undefined) return null;
        return { ...g.values[vi], groupLabel: g.label };
      })
      .filter(Boolean);

    onAdd(product, quantity, selectedOptions, notes.trim());
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[70] max-h-[92vh] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl overflow-hidden md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:max-w-lg md:mx-auto md:rounded-3xl md:h-auto"
          >
            <div className="overflow-y-auto max-h-[86vh]">
              <div className="md:hidden flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full" />
              </div>

              <div className="px-5 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Personaliza tu pedido</span>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{product.description}</p>
                  )}
                  <p className="text-xl font-black mt-2" style={{ color: theme.primaryColor || '#10B981' }}>
                    {formatPrice(unitPrice, currency)}
                  </p>
                </div>

                {/* Variantes: hasta 2 grupos */}
                {optionGroups.length > 0 && (
                  <div className="space-y-4">
                    {optionGroups.slice(0, 2).map((group, gi) => (
                      <div key={group.key}>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                          {group.label}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {group.values.map((val, vi) => {
                            const isActive = selected[gi] === vi;
                            const delta = Number(val.priceDelta) || 0;
                            return (
                              <button
                                key={vi}
                                onClick={() => pickOption(gi, vi)}
                                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                                  isActive
                                    ? 'text-white shadow'
                                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                                }`}
                                style={isActive ? { backgroundColor: theme.primaryColor || '#10B981' } : {}}
                              >
                                {val.label}
                                {delta > 0 && <span className="ml-1 opacity-80">+{formatPrice(delta, currency)}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
  {/* Notas especiales */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                    <StickyNote className="w-3.5 h-3.5" /> Notas especiales (opcional)
                  </p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Sin cebolla, extra salsa, etc."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 resize-none"
                  />
                </div>

                {/* Cantidad */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cantidad</span>
                  <div className="flex items-center gap-3">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </motion.button>
                    <span className="text-lg font-bold text-gray-900 dark:text-white w-6 text-center">{quantity}</span>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: theme.primaryColor || '#10B981' }}
                    >
                      <Plus className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>

                {/* CTA */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAdd}
                  className="w-full py-4 rounded-2xl text-white text-base font-bold shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
                  style={{
                    backgroundColor: theme.primaryColor || '#10B981',
                    boxShadow: `0 8px 24px ${theme.primaryColor || '#10B981'}40`,
                  }}
                >
                  <ShoppingBag className="w-5 h-5" />
                  Agregar al pedido · {formatPrice(lineTotal, currency)}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}