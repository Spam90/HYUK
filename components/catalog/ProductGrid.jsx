'use client';

import { motion, AnimatePresence } from 'framer-motion';
import ProductCardVariant from './ProductCardVariant';

export default function ProductGrid({ products, settings, categories, onProductClick, lockedExtra = 0, onUpgradeClick }) {
  const { layout } = settings;
  const { productGrid, productCardStyle, layoutType } = layout;

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-4">🍽️</div>
        <h3 className="text-lg font-semibold text-text/80">Sin productos disponibles</h3>
        <p className="text-sm text-text/50 mt-1">
          Pronto tendremos nuevos productos para ti
        </p>
      </div>
    );
  }

  // Función para obtener el nombre de categoría
  const getCategoryName = (categoryId) => {
    if (!categories) return '';
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || '';
  };

  // Determinar clases del grid según layoutType (con fallback a productGrid)
  const getGridClasses = () => {
    switch (layoutType) {
      case 'grid_modern':
        return 'grid grid-cols-2 gap-3';
      case 'list_compact':
        return 'flex flex-col gap-3';
      case 'menu_card':
        return 'grid grid-cols-1 gap-4';
      default:
        switch (productGrid) {
          case 'list':
            return 'flex flex-col gap-3';
          case 'grid-2-col':
            return 'grid grid-cols-2 gap-3';
          case 'grid-3-col':
            return 'grid grid-cols-2 md:grid-cols-3 gap-3';
          case 'cards-large':
            return 'grid grid-cols-1 gap-4';
          case 'horizontal-scroll':
            return 'flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory no-scrollbar';
          default:
            return 'grid grid-cols-2 gap-3';
        }
    }
  };

  // Container classes for horizontal scroll
  const isHorizontal = productGrid === 'horizontal-scroll' && layoutType !== 'list_compact';

  return (
    <div className={getGridClasses()}>
      <AnimatePresence mode="popLayout">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ 
              duration: 0.3, 
              delay: isHorizontal ? 0 : Math.min(index * 0.05, 0.3),
            }}
            className={isHorizontal ? 'snap-start shrink-0 w-64' : ''}
          >
            <ProductCardVariant
              product={product}
              categoryName={getCategoryName(product.category_id)}
              settings={settings}
              cardStyle={productCardStyle}
              onProductClick={onProductClick}
            />
          </motion.div>
        ))}
            </AnimatePresence>
      {lockedExtra > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={isHorizontal ? 'snap-start shrink-0 w-64' : ''}
        >
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg shadow-black/5 border-2 border-dashed border-amber-200 dark:border-amber-900/40 p-6 flex flex-col items-center justify-center text-center h-full min-h-[180px]">
            <Lock className="w-8 h-8 text-amber-400 mb-2" />
            <p className="font-semibold text-amber-900 dark:text-amber-200">+{lockedExtra} productos ocultos</p>
            <p className="text-xs text-text/50 mt-1">Pasá a Pro para verlos todos</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onUpgradeClick}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold shadow hover:bg-amber-600 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              Desbloquear
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}