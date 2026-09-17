'use client';

import { useEffect, useRef } from 'react';
import { BORDER_RADIUS_MAP, FONT_FAMILY_MAP, GOOGLE_FONTS_URL } from '@/lib/theme/defaults';

/**
 * ThemeScope - Aplica los colores, radios y tipografía del CATÁLOGO DEL NEGOCIO
 * a un subárbol concreto del DOM (la tienda pública / el preview), NO a <html>.
 *
 * Por qué existe:
 *   El tema global de la aplicación (Light/Dark) lo controla next-themes con la
 *   clase `.dark` en <html>. Si el motor de personalización escribiera sus
 *   variables en <html> con `style` inline, ganaría por especificidad a las
 *   reglas `.dark` de app/globals.css y la app quedaría "pegada" al preset del
 *   catálogo: al cambiar de tema media interfaz no cambiaría.
 *
 *   Con `display: contents` el wrapper no genera caja, así que no altera el
 *   layout; las variables CSS heredan igual a todo el subárbol.
 *
 * Al desmontarse limpia sus variables, así nada queda pegado a nivel global.
 */
export default function ThemeScope({ children, settings, className = '' }) {
  const ref = useRef(null);
  const theme = settings?.theme;

  useEffect(() => {
    const el = ref.current;
    if (!el || !theme) return;

    // Colores del catálogo
    el.style.setProperty('--primary', theme.primaryColor);
    el.style.setProperty('--secondary', theme.secondaryColor);
    el.style.setProperty('--background', theme.backgroundColor);
    el.style.setProperty('--card-bg', theme.cardBackgroundColor);
    el.style.setProperty('--text-color', theme.textColor);
    el.style.setProperty('--accent', theme.accentColor);

    // Bordes redondeados
    const radius = BORDER_RADIUS_MAP[theme.borderRadius] || '1rem';
    el.style.setProperty('--radius-sm', `calc(${radius} * 0.5)`);
    el.style.setProperty('--radius-md', radius);
    el.style.setProperty('--radius-lg', `calc(${radius} * 1.25)`);
    el.style.setProperty('--radius-xl', `calc(${radius} * 1.5)`);

    // Tipografía del catálogo
    el.style.fontFamily = FONT_FAMILY_MAP[theme.fontFamily] || "'Inter', sans-serif";

    // Google Font según la fuente elegida (una sola vez por familia)
    const fontUrl = GOOGLE_FONTS_URL[theme.fontFamily];
    if (fontUrl && !document.querySelector(`link[data-font="${theme.fontFamily}"]`)) {
      const linkEl = document.createElement('link');
      linkEl.rel = 'stylesheet';
      linkEl.href = fontUrl;
      linkEl.setAttribute('data-font', theme.fontFamily);
      document.head.appendChild(linkEl);
    }

    return () => {
      [
        '--primary',
        '--secondary',
        '--background',
        '--card-bg',
        '--text-color',
        '--accent',
        '--radius-sm',
        '--radius-md',
        '--radius-lg',
        '--radius-xl',
      ].forEach((prop) => el.style.removeProperty(prop));
      el.style.removeProperty('font-family');
    };
  }, [theme]);

  return (
    <div ref={ref} className={`contents ${className}`.trim()}>
      {children}
    </div>
  );
}