'use client';

import { motion } from 'framer-motion';
import { Plus, Star, Flame, Tag, Check, ShoppingBag } from 'lucide-react';
import Image from 'next/image';

export default function ProductCardVariant({ 
  product, 
  style = 'modern-shadow', 
  onAddToCart,
  settings 
}) {
  const { theme } = settings;

  const getBadgeConfig = (badge) => {
    switch (badge?.toLowerCase()) {
      case 'popular':
      case 'más vendido':
        return {
          icon: Flame,
          gradient: 'from-orange-500 to-red-500',
          text: 'POPULAR'
        };
      case 'nuevo':
        return {
          icon: Star,
          gradient: 'from-blue-500 to-cyan-500',
          text: 'NUEVO'
        };
      case 'descuento':
      case 'oferta':
        return {
          icon: Tag,
          gradient: 'from-green-500 to-emerald-500',
          text: '-20%'
        };
      default:
        return null;
    }
  };

  const badgeConfig = getBadgeConfig(product.badge);

  // Calculate discount price (for demo, assume 20% discount if badge is "descuento")
  const hasDiscount = product.badge?.toLowerCase() === 'descuento' || product.badge?.toLowerCase() === 'oferta';
  const originalPrice = hasDiscount ? parseFloat(product.price) * 1.2 : null;
  const finalPrice = parseFloat(product.price);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="group relative bg-white dark:bg-zinc-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
    >
      {/* Image Container - Tiendanube Style */}
      <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-zinc-700">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            🍽️
          </div>
        )}

        {/* Badge - Top Left Corner */}
        {badgeConfig && (
          <div className="absolute top-3 left-3 z-10">
            <div className={`
              flex items-center gap-1 px-2.5 py-1 rounded-md
              bg-gradient-to-r ${badgeConfig.gradient}
              text-white text-xs font-bold uppercase tracking-wide
              shadow-lg backdrop-blur-sm
            `}>
              <badgeConfig.icon className="w-3 h-3" />
              {badgeConfig.text}
            </div>
          </div>
        )}

        {/* Out of Stock Overlay */}
        {!product.is_available && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="bg-white/90 dark:bg-zinc-800/90 px-4 py-2 rounded-full">
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Agotado</p>
            </div>
          </div>
        )}

        {/* Quick Add Button - Bottom Right */}
        {product.is_available && onAddToCart && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onAddToCart(product)}
            className="
              absolute bottom-3 right-3 z-10
              w-11 h-11 rounded-full
              flex items-center justify-center
              text-white shadow-xl
              transition-all duration-300
              opacity-0 group-hover:opacity-100
            "
            style={{ 
              backgroundColor: theme.primaryColor,
              boxShadow: `0 4px 12px ${theme.primaryColor}40`
            }}
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        )}
      </div>

      {/* Content - Tiendanube Style */}
      <div className="p-4">
        {/* Product Name */}
        <h3 
          className="font-semibold text-sm mb-1 line-clamp-2 leading-tight text-gray-900 dark:text-white"
        >
          {product.name}
        </h3>

        {/* Description */}
        {product.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Price Block */}
        <div className="flex items-center gap-2 mb-3">
          {/* Original Price with strikethrough */}
          {originalPrice && (
            <span className="text-xs text-zinc-400 line-through">
              ${originalPrice.toFixed(2)}
            </span>
          )}
          {/* Final Price */}
          <span 
            className="text-base font-bold"
            style={{ color: theme.primaryColor }}
          >
            ${finalPrice.toFixed(2)}
          </span>
        </div>

        {/* Options Preview */}
        {product.options && product.options.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {product.options.slice(0, 3).map((option, idx) => (
              <span
                key={idx}
                className="
                  px-2 py-1 rounded-lg
                  text-[10px] font-medium
                  bg-gray-100 dark:bg-zinc-700
                  text-gray-600 dark:text-gray-300
                "
              >
                {option.label}
              </span>
            ))}
            {product.options.length > 3 && (
              <span className="px-2 py-1 rounded-lg text-[10px] font-medium bg-gray-100 dark:bg-zinc-700 text-gray-500">
                +{product.options.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Add to Cart Button - Mobile Always Visible */}
        {product.is_available && onAddToCart && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onAddToCart(product)}
            className="
              w-full py-2.5 rounded-xl
              flex items-center justify-center gap-2
              text-white text-sm font-semibold
              shadow-md hover:shadow-lg
              transition-all duration-200
              md:hidden
            "
            style={{ 
              backgroundColor: theme.primaryColor,
              boxShadow: `0 2px 8px ${theme.primaryColor}40`
            }}
          >
            <ShoppingBag className="w-4 h-4" />
            Agregar
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}