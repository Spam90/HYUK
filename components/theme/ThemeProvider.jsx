'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DEFAULT_SETTINGS, BORDER_RADIUS_MAP, FONT_FAMILY_MAP, GOOGLE_FONTS_URL } from '@/lib/theme/defaults';

const ThemeContext = createContext({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  resetSettings: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children, initialSettings = DEFAULT_SETTINGS }) {
  const [settings, setSettings] = useState(initialSettings);

  // Merge de settings con defaults para asegurar que todas las keys existan
  const mergedSettings = {
    theme: { ...DEFAULT_SETTINGS.theme, ...settings.theme },
    layout: { ...DEFAULT_SETTINGS.layout, ...settings.layout },
    banner: { ...DEFAULT_SETTINGS.banner, ...settings.banner },
    whatsapp_checkout: { ...DEFAULT_SETTINGS.whatsapp_checkout, ...settings.whatsapp_checkout },
    marketing: { ...DEFAULT_SETTINGS.marketing, ...settings.marketing },
  };

  // Función para actualizar secciones específicas de settings
  const updateSettings = useCallback((section, updates) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...updates,
      },
    }));
  }, []);

  // Función para actualizar settings completos
  const updateFullSettings = useCallback((newSettings) => {
    setSettings(newSettings);
  }, []);

  // Aplicar preset de diseño
  const applyPreset = useCallback((presetId) => {
    const preset = DESIGN_PRESETS[presetId];
    if (preset) {
      setSettings({
        theme: preset.theme,
        layout: preset.layout,
        banner: preset.banner,
        whatsapp_checkout: DEFAULT_SETTINGS.whatsapp_checkout,
      });
    }
  }, []);

  // Reset a defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // Inyecta variables CSS dinámicas en el contenedor raíz
  useEffect(() => {
    const root = document.documentElement;
    const theme = mergedSettings.theme;

    // Colores principales
    root.style.setProperty('--primary', theme.primaryColor);
    root.style.setProperty('--secondary', theme.secondaryColor);
    root.style.setProperty('--background', theme.backgroundColor);
    root.style.setProperty('--card-bg', theme.cardBackgroundColor);
    root.style.setProperty('--text-color', theme.textColor);
    root.style.setProperty('--accent', theme.accentColor);

    // Bordes redondeados
    const radius = BORDER_RADIUS_MAP[theme.borderRadius] || '1rem';
    root.style.setProperty('--radius-sm', `calc(${radius} * 0.5)`);
    root.style.setProperty('--radius-md', radius);
    root.style.setProperty('--radius-lg', `calc(${radius} * 1.25)`);
    root.style.setProperty('--radius-xl', `calc(${radius} * 1.5)`);

    // Tipografía
    const fontFamily = FONT_FAMILY_MAP[theme.fontFamily] || "'Inter', sans-serif";
    root.style.setProperty('--font-family', fontFamily);

        // Modo oscuro / claro
    // Importante: la clase `.dark` en <html> la administra next-themes (global),
    // por lo que aquí NO la forzamos add/remove para evitar conflictos con el
    // toggle global. Solo aplicamos las variables del store cuando su modo es dark
    // y el usuario no personalizó los colores de fondo (respetamos globals.css dark).
    if (theme.mode === 'dark' && !settings.theme.backgroundColor) {
      root.style.setProperty('--background', '#0F172A');
      root.style.setProperty('--text-color', '#F8FAFC');
      root.style.setProperty('--card-bg', '#1E293B');
    }

    // Cargar Google Font según la fuente seleccionada
    const fontUrl = GOOGLE_FONTS_URL[theme.fontFamily];
    if (fontUrl) {
      // Verificar si el link ya existe
      let linkEl = document.querySelector(`link[data-font="${theme.fontFamily}"]`);
      if (!linkEl) {
        linkEl = document.createElement('link');
        linkEl.rel = 'stylesheet';
        linkEl.href = fontUrl;
        linkEl.setAttribute('data-font', theme.fontFamily);
        document.head.appendChild(linkEl);
      }
    }

    // Limpieza: remover variables al desmontar (solo para preview en admin)
    return () => {
      // No limpiar en producción, solo en preview
      if (typeof window !== 'undefined' && window.location.pathname.includes('/customize')) {
        // Mantener las variables - el preview usa el mismo documento
      }
    };
  }, [mergedSettings, settings.theme.backgroundColor]);

  return (
    <ThemeContext.Provider
      value={{
        settings: mergedSettings,
        updateSettings,
        updateFullSettings,
        resetSettings,
        applyPreset,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}