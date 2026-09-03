import Link from 'next/link';
import { Mail, ArrowLeft, Home, CheckCircle2, Crown } from 'lucide-react';

export const metadata = {
  title: 'Contacto — HYUK',
  description: 'Contacta con el equipo de HYUK para consultas de planes, soporte, Enterprise y facturación.',
};

// Canal real de contacto de HYUK (fuente: app/terms §6, README).
// NO se finge un formulario de envío: solo se exponen canales verdaderos.
const SUPPORT_EMAIL = 'soporte@hyuk.app';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/60">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-black tracking-tight">
            HYUK<span className="text-emerald-400">.</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/pricing" className="text-zinc-400 hover:text-zinc-100 transition-colors">
              Planes
            </Link>
            <Link href="/" className="text-zinc-400 hover:text-zinc-100 transition-colors">
              Inicio
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-14 md:py-20">
        <div className="space-y-2 mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            Soporte &amp; ventas
          </span>
          <h1 className="text-3xl md:text-5xl font-black">¿En qué podemos ayudarte?</h1>
          <p className="text-zinc-400 text-lg max-w-2xl">
            Consultas sobre planes, facturación, dominios personalizados (Enterprise) o soporte
            técnico: escribinos por email.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Email (canal real documentado) */}
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Consulta%20HYUK`}
            className="group bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 md:p-8 hover:border-emerald-500/40 hover:bg-zinc-900/80 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold mb-1">Escríbenos un email</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Para consultas de planes, facturación y soporte. Respondemos en horario laboral.
            </p>
            <code className="text-emerald-400 font-mono text-sm">{SUPPORT_EMAIL}</code>
          </a>

          {/* Planes y precios (ruta real) */}
          <Link
            href="/pricing"
            className="group bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 md:p-8 hover:border-emerald-500/40 hover:bg-zinc-900/80 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
              <Crown className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold mb-1">Planes y precios</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Compará Free, Pro y Enterprise, o iniciá una suscripción online.
            </p>
            <span className="text-emerald-400 text-sm font-medium">Ver planes →</span>
          </Link>
        </div>

        <div className="mt-10 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 md:p-8">
          <h2 className="flex items-center gap-2 font-bold text-lg mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Qué esperar
          </h2>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li>• Respuesta en menos de 24 h hábiles por email.</li>
            <li>• Para activación de Enterprise o dominios personalizados, indicá tu correo de registro.</li>
            <li>• Si ya sos usuario, incluí el email con el que te registraste para agilizar la ayuda.</li>
          </ul>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Ver planes
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-zinc-700 text-zinc-200 hover:bg-zinc-800/60 font-medium transition-colors"
          >
            <Home className="w-4 h-4" /> Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}