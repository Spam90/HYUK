import Link from 'next/link';

export default function StoreNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 text-6xl">🏪</div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Esta tienda no existe o cambió de dirección
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Si escribiste el enlace a mano, fijate que esté bien. Si seguís sin encontrarla,
          tal vez fue eliminada por su dueño.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold shadow-lg hover:opacity-90 transition-opacity"
        >
          Crear mi catálogo en HYUK
        </Link>
        <div className="mt-6">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}