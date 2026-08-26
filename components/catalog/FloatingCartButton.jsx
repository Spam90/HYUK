'use client';

/**
 * FloatingCartButton
 * ---------------
 * Botón de carrito fijado a la esquina superior derecha
 * (fixed top-4 right-4 z-50) con un panel lateral que se desliza
 * desde la derecha al hacer clic.
 *
 * Reutiliza el estado global de `context/CartContext`
 * (cartItems, cartCount, cartTotal, updateQuantity, removeItem,
 *  clearCart) y las utilidades de `lib/whatsapp/checkout.js`
 * (formatPrice, generateWhatsAppUrl).
 *
 * Props:
 *  - store:    perfil de la tienda (business_name, phone_whatsapp, store_currency)
 *  - settings: settings del tema/tienda (settings.theme, settings.whatsapp_checkout)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  MessageCircle,
} from 'lucide-react';

import { useCart } from '@/context/CartContext';
import {
  formatPrice,
  generateWhatsAppUrl,
} from '@/lib/whatsapp/checkout';

export default function FloatingCartButton({ store, settings }) {
  // Estado GLOBAL del carrito (compartido con los "Agregar" de las cards)
  const {
    cartItems,
    cartCount,
    cartTotal,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  // Estado LOCAL de apertura del drawer (independiente del CartDrawer
  // existente, para no interferir con él)
  const [open, setOpen] = useState(false);

  // Bloquear scroll del body cuando el panel está abierto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => (document.body.style.overflow = '');
  }, [open]);

  const toggle = () => setOpen((v) => !v);

  // Helpers de display
  const primaryColor = settings?.theme?.primaryColor || '#EF4444';
  const currency = store?.store_currency || settings?.store_currency || 'USD';
  const storeName =
    store?.business_name || store?.store_name || 'Mi Tienda';
  const storePhone =
    store?.phone_whatsapp || store?.whatsapp_number || store?.phone || '';

  // Enviar pedido por WhatsApp usando la plantilla profesional existente
  const handleWhatsAppCheckout = () => {
    if (!cartItems.length) return;
    const checkoutConfig = settings?.whatsapp_checkout || {};
    const url = generateWhatsAppUrl({
      storeName,
      storePhone,
      cartItems,
      checkoutConfig,
      customerInfo: {},
      total: cartTotal,
      currency,
    });
    window.open(url, '_blank');
    clearCart();
    setOpen(false);
  };

  return (
    <>
      {/* ===== Botón flotante esquina superior derecha ===== */}
      <div className="fixed top-4 right-4 z-50">
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggle}
          aria-label="Abrir carrito de compras"
          className="relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          style={{ backgroundColor: primaryColor }}
        >
          <ShoppingBag className="h-6 w-6" />

          {/* Contador en tiempo real sobre el icono */}
          <AnimatePresence>
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="absolute -top-1.5 -right-1.5 flex h-6 w-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-500 text-[10px] font-extrabold text-white"
              >
                {cartCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* ===== Drawer lateral con AnimatePresence ===== */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={toggle}
              aria-hidden="true"
            />

            {/* Panel lateral (slide-in desde la derecha) */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.35, ease: 'easeOut' }}
              className="fixed top-0 right-0 z-[55] flex h-full w-full max-w-sm flex-col border-l border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del drawer */}
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-zinc-800">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Mi carrito
                </h2>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={toggle}
                  className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-zinc-800"
                  aria-label="Cerrar carrito"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>

                            {/* Lista de productos */}
              <div className="flex-1 overflow-y-auto p-5">
                {cartItems.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                      <ShoppingBag className="h-10 w-10 text-gray-300" />
                    </div>
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                      Tu carrito está vacío.
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Agrega productos y aquí aparecerán.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {cartItems.map((item) => (
                      <div key={item.key} className="flex items-center gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-zinc-800">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-2xl">🍽️</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatPrice(item.price, currency)} c/u
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              type="button"
                              onClick={() => updateQuantity(item.key, item.quantity - 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700"
                              aria-label="Disminuir cantidad"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </motion.button>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{item.quantity}</span>
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              type="button"
                              onClick={() => updateQuantity(item.key, item.quantity + 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-white"
                              style={{ backgroundColor: primaryColor }}
                              aria-label="Aumentar cantidad"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </motion.button>
                          </div>
                        </div>
                        <p className="w-16 shrink-0 text-right text-sm font-bold text-gray-900 dark:text-white">
                          {formatPrice(item.price * item.quantity, currency)}
                        </p>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          type="button"
                          onClick={() => removeItem(item.key)}
                          className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
                          aria-label={`Eliminar ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </motion.button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumen + Checkout */}
              <div className="border-t border-gray-200 px-6 py-4 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Subtotal</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatPrice(cartTotal, currency)}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={clearCart}
                    disabled={cartItems.length === 0}
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 dark:border-zinc-700 dark:text-zinc-300 disabled:opacity-50"
                  >
                    Vaciar carrito
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleWhatsAppCheckout}
                    disabled={cartItems.length === 0}
                    className="flex-1 rounded-xl text-sm font-bold text-white shadow-xl transition-opacity disabled:opacity-60"
                    style={{ backgroundColor: '#25D366', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.4)' }}
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <MessageCircle className="h-4 w-4" />
                      Enviar pedido
                    </span>
                  </motion.button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
