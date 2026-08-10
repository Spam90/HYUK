'use client';

import { motion } from 'framer-motion';
import { 
  Store, Smartphone, MessageCircle, Palette, Zap, Shield, 
  ArrowRight, Play, CheckCircle, Star, TrendingUp, Users 
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const presets = [
    { 
      id: 'elegant', 
      name: 'Elegante', 
      colors: ['#1a1a1a', '#d4af37', '#f5f5f5'],
      description: 'Diseño sofisticado y minimalista'
    },
    { 
      id: 'fast-food', 
      name: 'Comida Rápida', 
      colors: ['#ff6b35', '#f7c548', '#fff'],
      description: 'Colores vibrantes y energéticos'
    },
    { 
      id: 'botanical', 
      name: 'Botánica', 
      colors: ['#2d5016', '#8fb339', '#f1f8e9'],
      description: 'Natural y fresco'
    },
    { 
      id: 'neon', 
      name: 'Neón Nocturno', 
      colors: ['#0f0f0f', '#ff00ff', '#00ffff'],
      description: 'Estilo urbano y moderno'
    },
    { 
      id: 'minimal', 
      name: 'Minimalista', 
      colors: ['#ffffff', '#000000', '#f5f5f5'],
      description: 'Limpio y profesional'
    },
  ];

  const benefits = [
    {
      icon: Zap,
      title: 'Configuración en 5 minutos',
      description: 'Sin código, sin complicaciones. Crea tu catálogo en minutos.',
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    {
      icon: MessageCircle,
      title: 'Pedidos a WhatsApp',
      description: 'Recibe pedidos directamente sin comisiones por venta.',
      color: 'bg-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      icon: Palette,
      title: 'Personalización total',
      description: 'Colores, fuentes, logos y layouts a tu gusto.',
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      icon: Smartphone,
      title: '100% Optimizado para móviles',
      description: 'La mejor experiencia para tus clientes.',
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Hero Section - Tiendanube Style */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:from-zinc-900 dark:to-zinc-950">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-center md:text-left"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                Crea tu catálogo digital hoy y recibe pedidos en{' '}
                <span className="text-green-600 dark:text-green-400">WhatsApp</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8">
                La plataforma más fácil para crear tu tienda online. Sin comisiones, sin complicaciones.
              </p>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  Crear mi tienda gratis
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-zinc-700 rounded-xl font-semibold hover:border-primary transition-all"
                >
                  <Play className="w-5 h-5" />
                  Ver tienda de ejemplo
                </Link>
              </div>

              {/* Social Proof */}
              <div className="mt-8 flex items-center justify-center md:justify-start gap-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-white dark:border-zinc-900" />
                    ))}
                  </div>
                  <span className="font-medium">+500 tiendas activas</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">4.9/5</span>
                </div>
              </div>
            </motion.div>

            {/* Right Content - Phone Mockup */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative flex justify-center"
            >
              {/* Phone Frame */}
              <div className="relative">
                {/* Ambient Glow */}
                <div 
                  className="absolute -inset-8 rounded-[3rem] opacity-20 blur-3xl"
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

                {/* Floating Notification - Tiendanube Style */}
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
        </div>
      </section>

      {/* Presets Gallery - Tiendanube Style */}
      <section className="py-16 md:py-24 bg-gray-50 dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Diseños que enamoran
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Elige entre múltiples estilos profesionales
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {presets.map((preset, index) => (
              <motion.div
                key={preset.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group bg-white dark:bg-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer"
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
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {preset.name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    {preset.description}
                  </p>
                  <button className="w-full py-2 rounded-lg bg-gray-100 dark:bg-zinc-700 text-gray-900 dark:text-white text-sm font-medium hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors">
                    Previsualizar
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Grid - Bento Grid Tiendanube Style */}
      <section className="py-16 md:py-24 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              ¿Por qué elegir HYUK?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Todo lo que necesitas para vender online
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${benefit.bgColor} rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-zinc-800 hover:shadow-lg transition-all`}
                >
                  <div className={`w-12 h-12 rounded-xl ${benefit.color} bg-opacity-10 flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${benefit.color.replace('bg-', 'text-')}`} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {benefit.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 md:py-24 bg-primary">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              ¿Listo para comenzar?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Crea tu catálogo digital en menos de 5 minutos
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              Crear mi tienda gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>© 2024 HYUK. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}