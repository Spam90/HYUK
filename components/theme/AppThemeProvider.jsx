'use client';

import { ThemeProvider } from 'next-themes';

/**
 * AppThemeProvider - Proveedor global de tema (light/dark/neón) basado en next-themes.
 * Persiste la preferencia en localStorage (`hyuk-theme`), aplica la clase del tema
 * en <html> (`dark` → `.dark`, `neon` → `.neon`) y evita el FOUC (flash de
 * contenido sin estilo) en la hidratación.
 *
 * temas explícitos: 'light' | 'dark' | 'neon'  (Prompt 15)
 */
export default function AppThemeProvider({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="hyuk-theme"
      themes={['light', 'dark', 'neon']}
    >
      {children}
    </ThemeProvider>
  );
}