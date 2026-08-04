'use client';

import { motion } from 'framer-motion';
import { Utensils, Coffee, Pizza, IceCream, Salad, ChefHat, Soup, Cake } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';

// Mapa de iconos disponibles
const ICON_MAP = {
  utensils: Utensils,
  coffee: Coffee,
  pizza: Pizza,
  icecream: IceCream,
  salad: Salad,
  chefhat: ChefHat,
  soup: Soup,
  cake: Cake,
};

export default function CategoryNav({ categories, activeCategory, onSelectCategory, settings }) {
  const { layout, theme } = settings;
  const { categoryStyle } = layout;

  if (!categories || categories.length === 0) return null;

  // Función para obtener el componente de icono
  const getIcon = (iconName) => {
    const IconComp = ICON_MAP[iconName?.toLowerCase()] || Utensils;
    return <IconComp className="w-4 h-4" />;
  };

  // Estilo: Píldoras Scroll (default)
  if (categoryStyle === 'pills-scroll') {
    return (
      <div className="sticky top-[64px] z-30 bg-background/95 backdrop-blur-md py-3 border-b border-secondary/5">
        <div className="max-w-3xl mx-auto px-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max">
            {/* "Todos" */}
            <button
              onClick={() => onSelectCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${
                activeCategory === null
                  ? 'text-white shadow-md'
                  : 'bg-card border border-secondary/10 text-text/70 hover:border-primary/50'
              }`}
              style={activeCategory === null ? { backgroundColor: theme.primaryColor } : {}}
            >
              Todos
            </button>
            {categories.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(isActive ? null : cat.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${
                    isActive
                      ? 'text-white shadow-md'
                      : 'bg-card border border-secondary/10 text-text/70 hover:border-primary/50'
                  }`}
                  style={isActive ? { backgroundColor: theme.primaryColor } : {}}
                >
                  {cat.icon && getIcon(cat.icon)}
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Estilo: Tabs Subrayados
  if (categoryStyle === 'tabs-underlined') {
    return (
      <div className="border-b border-secondary/10 bg-background/95 backdrop-blur-md sticky top-[64px] z-30">
        <div className="max-w-3xl mx-auto px-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-6 min-w-max">
            <button
              onClick={() => onSelectCategory(null)}
              className={`relative py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === null ? 'font-semibold' : 'text-text/60'
              }`}
              style={activeCategory === null ? { color: theme.primaryColor } : {}}
            >
              Todos
              {activeCategory === null && (
                <motion.div
                  layoutId="underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: theme.primaryColor }}
                />
              )}
            </button>
            {categories.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(isActive ? null : cat.id)}
                  className={`relative py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    isActive ? 'font-semibold' : 'text-text/60'
                  }`}
                  style={isActive ? { color: theme.primaryColor } : {}}
                >
                  {cat.icon && getIcon(cat.icon)}
                  {cat.name}
                  {isActive && (
                    <motion.div
                      layoutId="underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Estilo: Barra Flotante
  if (categoryStyle === 'floating-bar') {
    return (
      <div className="sticky top-[64px] z-30 py-3">
        <div className="max-w-3xl mx-auto px-4">
          <div 
            className="rounded-full shadow-lg border border-secondary/10 p-1.5 overflow-x-auto no-scrollbar"
            style={{ backgroundColor: theme.cardBackgroundColor }}
          >
            <div className="flex gap-1 min-w-max">
              <button
                onClick={() => onSelectCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${
                  activeCategory === null ? 'text-white' : 'text-text/70'
                }`}
                style={activeCategory === null ? { backgroundColor: theme.primaryColor } : {}}
              >
                Todos
              </button>
              {categories.map(cat => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => onSelectCategory(isActive ? null : cat.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${
                      isActive ? 'text-white' : 'text-text/70 hover:bg-secondary/5'
                    }`}
                    style={isActive ? { backgroundColor: theme.primaryColor } : {}}
                  >
                    {cat.icon && getIcon(cat.icon)}
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Estilo: Grid de Iconos
  if (categoryStyle === 'grid-icons') {
    return (
      <div className="py-4 bg-background">
        <div className="max-w-3xl mx-auto px-4">
          <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
            <button
              onClick={() => onSelectCategory(null)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-theme-lg transition-all active:scale-95 ${
                activeCategory === null
                  ? 'bg-secondary/5'
                  : 'bg-card border border-secondary/10 hover:border-primary/30'
              }`}
            >
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: activeCategory === null ? theme.primaryColor : theme.cardBackgroundColor,
                  border: activeCategory === null ? 'none' : `2px solid ${theme.primaryColor}33`,
                  color: activeCategory === null ? '#fff' : theme.textColor,
                }}
              >
                <Utensils className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-text/70">Todos</span>
            </button>
            {categories.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(isActive ? null : cat.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-theme-lg transition-all active:scale-95 ${
                    isActive
                      ? 'bg-secondary/5'
                      : 'bg-card border border-secondary/10 hover:border-primary/30'
                  }`}
                >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: isActive ? theme.primaryColor : theme.cardBackgroundColor,
                      border: isActive ? 'none' : `2px solid ${theme.primaryColor}33`,
                      color: isActive ? '#fff' : theme.textColor,
                    }}
                  >
                    {cat.icon && getIcon(cat.icon)}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-text/70'}`}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Fallback a pills-scroll
  return null;
}