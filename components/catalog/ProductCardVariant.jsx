'use client';

import { motion } from 'framer-motion';
import { Star, Flame, Tag, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function ProductCardVariant({ 
  product, 
  style = 'modern-shadow', 
  onAddToCart,
  settings 
}) {
  const { theme } = settings;
  const layoutType = settings.layout?.layoutType || 'grid_modern';

  // Modos de layout
  const isListCompact = layoutType === 'list_compact';
  const isMenuCard = layoutType === 'menu_card';

  // Aplicar clases según el estilo de tarjeta seleccionado
  const getCardClasses = () => {
    if (isMenuCard) {
      return 'bg-white dark:bg-zinc-800 rounded-2xl shadow-lg shadow-black/5 flex flex-row items-stretch overflow-hidden';
    }
    if (isListCompact) {
      return 'bg-white dark:bg-zinc-800 rounded-xl shadow-sm flex-row items-center gap-3';
    }
    switch (style) {
      case 'minimalist':
        return 'bg-transparent shadow-none border-0';
      case 'modern-shadow':
        return 'bg-white dark:bg-zinc-800 rounded-2xl shadow-lg shadow-black/5';
      case 'compact-row':
        return 'bg-white dark:bg-zinc-800 rounded-xl shadow-sm flex-row items-center gap-3';
      case 'glassmorphic':
        return 'backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl';
      default:
        return 'bg-white dark:bg-zinc-800 rounded-2xl shadow-lg shadow-black/5';
    }
  };

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

  // Oferta relámpago con cuenta regresiva en tiempo real
  const [flashRemaining, setFlashRemaining] = useState(null);
  useEffect(() => {
    if (!product.flash_sale_end) {
      setFlashRemaining(null);
      return;
    }
    const endTime = new Date(product.flash_sale_end).getTime();
    const tick = () => {
      const diff = endTime - Date.now();
      if (diff <= 0) {
        setFlashRemaining(null);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setFlashRemaining(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [product.flash_sale_end]);

  // Precio de la oferta relámpago (si existe precio especial vigente)
  const isFlashActive = !!flashRemaining && parseFloat(product.flash_sale_price) > 0;
  const displayPrice = isFlashActive ? parseFloat(product.flash_sale_price) : finalPrice;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`group relative transition-all duration-300 overflow-hidden ${getCardClasses()}`}
    >
      {/* Image Container */}
      <div className={`relative overflow-hidden bg-gray-50 dark:bg-zinc-700 ${isListCompact ? 'w-20 h-20 rounded-xl shrink-0' : isMenuCard ? 'w-28 sm:w-32 shrink-0 self-stretch' : 'aspect-square'}`}>
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🍽️
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
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isListCompact ? 'p-3' : 'p-4'}`}>
        <div className={`${isMenuCard || isListCompact ? 'flex items-start justify-between gap-3' : ''}`}>
          <div className="min-w-0">
            {/* Badge + Name */}
            <div className="flex items-center gap-2 mb-1">
              {badgeConfig && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r ${badgeConfig.gradient} text-white text-[10px] font-bold uppercase tracking-wide shadow`}>
                  <badgeConfig.icon className="w-3 h-3" />
                  {badgeConfig.text}
                </span>
              )}
              <h3 className="font-semibold text-sm leading-tight text-gray-900 dark:text-white line-clamp-2">
                {product.name}
              </h3>
            </div>

            {/* Description - mostramos solo en menu_card y grid_modern */}
            {(isMenuCard) && product.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed mt-1">
                {product.description}
              </p>
            )}
          </div>

          {/* Price Block */}
          <div className={`flex shrink-0 ${isListCompact ? 'flex-col items-end' : isMenuCard ? 'flex-col items-end gap-0.5' : 'items-baseline gap-2'}`}>
            {isFlashActive && (
              <span className="text-xs text-zinc-400 line-through">
                ${finalPrice.toFixed(2)}
              </span>
            )}
            {!isFlashActive && originalPrice && (
              <span className="text-xs text-zinc-400 line-through">
                ${originalPrice.toFixed(2)}
              </span>
            )}
            <span 
              className={`font-bold ${isListCompact ? 'text-sm' : 'text-base'}`}
              style={{ color: isFlashActive ? '#dc2626' : theme.primaryColor }}
            >
              ${displayPrice.toFixed(2)}
            </span>
          </div>

          {/* Cuenta regresiva de oferta relámpago */}
          {flashRemaining && (
            <span className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-md bg-red-600 text-white text-[11px] font-bold w-fit shadow">
              <Flame className="w-3.5 h-3.5" />
              🔥 {flashRemaining} restantes
            </span>
          )}
        </div>

        {/* Options Preview */}
        {product.options && product.options.length > 0 && !isListCompact && (
          <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
            {product.options.slice(0, 3).map((option, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded-lg text-[10px] font-medium bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300"
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
              flex items-center justify-center gap-2
              text-white text-sm font-semibold
              shadow-md hover:shadow-lg
              transition-all duration-200
              rounded-xl
            "
            style={{ 
              backgroundColor: theme.primaryColor,
              boxShadow: `0 2px 8px ${theme.primaryColor}40`,
              padding: isListCompact ? '0.375rem 0.75rem' : '0.625rem 1rem',
              width: isListCompact ? 'auto' : '100%',
              marginTop: isListCompact ? '0.5rem' : '0.75rem',
              fontSize: isListCompact ? '0.75rem' : '0.875rem'
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