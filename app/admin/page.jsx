'use client';

import { motion } from 'framer-motion';
import { Palette, Package, ShoppingBag, Settings, ExternalLink, LogOut, Store, FolderOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminDashboard() {
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-secondary/10 p-4 hidden md:flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-theme-lg bg-primary flex items-center justify-center text-white">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-text">SAS Admin</h1>
            <p className="text-xs text-text/40">Panel de control</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <a
            href="/admin/customize"
            className="flex items-center gap-3 px-4 py-3 rounded-theme-lg text-text/60 hover:bg-secondary/5 hover:text-text transition-colors"
          >
            <Palette className="w-4 h-4" />
            Personalizar
          </a>
          <a
            href="/admin/categories"
            className="flex items-center gap-3 px-4 py-3 rounded-theme-lg text-text/60 hover:bg-secondary/5 hover:text-text transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            Categorías
          </a>
          <a
            href="/admin/products"
            className="flex items-center gap-3 px-4 py-3 rounded-theme-lg text-text/60 hover:bg-secondary/5 hover:text-text transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Productos
          </a>
          <a
            href="/admin/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-theme-lg text-text/60 hover:bg-secondary/5 hover:text-text transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configuración
          </a>
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-theme-lg text-text/60 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>

      {/* Main content */}
      <div className="md:ml-64 p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-text mb-6">Dashboard</h1>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Productos', value: '0', icon: ShoppingBag, color: '#10B981' },
              { label: 'Categorías', value: '0', icon: Package, color: '#8B5CF6' },
              { label: 'Pedidos', value: '0', icon: ExternalLink, color: '#F59E0B' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-theme-xl p-6 border border-secondary/10"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-theme-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: stat.color }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-bold text-text">{stat.value}</span>
                  </div>
                  <p className="text-sm font-medium text-text/60">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.a
              href="/admin/customize"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="group bg-card rounded-theme-xl p-6 border border-secondary/10 hover:border-primary/40 transition-all"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-theme-lg bg-primary/10 flex items-center justify-center">
                  <Palette className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-text">Personalizar Catálogo</h3>
                  <p className="text-sm text-text/40">Colores, layouts y estilos</p>
                </div>
              </div>
              <p className="text-sm text-text/60 mb-4">
                Personaliza el aspecto visual de tu catálogo con vista previa en tiempo real.
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                Ir a personalizar
                <ExternalLink className="w-4 h-4" />
              </span>
            </motion.a>

            <motion.a
              href="/admin/products"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="group bg-card rounded-theme-xl p-6 border border-secondary/10 hover:border-primary/40 transition-all"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-theme-lg bg-accent/10 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-bold text-text">Gestionar Productos</h3>
                  <p className="text-sm text-text/40">Agrega y edita productos</p>
                </div>
              </div>
              <p className="text-sm text-text/60 mb-4">
                Administra tu catálogo de productos, precios, categorías y disponibilidad.
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                Gestionar productos
                <ExternalLink className="w-4 h-4" />
              </span>
            </motion.a>
          </div>
        </div>
      </div>
    </div>
  );
}