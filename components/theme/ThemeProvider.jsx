'use client';

import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { DEFAULT_SETTINGS, DESIGN_PRESETS } from '@/lib/theme/defaults';
import ThemeScope from './ThemeScope';

const ThemeContext = createContext({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  resetSettings: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * ThemeProvider - Estado + contexto del CATÁLOGO DEL NEGOCIO (colores, layout,
 * tipografía). NO escribe variables en <html>: eso lo hace <ThemeScope>, que
 * envuelve únicamente el subárbol de la tienda/preview, para no secuestrar el
 * tema global Light/Dark de la app (clase `.dark` administrada por next-themes).
 *
 * @param {boolean} applyCatalogTheme - Si es `false` NO aplica el palette del
 *   catálogo al subárbol. Se usa en /admin/customize, donde el chrome del panel
 *   debe seguir el tema de la app y el preview (PhonePreview) pinta con estilos
 *   inline, sin depender de las variables CSS.
 */
export default function ThemeProvider({
  children,
  initialSettings = DEFAULT_SETTINGS,
  applyCatalogTheme = true,
}) {
  const [settings, setSettings] = useState(initialSettings);

  // Merge de settings con defaults para asegurar que todas las keys existan.
  // useMemo: la identidad se mantiene estable entre renders para que ThemeScope
  // no re-aplique las variables CSS en cada render.
  const mergedSettings = useMemo(
    () => ({
      theme: { ...DEFAULT_SETTINGS.theme, ...settings.theme },
      layout: { ...DEFAULT_SETTINGS.layout, ...settings.layout },
      banner: { ...DEFAULT_SETTINGS.banner, ...settings.banner },
      whatsapp_checkout: { ...DEFAULT_SETTINGS.whatsapp_checkout, ...settings.whatsapp_checkout },
      marketing: { ...DEFAULT_SETTINGS.marketing, ...settings.marketing },
    }),
    [settings]
  );

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

  // NOTA ARQUITECTÓNICA (tema global Light/Dark)
  // ------------------------------------------------------------------
  // Este provider es SOLO contexto + estado del CATÁLOGO DEL NEGOCIO
  // (colores, radios, tipografía). NO escribe variables CSS en <html>.
  //
  // Por qué: el tema Light/Dark de la aplicación lo aplica next-themes con la
  // clase `.dark` en <html>. Escribir las variables con `style` inline en
  // <html> gana por especificidad a las reglas `.dark` de app/globals.css, así
  // que el preset del catálogo secuestraba los colores de TODA la app y el
  // cambio de tema dejaba de propagarse (superficies "pegadas").
  //
  // Ahora las variables del catálogo las aplica <ThemeScope>
  // (components/theme/ThemeScope.jsx) dentro del subárbol de tienda/preview,
  // y las limpia al desmontarse. App y catálogo quedan desacoplados.

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
      {applyCatalogTheme ? (
        <ThemeScope settings={mergedSettings}>{children}</ThemeScope>
      ) : (
        children
      )}
    </ThemeContext.Provider>
  );
}