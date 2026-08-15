'use client';

import { motion } from 'framer-motion';
import { 
  Store, Smartphone, MessageCircle, Palette, Zap, Shield, 
  ArrowRight, Play, CheckCircle, Star, TrendingUp, Users,
  Sparkles, Globe, Lock
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const presets = [
    { 
      id: 'minimal-lux', 
      name: 'Minimal Lux', 
      colors: ['#18181B', '#71717A', '#FAFAFA'],
      description: 'Elegancia limpia con enfoque en fotografía'
    },
    { 
      id: 'fast-casual', 
      name: 'Fast Casual', 
      colors: ['#EA580C', '#7C2D12', '#FFF7ED'],
      description: 'Energía vibrante para comida rápida'
    },
    { 
      id: 'clean-commerce', 
      name: 'Clean Commerce', 
      colors: ['#2563EB', '#1E3A8A', '#F8FAFC'],
      description: 'Comercio electrónico moderno'
    },
    { 
      id: 'cyber-streetwear', 
      name: 'Cyber / Streetwear', 
      colors: ['#22D3EE', '#A855F7', '#09090B'],
      description: 'Estética urbana con neón'
    },
    { 
      id: 'botanica', 
      name: 'Botánica', 
      colors: ['#16A34A', '#14532D', '#F0FDF4'],
      description: 'Natural, orgánico y fresco'
    },
  ];

  const benefits = [
    {
      icon: Zap,
      title: 'Velocidad Extraordinaria',
      description: 'Tu tienda carga en menos de 1 segundo. Optimizada para móviles.',
      metric: '< 1s',
      metricLabel: 'Tiempo de carga',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      size: 'large'
    },
    {
      icon: MessageCircle,
      title: 'Cero Comisiones',
      description: 'Recibe pedidos directamente por WhatsApp. Sin comisiones por venta.',
      metric: '$0',
      metricLabel: 'Comisiones',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      size: 'medium'
    },
    {
      icon: Palette,
      title: 'Personalización Total',
      description: '5 presets profesionales, 4 layouts de tarjetas, fuentes y colores ilimitados.',
      metric: '5+',
      metricLabel: 'Presets',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      size: 'medium'
    },
    {
      icon: Smartphone,
      title: 'Mobile-First',
      description: 'Experiencia nativa en móviles. Bottom sheet, gestos táctiles y más.',
      metric: '100%',
      metricLabel: 'Optimizado',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      size: 'small'
    },
    {
      icon: Shield,
      title: 'Seguridad Empresarial',
      description: 'SSL, backups automáticos y cumplimiento GDPR.',
      metric: '99.9%',
      metricLabel: 'Uptime',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      size: 'small'
    },
  ];

  const plans = [
    {
      name: 'Gratis',
      price: '$0',
      period: 'para siempre',
      description: 'Perfecto para empezar',
      features: [
        'Hasta 10 productos',
        '3 categorías',
        'Personalización básica',
        'WhatsApp checkout',
        'Soporte por email'
      ],
      cta: 'Comenzar gratis',
      href: '/signup',
      popular: false
    },
    {
      name: 'Pro Negocio',
      price: '$19',
      period: '/mes',
      description: 'Para negocios en crecimiento',
      features: [
        'Productos ilimitados',
        'Categorías ilimitadas',
        '5 presets premium',
        'Analytics avanzado',
        'Soporte prioritario',
        'Dominio personalizado'
      ],
      cta: 'Probar 14 días gratis',
      href: '/signup',
      popular: true
    },
    {
      name: 'Enterprise',
      price: '$49',
      period: '/mes',
      description: 'Para empresas escalables',
      features: [
        'Todo lo de Pro',
        'API personalizada',
        'Multi-tienda',
        'Soporte 24/7',
        'SLA garantizado',
        'Onboarding dedicado'
      ],
      cta: 'Contactar ventas',
      href: '/signup',
      popular: false
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero Section - Vercel/Linear Style */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:4rem_4rem]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-3xl opacity-30" />
        
        <div className="relative max-w-7xl mx-auto px-4 pt-20 pb-24 md:pt-32 md:pb-40">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-zinc-300">
                HYUK 2.0 — El motor de catálogos más rápido para WhatsApp
              </span>
            </div>
          </motion.div>

          {/* Title & Subtitle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center max-w-4xl mx-auto mb-12"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                Crea tu tienda digital en minutos.
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Vende por WhatsApp sin comisiones.
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">
              La plataforma que utilizan +500 negocios para crear catálogos digitales 
              personalizables en minutos. Sin código, sin comisiones, sin límites.
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <Link
              href="/signup"
              className="group relative inline-flex items-center gap-2 px-8 py-4 bg-white text-zinc-900 rounded-xl font-semibold shadow-2xl hover:shadow-primary/50 transition-all hover:scale-105"
            >
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative flex items-center gap-2">
                Crear mi tienda gratis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 bg-zinc-900 text-white border border-zinc-700 rounded-xl font-semibold hover:border-zinc-600 transition-all"
            >
              <Play className="w-5 h-5" />
              Ver tienda demo en vivo
            </Link>
          </motion.div>

          {/* Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative flex justify-center"
          >
            <div className="relative">
              {/* Ambient Glow */}
              <div 
                className="absolute -inset-8 rounded-[3rem] opacity-30 blur-3xl"
                style={{ 
                  background: 'linear-gradient(135deg, #10B981, #F59E0B)' 
                }}
              />

              {/* Phone */}
              <div className="relative bg-gradient-to-br from-zinc-800 via-zinc-900 to-black rounded-[2.5rem] p-3 shadow-2xl">
                <div className="bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 rounded-[2rem] p-1.5">
                  <div className="relative rounded-[1.75rem] overflow-hidden bg-white" style={{ aspectRatio: '9/19.5' }}>
                    {/* Dynamic Island */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-20" />

                    {/* Screen Content */}
                    <div className="h-full overflow-hidden bg-gray-50">
                      {/* Header */}
                      <div className="pt-10 pb-3 px-4 bg-primary text-white text-center">
                        <p className="text-sm font-medium">Mi Tienda</p>
                      </div>

                      {/* Products */}
                      <div className="p-3 space-y-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="bg-white rounded-lg p-2 shadow-sm">
                            <div className="flex gap-2">
                              <div className="w-16 h-16 rounded-lg bg-gray-200" />
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-gray-900">Producto {i}</p>
                                <p className="text-[10px] text-gray-500">Descripción corta</p>
                                <p className="text-sm font-bold text-primary mt-1">$99.00</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Notification */}
              <motion.div
                initial={{ opacity: 0, y: 20, x: 20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ delay: 1 }}
                className="absolute -right-4 top-20 bg-white dark:bg-zinc-800 rounded-xl p-3 shadow-2xl border border-gray-200 dark:border-zinc-700 max-w-[200px]"
              >
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">¡Nuevo pedido!</p>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400">$1,200 recibido por WhatsApp</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bento Grid - Benefits */}
      <section className="py-16 md:py-24 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              ¿Por qué elegir HYUK?
            </h2>
            <p className="text-lg text-zinc-400">
              Todo lo que necesitas para vender online
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative group bg-zinc-900/50 backdrop-blur-xl rounded-2xl p-6 md:p-8 border border-white/10 hover:border-white/20 transition-all ${
                    benefit.size === 'large' ? 'md:col-span-2 md:row-span-2' : 
                    benefit.size === 'medium' ? 'md:col-span-1' : 
                    'md:col-span-1'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl ${benefit.bgColor} flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${benefit.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-zinc-400 mb-4">
                    {benefit.description}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">{benefit.metric}</span>
                    <span className="text-sm text-zinc-500">{benefit.metricLabel}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Presets Showcase */}
      <section className="py-16 md:py-24 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Una plataforma, infinitas identidades
            </h2>
            <p className="text-lg text-zinc-400">
              Elige entre 5 presets profesionales y personaliza cada detalle
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {presets.map((preset, index) => (
              <motion.div
                key={preset.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative bg-zinc-800/50 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all cursor-pointer"
              >
                {/* Preview */}
                <div 
                  className="aspect-[3/4] relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})`
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm" />
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-1">
                    {preset.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mb-3">
                    {preset.description}
                  </p>
                  <button className="w-full py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                    Explorar este estilo
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 md:py-24 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Planes simples y transparentes
            </h2>
            <p className="text-lg text-zinc-400">
              Sin sorpresas. Sin comisiones ocultas.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative bg-zinc-900/50 backdrop-blur-xl rounded-2xl p-6 md:p-8 border ${
                  plan.popular 
                    ? 'border-primary/50 shadow-2xl shadow-primary/20' 
                    : 'border-white/10'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary to-accent rounded-full text-xs font-bold text-white">
                    Más Popular
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-zinc-400">{plan.period}</span>
                  </div>
                  <p className="text-sm text-zinc-400">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block w-full py-3 rounded-xl font-semibold text-center transition-all ${
                    plan.popular
                      ? 'bg-white text-zinc-900 hover:bg-zinc-100'
                      : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              ¿Listo para comenzar?
            </h2>
            <p className="text-xl text-zinc-400 mb-8">
              Crea tu catálogo digital en menos de 5 minutos
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-zinc-900 rounded-xl font-semibold shadow-2xl hover:shadow-primary/50 transition-all hover:scale-105"
            >
              Crear mi tienda gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-800 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-zinc-500">
          <p>© 2024 HYUK. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}