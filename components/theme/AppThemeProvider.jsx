'use client';

import { ThemeProvider } from 'next-themes';

/**
 * AppThemeProvider - ÚNICA fuente global de tema (Light/Dark) basada en next-themes.
 * Persiste la preferencia en localStorage (`hyuk-theme`), aplica la clase del tema
 * en <html> (`dark` → `.dark`) y evita el FOUC (flash de contenido sin estilo)
 * en la hidratación.
 *
 * Temas soportados: 'light' | 'dark'  (no existe un tercer modo)
 */
export default function AppThemeProvider({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="hyuk-theme"
      themes={['light', 'dark']}
    >
      {children}
    </ThemeProvider>
  );
}