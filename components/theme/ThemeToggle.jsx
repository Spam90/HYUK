'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

/**
 * ThemeToggle - Botón de alternancia entre modo claro (☀️) y oscuro (🌙).
 * Refleja el tema actual de next-themes, anima la transición y persiste
 * la preferencia en localStorage automáticamente.
 *
 * Props opcionales:
 * - size: 'sm' | 'md' para controlar las dimensiones del botón.
 * - variant: 'floating' | 'solid' | 'ghost' para diferentes presentaciones.
 */
export default function ThemeToggle({ size = 'md', variant = 'ghost' }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evitar desajuste de hidratación (SSR vs cliente)
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = resolvedTheme === 'dark';

  const sizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
  };

  const variantClasses = {
    ghost:
      'bg-zinc-200/60 hover:bg-zinc-300/60 dark:bg-zinc-800/60 dark:hover:bg-zinc-700/60',
    solid:
      'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-primary/50',
    floating:
      'bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 shadow-lg shadow-black/10 backdrop-blur-md hover:scale-105',
  };

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <motion.button
      type="button"
      aria-label="Cambiar tema claro/oscuro"
      whileTap={{ scale: 0.85 }}
      whileHover={{ scale: 1.05 }}
      onClick={toggleTheme}
      className={`relative flex items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${sizeClasses[size]} ${variantClasses[variant]}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? 'sun' : 'moon'}
          initial={{ y: -18, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 18, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.25 }}
          className="flex items-center justify-center"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-500" />
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}