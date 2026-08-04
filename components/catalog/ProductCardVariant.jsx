'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Plus, Minus, ShoppingBag, ChevronDown, Flame, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/whatsapp/checkout';

export default function ProductCardVariant({ product, categoryName, settings, cardStyle }) {
  const { addItem } = useCart();
  const { theme } = settings;
  const [quantity, setQuantity] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState({});

  // Precio base del producto
  const basePrice = parseFloat(product.price) || 0;

  // Opciones del producto (formato: array de {name, choices: [{label, priceDelta}]})
  const productOptions = product.options || [];

  // Calcular precio total con opciones seleccionadas
  const calculateTotalPrice = () => {
    let total = basePrice;
    productOptions.forEach(option => {
      const selected = selectedOptions[option.name];
      if (selected) {
        const choice = option.choices?.find(c => c.label === selected);
        if (choice?.priceDelta) {
          total += choice.priceDelta;
        }
      }
    });
    return total;
  };

  const totalPrice = calculateTotalPrice();

  // Formatear opciones seleccionadas para el carrito
  const getSelectedOptionsArray = () => {
    const options = [];
    productOptions.forEach(option => {
      const selected = selectedOptions[option.name];
      if (selected) {
        const choice = option.choices?.find(c => c.label === selected);
        options.push({
          name: option.name,
          label: `${selected}${choice?.priceDelta ? ` +${formatPrice(choice.priceDelta)}` : ''}`,
          priceDelta: choice?.priceDelta || 0,
        });
      }
    });
    return options;
  };

  // Función para agregar al carrito
  const handleAddToCart = () => {
    if (quantity <= 0) {
      // Si hay opciones, abrir selector de opciones
      if (productOptions.length > 0) {
        setShowOptions(true);
        return;
      }
      // Agregar 1 directamente
      addItem(product, 1, []);
      return;
    }
    // Agregar con la cantidad actual y opciones seleccionadas
    addItem(product, quantity, getSelectedOptionsArray());
    setQuantity(0);
    setSelectedOptions({});
    setShowOptions(false);
  };

  // Función para agregar desde el selector de opciones
  const handleConfirmWithOptions = () => {
    // Verificar opciones requeridas
    const requiredMissing = productOptions.filter(
      opt => opt.is_required && !selectedOptions[opt.name]
    );
    if (requiredMissing.length > 0) {
      alert(`Por favor selecciona: ${requiredMissing.map(o => o.name).join(', ')}`);
      return;
    }
    addItem(product, 1, getSelectedOptionsArray());
    setShowOptions(false);
    setSelectedOptions({});
  };

  // Determinar si el producto tiene badge
  const badge = product.badge || (product.is_featured ? 'Popular' : null);

  // Style: compact-row
  if (cardStyle === 'compact-row') {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-3 bg-card rounded-theme-lg border border-secondary/10 p-3 relative overflow-hidden"
      >
        {/* Imagen */}
        <div className="w-16 h-16 rounded-theme-md overflow-hidden relative shrink-0 bg-secondary/5">
          {product.image_url ? (
            <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="64px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
          )}
          {!product.is_available && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold px-2 py-0.5 bg-red-500 rounded-full">AGOTADO</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-text truncate">{product.name}</h4>
          {product.description && (
            <p className="text-xs text-text/50 line-clamp-1">{product.description}</p>
          )}
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-bold" style={{ color: theme.primaryColor }}>
              {formatPrice(basePrice)}
            </span>
          </div>
        </div>

        {/* Botón agregar */}
        <div className="flex flex-col items-center gap-1">
          {quantity === 0 ? (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleAddToCart}
              disabled={!product.is_available}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md disabled:opacity-40"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <Plus className="w-4 h-4" />
            </motion.button>
          ) : (
            <div className="flex items-center gap-1.5">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setQuantity(prev => prev - 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-secondary/10"
              >
                <Minus className="w-3.5 h-3.5" />
              </motion.button>
              <span className="text-sm font-bold w-5 text-center">{quantity}</span>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setQuantity(prev => prev + 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <Plus className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          )}
          {quantity > 0 && (
            <button
              onClick={handleAddToCart}
              className="text-[10px] font-semibold"
              style={{ color: theme.primaryColor }}
            >
              Agregar
            </button>
          )}
        </div>

        {/* Badge */}
        {badge && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow"
            style={{ backgroundColor: badge === 'Popular' ? theme.accentColor : '#EF4444' }}
          >
            {badge === 'Popular' && <Flame className="w-3 h-3 inline mr-0.5" />}
            {badge}
          </span>
        )}
      </motion.div>
    );
  }

  // Style: minimal-border
  if (cardStyle === 'minimal-border') {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="bg-card rounded-theme-lg border-2 border-secondary/10 hover:border-primary/30 transition-colors overflow-hidden relative"
      >
        {/* Imagen */}
        <div className="relative h-36 w-full bg-secondary/5">
          {product.image_url ? (
            <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
          )}
          {!product.is_available && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xs font-bold px-3 py-1 bg-red-500 rounded-full">AGOTADO</span>
            </div>
          )}
          {/* Badge */}
          {badge && (
            <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-lg"
              style={{ backgroundColor: badge === 'Popular' ? theme.accentColor : '#EF4444' }}
            >
              {badge === 'Popular' && <Flame className="w-3 h-3 inline mr-0.5" />}
              {badge}
            </span>
          )}
        </div>

        {/* Contenido */}
        <div className="p-3">
          {categoryName && (
            <p className="text-[10px] uppercase tracking-wider text-text/40 mb-0.5">{categoryName}</p>
          )}
          <h4 className="font-semibold text-sm text-text leading-tight">{product.name}</h4>
          {product.description && (
            <p className="text-xs text-text/50 mt-0.5 line-clamp-2">{product.description}</p>
          )}
          <div className="flex items-center justify-between mt-2.5">
            <span className="font-bold text-sm" style={{ color: theme.primaryColor }}>
              {formatPrice(basePrice)}
            </span>
            {quantity === 0 ? (
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleAddToCart}
                disabled={!product.is_available}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-40"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            ) : (
              <div className="flex items-center gap-1.5 bg-secondary/5 rounded-full px-1.5 py-1">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setQuantity(prev => prev - 1)}
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-card shadow-sm"
                >
                  <Minus className="w-3 h-3" />
                </motion.button>
                <span className="text-sm font-bold w-5 text-center">{quantity}</span>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setQuantity(prev => prev + 1)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <Plus className="w-3 h-3" />
                </motion.button>
              </div>
            )}
          </div>
          {quantity > 0 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleAddToCart}
              className="mt-2 w-full py-1.5 rounded-theme-md text-xs font-semibold text-white"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Agregar al pedido
            </motion.button>
          )}
        </div>
      </motion.div>
    );
  }

  // Style: glassmorphic
  if (cardStyle === 'glassmorphic') {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="relative rounded-theme-xl overflow-hidden bg-card/40 backdrop-blur-xl border border-white/20 shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${theme.cardBackgroundColor}dd 0%, ${theme.cardBackgroundColor}88 100%)`,
          boxShadow: `0 8px 32px ${theme.primaryColor}22`,
        }}
      >
        {/* Imagen */}
        <div className="relative h-36 w-full">
          {product.image_url ? (
            <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-primary/20 to-accent/20">🍽️</div>
          )}
          {!product.is_available && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
              <span className="text-white text-xs font-bold px-3 py-1 bg-red-500/90 rounded-full">AGOTADO</span>
            </div>
          )}
          {/* Badge */}
          {badge && (
            <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-lg backdrop-blur"
              style={{ backgroundColor: badge === 'Popular' ? `${theme.accentColor}dd` : '#EF4444dd' }}
            >
              {badge === 'Popular' && <Flame className="w-3 h-3 inline mr-0.5" />}
              {badge}
            </span>
          )}
        </div>

        {/* Contenido */}
        <div className="p-3.5">
          <h4 className="font-semibold text-sm text-text leading-tight">{product.name}</h4>
          {product.description && (
            <p className="text-xs text-text/50 mt-0.5 line-clamp-2">{product.description}</p>
          )}
          <div className="flex items-center justify-between mt-2.5">
            <span className="font-bold text-base" style={{ color: theme.textColor }}>
              {formatPrice(basePrice)}
            </span>
            {quantity === 0 ? (
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleAddToCart}
                disabled={!product.is_available}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg disabled:opacity-40"
                style={{ backgroundColor: theme.primaryColor, boxShadow: `0 4px 15px ${theme.primaryColor}55` }}
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full px-1.5 py-1 backdrop-blur"
                style={{ backgroundColor: theme.secondaryColor + '11' }}
              >
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setQuantity(prev => prev - 1)}
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-white/40 backdrop-blur"
                >
                  <Minus className="w-3 h-3" />
                </motion.button>
                <span className="text-sm font-bold w-5 text-center text-text">{quantity}</span>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setQuantity(prev => prev + 1)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <Plus className="w-3 h-3" />
                </motion.button>
              </div>
            )}
          </div>
          {quantity > 0 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleAddToCart}
              className="mt-2.5 w-full py-2 rounded-theme-lg text-xs font-semibold text-white backdrop-blur"
              style={{ backgroundColor: theme.primaryColor, boxShadow: `0 4px 15px ${theme.primaryColor}44` }}
            >
              Agregar al pedido
            </motion.button>
          )}
        </div>
      </motion.div>
    );
  }

  // Style: modern-shadow (default)
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="bg-card rounded-theme-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden relative"
      style={{ boxShadow: `0 4px 12px ${theme.secondaryColor}15` }}
    >
      {/* Imagen */}
      <div className="relative h-36 w-full bg-secondary/5">
        {product.image_url ? (
          <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        )}
        {!product.is_available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs font-bold px-3 py-1 bg-red-500 rounded-full">AGOTADO</span>
          </div>
        )}
        {/* Badge */}
        {badge && (
          <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-lg"
            style={{ backgroundColor: badge === 'Popular' ? theme.accentColor : '#EF4444' }}
          >
            {badge === 'Popular' && <Flame className="w-3 h-3 inline mr-0.5" />}
            {badge}
          </span>
        )}
      </div>

      {/* Contenido */}
      <div className="p-3.5">
        {categoryName && (
          <p className="text-[10px] uppercase tracking-wider text-text/40 mb-0.5">{categoryName}</p>
        )}
        <h4 className="font-semibold text-sm text-text leading-tight">{product.name}</h4>
        {product.description && (
          <p className="text-xs text-text/50 mt-0.5 line-clamp-2">{product.description}</p>
        )}

        {/* Opciones quick-add si hay opciones */}
        {productOptions.length > 0 && (
          <button
            onClick={() => setShowOptions(true)}
            className="mt-2 flex items-center gap-1 text-xs text-text/60 hover:text-primary transition-colors"
          >
            <ChevronDown className="w-3 h-3" />
            Personalizar
          </button>
        )}

        <div className="flex items-center justify-between mt-2.5">
          <span className="font-bold text-sm" style={{ color: theme.primaryColor }}>
            {formatPrice(basePrice)}
          </span>
          {quantity === 0 ? (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleAddToCart}
              disabled={!product.is_available}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md disabled:opacity-40"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <Plus className="w-4 h-4" />
            </motion.button>
          ) : (
            <div className="flex items-center gap-1.5 bg-secondary/5 rounded-full px-1.5 py-1">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setQuantity(prev => prev - 1)}
                className="w-6 h-6 rounded-full flex items-center justify-center bg-card shadow-sm"
              >
                <Minus className="w-3 h-3" />
              </motion.button>
              <span className="text-sm font-bold w-5 text-center text-text">{quantity}</span>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setQuantity(prev => prev + 1)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <Plus className="w-3 h-3" />
              </motion.button>
            </div>
          )}
        </div>
        {quantity > 0 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleAddToCart}
            className="mt-2.5 w-full py-2 rounded-theme-lg text-xs font-semibold text-white shadow-md"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <ShoppingBag className="w-3.5 h-3.5 inline mr-1" />
            Agregar al pedido
          </motion.button>
        )}
      </div>

      {/* Modal de opciones */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-end bg-black/50 backdrop-blur-sm"
            onClick={() => setShowOptions(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full bg-card rounded-t-theme-xl p-4 pb-6 max-h-[80%] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-text">Personalizar: {product.name}</h4>
                <button
                  onClick={() => setShowOptions(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary/10 hover:bg-secondary/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Opciones del producto */}
              {productOptions.map((option) => (
                <div key={option.name} className="mb-4">
                  <p className="text-sm font-semibold text-text mb-2">
                    {option.name}
                    {option.is_required && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {option.choices?.map((choice) => {
                      const isSelected = selectedOptions[option.name] === choice.label;
                      return (
                        <button
                          key={choice.label}
                          onClick={() => setSelectedOptions(prev => ({
                            ...prev,
                            [option.name]: isSelected ? undefined : choice.label,
                          }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                            isSelected
                              ? 'text-white border-transparent'
                              : 'border-secondary/20 text-text/70'
                          }`}
                          style={isSelected ? { backgroundColor: theme.primaryColor } : {}}
                        >
                          {choice.label}
                          {choice.priceDelta > 0 && (
                            <span className="ml-1 opacity-80">+{formatPrice(choice.priceDelta)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Total y confirmar */}
              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-text/50">Precio total</p>
                  <p className="font-bold text-lg" style={{ color: theme.primaryColor }}>
                    {formatPrice(totalPrice)}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleConfirmWithOptions}
                  className="flex-1 max-w-[200px] py-3 rounded-theme-lg text-sm font-bold text-white shadow-lg"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <ShoppingBag className="w-4 h-4 inline mr-1.5" />
                  Agregar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}