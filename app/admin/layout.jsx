import ThemeToggle from '@/components/theme/ThemeToggle';

export const metadata = {
  title: 'Panel Admin - HYUK Catálogo Digital',
};

export default function AdminLayout({ children }) {
  return (
    <>
      {children}
      {/* Toggle de tema flotante persistente en todo el panel admin */}
      <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <ThemeToggle variant="floating" />
        </div>
      </div>
    </>
  );
}