'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Zap } from 'lucide-react';

/**
 * ThemeToggle - Botón de alternancia entre los 3 temas globales:
 * ☀️ LIGHT  →  🌙 DARK  →  ⚡ NEÓN  →  ☀️ LIGHT
 *
 * next-themes aplica la clase del tema en <html> (`dark` → `.dark`,
 * `neon` → `.neon`) y persiste en localStorage (`hyuk-theme`).
 * Con `darkMode: ['class','[class~="neon"]']` en tailwind.config.js,
 * TODAS las variantes `dark:` de la app se activan también bajo `.neon`.
 */
const THEME_ORDER = ['light', 'dark', 'neon'];

function nextTheme(current) {
  const idx = THEME_ORDER.indexOf(current);
  return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
}

const THEME_META = {
  light: { Icon: Sun, className: 'text-amber-400' },
  dark: { Icon: Moon, className: 'text-indigo-400' },
  neon: { Icon: Zap, className: 'text-fuchsia-400' },
};

export default function ThemeToggle({ size = 'md', variant = 'ghost' }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evitar desajuste de hidratación (SSR vs cliente)
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Normalizar el tema actual (resolvedTheme puede ser 'system' o indefinido).
  const current =
    resolvedTheme === 'dark' || resolvedTheme === 'neon' || resolvedTheme === 'light'
      ? resolvedTheme
      : 'light';
  const next = nextTheme(current);
  const { Icon, className } = THEME_META[next];

  const sizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
  };

  const variantClasses = {
    ghost:
      'bg-zinc-200/60 hover:bg-zinc-300/60 dark:bg-zinc-800/60 dark:hover:bg-zinc-700/60',
    solid:
      'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800',
    floating:
      'bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 shadow-lg shadow-black/10 backdrop-blur-md hover:scale-105',
  };

  const toggleTheme = () => {
    setTheme(next);
  };

  return (
    <motion.button
      type="button"
      aria-label={`Cambiar tema: activar ${next === 'dark' ? 'oscuro' : next === 'neon' ? 'neón' : 'claro'}`}
      whileTap={{ scale: 0.85 }}
      whileHover={{ scale: 1.05 }}
      onClick={toggleTheme}
      className={`relative flex items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${sizeClasses[size]} ${variantClasses[variant]}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={next}
          initial={{ y: -18, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 18, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.25 }}
          className="flex items-center justify-center"
        >
          <Icon className={`w-5 h-5 ${className}`} />
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

