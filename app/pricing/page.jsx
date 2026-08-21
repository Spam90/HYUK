import Link from 'next/link';

// Página pública de planes. Los CTAs del admin ("Mejorar a Pro", "Ver planes",
// banners de upgrade) apuntan aquí. En esta versión el checkout de suscripción
// se procesa manualmente (contacto), pero la página ya deja clara la propuesta
// de valor y los beneficios de cada plan.

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'para siempre',
    tagline: 'Para probar y empezar a vender',
    highlight: false,
    cta: 'Empezar gratis',
    href: '/signup',
    features: [
      'Catálogo digital con todos tus productos visibles',
      'Pedidos por WhatsApp',
      '1 tienda · hasta 6 productos',
      'Dominio hyuk.app gratis',
      'Marca de agua de HYUK',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9',
    period: 'por mes',
    tagline: 'Para negocios que venden a diario',
    highlight: true,
    cta: 'Empezar con Pro',
    href: '/signup',
    features: [
      'Todo lo del plan Free',
      'Productos ilimitados',
      'Generación de catálogos con IA',
      'Quita la marca de agua',
      'Redes sociales configuradas',
      'Estadísticas y analíticas',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$29',
    period: 'por mes',
    tagline: 'Para cadenas y equipos',
    highlight: false,
    cta: 'Contactar ventas',
    href: '/contact',
    features: [
      'Todo lo del plan Pro',
      'Dominio personalizado',
      'Varias tiendas',
      'Soporte prioritario',
      'Onboarding asistido',
    ],
  },
];

export const metadata = {
  title: 'Planes y precios — HYUK',
  description: 'Elige el plan de catálogo digital perfecto para tu negocio. Empieza gratis hoy.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-4">
            ✨ Prueba Pro gratis 28 días
          </span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            Planes y precios simples
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Arrancá gratis con tu catálogo digital. Cuando tu negocio crezca,
            pasás a Pro y desbloqueás todo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-3xl p-6 border ${
                plan.highlight
                  ? 'bg-emerald-500/5 border-emerald-500/50 shadow-xl shadow-emerald-500/10'
                  : 'bg-zinc-900/60 border-zinc-800'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-black uppercase tracking-wide">
                  Más popular
                </span>
              )}
              <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
              <p className="text-sm text-zinc-400 mb-4">{plan.tagline}</p>
              <div className="mb-6">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="text-sm text-zinc-400"> {plan.period}</span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`w-full py-3 rounded-xl text-center font-semibold transition-colors ${
                  plan.highlight
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-zinc-500 text-sm mt-10">
          Todos los planes incluyen soporte por WhatsApp. Sin permanencia, cancelá cuando quieras.
        </p>
      </div>
    </div>
  );
}
