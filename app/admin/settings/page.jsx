'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store, User, Mail, Phone, Save, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    tagline: '',
    phone_whatsapp: '',
    email: '',
  });
  const router = useRouter();

  // Lazy load Supabase client
  const [supabase, setSupabase] = useState(null);

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      setSupabase(createClient());
    });
  }, []);

  useEffect(() => {
    if (supabase) {
      loadSettings();
    }
  }, [supabase]);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (profile) {
        setFormData({
          business_name: profile.business_name || '',
          tagline: profile.tagline || '',
          phone_whatsapp: profile.phone_whatsapp || '',
          email: profile.email || user.email || '',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          business_name: formData.business_name,
          tagline: formData.tagline,
          phone_whatsapp: formData.phone_whatsapp,
          email: formData.email,
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Configuración de la Tienda</h1>
          <p className="text-text/60">Administra la información básica de tu negocio</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Negocio */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-theme-xl p-6 border border-secondary/10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-theme-lg bg-primary/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text">Información del Negocio</h2>
                <p className="text-sm text-text/50">Datos básicos que verán tus clientes</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Nombre del Negocio *
                </label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  placeholder="Ej: Mi Restaurante"
                  className="w-full px-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Eslogan o Descripción Corta
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="Ej: Los mejores sabores de la ciudad"
                  className="w-full px-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          </motion.div>

          {/* Información de Contacto */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-theme-xl p-6 border border-secondary/10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-theme-lg bg-blue-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text">Información de Contacto</h2>
                <p className="text-sm text-text/50">Cómo te contactarán tus clientes</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Correo Electrónico *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text/30" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contacto@mitienda.com"
                    className="w-full pl-10 pr-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  WhatsApp (con código de país)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text/30" />
                  <input
                    type="tel"
                    value={formData.phone_whatsapp}
                    onChange={(e) => setFormData({ ...formData, phone_whatsapp: e.target.value })}
                    placeholder="+18091234567"
                    className="w-full pl-10 pr-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <p className="text-xs text-text/40 mt-1">
                  Incluye el código de país (ej: +1 para USA, +52 para México)
                </p>
              </div>
            </div>
          </motion.div>

          {/* Botón de Guardar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-end"
          >
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-theme-lg font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Guardar Cambios
                </>
              )}
            </button>
          </motion.div>
        </form>

        {/* Información Adicional */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-blue-50 border border-blue-200 rounded-theme-xl p-6"
        >
          <h3 className="font-bold text-blue-900 mb-2">💡 Información</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• El nombre del negocio se mostrará en el encabezado de tu catálogo</li>
            <li>• El eslogan aparecerá como subtítulo debajo del nombre</li>
            <li>• El WhatsApp es donde llegarán los pedidos de tus clientes</li>
            <li>• El correo electrónico se usará para notificaciones y recuperación de cuenta</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}