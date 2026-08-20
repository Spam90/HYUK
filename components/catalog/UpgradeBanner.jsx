'use client';

import { motion } from 'framer-motion';
import { Zap, Crown } from 'lucide-react';

/**
 * UpgradeBanner - Barra de upsell visible cuando un usuario FREE supera el
 * límite de productos visibles. Se muestra arriba de la grilla del catálogo.
 */
export default function UpgradeBanner({ visible = 0, total = 0, onUpgradeClick }) {
  const hidden = total - visible;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 px-4 py-3.5"
    >
      <div className="flex items-center gap-3 text-amber-900 dark:text-amber-200">
        <div className="flex shrink-0 items-center justify-center w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40">
          <Zap className="w-5 h-5 text-amber-500 dark:text-amber-300" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">
            Estás en el plan <span className="font-bold">Free</span>: se muestran {visible} de {total} productos.
          </p>
          <p className="text-xs opacity-80 mt-0.5">{hidden} productos más están ocultos. Desbloquéalos pasando a Pro.</p>
        </div>
        <button
          type="button"
          onClick={onUpgradeClick}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold shadow-lg hover:scale-[1.03] transition-transform focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <Crown className="w-4 h-4" />
          Pasar a Pro
        </button>
      </div>
    </motion.div>
  );
}
