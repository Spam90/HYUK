'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Store, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function HeaderVariant({ store, settings, onCartClick }) {
  const { layout, banner, theme } = settings;
  const { headerStyle } = layout;
  const { cartCount, openCart } = useCart();
  const handleCartClick = onCartClick || openCart;

  // Datos de la tienda con fallbacks
  const storeName = store?.store_name || store?.full_name || 'Mi Tienda';
  const logoUrl = store?.logo_url || banner?.imageUrl || '';
  const tagline = banner?.tagline || '';

  // Función para renderizar el badge del carrito
  const CartBadge = ({ showText = true }) => (
    <button
      onClick={handleCartClick}
      className="relative flex items-center gap-2 px-4 py-2 rounded-theme-md font-semibold transition-all active:scale-95"
      style={{
        backgroundColor: theme.primaryColor,
        color: '#FFFFFF',
      }}
    >
      <ShoppingBag className="w-5 h-5" />
      {showText && <span>Pedir</span>}
      {cartCount > 0 && (
        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent text-white text-xs flex items-center justify-center font-bold shadow-lg">
          {cartCount}
        </span>
      )}
    </button>
  );

  // Estilo: Minimal
  if (headerStyle === 'minimal') {
    return (
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-40 backdrop-blur-lg bg-background/80 border-b border-secondary/10"
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <div className="w-10 h-10 rounded-theme-md overflow-hidden relative">
                <Image 
                  src={logoUrl} 
                  alt={storeName} 
                  fill 
                  className="object-cover" 
                  sizes="40px" 
                />
              </div>
            ) : (
              <div 
                className="w-10 h-10 rounded-theme-md flex items-center justify-center"
                style={{ backgroundColor: theme.primaryColor, color: '#fff' }}
              >
                <Store className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-text leading-tight">{storeName}</h1>
              <p className="text-xs text-text/60 truncate max-w-[180px]">{tagline}</p>
            </div>
          </div>
          <CartBadge />
        </div>
      </motion.header>
    );
  }

  // Estilo: Banner Grande
  if (headerStyle === 'banner-large') {
    return (
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        {/* Banner de fondo */}
        <div className="relative h-48 md:h-64 w-full overflow-hidden">
          {banner?.imageUrl ? (
            <Image
              src={banner.imageUrl}
              alt={storeName}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          ) : (
            <div 
              className="w-full h-full absolute inset-0"
              style={{
                backgroundColor: theme.secondaryColor,
                backgroundImage: `radial-gradient(circle at 20% 50%, ${theme.primaryColor}44 0%, transparent 50%), radial-gradient(circle at 80% 80%, ${theme.accentColor}33 0%, transparent 50%)`,
              }}
            />
          )}
          {/* Overlay para legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 via-secondary/30 to-transparent" />
        </div>

        {/* Contenido del header */}
        <div className="max-w-3xl mx-auto px-4 relative">
          <div className="flex items-end justify-between -mt-16 relative z-10">
            <div className="flex items-end gap-4">
              {/* Logo */}
              {logoUrl ? (
                <div className="w-24 h-24 rounded-theme-lg overflow-hidden border-4 border-card bg-card shadow-xl relative shrink-0">
                  <Image 
                    src={logoUrl} 
                    alt={storeName} 
                    fill 
                    className="object-cover" 
                    sizes="96px" 
                  />
                </div>
              ) : (
                <div 
                  className="w-24 h-24 rounded-theme-lg border-4 border-card shadow-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: theme.primaryColor, color: '#fff' }}
                >
                  <Store className="w-12 h-12" />
                </div>
              )}
              <div className="pb-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
                  {storeName}
                </h1>
                {tagline && (
                  <p className="text-white/90 text-sm md:text-base drop-shadow">
                    {tagline}
                  </p>
                )}
              </div>
            </div>
            <div className="pb-2">
              <CartBadge />
            </div>
          </div>
        </div>
      </motion.header>
    );
  }

  // Estilo: Logo Centrado
  if (headerStyle === 'centered-logo') {
    return (
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-card border-b border-secondary/10"
      >
        <div className="max-w-3xl mx-auto px-4 py-6 text-center relative">
          <button
            onClick={handleCartClick}
            className="absolute right-4 top-1/2 -translate-y-1/2"
          >
            <CartBadge showText={false} />
          </button>

          {/* Logo centrado */}
          <div className="flex justify-center mb-3">
            {logoUrl ? (
              <div className="w-20 h-20 rounded-full overflow-hidden relative border-4 border-primary/20">
                <Image 
                  src={logoUrl} 
                  alt={storeName} 
                  fill 
                  className="object-cover" 
                  sizes="80px" 
                />
              </div>
            ) : (
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: theme.primaryColor, color: '#fff' }}
              >
                <Store className="w-10 h-10" />
              </div>
            )}
          </div>
          <h1 
            className="text-2xl font-bold"
            style={{ color: theme.textColor }}
          >
            {storeName}
          </h1>
          {tagline && (
            <p className="text-sm text-text/60 mt-1">{tagline}</p>
          )}
        </div>
      </motion.header>
    );
  }

  // Estilo: Tarjeta Flotante
  if (headerStyle === 'floating-card') {
    return (
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-40"
        style={{ backgroundColor: theme.backgroundColor }}
      >
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className="rounded-theme-xl p-5 shadow-xl border border-secondary/10 flex items-center justify-between"
            style={{ backgroundColor: theme.cardBackgroundColor }}
          >
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <div className="w-14 h-14 rounded-theme-md overflow-hidden relative shrink-0">
                  <Image 
                    src={logoUrl} 
                    alt={storeName} 
                    fill 
                    className="object-cover" 
                    sizes="56px" 
                  />
                </div>
              ) : (
                <div 
                  className="w-14 h-14 rounded-theme-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: theme.primaryColor, color: '#fff' }}
                >
                  <Store className="w-7 h-7" />
                </div>
              )}
              <div>
                <h1 
                  className="font-bold text-lg leading-tight"
                  style={{ color: theme.textColor }}
                >
                  {storeName}
                </h1>
                {tagline && (
                  <p className="text-xs text-text/60 truncate max-w-[200px]">
                    {tagline}
                  </p>
                )}
              </div>
            </div>
            <CartBadge />
          </div>
        </div>
      </motion.header>
    );
  }

  // Fallback a minimal
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-secondary/10">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-text">{storeName}</h1>
        </div>
        <CartBadge />
      </div>
    </header>
  );
}