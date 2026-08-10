'use client';

import { motion } from 'framer-motion';
import { Store, Smartphone, Palette, MessageCircle, ArrowRight, Check, Star, Zap, Globe, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const features = [
    {
      icon: Palette,
      title: 'Personalización Extrema',
      description: 'Colores, tipografías, layouts y estilos completamente personalizables. Sin código.',
      color: '#10B981',
    },
    {
      icon: Smartphone,
      title: 'Vista Previa en Tiempo Real',
      description: 'Simulador de iPhone integrado. Ve los cambios al instante mientras editas.',
      color: '#8B5CF6',
    },
    {
      icon: MessageCircle,
      title: 'Pedidos a WhatsApp',
      description: 'Recibe pedidos directamente en tu WhatsApp con mensajes formateados y profesionales.',
      color: '#F59E0B',
    },
    {
      icon: Globe,
      title: 'Tu Propio Dominio',
      description: 'Cada tienda tiene su URL única: hyuk.vercel.app/mi-tienda. Fácil de compartir.',
      color: '#3B82F6',
    },
    {
      icon: Zap,
      title: 'Rápido y Optimizado',
      description: 'Carga instantánea, SEO optimizado y experiencia de app nativa en móviles.',
      color: '#EF4444',
    },
    {
      icon: BarChart3,
      title: 'Analytics y Métricas',
      description: 'Visualiza visitas, pedidos y conversiones. Toma decisiones basadas en datos.',
      color: '#06B6D4',
    },
  ];

  const presets = [
    { name: 'Comida Rápida', emoji: '🍔', colors: ['#EF4444', '#F59E0B'] },
    { name: 'Botánica', emoji: '🌿', colors: ['#10B981', '#059669'] },
    { name: 'Elegante', emoji: '💎', colors: ['#6366F1', '#8B5CF6'] },
    { name: 'Neón', emoji: '✨', colors: ['#EC4899', '#8B5CF6'] },
  ];

  const plans = [
    {
      name: 'Gratis',
      price: '$0',
      period: 'para siempre',
      features: ['Hasta 10 productos', '1 categoría', 'Personalización básica', 'Pedidos a WhatsApp'],
      cta: 'Comenzar Gratis',
      href: '/signup',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '$19',
      period: 'por mes',
      features: ['Productos ilimitados', 'Categorías ilimitadas', 'Personalización completa', 'Analytics avanzado', 'Soporte prioritario'],
      cta: 'Comenzar Prueba Gratis',
      href: '/signup',
      highlighted: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Star className="w-4 h-4" />
              La plataforma #1 para catálogos digitales
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-text mb-6 leading-tight">
              Tu Menú Digital,
              <span className="text-primary"> Personalizado</span>
              <br />
              y Listo en Minutos
            </h1>

            <p className="text-lg md:text-xl text-text/60 mb-8 max-w-2xl mx-auto">
              Crea tu catálogo digital con personalización extrema. Recibe pedidos directamente en WhatsApp.
              Sin código, sin complicaciones.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-theme-lg bg-primary text-white font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-105"
              >
                Crear mi menú gratis
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-theme-lg bg-card border-2 border-secondary/20 text-text font-bold hover:border-primary/40 transition-all"
              >
                <Smartphone className="w-5 h-5" />
                Ver Demo Interactiva
              </Link>
            </div>

            <p className="text-sm text-text/40 mt-6">
              No requiere tarjeta de crédito · Configuración en 5 minutos
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-text mb-4">
              Todo lo que necesitas para vender más
            </h2>
            <p className="text-lg text-text/60 max-w-2xl mx-auto">
              Herramientas poderosas diseñadas para hacer crecer tu negocio
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-background rounded-theme-xl p-6 border border-secondary/10 hover:border-primary/40 transition-all hover:shadow-lg"
                >
                  <div
                    className="w-12 h-12 rounded-theme-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${feature.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-xl font-bold text-text mb-2">{feature.title}</h3>
                  <p className="text-text/60">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Presets Showcase */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-text mb-4">
              Diseños para cada tipo de negocio
            </h2>
            <p className="text-lg text-text/60 max-w-2xl mx-auto">
              Elige entre múltiples estilos predefinidos o crea el tuyo propio desde cero
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {presets.map((preset, index) => (
              <motion.div
                key={preset.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative aspect-[9/16] rounded-theme-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer group"
                style={{
                  background: `linear-gradient(135deg, ${preset.colors[0]}40, ${preset.colors[1]}40)`,
                }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                    {preset.emoji}
                  </div>
                  <h3 className="text-xl font-bold text-text">{preset.name}</h3>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-text mb-4">
              Planes simples y transparentes
            </h2>
            <p className="text-lg text-text/60 max-w-2xl mx-auto">
              Comienza gratis y escala cuando lo necesites
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className={`relative rounded-theme-xl p-8 border-2 ${
                  plan.highlighted
                    ? 'border-primary shadow-2xl scale-105'
                    : 'border-secondary/10 shadow-lg'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-sm font-bold rounded-full">
                    Más Popular
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-text mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-bold text-text">{plan.price}</span>
                    <span className="text-text/60">/{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-text/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block w-full py-3 rounded-theme-lg font-bold text-center transition-all ${
                    plan.highlighted
                      ? 'bg-primary text-white shadow-lg hover:shadow-xl'
                      : 'bg-secondary/10 text-text hover:bg-secondary/20'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-accent">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              ¿Listo para crear tu catálogo digital?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Únete a cientos de negocios que ya usan HYUK
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-theme-lg bg-white text-primary font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-105"
            >
              Comenzar Ahora - Es Gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-secondary/10 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-theme-lg bg-primary flex items-center justify-center text-white">
                  <Store className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold text-text">HYUK</span>
              </div>
              <p className="text-text/60 max-w-sm">
                La plataforma de catálogos digitales con personalización extrema y pedidos a WhatsApp.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-text mb-4">Producto</h4>
              <ul className="space-y-2">
                <li><Link href="/#features" className="text-text/60 hover:text-primary transition-colors">Características</Link></li>
                <li><Link href="/#pricing" className="text-text/60 hover:text-primary transition-colors">Precios</Link></li>
                <li><Link href="/demo" className="text-text/60 hover:text-primary transition-colors">Demo</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-text mb-4">Empresa</h4>
              <ul className="space-y-2">
                <li><Link href="/signup" className="text-text/60 hover:text-primary transition-colors">Comenzar</Link></li>
                <li><Link href="/login" className="text-text/60 hover:text-primary transition-colors">Iniciar Sesión</Link></li>
                <li><a href="mailto:contacto@hyuk.app" className="text-text/60 hover:text-primary transition-colors">Contacto</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-secondary/10 pt-8 text-center">
            <p className="text-sm text-text/40">
              © {new Date().getFullYear()} HYUK. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}