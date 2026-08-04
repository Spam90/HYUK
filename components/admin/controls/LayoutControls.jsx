'use client';

import { LayoutGrid, List, Columns2, Columns3, Square, ScrollText, PanelTop, AlignCenter, CreditCard, LayoutList, Rows3, Grid3x3, CircleDot, Underline, Navigation, LayoutDashboard } from 'lucide-react';
import { PRODUCT_GRID_OPTIONS, HEADER_STYLE_OPTIONS, CATEGORY_STYLE_OPTIONS, PRODUCT_CARD_STYLE_OPTIONS } from '@/lib/theme/defaults';

// Mapa de iconos para opciones de grid
const GRID_ICONS = {
  'list': List,
  'grid-2-col': Columns2,
  'grid-3-col': Columns3,
  'cards-large': Square,
  'horizontal-scroll': ScrollText,
};

// Mapa de iconos para estilos de header
const HEADER_ICONS = {
  'minimal': LayoutList,
  'banner-large': PanelTop,
  'centered-logo': AlignCenter,
  'floating-card': CreditCard,
};

// Mapa de iconos para estilos de categoría
const CATEGORY_ICONS = {
  'pills-scroll': CircleDot,
  'tabs-underlined': Underline,
  'floating-bar': Navigation,
  'grid-icons': Grid3x3,
};

// Mapa de iconos para estilos de tarjeta
const CARD_ICONS = {
  'minimal-border': LayoutList,
  'modern-shadow': LayoutGrid,
  'glassmorphic': LayoutDashboard,
  'compact-row': Rows3,
};

export default function LayoutControls({ settings, updateSettings }) {
  const { layout } = settings;

  // Componente para selector visual de opciones
  const VisualSelector = ({ title, icon: TitleIcon, options, value, onChange, iconMap }) => (
    <div>
      <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
        <TitleIcon className="w-4 h-4" />
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const Icon = iconMap[option.value] || LayoutGrid;
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`p-3 rounded-theme-lg border flex flex-col items-center gap-2 transition-all ${
                isActive
                  ? 'border-primary bg-primary/5'
                  : 'border-secondary/10 hover:border-primary/30'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-text/50'}`} />
              <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-text/70'}`}>
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Distribución de productos */}
      <VisualSelector
        title="Distribución de Productos"
        icon={LayoutGrid}
        options={PRODUCT_GRID_OPTIONS}
        value={layout.productGrid}
        onChange={(value) => updateSettings('layout', { productGrid: value })}
        iconMap={GRID_ICONS}
      />

      {/* Estilo de header */}
      <VisualSelector
        title="Estilo de Cabecera"
        icon={PanelTop}
        options={HEADER_STYLE_OPTIONS}
        value={layout.headerStyle}
        onChange={(value) => updateSettings('layout', { headerStyle: value })}
        iconMap={HEADER_ICONS}
      />

      {/* Estilo de categorías */}
      <VisualSelector
        title="Estilo de Categorías"
        icon={CircleDot}
        options={CATEGORY_STYLE_OPTIONS}
        value={layout.categoryStyle}
        onChange={(value) => updateSettings('layout', { categoryStyle: value })}
        iconMap={CATEGORY_ICONS}
      />

      {/* Estilo de tarjetas de producto */}
      <VisualSelector
        title="Estilo de Tarjetas"
        icon={LayoutGrid}
        options={PRODUCT_CARD_STYLE_OPTIONS}
        value={layout.productCardStyle}
        onChange={(value) => updateSettings('layout', { productCardStyle: value })}
        iconMap={CARD_ICONS}
      />
    </div>
  );
}