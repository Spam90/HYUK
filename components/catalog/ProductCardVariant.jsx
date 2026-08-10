'use client';

import { motion } from 'framer-motion';
import { Plus, Star, Flame, Tag, Check } from 'lucide-react';
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
          text: 'Más Vendido'
        };
      case 'nuevo':
        return {
          icon: Star,
          gradient: 'from-blue-500 to-cyan-500',
          text: 'Nuevo'
        };
      case 'descuento':
      case 'oferta':
        return {
          icon: Tag,
          gradient: 'from-green-500 to-emerald-500',
          text: 'Oferta'
        };
      default:
        return null;
    }
  };

  const badgeConfig = getBadgeConfig(product.badge);

  const cardStyles = {
    'modern-shadow': {
      container: 'bg-white dark:bg-zinc-800 rounded-2xl shadow-lg hover:shadow-2xl',
      image: 'rounded-t-2xl',
      content: 'p-4'
    },
    'glassmorphic': {
      container: 'bg-white/70 dark:bg-zinc-800/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl',
      image: 'rounded-t-2xl',
      content: 'p-4'
    },
    'minimal-border': {
      container: 'bg-white dark:bg-zinc-800 rounded-2xl border-2 border-gray-100 dark:border-zinc-700 hover:border-gray-200',
      image: 'rounded-t-2xl',
      content: 'p-4'
    },
    'compact-row': {
      container: 'bg-white dark:bg-zinc-800 rounded-xl shadow-md hover:shadow-lg',
      image: 'rounded-l-xl',
      content: 'p-3'
    }
  };

  const currentStyle = cardStyles[style] || cardStyles['modern-shadow'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`
        group relative overflow-hidden
        ${currentStyle.container}
        transition-all duration-300
      `}
    >
      {/* Badge */}
      {badgeConfig && (
        <div className="absolute top-3 left-3 z-10">
          <div className={`
            flex items-center gap-1 px-2.5 py-1 rounded-full
            bg-gradient-to-r ${badgeConfig.gradient}
            text-white text-[10px] font-bold uppercase tracking-wide
            shadow-lg backdrop-blur-sm
          `}>
            <badgeConfig.icon className="w-3 h-3" />
            {badgeConfig.text}
          </div>
        </div>
      )}

      {/* Out of Stock Overlay */}
      {!product.is_available && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="bg-white/90 dark:bg-zinc-800/90 px-4 py-2 rounded-full">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Agotado</p>
          </div>
        </div>
      )}

      {/* Image Container */}
      <div className={`
        relative overflow-hidden
        ${style === 'compact-row' ? 'w-24 h-24' : 'w-full aspect-square'}
        ${currentStyle.image}
        bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-700 dark:to-zinc-800
      `}>
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🍽️
          </div>
        )}

        {/* Hover Overlay */}
        {product.is_available && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
        )}

        {/* Quick Add Button */}
        {product.is_available && onAddToCart && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onAddToCart(product)}
            className="
              absolute bottom-2 right-2 z-10
              w-10 h-10 rounded-full
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

      {/* Content */}
      <div className={currentStyle.content}>
        {/* Product Name */}
        <h3 
          className="font-semibold text-sm mb-1 line-clamp-2 leading-tight"
          style={{ color: theme.textColor }}
        >
          {product.name}
        </h3>

        {/* Description */}
        {product.description && style !== 'compact-row' && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Price and Action */}
        <div className="flex items-center justify-between mt-2">
          <div>
            <p 
              className="text-lg font-bold"
              style={{ color: theme.primaryColor }}
            >
              ${parseFloat(product.price).toFixed(2)}
            </p>
          </div>

          {/* Add to Cart Button (Compact Row Style) */}
          {style === 'compact-row' && product.is_available && onAddToCart && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onAddToCart(product)}
              className="
                w-8 h-8 rounded-lg
                flex items-center justify-center
                text-white shadow-md
                transition-all duration-200
                hover:shadow-lg
              "
              style={{ backgroundColor: theme.primaryColor }}
            >
              <Plus className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        {/* Options Preview */}
        {product.options && product.options.length > 0 && style !== 'compact-row' && (
          <div className="flex flex-wrap gap-1.5 mt-3">
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
      </div>

      {/* Shimmer Effect on Hover */}
      <div 
        className="
          absolute inset-0 opacity-0 group-hover:opacity-100
          pointer-events-none transition-opacity duration-500
          bg-gradient-to-r from-transparent via-white/10 to-transparent
          -translate-x-full group-hover:translate-x-full
          transition-transform duration-1000
        "
      />
    </motion.div>
  );
}