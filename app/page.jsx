import Link from 'next/link';
import { Store, Palette, MessageCircle, Smartphone, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="max-w-6xl mx-auto px-4 py-20 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Smartphone className="w-4 h-4" />
            Catálogo Digital con Pedidos a WhatsApp
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-text mb-6">
            Tu catálogo digital
            <br />
            <span className="text-primary">personalizado al máximo</span>
          </h1>
          <p className="text-lg text-text/60 max-w-2xl mx-auto mb-8">
            Crea un catálogo único para tu negocio. Personaliza colores, tipografías, layouts y más,
            todo sin escribir una sola línea de código.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/admin/customize"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-theme-lg bg-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <Palette className="w-5 h-5" />
              Personalizar mi catálogo
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-theme-lg border-2 border-secondary/10 text-text font-semibold hover:border-primary/40 transition-all"
            >
              <Store className="w-5 h-5" />
              Ver demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Palette,
              title: 'Personalización Extrema',
              description: 'Colores, tipografías, layouts y estilos. Todo configurable en tiempo real.',
            },
            {
              icon: MessageCircle,
              title: 'Pedidos por WhatsApp',
              description: 'Tus clientes hacen pedidos directo a tu WhatsApp con un mensaje formateado.',
            },
            {
              icon: Smartphone,
              title: 'Vista Previa en Vivo',
              description: 'Simulador de iPhone que muestra los cambios al instante mientras editas.',
            },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="p-6 rounded-theme-xl bg-card border border-secondary/10 hover:border-primary/30 transition-all"
              >
                <div className="w-12 h-12 rounded-theme-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-text mb-2">{feature.title}</h3>
                <p className="text-sm text-text/60">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}