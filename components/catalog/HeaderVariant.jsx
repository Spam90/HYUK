'use client';

import { motion } from 'framer-motion';
import { Store, MapPin, Phone, Clock, ChevronDown } from 'lucide-react';

export default function HeaderVariant({ 
  store, 
  settings, 
  style = 'banner-large' 
}) {
  const { theme, banner } = settings;

  const headerStyles = {
    'minimal': {
      container: 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-zinc-800/50',
      content: 'max-w-7xl mx-auto px-4 py-4',
    },
    'banner-large': {
      container: 'relative overflow-hidden',
      content: 'relative z-10 max-w-7xl mx-auto px-4 py-8',
    },
    'centered-logo': {
      container: 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-zinc-800/50',
      content: 'max-w-7xl mx-auto px-4 py-6 text-center',
    },
    'floating-card': {
      container: 'relative px-4 pt-8',
      content: 'max-w-7xl mx-auto',
    }
  };

  const currentStyle = headerStyles[style] || headerStyles['banner-large'];

  return (
    <header className={currentStyle.container}>
      {/* Background Banner with Gradient Overlay */}
      {style === 'banner-large' && banner?.imageUrl && (
        <div className="absolute inset-0">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${banner.imageUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        </div>
      )}

      {/* Content */}
      <div className={currentStyle.content}>
        {/* Minimal Style */}
        {style === 'minimal' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                style={{ 
                  backgroundColor: theme.primaryColor,
                  boxShadow: `0 4px 12px ${theme.primaryColor}40`
                }}
              >
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {store?.business_name || store?.store_name || 'Mi Tienda'}
                </h1>
                {store?.tagline && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {store.tagline}
                  </p>
                )}
              </div>
            </div>

            {store?.phone_whatsapp && (
              <a
                href={`https://wa.me/${store.phone_whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all"
              >
                <Phone className="w-4 h-4" />
                Contactar
              </a>
            )}
          </div>
        )}

        {/* Banner Large Style */}
        {style === 'banner-large' && (
          <div className="text-center text-white">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block mb-4"
            >
              <div 
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-2xl mx-auto"
                style={{ 
                  backgroundColor: theme.primaryColor,
                  boxShadow: `0 8px 24px ${theme.primaryColor}60`
                }}
              >
                <Store className="w-10 h-10" />
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl font-bold mb-2 tracking-tight"
            >
              {store?.business_name || store?.store_name || 'Mi Tienda'}
            </motion.h1>

            {store?.tagline && (
              <motion.p
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-white/90 mb-4"
              >
                {store.tagline}
              </motion.p>
            )}

            {banner?.announcementText && banner?.showAnnouncementBar && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-sm font-medium"
              >
                <span>{banner.announcementText}</span>
              </motion.div>
            )}
          </div>
        )}

        {/* Centered Logo Style */}
        {style === 'centered-logo' && (
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-3"
            >
              <div 
                className="w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-xl"
                style={{ 
                  backgroundColor: theme.primaryColor,
                  boxShadow: `0 8px 24px ${theme.primaryColor}40`
                }}
              >
                <Store className="w-8 h-8" />
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold text-gray-900 dark:text-white mb-1"
            >
              {store?.business_name || store?.store_name || 'Mi Tienda'}
            </motion.h1>

            {store?.tagline && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-gray-600 dark:text-gray-400"
              >
                {store.tagline}
              </motion.p>
            )}
          </div>
        )}

        {/* Floating Card Style */}
        {style === 'floating-card' && (
          <div className="flex justify-center -mt-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-4 px-6 py-4 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20"
            >
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                style={{ 
                  backgroundColor: theme.primaryColor,
                  boxShadow: `0 4px 12px ${theme.primaryColor}40`
                }}
              >
                <Store className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {store?.business_name || store?.store_name || 'Mi Tienda'}
                </h1>
                {store?.tagline && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {store.tagline}
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </header>
  );
}