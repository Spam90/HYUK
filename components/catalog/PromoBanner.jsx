'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Percent } from 'lucide-react';

/**
 * Banners promocionales y popups del catálogo público.
 * - Barra de anuncio superior (color primario de la tienda)
 * - Popup modal promocional (una vez por sesión)
 */
export default function PromoBanner({ settings, storeId }) {
  const marketing = settings?.marketing || {};
  const theme = settings?.theme || {};
  const [showPopup, setShowPopup] = useState(false);

  // Mostrar banner superior (desde marketing o fallback al banner clásico)
  const announcementText =
    marketing.announcementText || settings?.banner?.announcementText || '';
  const showAnnouncementBar =
    (marketing.showAnnouncementBar ?? settings?.banner?.showAnnouncementBar) &&
    announcementText;

  // Popup promocional: aparece una sola vez por sesión
  useEffect(() => {
    if (!marketing.showPopup) return;

    // No repetir si ya se mostró en esta sesión
    const key = `hyuk_popup_shown_${storeId || 'demo'}`;
    if (sessionStorage.getItem(key)) return;

    // Esperar 1.5s para no interrumpir la carga
    const timer = setTimeout(() => {
      setShowPopup(true);
      sessionStorage.setItem(key, '1');
    }, 1500);

    return () => clearTimeout(timer);
  }, [marketing.showPopup, storeId]);

  return (
    <>
      {/* Banner superior */}
      {showAnnouncementBar && (
        <div
          className="text-center text-white text-sm py-2 px-4 font-medium relative z-20"
          style={{ backgroundColor: theme.primaryColor || '#10B981' }}
        >
          <span className="inline-block">{announcementText}</span>
        </div>
      )}

      {/* Popup promocional */}
      <AnimatePresence>
        {showPopup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              onClick={() => setShowPopup(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 30 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-6 pointer-events-none"
            >
              <motion.div
                className="pointer-events-auto w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden"
                style={{ boxShadow: `0 24px 64px ${theme.primaryColor || '#10B981'}40` }}
              >
                {/* Cabecera con gradiente del tema */}
                <div
                  className="relative p-8 text-white text-center"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primaryColor || '#10B981'}, ${theme.accentColor || '#F59E0B'})`,
                  }}
                >
                  <button
                    onClick={() => setShowPopup(false)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                  <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
                    <Gift className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold leading-snug">
                    {marketing.popupTitle || '🎁 ¡Bienvenido a nuestra tienda!'}
                  </h3>
                </div>

                {/* Cuerpo */}
                <div className="p-6 text-center">
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    {marketing.popupText ||
                      'Obtén un descuento especial en tu primer pedido.'}
                  </p>
                  <button
                    onClick={() => setShowPopup(false)}
                    className="mt-6 w-full py-3.5 rounded-2xl text-white font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
                    style={{
                      backgroundColor: theme.primaryColor || '#10B981',
                      boxShadow: `0 8px 24px ${theme.primaryColor || '#10B981'}40`,
                    }}
                  >
                    {marketing.popupButtonLabel || '¡Comenzar!'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}