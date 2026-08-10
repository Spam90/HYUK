'use client';

import { motion } from 'framer-motion';
import { Smartphone, Monitor, Maximize2, RefreshCw, ExternalLink } from 'lucide-react';

export default function PhonePreview({ settings }) {
  const { theme, layout, banner } = settings;

  return (
    <div className="w-full max-w-[380px]">
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
              className="relative rounded-[1.75rem] overflow-hidden bg-white"
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
                  fontFamily: theme.fontFamily === 'font-sans' ? 'Inter, sans-serif' : 
                             theme.fontFamily === 'font-poppins' ? 'Poppins, sans-serif' :
                             theme.fontFamily === 'font-montserrat' ? 'Montserrat, sans-serif' :
                             theme.fontFamily === 'font-playfair' ? 'Playfair Display, serif' :
                             theme.fontFamily === 'font-outfit' ? 'Outfit, sans-serif' :
                             theme.fontFamily === 'font-space' ? 'Space Grotesk, sans-serif' :
                             'Inter, sans-serif'
                }}
              >
                {/* Preview Content */}
                <div className="pt-10 pb-4 px-3">
                  {/* Banner Preview */}
                  {banner?.imageUrl && (
                    <div 
                      className="w-full h-32 rounded-2xl bg-cover bg-center mb-3 shadow-lg"
                      style={{ 
                        backgroundImage: `url(${banner.imageUrl})`,
                        borderRadius: theme.borderRadius === 'rounded-none' ? '0' :
                                     theme.borderRadius === 'rounded-lg' ? '0.5rem' :
                                     theme.borderRadius === 'rounded-2xl' ? '1rem' :
                                     theme.borderRadius === 'rounded-full' ? '9999px' : '1rem'
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
                        borderRadius: theme.borderRadius === 'rounded-none' ? '0' :
                                     theme.borderRadius === 'rounded-lg' ? '0.5rem' :
                                     theme.borderRadius === 'rounded-2xl' ? '1rem' :
                                     theme.borderRadius === 'rounded-full' ? '9999px' : '1rem'
                      }}
                    >
                      <p className="text-[10px] font-medium" style={{ color: theme.primaryColor }}>
                        {banner.announcementText}
                      </p>
                    </div>
                  )}

                  {/* Categories Preview */}
                  <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-medium"
                        style={{
                          backgroundColor: i === 1 ? theme.primaryColor : `${theme.primaryColor}15`,
                          color: i === 1 ? 'white' : theme.primaryColor,
                          borderRadius: theme.borderRadius === 'rounded-none' ? '0' :
                                       theme.borderRadius === 'rounded-lg' ? '0.5rem' :
                                       theme.borderRadius === 'rounded-2xl' ? '1rem' :
                                       theme.borderRadius === 'rounded-full' ? '9999px' : '1rem'
                        }}
                      >
                        Categoría {i}
                      </div>
                    ))}
                  </div>

                  {/* Products Preview */}
                  <div className="space-y-2.5">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="p-2.5 shadow-sm"
                        style={{
                          backgroundColor: theme.cardBackgroundColor,
                          borderRadius: theme.borderRadius === 'rounded-none' ? '0' :
                                       theme.borderRadius === 'rounded-lg' ? '0.5rem' :
                                       theme.borderRadius === 'rounded-2xl' ? '1rem' :
                                       theme.borderRadius === 'rounded-full' ? '9999px' : '1rem'
                        }}
                      >
                        <div className="flex gap-2.5">
                          <div 
                            className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0"
                            style={{
                              borderRadius: theme.borderRadius === 'rounded-none' ? '0' :
                                           theme.borderRadius === 'rounded-lg' ? '0.5rem' :
                                           theme.borderRadius === 'rounded-2xl' ? '1rem' :
                                           theme.borderRadius === 'rounded-full' ? '9999px' : '1rem'
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[11px] font-semibold truncate" style={{ color: theme.textColor }}>
                              Producto {i}
                            </h4>
                            <p className="text-[9px] text-gray-400 line-clamp-1">
                              Descripción corta del producto
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

        {/* Floating Toolbar */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1 px-3 py-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl rounded-2xl shadow-premium-lg border border-white/20">
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
              <Smartphone className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
              <Monitor className="w-4 h-4 text-gray-400" />
            </button>
            <div className="w-px h-5 bg-gray-200 dark:bg-zinc-700" />
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
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