'use client';

import { useEffect } from 'react';

/**
 * Registra el Service Worker y metadatos PWA.
 * Se monta solo en el cliente (window disponible).
 */
export default function PWAProvider() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Registrar service worker en producción
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrado:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Error registrando SW:', err);
        });
    }

    // Vincular manifest dinámicamente (fallback si no está en el layout)
    const link = document.querySelector('link[rel="manifest"]');
    if (link) return;
    const manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = '/manifest.json';
    document.head.appendChild(manifest);
  }, []);

  return null;
}