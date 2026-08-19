'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, LayoutGrid, Image as ImageIcon, MessageCircle, Save, RotateCcw, Check, Smartphone, Loader2, Sparkles } from 'lucide-react';
import ThemeProvider, { useTheme } from '@/components/theme/ThemeProvider';
import { CartProvider } from '@/context/CartContext';
import { DEFAULT_SETTINGS } from '@/lib/theme/defaults';
import { createClient } from '@/lib/supabase/client';
import ColorControls from '@/components/admin/controls/ColorControls';
import LayoutControls from '@/components/admin/controls/LayoutControls';
import BannerControls from '@/components/admin/controls/BannerControls';
import WhatsAppControls from '@/components/admin/controls/WhatsAppControls';
import AiCustomizePanel from '@/components/admin/controls/AiCustomizePanel';
import PhonePreview from '@/components/admin/PhonePreview';

// Tabs de configuración
const TABS = [
  { id: 'ai', label: 'Personalizar con IA', icon: Sparkles },
  { id: 'colors', label: 'Colores y Estilo', icon: Palette },
  { id: 'layout', label: 'Layout y Retícula', icon: LayoutGrid },
  { id: 'banner', label: 'Banners y Header', icon: ImageIcon },
  { id: 'whatsapp', label: 'WhatsApp & Checkout', icon: MessageCircle },
];

function CustomizePanel() {
  const { settings, updateSettings, resetSettings, updateFullSettings } = useTheme();
  const [activeTab, setActiveTab] = useState('colors');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Lazy load Supabase client to avoid build errors
  const [supabase, setSupabase] = useState(null);
  
  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      setSupabase(createClient());
    });
  }, []);

  // Cargar settings desde Supabase al montar
  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setError('No hay sesión activa');
          setIsLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', user.id)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching settings:', fetchError);
          throw fetchError;
        }

        if (data?.settings) {
          updateFullSettings(data.settings);
        } else {
          // Create profile if it doesn't exist
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({ id: user.id, settings: settings });
          
          if (insertError) {
            console.error('Error creating profile:', insertError);
          }
        }
      } catch (err) {
        console.error('Error cargando settings:', err);
        const errorMessage = err?.message || 'Error al cargar la configuración';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [updateFullSettings]);

  // Guardar cambios en Supabase
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error('Cliente de Supabase no inicializado');
      }
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No hay sesión activa');
      }

      const { data, error: updateError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, settings })
        .select()
        .single();

      if (updateError) {
        console.error('Error saving settings:', updateError);
        alert(`Error al guardar: ${updateError.message || 'Verifica que el schema SQL esté ejecutado correctamente'}`);
        return;
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      console.log('Settings saved successfully:', data);
    } catch (err) {
      console.error('Error saving settings:', err);
      const errorMessage = err?.message || 'Error al guardar la configuración';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Renderizar controles según tab activo
  const renderControls = () => {
        switch (activeTab) {
      case 'ai':
        return (
          <AiCustomizePanel
            settings={settings}
            updateSettings={updateSettings}
            updateFullSettings={updateFullSettings}
          />
        );
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
              disabled={isSaving || isLoading}
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
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
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

      {/* Notificación de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-theme-lg mx-4 mt-4">
          <p className="font-medium">Error:</p>
          <p className="text-sm">{typeof error === 'object' ? JSON.stringify(error) : error}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: settings.theme.primaryColor }} />
            <p className="text-text/60">Cargando configuración...</p>
          </div>
        </div>
      )}

      {/* Split-screen layout */}
      {!isLoading && (
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
      )}

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

export const dynamic = 'force-dynamic';

export default function CustomizePage() {
  return (
    <ThemeProvider initialSettings={DEFAULT_SETTINGS}>
      <CartProvider>
        <CustomizePanel />
      </CartProvider>
    </ThemeProvider>
  );
}
