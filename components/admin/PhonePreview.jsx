'use client';

import { motion } from 'framer-motion';
import { Smartphone, Monitor, RefreshCw, ExternalLink } from 'lucide-react';

export default function PhonePreview({ settings }) {
  const { theme, layout, banner } = settings;

  // Helper to get border radius value
  const getBorderRadius = (type = 'md') => {
    const radiusMap = {
      'rounded-none': '0',
      'rounded-sm': '0.125rem',
      'rounded-md': '0.375rem',
      'rounded-lg': '0.5rem',
      'rounded-xl': '0.75rem',
      'rounded-2xl': '1rem',
      'rounded-3xl': '1.5rem',
      'rounded-full': '9999px',
    };
    return radiusMap[theme.borderRadius] || radiusMap[type];
  };

  // Helper to get font family
  const getFontFamily = () => {
    const fontMap = {
      'font-sans': 'Inter, sans-serif',
      'font-poppins': 'Poppins, sans-serif',
      'font-montserrat': 'Montserrat, sans-serif',
      'font-playfair': 'Playfair Display, serif',
      'font-outfit': 'Outfit, sans-serif',
      'font-space': 'Space Grotesk, sans-serif',
    };
    return fontMap[theme.fontFamily] || fontMap['font-sans'];
  };

  // Helper to get product grid classes
  const getProductGridClasses = () => {
    const gridMap = {
      'list': 'flex flex-col gap-2',
      'grid-2-col': 'grid grid-cols-2 gap-2',
      'grid-3-col': 'grid grid-cols-3 gap-2',
      'cards-large': 'grid grid-cols-1 gap-3',
      'horizontal-scroll': 'flex overflow-x-auto gap-2 no-scrollbar',
    };
    return gridMap[layout.productGrid] || gridMap['grid-2-col'];
  };

  // Helper to get category style classes
  const getCategoryStyleClasses = () => {
    const styleMap = {
      'pills-scroll': 'flex gap-2 overflow-x-auto no-scrollbar',
      'tabs-underlined': 'flex gap-4 border-b border-gray-200 dark:border-zinc-700',
      'floating-bar': 'flex gap-2 overflow-x-auto no-scrollbar pb-2',
      'grid-icons': 'grid grid-cols-4 gap-2',
    };
    return styleMap[layout.categoryStyle] || styleMap['pills-scroll'];
  };

  // Helper to get product card style
  const getProductCardClasses = () => {
    const styleMap = {
      'minimal-border': 'border border-gray-200 dark:border-zinc-700',
      'modern-shadow': 'shadow-md',
      'glassmorphic': 'glass',
      'compact-row': 'flex gap-2',
    };
    return styleMap[layout.productCardStyle] || styleMap['modern-shadow'];
  };

  // Helper to get header style
  const getHeaderStyleClasses = () => {
    const styleMap = {
      'minimal': 'bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800',
      'banner-large': 'relative overflow-hidden',
      'centered-logo': 'bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 text-center',
      'floating-card': 'relative px-4 pt-8',
    };
    return styleMap[layout.headerStyle] || styleMap['banner-large'];
  };

  return (
    <div className="w-full max-w-[380px]">
      {/* Canvas Container with Dot Pattern */}
      <div className="relative p-8 rounded-3xl" style={{ 
        backgroundColor: '#f8f9fa',
        backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}>
        {/* Canvas Label */}
        <div className="absolute top-4 left-4 px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full text-xs font-medium text-gray-600 border border-gray-200">
          Canvas de Diseño
        </div>

        {/* Phone Frame */}
        <div className="relative">
          {/* Ambient Glow */}
          <div 
            className="absolute -inset-4 rounded-[3rem] opacity-30 blur-3xl"
            style={{ 
              background: `linear-gradient(135deg, ${theme.primaryColor}40, ${theme.accentColor}40)` 
            }}
          />

          {/* Phone Bezel */}
          <div className="relative bg-gradient-to-br from-zinc-800 via-zinc-900 to-black rounded-[2.5rem] p-3 shadow-2xl">
            {/* Inner Frame with metallic gradient */}
            <div className="relative bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 rounded-[2rem] p-1.5">
              {/* Screen Container */}
              <div 
                className="relative rounded-[1.75rem] overflow-hidden"
                style={{ 
                  aspectRatio: '9/19.5',
                  backgroundColor: theme.backgroundColor 
                }}
              >
                {/* Dynamic Island / Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-20" />

                {/* Screen Content */}
                <div 
                  className="h-full overflow-y-auto no-scrollbar"
                  style={{ 
                    fontFamily: getFontFamily(),
                    backgroundColor: theme.backgroundColor,
                    color: theme.textColor,
                  }}
                >
                  {/* Header - applies headerStyle */}
                  <div 
                    className={`p-3 ${getHeaderStyleClasses()}`}
                    style={{ 
                      backgroundColor: theme.primaryColor,
                      color: 'white',
                    }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div 
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: theme.secondaryColor }}
                      >
                        <span className="text-sm font-bold">🍽️</span>
                      </div>
                      <span className="text-sm font-bold">Mi Tienda</span>
                    </div>
                  </div>

                  {/* Preview Content */}
                  <div className="pt-3 pb-4 px-3">
                    {/* Banner Preview */}
                    {banner?.imageUrl && (
                      <div 
                        className="w-full h-24 rounded-xl bg-cover bg-center mb-3 shadow-lg"
                        style={{ 
                          backgroundImage: `url(${banner.imageUrl})`,
                          borderRadius: getBorderRadius(),
                        }}
                      />
                    )}

                    {/* Tagline */}
                    {banner?.tagline && (
                      <div className="text-center mb-3">
                        <p className="text-xs font-medium" style={{ color: theme.textColor }}>
                          {banner.tagline}
                        </p>
                      </div>
                    )}

                    {/* Announcement Bar */}
                    {banner?.showAnnouncementBar && banner?.announcementText && (
                      <div 
                        className="px-3 py-2 rounded-xl mb-3 text-center"
                        style={{ 
                          backgroundColor: `${theme.primaryColor}15`,
                          borderRadius: getBorderRadius(),
                        }}
                      >
                        <p className="text-[10px] font-medium" style={{ color: theme.primaryColor }}>
                          {banner.announcementText}
                        </p>
                      </div>
                    )}

                    {/* Categories Preview - applies categoryStyle */}
                    <div className={getCategoryStyleClasses() + ' mb-3'}>
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-medium"
                          style={{
                            backgroundColor: i === 1 ? theme.primaryColor : `${theme.primaryColor}15`,
                            color: i === 1 ? 'white' : theme.primaryColor,
                            borderRadius: getBorderRadius('full'),
                          }}
                        >
                          Categoría {i}
                        </div>
                      ))}
                    </div>

                    {/* Products Preview - applies productGrid and productCardStyle */}
                    <div className={getProductGridClasses()}>
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`p-2.5 shadow-sm ${getProductCardClasses()}`}
                          style={{
                            backgroundColor: theme.cardBackgroundColor,
                            borderRadius: getBorderRadius(),
                          }}
                        >
                          <div className="flex gap-2.5">
                            <div 
                              className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0"
                              style={{
                                borderRadius: getBorderRadius(),
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[11px] font-semibold truncate" style={{ color: theme.textColor }}>
                                Producto {i}
                              </h4>
                              <p className="text-[9px] text-gray-400 line-clamp-1">
                                Descripción corta
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs font-bold" style={{ color: theme.primaryColor }}>
                                  $99.00
                                </span>
                                <div 
                                  className="w-5 h-5 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: theme.primaryColor }}
                                >
                                  <span className="text-white text-[10px] font-bold">+</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Toolbar */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1 px-3 py-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl rounded-2xl shadow-premium-lg border border-gray-200">
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors" title="Vista móvil">
              <Smartphone className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors" title="Vista desktop">
              <Monitor className="w-4 h-4 text-gray-400" />
            </button>
            <div className="w-px h-5 bg-gray-200 dark:bg-zinc-700" />
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors" title="Actualizar">
              <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors" title="Abrir en nueva pestaña">
              <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="w-px h-5 bg-gray-200 dark:bg-zinc-700" />
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 px-2">
              100%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
