/**
 * Skeleton reutilizable para estados de carga.
 *
 * Usa el token semántico `--muted` (definido en app/globals.css) en lugar de
 * colores hardcodeados como `bg-gray-200 dark:bg-zinc-800`. Esto garantiza que
 * los esqueletos respeten el tema global: en modo oscuro adoptan el gris carbón
 * neutro (#282A2C) y en modo claro #F4F4F5, manteniendo coherencia visual
 * (estilo Gemini) y evitando el tinte azulado de `zinc-800`.
 */
export default function Skeleton({ className = '', rounded = 'rounded-xl' }) {
  return (
    <div
      className={`animate-pulse ${rounded} bg-muted ${className}`}
      aria-hidden="true"
    />
  );
}
