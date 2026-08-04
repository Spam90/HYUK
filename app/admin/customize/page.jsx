'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, LayoutGrid, Image as ImageIcon, MessageCircle, Save, RotateCcw, Check, ArrowLeft, Smartphone } from 'lucide-react';
import ThemeProvider, { useTheme } from '@/components/theme/ThemeProvider';
import { CartProvider } from '@/context/CartContext';
import { DEFAULT_SETTINGS } from '@/lib/theme/defaults';
import ColorControls from '@/components/admin/controls/ColorControls';
import LayoutControls from '@/components/admin/controls/LayoutControls';
import BannerControls from '@/components/admin/controls/BannerControls';
import WhatsAppControls from '@/components/admin/controls/WhatsAppControls';
import PhonePreview from '@/components/admin/PhonePreview';

// Tabs de configuración
const TABS = [
  { id: 'colors', label: 'Colores y Estilo', icon: Palette },
  { id: 'layout', label: 'Layout y Retícula', icon: LayoutGrid },
  { id: 'banner', label: 'Banners y Header', icon: ImageIcon },
  { id: 'whatsapp', label: 'WhatsApp & Checkout', icon: MessageCircle },
];

function CustomizePanel() {
  const { settings, updateSettings, resetSettings } = useTheme();
  const [activeTab, setActiveTab] = useState('colors');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Simular guardado
  const handleSave = () => {
    setIsSaving(true);
    // En producción: guardar en Supabase
    setTimeout(() => {
      setIsSaving(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }, 1000);
  };

  // Renderizar controles según tab activo
  const renderControls = () => {
    switch (activeTab) {
      case 'colors':
        return <ColorControls settings={settings} updateSettings={updateSettings} />;
      case 'layout':
        return <LayoutControls settings={settings} updateSettings={updateSettings} />;
      case 'banner':
        return <BannerControls settings={settings} updateSettings={updateSettings} />;
      case 'whatsapp':
        return <WhatsAppControls settings={settings} updateSettings={updateSettings} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Barra superior */}
      <header className="sticky top-0 z-50 bg-card border-b border-secondary/10 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary/5 hover:bg-secondary/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </a>
            <div>
              <h1 className="font-bold text-text">Personalizar Catálogo</h1>
              <p className="text-xs text-text/40">Los cambios se reflejan en tiempo real</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botón reset */}
            <button
              onClick={resetSettings}
              className="flex items-center gap-1.5 px-3 py-2 rounded-theme-lg text-sm font-medium text-text/60 hover:text-text transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Restablecer</span>
            </button>

            {/* Botón guardar */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-theme-lg text-sm font-bold text-white shadow-lg transition-all ${
                isSaved ? 'bg-green-500' : ''
              }`}
              style={!isSaved ? { backgroundColor: settings.theme.primaryColor } : {}}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  Guardado
                </>
              ) : isSaving ? (
                <span className="animate-pulse">Guardando...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar
                </>
              )}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Split-screen layout */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Panel izquierdo - Controles */}
        <div className="w-full lg:w-[420px] xl:w-[480px] border-r border-secondary/10 flex flex-col bg-card/50">
          {/* Tabs */}
          <div className="flex border-b border-secondary/10 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                    isActive ? 'text-primary' : 'text-text/50 hover:text-text'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Contenido de controles */}
          <div className="flex-1 overflow-y-auto admin-scroll p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderControls()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Panel derecho - Preview */}
        <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-secondary/5 to-primary/5 p-8">
          <PhonePreview settings={settings} />
        </div>
      </div>

      {/* Preview móvil (solo en pantallas pequeñas) */}
      <div className="lg:hidden fixed bottom-4 right-4 z-40">
        <button
          onClick={() => document.getElementById('mobile-preview')?.scrollIntoView({ behavior: 'smooth' })}
          className="w-12 h-12 rounded-full bg-primary text-white shadow-xl flex items-center justify-center"
        >
          <Smartphone className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default function CustomizePage() {
  return (
    <ThemeProvider initialSettings={DEFAULT_SETTINGS}>
      <CartProvider>
        <CustomizePanel />
      </CartProvider>
    </ThemeProvider>
  );
}