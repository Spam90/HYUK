'use client';

import { ThemeProvider } from 'next-themes';

/**
 * AppThemeProvider - Proveedor global de tema (light/dark) basado en next-themes.
 * Persiste la preferencia en localStorage, aplica la clase `.dark` en <html>
 * y evita el FOUC (flash de contenido sin estilo) en la hidratación.
 */
export default function AppThemeProvider({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="hyuk-theme"
    >
      {children}
    </ThemeProvider>
  );
}