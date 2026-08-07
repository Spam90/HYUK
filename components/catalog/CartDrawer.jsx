'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, Plus, Minus, Trash2, MessageCircle, MapPin, User, CreditCard, Bike, Store } from 'lucide-react';
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

  // Generar enlace de WhatsApp
  const handleWhatsAppCheckout = () => {
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
    
    // Limpiar carrito después de un momento
    setTimeout(() => {
      clearCart();
      closeCart();
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 inset-y-0 z-50 w-full max-w-md bg-card shadow-2xl flex flex-col"
          >
            {/* Header del drawer */}
            <div className="p-4 border-b border-secondary/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-10 h-10 rounded-theme-md flex items-center justify-center text-white"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text">Tu Pedido</h3>
                  <p className="text-xs text-text/50">
                    {cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeCart}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary/10 hover:bg-secondary/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del carrito */}
            {cartItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="text-6xl mb-4">🛒</div>
                <h4 className="text-lg font-semibold text-text">Tu carrito está vacío</h4>
                <p className="text-sm text-text/50 mt-1">
                  Agrega productos de nuestro catálogo para hacer tu pedido
                </p>
                <button
                  onClick={closeCart}
                  className="mt-6 px-6 py-3 rounded-theme-lg text-white font-semibold shadow-lg transition-transform active:scale-95"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Ver catálogo
                </button>
              </div>
            ) : (
              <>
                {/* Lista de items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {cartItems.map((item) => (
                    <motion.div
                      key={item.key}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 50 }}
                      className="flex gap-3 bg-background rounded-theme-lg p-3 border border-secondary/5"
                    >
                      {/* Imagen */}
                      <div className="w-16 h-16 rounded-theme-md overflow-hidden relative shrink-0 bg-secondary/5">
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="64px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                        )}
                      </div>

                      {/* Info del item */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="text-sm font-semibold text-text leading-tight">{item.name}</h5>
                            {item.selectedOptions?.length > 0 && (
                              <div className="mt-0.5 space-y-0.5">
                                {item.selectedOptions.map((opt, idx) => (
                                  <p key={idx} className="text-xs text-text/50">
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
                            className="text-text/30 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Controles de cantidad */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => updateQuantity(item.key, item.quantity - 1)}
                              className="w-7 h-7 rounded-full flex items-center justify-center bg-secondary/10 hover:bg-secondary/20 transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </motion.button>
                            <span className="text-sm font-bold text-text w-6 text-center">
                              {item.quantity}
                            </span>
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => updateQuantity(item.key, item.quantity + 1)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white"
                              style={{ backgroundColor: theme.primaryColor }}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </motion.button>
                          </div>
                          <p className="text-sm font-bold text-text">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Botón limpiar */}
                  <button
                    onClick={clearCart}
                    className="w-full py-2 text-xs text-text/40 hover:text-red-500 transition-colors text-center"
                  >
                    Vaciar carrito
                  </button>
                </div>

                {/* Formulario de checkout */}
                <div className="border-t border-secondary/10 p-4 space-y-3 bg-background/50">
                  {/* Nombre del cliente */}
                  {checkoutConfig.requireClientName && (
                    <div className="flex items-center gap-2 bg-card rounded-theme-lg p-3 border border-secondary/5">
                      <User className="w-4 h-4 text-text/40 shrink-0" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Tu nombre *"
                        className="flex-1 bg-transparent text-sm text-text placeholder:text-text/30 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Método de entrega */}
                  {checkoutConfig.deliveryMethods?.length > 0 && (
                    <div className="bg-card rounded-theme-lg p-3 border border-secondary/5">
                      <p className="text-xs font-semibold text-text/60 mb-2 flex items-center gap-1.5">
                        <Bike className="w-3.5 h-3.5" />
                        Tipo de entrega
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {checkoutConfig.deliveryMethods.map((method) => {
                          const isSelected = deliveryMethod === method;
                          return (
                            <button
                              key={method}
                              onClick={() => setDeliveryMethod(method)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                                isSelected
                                  ? 'text-white border-transparent'
                                  : 'border-secondary/15 text-text/60'
                              }`}
                              style={isSelected ? { backgroundColor: theme.primaryColor } : {}}
                            >
                              {method.includes('domicilio') || method.includes('Domicilio') ? (
                                <Bike className="w-3 h-3" />
                              ) : (
                                <Store className="w-3 h-3" />
                              )}
                              {method}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Dirección */}
                  {checkoutConfig.askForAddress && (
                    <div className="flex items-center gap-2 bg-card rounded-theme-lg p-3 border border-secondary/5">
                      <MapPin className="w-4 h-4 text-text/40 shrink-0" />
                      <input
                        type="text"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Dirección de entrega *"
                        className="flex-1 bg-transparent text-sm text-text placeholder:text-text/30 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Método de pago */}
                  {checkoutConfig.askForPaymentMethod && (
                    <div className="bg-card rounded-theme-lg p-3 border border-secondary/5">
                      <p className="text-xs font-semibold text-text/60 mb-2 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" />
                        Método de pago
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {checkoutConfig.paymentOptions?.map((method) => {
                          const isSelected = paymentMethod === method;
                          return (
                            <button
                              key={method}
                              onClick={() => setPaymentMethod(method)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                                isSelected
                                  ? 'text-white border-transparent'
                                  : 'border-secondary/15 text-text/60'
                              }`}
                              style={isSelected ? { backgroundColor: theme.primaryColor } : {}}
                            >
                              {method}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Total y botón de confirmación */}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <p className="text-xs text-text/50">Total del pedido</p>
                      <p className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
                        {formatPrice(cartTotal)}
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleWhatsAppCheckout}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-5 py-3.5 rounded-theme-lg text-sm font-bold text-white shadow-lg disabled:opacity-60"
                      style={{ 
                        backgroundColor: '#25D366',
                        boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)',
                      }}
                    >
                      {isSubmitting ? (
                        <span className="animate-pulse">Procesando...</span>
                      ) : (
                        <>
                          <MessageCircle className="w-5 h-5" />
                          Pedir por WhatsApp
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}