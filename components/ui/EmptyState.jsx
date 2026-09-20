/**
 * EmptyState reutilizable.
 *
 * Se muestra cuando una lista está vacía (categorías, productos, búsquedas sin
 * resultados, admin vacío, etc.). Usa tokens semánticos (`text-text`,
 * `text-muted-foreground`) para que respete Light/Dark carbon de forma
 * consistente y no introduzca grises azulados.
 */
export default function EmptyState({
  icon,
  title,
  description,
  className = '',
  iconClassName = 'text-6xl mb-4 opacity-70',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 text-center text-text ${className}`}
    >
      {icon && <div className={iconClassName}>{icon}</div>}
      <h3 className="text-lg font-semibold text-text/80">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}
