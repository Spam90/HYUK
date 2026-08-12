'use client';

import { LayoutGrid, List, Columns2, Grid3x3, Rows3, Menu, ShoppingBag, Smartphone } from 'lucide-react';
import { LAYOUT_TYPE_OPTIONS } from '@/lib/theme/defaults';

// Mapa de iconos para layout types
const LAYOUT_TYPE_ICONS = {
  grid_modern: LayoutGrid,
  list_compact: List,
  menu_card: Menu,
};

export default function LayoutControls({ settings, updateSettings }) {
  const { layout } = settings;

  return (
    <div className="space-y-6">
      {/* Selector de tipo de layout de tienda */}
      <div>
        <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <LayoutGrid className="w-4 h-4" />
          Tipo de Layout de Tienda
        </h4>
        <p className="text-xs text-text/40 mb-3">
          Define la arquitectura visual principal de tu catálogo
        </p>
        <div className="grid grid-cols-1 gap-3">
          {LAYOUT_TYPE_OPTIONS.map((option) => {
            const Icon = LAYOUT_TYPE_ICONS[option.value] || Grid3x3;
            const isActive = layout.layoutType === option.value;
            return (
              <button
                key={option.value}
                onClick={() => updateSettings('layout', { layoutType: option.value })}
                className={`p-4 rounded-theme-lg border flex items-center gap-3 transition-all text-left ${
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-secondary/10 hover:border-primary/30'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: isActive ? 'var(--primary)' : 'var(--secondary)' }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${isActive ? 'text-primary' : 'text-text'}`}>
                    {option.label}
                  </p>
                  <p className="text-xs text-text/50 mt-0.5">
                    {option.description}
                  </p>
                </div>
                {isActive && (
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Distribución de productos (existente) */}
      <div>
        <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <Grid3x3 className="w-4 h-4" />
          Distribución de Productos
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'grid-2-col', icon: Columns2, label: 'Grid 2 Col' },
            { value: 'grid-3-col', icon: Grid3x3, label: 'Grid 3 Col' },
            { value: 'list', icon: List, label: 'Lista' },
            { value: 'cards-large', icon: Rows3, label: 'Tarjetas Grandes' },
          ].map((option) => {
            const Icon = option.icon;
            const isActive = layout.productGrid === option.value;
            return (
              <button
                key={option.value}
                onClick={() => updateSettings('layout', { productGrid: option.value })}
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

      {/* Estilos de tarjetas de producto (existente) */}
      <div>
        <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" />
          Estilo de Tarjetas
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'modern-shadow', icon: LayoutGrid, label: 'Sombra Moderna' },
            { value: 'compact-row', icon: List, label: 'Fila Compacta' },
            { value: 'minimalist', icon: ShoppingBag, label: 'Minimalista' },
            { value: 'glassmorphic', icon: Smartphone, label: 'Glassmórfico' },
          ].map((option) => {
            const Icon = option.icon;
            const isActive = layout.productCardStyle === option.value;
            return (
              <button
                key={option.value}
                onClick={() => updateSettings('layout', { productCardStyle: option.value })}
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
        </div>
  );
}
