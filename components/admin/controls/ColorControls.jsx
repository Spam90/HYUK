'use client';

import { Palette, Type, Square, Sun, Moon, Zap } from 'lucide-react';
import { useTheme } from 'next-themes';
import { COLOR_PRESETS, FONT_OPTIONS, BORDER_RADIUS_OPTIONS } from '@/lib/theme/defaults';

export default function ColorControls({ settings, updateSettings }) {
  const { theme } = settings;
  const { setTheme } = useTheme();

  // Campos de color configurables
  const colorFields = [
    { key: 'primaryColor', label: 'Color Primario', description: 'Botones y acentos principales' },
    { key: 'secondaryColor', label: 'Color Secundario', description: 'Fondos oscuros y contrastes' },
    { key: 'backgroundColor', label: 'Color de Fondo', description: 'Fondo general de la página' },
    { key: 'cardBackgroundColor', label: 'Color de Tarjetas', description: 'Fondo de las tarjetas de producto' },
    { key: 'textColor', label: 'Color de Texto', description: 'Color principal del texto' },
    { key: 'accentColor', label: 'Color de Acento', description: 'Badges y elementos destacados' },
  ];

  // Aplicar preset de colores
  const applyPreset = (preset) => {
    updateSettings('theme', preset.colors);
  };

  return (
    <div className="space-y-6">
      {/* Presets de paletas */}
      <div>
        <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Paletas Profesionales
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="flex items-center gap-3 p-3 rounded-theme-lg border border-secondary/10 hover:border-primary/40 transition-all group"
            >
              {/* Mini paleta de colores */}
              <div className="flex -space-x-1.5 shrink-0">
                {Object.values(preset.colors).slice(0, 4).map((color, idx) => (
                  <div
                    key={idx}
                    className="w-6 h-6 rounded-full border-2 border-card shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-medium text-text group-hover:text-primary transition-colors">
                  {preset.name}
                </p>
                <p className="text-xs text-text/40">{preset.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selectores de color individuales */}
      <div>
        <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Colores Personalizados
        </h4>
        <div className="space-y-3">
          {colorFields.map((field) => (
            <div key={field.key} className="flex items-center gap-3">
              <input
                type="color"
                value={theme[field.key]}
                onChange={(e) => updateSettings('theme', { [field.key]: e.target.value })}
                className="w-10 h-10 rounded-theme-md cursor-pointer shrink-0"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-text">{field.label}</p>
                <p className="text-xs text-text/40">{field.description}</p>
              </div>
              <span className="text-xs font-mono text-text/50 bg-secondary/5 px-2 py-1 rounded-md">
                {theme[field.key]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tipografía */}
      <div>
        <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <Type className="w-4 h-4" />
          Tipografía
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {FONT_OPTIONS.map((font) => (
            <button
              key={font.value}
              onClick={() => updateSettings('theme', { fontFamily: font.value })}
              className={`p-3 rounded-theme-lg border text-left transition-all ${
                theme.fontFamily === font.value
                  ? 'border-primary bg-primary/5'
                  : 'border-secondary/10 hover:border-primary/30'
              }`}
            >
              <p 
                className="text-sm font-medium text-text"
                style={{ fontFamily: `'${font.label}', sans-serif` }}
              >
                {font.label}
              </p>
              <p className="text-xs text-text/40 mt-0.5">Aa Bb Cc 123</p>
            </button>
          ))}
        </div>
      </div>

      {/* Redondeo de bordes */}
      <div>
        <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <Square className="w-4 h-4" />
          Redondeo de Bordes
        </h4>
        <div className="grid grid-cols-4 gap-2">
          {BORDER_RADIUS_OPTIONS.map((radius) => (
            <button
              key={radius.value}
              onClick={() => updateSettings('theme', { borderRadius: radius.value })}
              className={`p-3 rounded-theme-lg border flex flex-col items-center gap-2 transition-all ${
                theme.borderRadius === radius.value
                  ? 'border-primary bg-primary/5'
                  : 'border-secondary/10 hover:border-primary/30'
              }`}
            >
              <div
                className="w-10 h-10 border-2 border-current"
                style={{ borderRadius: radius.class === 'rounded-full' ? '9999px' : radius.class === 'rounded-none' ? '0px' : radius.class === 'rounded-lg' ? '8px' : '16px' }}
              />
              <span className="text-xs font-medium text-text">{radius.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Modo de visualización */}
      <div>
        <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Modo de Visualización
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'light', label: 'Claro', icon: Sun },
            { value: 'dark', label: 'Oscuro', icon: Moon },
            { value: 'neon', label: 'Neón', icon: Zap },
          ].map((mode) => {
            const Icon = mode.icon;
            const isActive = theme.mode === mode.value;
            return (
              <button
                key={mode.value}
                                onClick={() => {
                  updateSettings('theme', { mode: mode.value });
                  // Sincronizar con el tema global (next-themes) -> app + preview en tiempo real
                  setTheme(mode.value === 'dark' || mode.value === 'neon' ? 'dark' : 'light');
                  // Ajustar colores para modo neón
                  if (mode.value === 'neon') {
                    updateSettings('theme', {
                      primaryColor: '#8B5CF6',
                      secondaryColor: '#1E1B4B',
                      backgroundColor: '#0F172A',
                      cardBackgroundColor: '#1E293B',
                      textColor: '#F8FAFC',
                      accentColor: '#22D3EE',
                    });
                  }
                }}
                className={`p-3 rounded-theme-lg border flex flex-col items-center gap-2 transition-all ${
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-secondary/10 hover:border-primary/30'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium text-text">{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}