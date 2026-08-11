'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, Plus, Minus, Trash2, MessageCircle, MapPin, User, CreditCard, Bike, Store, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/components/theme/ThemeProvider';
import { formatPrice, generateWhatsAppUrl } from '@/lib/whatsapp/checkout';

export default function CartDrawer({ store, settings }) {
  const { 
    isCartOpen, 
    closeCart, 
    cartItems, 
    updateQuantity, 
    removeItem, 
    clearCart,
    cartTotal,
  } = useCart();
  const { settings: themeSettings } = useTheme();
  const { theme, whatsapp_checkout: checkoutConfig } = settings;

  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bloquear scroll cuando el drawer está abierto
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCartOpen]);

  // Reset del formulario cuando se cierra
  useEffect(() => {
    if (!isCartOpen) {
      setCustomerName('');
      setCustomerAddress('');
      setDeliveryMethod('');
      setPaymentMethod('');
    }
  }, [isCartOpen]);

  const storeName = store?.store_name || store?.full_name || 'Mi Tienda';
  const storePhone = store?.whatsapp_number || store?.phone || '';

  // Generar URL de WhatsApp y guardar pedido
  const handleWhatsAppCheckout = async () => {
    setIsSubmitting(true);

    // Validar campos requeridos
    if (checkoutConfig.requireClientName && !customerName) {
      alert('Por favor ingresa tu nombre');
      setIsSubmitting(false);
      return;
    }
    if (checkoutConfig.askForAddress && !customerAddress) {
      alert('Por favor ingresa tu dirección');
      setIsSubmitting(false);
      return;
    }
    if (checkoutConfig.deliveryMethods?.length > 0 && !deliveryMethod) {
      alert('Por favor selecciona el tipo de entrega');
      setIsSubmitting(false);
      return;
    }
    if (checkoutConfig.askForPaymentMethod && !paymentMethod) {
      alert('Por favor selecciona el método de pago');
      setIsSubmitting(false);
      return;
    }

    try {
      // Guardar pedido en la base de datos
      const { createOrder } = await import('@/lib/orders');
      const orderResult = await createOrder({
        customerName: customerName,
        customerPhone: '',
        deliveryAddress: customerAddress,
        deliveryMethod: deliveryMethod,
        paymentMethod: paymentMethod,
        items: cartItems,
        total: cartTotal,
        notes: '',
      });

      if (!orderResult.success) {
        console.error('Error guardando pedido:', orderResult.error);
        // Continuar de todas formas para enviar por WhatsApp
      } else {
        console.log('Pedido guardado exitosamente:', orderResult.order.id);
      }

      // Generar URL de WhatsApp
      const whatsappUrl = generateWhatsAppUrl({
        storeName,
        storePhone,
        cartItems,
        checkoutConfig,
        customerInfo: {
          name: customerName,
          address: customerAddress,
          deliveryMethod,
          paymentMethod,
        },
        total: cartTotal,
      });
      
      // Abrir WhatsApp
      window.open(whatsappUrl, '_blank');
      
      // Limpiar carrito
      clearCart();
      closeCart();
      
    } catch (error) {
      console.error('Error en checkout:', error);
      alert('Error al procesar el pedido. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
            onClick={closeCart}
          />

          {/* Bottom Sheet - Mobile Native Style */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl flex flex-col md:left-auto md:right-0 md:top-0 md:bottom-0 md:rounded-t-none md:rounded-l-3xl md:max-w-md"
          >
            {/* Header - Drag Handle for Mobile */}
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                  style={{ 
                    backgroundColor: theme.primaryColor,
                    boxShadow: `0 2px 8px ${theme.primaryColor}40`
                  }}
                >
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white">
                    Mi carrito
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeCart}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* Content */}
            {cartItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-10 h-10 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Tu carrito está vacío
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Agrega productos de nuestro catálogo para hacer tu pedido
                </p>
                <button
                  onClick={closeCart}
                  className="px-6 py-3 rounded-xl text-white font-semibold shadow-lg transition-transform active:scale-95"
                  style={{ 
                    backgroundColor: theme.primaryColor,
                    boxShadow: `0 4px 12px ${theme.primaryColor}40`
                  }}
                >
                  Ver catálogo
                </button>
              </div>
            ) : (
              <>
                {/* Items List - Tiendanube Style */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                  {cartItems.map((item) => (
                    <motion.div
                      key={item.key}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      className="flex gap-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-gray-100 dark:border-zinc-800"
                    >
                      {/* Image - Square */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden relative shrink-0 bg-gray-200 dark:bg-zinc-700">
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="80px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h5 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight line-clamp-2">
                              {item.name}
                            </h5>
                            {item.selectedOptions?.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {item.selectedOptions.map((opt, idx) => (
                                  <p key={idx} className="text-xs text-gray-500 dark:text-gray-400">
                                    • {opt.label}
                                  </p>
                                ))}
                              </div>
                            )}
                            <p className="text-sm font-bold mt-1" style={{ color: theme.primaryColor }}>
                              {formatPrice(item.price)}
                            </p>
                          </div>
                          <button
                            onClick={() => removeItem(item.key)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Quantity Controls - Compact Gray Box */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1 bg-white dark:bg-zinc-700 rounded-lg p-1 border border-gray-200 dark:border-zinc-600">
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => updateQuantity(item.key, item.quantity - 1)}
                              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-600 transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                            </motion.button>
                            <span className="text-sm font-bold text-gray-900 dark:text-white w-6 text-center">
                              {item.quantity}
                            </span>
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => updateQuantity(item.key, item.quantity + 1)}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-white"
                              style={{ 
                                backgroundColor: theme.primaryColor,
                                boxShadow: `0 1px 4px ${theme.primaryColor}40`
                              }}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </motion.button>
                          </div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Checkout Section - Tiendanube Style */}
                <div className="border-t border-gray-200 dark:border-zinc-800 p-6 space-y-4 bg-white dark:bg-zinc-900">
                  {/* Subtotal */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatPrice(cartTotal)}
                    </span>
                  </div>

                  {/* Shipping Notice */}
                  <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                    <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      El costo de envío se calculará al finalizar la compra
                    </p>
                  </div>

                  {/* Customer Name */}
                  {checkoutConfig.requireClientName && (
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-gray-200 dark:border-zinc-800">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Tu nombre *"
                        className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Delivery Method */}
                  {checkoutConfig.deliveryMethods?.length > 0 && (
                    <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-gray-200 dark:border-zinc-800">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Tipo de entrega
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {checkoutConfig.deliveryMethods.map((method) => {
                          const isSelected = deliveryMethod === method;
                          return (
                            <button
                              key={method}
                              onClick={() => setDeliveryMethod(method)}
                              className={`
                                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                transition-all duration-200
                              `}
                              style={isSelected ? { 
                                backgroundColor: theme.primaryColor,
                                color: 'white'
                              } : {
                                backgroundColor: 'white',
                                color: 'gray',
                                border: '1px solid #e5e7eb'
                              }}
                            >
                              {method}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Address */}
                  {checkoutConfig.askForAddress && (
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-gray-200 dark:border-zinc-800">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Dirección de entrega *"
                        className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Payment Method */}
                  {checkoutConfig.askForPaymentMethod && (
                    <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-gray-200 dark:border-zinc-800">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Método de pago
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {checkoutConfig.paymentOptions?.map((method) => {
                          const isSelected = paymentMethod === method;
                          return (
                            <button
                              key={method}
                              onClick={() => setPaymentMethod(method)}
                              className={`
                                px-3 py-1.5 rounded-lg text-xs font-medium
                                transition-all duration-200
                              `}
                              style={isSelected ? { 
                                backgroundColor: theme.primaryColor,
                                color: 'white'
                              } : {
                                backgroundColor: 'white',
                                color: 'gray',
                                border: '1px solid #e5e7eb'
                              }}
                            >
                              {method}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                   {/* WhatsApp Button - High Impact */}
                   <motion.button
                     whileTap={{ scale: 0.98 }}
                     onClick={handleWhatsAppCheckout}
                     disabled={isSubmitting}
                     className="w-full py-4 text-base font-bold text-white shadow-xl rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
                     style={{ 
                       backgroundColor: '#25D366',
                       boxShadow: '0 8px 24px rgba(37, 211, 102, 0.4)',
                     }}
                   >
                     {isSubmitting ? (
                       <span className="animate-pulse">Procesando...</span>
                     ) : (
                       <>
                         <MessageCircle className="w-6 h-6" />
                         <span className="text-lg">Finalizar compra por WhatsApp</span>
                       </>
                     )}
                   </motion.button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}