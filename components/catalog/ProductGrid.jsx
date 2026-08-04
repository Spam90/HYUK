'use client';

import { motion, AnimatePresence } from 'framer-motion';
import ProductCardVariant from './ProductCardVariant';

export default function ProductGrid({ products, settings, categories }) {
  const { productGrid } = settings.layout;
  const { productCardStyle } = settings.layout;

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

  // Determinar clases del grid según la configuración
  const getGridClasses = () => {
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
  };

  // Container classes for horizontal scroll
  const isHorizontal = productGrid === 'horizontal-scroll';

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
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}