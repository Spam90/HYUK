'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Banner de instalación PWA (beforeinstallprompt).
 *
 * - Captura el evento nativo `beforeinstallprompt`.
 * - Se muestra un banner Material "Agregar a pantalla" con el tono del brand.
 * - Respetuoso: si el usuario lo rechaza o instala, no vuelve a aparecer
 *   (persistido en localStorage bajo `hyuk_dont_show_install`).
 * - Gracefully: si el navegador no dispara el evento o ya está instalada,
 *   no renderiza nada.
 */
export default function PWAInstallBanner() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // No mostrar si ya está instalada (appinstalled disparado antes) o desestimada.
    if (localStorage.getItem('hyuk_dont_show_install') === 'true') return;

    const onBeforeInstallPrompt = (e) => {
      // Evita el mini-banner nativo y guarda el evento para el banner propio.
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    const onAppInstalled = () => {
      setVisible(false);
      localStorage.setItem('hyuk_dont_show_install', 'true');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem('hyuk_dont_show_install', 'true');
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('hyuk_dont_show_install', 'true');
    } else {
      localStorage.setItem('hyuk_dont_show_install', 'later');
    }
    setVisible(false);
    setDeferred(null);
  }, [deferred]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[2000]
                 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl
                 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800
                 max-w-md w-[90%]"
    >
      <img src="/icon-192.png" alt="HYUK" className="w-10 h-10 rounded-lg" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-gray-900 dark:text-white">
          Agregar HYUK a la pantalla de inicio
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Accede como una app nativa sin instalar nada.
        </p>
      </div>
      <button
        onClick={install}
        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
        style={{ backgroundColor: '#10b981' }}
      >
        Instalar
      </button>
      <button
        onClick={dismiss}
        className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  );
}
