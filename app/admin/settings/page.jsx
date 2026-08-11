'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Store, User, Mail, Phone, Save, Loader2, 
  MapPin, Instagram, Clock, Truck, DollarSign,
  CreditCard, Ban, CheckCircle, XCircle, Image as ImageIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    // Información general
    business_name: '',
    description: '',
    tagline: '',
    phone_whatsapp: '',
    phone_secondary: '',
    email: '',
    address: '',
    instagram_url: '',
    // Logística
    delivery_enabled: true,
    delivery_cost: 3.00,
    minimum_order: 0,
    pickup_enabled: true,
    // Métodos de pago
    payment_methods: {
      cash: true,
      transfer: true,
      card: true,
    },
    transfer_instructions: '',
    // Horarios
    is_open: true,
    schedule: {
      monday: { open: '09:00', close: '18:00', enabled: true },
      tuesday: { open: '09:00', close: '18:00', enabled: true },
      wednesday: { open: '09:00', close: '18:00', enabled: true },
      thursday: { open: '09:00', close: '18:00', enabled: true },
      friday: { open: '09:00', close: '18:00', enabled: true },
      saturday: { open: '09:00', close: '14:00', enabled: true },
      sunday: { open: '00:00', close: '00:00', enabled: false },
    },
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
        const settings = profile.settings || {};
        setFormData({
          // Información general
          business_name: profile.business_name || '',
          description: profile.description || '',
          tagline: profile.tagline || '',
          phone_whatsapp: profile.phone_whatsapp || '',
          phone_secondary: profile.phone_secondary || '',
          email: profile.email || user.email || '',
          address: profile.address || '',
          instagram_url: profile.instagram_url || '',
          // Logística
          delivery_enabled: settings.delivery_enabled ?? true,
          delivery_cost: settings.delivery_cost || 3.00,
          minimum_order: settings.minimum_order || 0,
          pickup_enabled: settings.pickup_enabled ?? true,
          // Métodos de pago
          payment_methods: settings.payment_methods || {
            cash: true,
            transfer: true,
            card: true,
          },
          transfer_instructions: settings.transfer_instructions || '',
          // Horarios
          is_open: settings.is_open ?? true,
          schedule: settings.schedule || formData.schedule,
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
          // Información general
          business_name: formData.business_name,
          description: formData.description,
          tagline: formData.tagline,
          phone_whatsapp: formData.phone_whatsapp,
          phone_secondary: formData.phone_secondary,
          email: formData.email,
          address: formData.address,
          instagram_url: formData.instagram_url,
          // Configuración en settings JSONB
          settings: {
            delivery_enabled: formData.delivery_enabled,
            delivery_cost: formData.delivery_cost,
            minimum_order: formData.minimum_order,
            pickup_enabled: formData.pickup_enabled,
            payment_methods: formData.payment_methods,
            transfer_instructions: formData.transfer_instructions,
            is_open: formData.is_open,
            schedule: formData.schedule,
          },
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
          <p className="text-text/60">Administra la información, logística y horarios de tu negocio</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'general'
                ? 'bg-primary text-white'
                : 'bg-card text-text hover:bg-secondary/10'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('logistics')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'logistics'
                ? 'bg-primary text-white'
                : 'bg-card text-text hover:bg-secondary/10'
            }`}
          >
            Logística
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'schedule'
                ? 'bg-primary text-white'
                : 'bg-card text-text hover:bg-secondary/10'
            }`}
          >
            Horarios
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tab: Información General */}
          {activeTab === 'general' && (
            <>
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
                      Descripción del Negocio
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe tu negocio en una o dos líneas..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors resize-none"
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
                    <h2 className="text-xl font-bold text-text">Canales de Contacto</h2>
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
                      WhatsApp Principal (con código de país)
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
                      Los pedidos llegarán a este número
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      Teléfono Secundario (opcional)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text/30" />
                      <input
                        type="tel"
                        value={formData.phone_secondary}
                        onChange={(e) => setFormData({ ...formData, phone_secondary: e.target.value })}
                        placeholder="+18091234567"
                        className="w-full pl-10 pr-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      Dirección Física
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text/30" />
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Calle Principal #123, Santo Domingo"
                        className="w-full pl-10 pr-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      Instagram (opcional)
                    </label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text/30" />
                      <input
                        type="url"
                        value={formData.instagram_url}
                        onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                        placeholder="https://instagram.com/mitienda"
                        className="w-full pl-10 pr-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}

          {/* Tab: Logística */}
          {activeTab === 'logistics' && (
            <>
              {/* Estado de la Tienda */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-theme-xl p-6 border border-secondary/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-theme-lg bg-primary/10 flex items-center justify-center">
                      <Store className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-text">Estado de la Tienda</h2>
                      <p className="text-sm text-text/50">Control manual de apertura/cierre</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_open: !formData.is_open })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      formData.is_open
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {formData.is_open ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Abierta
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5" />
                        Cerrada
                      </>
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Métodos de Entrega */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card rounded-theme-xl p-6 border border-secondary/10"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-theme-lg bg-primary/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text">Métodos de Entrega</h2>
                    <p className="text-sm text-text/50">Configura cómo llegarán tus productos</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Delivery */}
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-text/60" />
                      <div>
                        <p className="font-medium text-text">Delivery</p>
                        <p className="text-xs text-text/50">Entrega a domicilio</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.delivery_enabled}
                        onChange={(e) => setFormData({ ...formData, delivery_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {formData.delivery_enabled && (
                    <div className="grid grid-cols-2 gap-4 pl-4">
                      <div>
                        <label className="block text-sm font-medium text-text mb-2">
                          Costo de Envío (DOP)
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text/30" />
                          <input
                            type="number"
                            step="0.01"
                            value={formData.delivery_cost}
                            onChange={(e) => setFormData({ ...formData, delivery_cost: parseFloat(e.target.value) || 0 })}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text mb-2">
                          Monto Mínimo (DOP)
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text/30" />
                          <input
                            type="number"
                            step="0.01"
                            value={formData.minimum_order}
                            onChange={(e) => setFormData({ ...formData, minimum_order: parseFloat(e.target.value) || 0 })}
                            placeholder="0 = sin mínimo"
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Retiro en Local */}
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                    <div className="flex items-center gap-3">
                      <Store className="w-5 h-5 text-text/60" />
                      <div>
                        <p className="font-medium text-text">Retiro en Local</p>
                        <p className="text-xs text-text/50">Cliente retira personalmente</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.pickup_enabled}
                        onChange={(e) => setFormData({ ...formData, pickup_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </motion.div>

              {/* Métodos de Pago */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card rounded-theme-xl p-6 border border-secondary/10"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-theme-lg bg-primary/10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text">Métodos de Pago</h2>
                    <p className="text-sm text-text/50">Formas de pago aceptadas</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 bg-background rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-text/60" />
                      <div>
                        <p className="font-medium text-text">Efectivo</p>
                        <p className="text-xs text-text/50">Pago en efectivo al recibir</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.payment_methods.cash}
                      onChange={(e) => setFormData({
                        ...formData,
                        payment_methods: { ...formData.payment_methods, cash: e.target.checked }
                      })}
                      className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-background rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-text/60" />
                      <div>
                        <p className="font-medium text-text">Transferencia Bancaria</p>
                        <p className="text-xs text-text/50">Pago por transferencia o Zelle</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.payment_methods.transfer}
                      onChange={(e) => setFormData({
                        ...formData,
                        payment_methods: { ...formData.payment_methods, transfer: e.target.checked }
                      })}
                      className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-background rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-text/60" />
                      <div>
                        <p className="font-medium text-text">Tarjeta al Entregar</p>
                        <p className="text-xs text-text/50">Pago con tarjeta en el momento</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.payment_methods.card}
                      onChange={(e) => setFormData({
                        ...formData,
                        payment_methods: { ...formData.payment_methods, card: e.target.checked }
                      })}
                      className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </label>
                </div>

                {formData.payment_methods.transfer && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-text mb-2">
                      Instrucciones de Transferencia
                    </label>
                    <textarea
                      value={formData.transfer_instructions}
                      onChange={(e) => setFormData({ ...formData, transfer_instructions: e.target.value })}
                      placeholder="Ej: Banco: Banco Popular, Cuenta: 1234567890, Titular: Mi Tienda, RNC: 123456789"
                      rows={3}
                      className="w-full px-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors resize-none"
                    />
                    <p className="text-xs text-text/40 mt-1">
                      Esta información se incluirá en el ticket de pedido
                    </p>
                  </div>
                )}
              </motion.div>
            </>
          )}

          {/* Tab: Horarios */}
          {activeTab === 'schedule' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-theme-xl p-6 border border-secondary/10"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-theme-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text">Horarios de Atención</h2>
                  <p className="text-sm text-text/50">Define tu horario de atención por día</p>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(formData.schedule).map(([day, hours]) => (
                  <div key={day} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                    <div className="w-24">
                      <p className="text-sm font-medium text-text capitalize">
                        {day === 'monday' && 'Lunes'}
                        {day === 'tuesday' && 'Martes'}
                        {day === 'wednesday' && 'Miércoles'}
                        {day === 'thursday' && 'Jueves'}
                        {day === 'friday' && 'Viernes'}
                        {day === 'saturday' && 'Sábado'}
                        {day === 'sunday' && 'Domingo'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hours.enabled}
                        onChange={(e) => setFormData({
                          ...formData,
                          schedule: {
                            ...formData.schedule,
                            [day]: { ...hours, enabled: e.target.checked }
                          }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                    {hours.enabled && (
                      <div className="flex items-center gap-2 ml-auto">
                        <input
                          type="time"
                          value={hours.open}
                          onChange={(e) => setFormData({
                            ...formData,
                            schedule: {
                              ...formData.schedule,
                              [day]: { ...hours, open: e.target.value }
                            }
                          })}
                          className="px-3 py-1.5 rounded-lg border border-secondary/10 bg-background text-text text-sm focus:outline-none focus:border-primary transition-colors"
                        />
                        <span className="text-text/40">—</span>
                        <input
                          type="time"
                          value={hours.close}
                          onChange={(e) => setFormData({
                            ...formData,
                            schedule: {
                              ...formData.schedule,
                              [day]: { ...hours, close: e.target.value }
                            }
                          })}
                          className="px-3 py-1.5 rounded-lg border border-secondary/10 bg-background text-text text-sm focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Botón de Guardar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
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
          transition={{ delay: 0.4 }}
          className="mt-8 bg-blue-50 border border-blue-200 rounded-theme-xl p-6"
        >
          <h3 className="font-bold text-blue-900 mb-2">💡 Información</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• El nombre del negocio se mostrará en el encabezado de tu catálogo</li>
            <li>• El eslogan aparecerá como subtítulo debajo del nombre</li>
            <li>• El WhatsApp es donde llegarán los pedidos de tus clientes</li>
            <li>• El correo electrónico se usará para notificaciones y recuperación de cuenta</li>
            <li>• Los horarios se mostrarán en tu catálogo público</li>
            <li>• Si la tienda está cerrada, los clientes no podrán hacer pedidos</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
