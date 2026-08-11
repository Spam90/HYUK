'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Palette, ExternalLink, MessageCircle, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ThemeProvider from '@/components/theme/ThemeProvider';
import { CartProvider } from '@/context/CartContext';
import { DEFAULT_SETTINGS } from '@/lib/theme/defaults';
import CatalogView from '@/app/[slug]/CatalogView';

export const dynamic = 'force-dynamic';

export default function DemoPage() {
  const [showBanner, setShowBanner] = useState(true);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Floating Demo Banner - Tiendanube Style */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg"
          >
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      Estás viendo una demo en vivo de HYUK
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push('/signup')}
                    className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-white text-emerald-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors shrink-0"
                  >
                    <Palette className="w-4 h-4" />
                    Probar a personalizar esta tienda
                  </button>
                  <button
                    onClick={() => setShowBanner(false)}
                    className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile CTA Button (visible when banner is closed) */}
      {!showBanner && (
        <div className="fixed top-4 left-4 right-4 z-40 sm:hidden">
          <button
            onClick={() => router.push('/signup')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl shadow-lg font-medium shadow-emerald-500/30"
          >
            <Palette className="w-4 h-4" />
            Personalizar esta tienda
          </button>
        </div>
      )}

      {/* Catalog Content */}
      <div className={showBanner ? 'pt-16' : ''}>
        <ThemeProvider initialSettings={DEFAULT_SETTINGS}>
          <CartProvider>
            <CatalogView />
          </CartProvider>
        </ThemeProvider>
      </div>
    </div>
  );
}