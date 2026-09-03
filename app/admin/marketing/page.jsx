'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, Plus, Edit2, Trash2, Percent, DollarSign, Clock,
  Tag, Save, Loader2, X, ToggleLeft, ToggleRight, CalendarDays,
  BellRing, Copy, CheckCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

const DEFAULT_MARKETING = {
  showAnnouncementBar: true,
  announcementText: '🎉 ¡Usa el cupón HYUK10 para obtener 10% de descuento en tu primer pedido!',
  showPopup: false,
  popupTitle: '🎁 ¡Bienvenido a nuestra tienda!',
  popupText: 'Obtén un 10% de descuento en tu primer pedido usando el cupón HYUK10.',
  popupButtonLabel: '¡Comenzar!',
};

export default function MarketingPage() {
  const [coupons, setCoupons] = useState([]);
  const [marketing, setMarketing] = useState(DEFAULT_MARKETING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('coupons');
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const router = useRouter();

  const [supabase, setSupabase] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      setSupabase(createClient());
    });
  }, []);

  useEffect(() => {
    if (supabase) {
      loadData();
    }
  }, [supabase]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('settings, business_name')
        .eq('id', user.id)
        .single();

      if (profile?.settings?.marketing) {
        setMarketing({ ...DEFAULT_MARKETING, ...profile.settings.marketing });
      }

      const { data: couponsData } = await supabase
        .from('coupons')
        .select('*')
        .eq('store_id', user.id)
        .order('created_at', { ascending: false });

      setCoupons(couponsData || []);
    } catch (error) {
      console.error('Error loading marketing data:', error);
      alert('Error al cargar datos de marketing. Verifica que el schema SQL (tabla coupons) esté ejecutado.');
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percent',
    discount_value: '',
    max_uses: '',
    expires_at: '',
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percent',
      discount_value: '',
      max_uses: '',
      expires_at: '',
      is_active: true,
    });
  };

  const openCreateModal = () => {
    setEditingCoupon(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      max_uses: coupon.max_uses ? String(coupon.max_uses) : '',
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : '',
      is_active: coupon.is_active,
    });
    setShowModal(true);
  };

  const handleSubmitCoupon = async (e) => {
    e.preventDefault();
    if (!supabase || !userId) return;

    if (!formData.code.trim() || !formData.discount_value) {
      alert('Completa el código y el valor del descuento');
      return;
    }

    try {
      const couponData = {
        store_id: userId,
        code: String(formData.code).trim().toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value) || 0,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        is_active: formData.is_active,
      };

      let error;
      if (editingCoupon) {
        const result = await supabase.from('coupons').update(couponData).eq('id', editingCoupon.id);
        error = result.error;
      } else {
        const result = await supabase.from('coupons').insert(couponData);
        error = result.error;
      }

      if (error) throw error;

      setShowModal(false);
      resetForm();
      loadData();
      alert('Cupón guardado exitosamente');
    } catch (error) {
      console.error('Error saving coupon:', error);
      // PROMPT 13: mensaje seguro; el detalle técnico queda en el log.
      alert(error.message?.includes('duplicate') || error.message?.includes('23505')
        ? 'Ya existe un cupón con ese código'
        : 'No se pudo guardar el cupón. Intenta de nuevo.');
    }
  };
const handleDeleteCoupon = async (id) => {
    if (!confirm('¿Eliminar este cupón?')) return;
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      alert('Error al eliminar el cupón');
    }
  };

  const handleToggleCoupon = async (coupon) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: !coupon.is_active })
        .eq('id', coupon.id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error toggling coupon:', error);
    }
  };

  const handleSaveMarketing = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single();

      const settings = {
        ...(profile?.settings || {}),
        marketing,
      };

      const { error } = await supabase
        .from('profiles')
        .update({ settings })
        .eq('id', user.id);

      if (error) throw error;
      alert('Configuración de promociones guardada');
    } catch (error) {
      console.error('Error saving marketing', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const getCouponStatus = (coupon) => {
    if (!coupon.is_active) return { label: 'Inactivo', cls: 'bg-gray-100 text-gray-600' };
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { label: 'Expirado', cls: 'bg-red-100 text-red-600' };
    }
    if (coupon.max_uses && (coupon.used_count || 0) >= coupon.max_uses) {
      return { label: 'Agotado', cls: 'bg-orange-100 text-orange-600' };
    }
    return { label: 'Activo', cls: 'bg-green-100 text-green-700' };
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
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-theme-xl bg-primary/10 flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text">Marketing y Fidelización</h1>
              <p className="text-text/60">Cupones de descuento y promociones para tu tienda</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('coupons')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'coupons'
                ? 'bg-primary text-white'
                : 'bg-card text-text hover:bg-secondary/10'
            }`}
          >
            <Tag className="w-4 h-4 inline mr-1.5" />
            Cupones de Descuento
          </button>
          <button
            onClick={() => setActiveTab('promos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'promos'
                ? 'bg-primary text-white'
                : 'bg-card text-text hover:bg-secondary/10'
            }`}
          >
            <BellRing className="w-4 h-4 inline mr-1.5" />
            Banners y Popups
          </button>
        </div>
{/* ===== TAB CUPONES ===== */}
        {activeTab === 'coupons' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-text/60">
                {coupons.length} {coupons.length === 1 ? 'cupón creado' : 'cupones creados'}
              </p>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-theme-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="w-4 h-4" />
                Nuevo Cupón
              </button>
            </div>

            {coupons.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-theme-xl p-12 border-2 border-dashed border-secondary/20 text-center"
              >
                <Tag className="w-16 h-16 text-secondary/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-text mb-2">Crea tu primer cupón</h3>
                <p className="text-text/60 max-w-md mx-auto mb-6">
                  Ofrece descuentos porcentuales o montos fijos. Ej: <b>HYUK10</b> para un 10% de descuento en el primer pedido.
                </p>
                <button
                  onClick={openCreateModal}
                  className="px-6 py-3 bg-primary text-white rounded-theme-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  + Crear cupón de bienvenida
                </button>
              </motion.div>
            ) : (
<div className="space-y-3">
                {coupons.map((coupon, index) => {
                  const status = getCouponStatus(coupon);
                  const usage = coupon.max_uses
                    ? `${coupon.used_count || 0}/${coupon.max_uses} usos`
                    : `${coupon.used_count || 0} usos`;
                  return (
                    <motion.div
                      key={coupon.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card rounded-theme-xl p-5 border border-secondary/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <button
                            onClick={() => copyCode(coupon.code)}
                            className="group flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary font-mono font-bold px-4 py-2 rounded-theme-lg transition-colors"
                            title="Copiar código"
                          >
                            {coupon.code}
                            {copiedCode === coupon.code ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                            )}
                          </button>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${status.cls}`}>
                            {status.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-sm text-text/70 flex-wrap">
                          <span className="flex items-center gap-1.5 font-semibold">
                            {coupon.discount_type === 'percent' ? (
                              <>
                                <Percent className="w-4 h-4 text-primary" />
                                {parseFloat(coupon.discount_value).toFixed(0)}% de descuento
                              </>
                            ) : (
                              <>
                                <DollarSign className="w-4 h-4 text-primary" />
                                ${parseFloat(coupon.discount_value).toFixed(2)} de descuento
                              </>
                            )}
                          </span>
                          <span className="flex items-center gap-1.5 text-text/50">
                            <Clock className="w-3.5 h-3.5" />
                            {usage}
                          </span>
                          {coupon.expires_at && (
                            <span className="flex items-center gap-1.5 text-text/50">
                              <CalendarDays className="w-3.5 h-3.5" />
                              Expira: {new Date(coupon.expires_at).toLocaleDateString('es-DO')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleCoupon(coupon)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-theme-lg text-xs font-semibold transition-colors ${
                            coupon.is_active
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {coupon.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          {coupon.is_active ? 'Activo' : 'Inactivo'}
                        </button>
                        <button
                          onClick={() => openEditModal(coupon)}
                          className="p-2 rounded-theme-lg bg-secondary/10 hover:bg-secondary/20 transition-colors text-text"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="p-2 rounded-theme-lg bg-red-50 hover:bg-red-100 transition-colors text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
{/* ===== TAB BANNERS / POPUPS ===== */}
        {activeTab === 'promos' && (
          <form onSubmit={handleSaveMarketing} className="space-y-6">
            {/* Barra de anuncio */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-theme-xl p-6 border border-secondary/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-theme-lg bg-primary/10 flex items-center justify-center">
                    <BellRing className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text">Barra de Anuncio Superior</h2>
                    <p className="text-sm text-text/50">Ticker visible sobre el catálogo</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMarketing({ ...marketing, showAnnouncementBar: !marketing.showAnnouncementBar })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    marketing.showAnnouncementBar ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {marketing.showAnnouncementBar ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  {marketing.showAnnouncementBar ? 'Visible' : 'Oculto'}
                </button>
              </div>

              {marketing.showAnnouncementBar && (
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Texto del anuncio
                  </label>
                  <input
                    type="text"
                    value={marketing.announcementText}
                    onChange={(e) => setMarketing({ ...marketing, announcementText: e.target.value })}
                    placeholder="Ej: 🚚 ¡Envío gratis en pedidos mayores a $1,000!"
                    className="w-full px-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-text/40 mt-1">
                    Aparece en la parte superior de tu catálogo con el color principal de tu tienda
                  </p>
                </div>
              )}
            </motion.div>
{/* Popup promocional */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-theme-xl p-6 border border-secondary/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-theme-lg bg-primary/10 flex items-center justify-center">
                    <Megaphone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text">Popup Promocional</h2>
                    <p className="text-sm text-text/50">Aviso modal al entrar a la tienda</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMarketing({ ...marketing, showPopup: !marketing.showPopup })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    marketing.showPopup ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {marketing.showPopup ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  {marketing.showPopup ? 'Activo' : 'Inactivo'}
                </button>
              </div>

              {marketing.showPopup && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Título</label>
                    <input
                      type="text"
                      value={marketing.popupTitle}
                      onChange={(e) => setMarketing({ ...marketing, popupTitle: e.target.value })}
                      placeholder="Ej: 🎁 ¡2x1 en Hamburguesas los Jueves!"
                      className="w-full px-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Mensaje</label>
                    <textarea
                      value={marketing.popupText}
                      onChange={(e) => setMarketing({ ...marketing, popupText: e.target.value })}
                      placeholder="Ej: Todos los jueves, 2x1 en hamburguesas. ¡No te lo pierdas!"
                      rows={3}
                      className="w-full px-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Texto del botón</label>
                    <input
                      type="text"
                      value={marketing.popupButtonLabel}
                      onChange={(e) => setMarketing({ ...marketing, popupButtonLabel: e.target.value })}
                      placeholder="Ej: ¡Quiero mi descuento!"
                      className="w-full px-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              )}
            </motion.div>
{/* Botón guardar */}
            <div className="flex justify-end">
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
                    Guardar Promociones
                  </>
                )}
              </button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-blue-50 border border-blue-200 rounded-theme-xl p-6"
            >
              <h3 className="font-bold text-blue-900 mb-2">💡 Consejos de Fidelización</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Usa códigos memorables como <b>BIENVENIDA10</b> o <b>2X1JUEVES</b></li>
                <li>• El popup aparece solo cuando la tienda lo muestra; también puedes combinarlo con WhatsApp</li>
                <li>• Limita los usos máximos para controlar promociones de alto costo</li>
                <li>• Los cupones se aplican automáticamente en el carrito de tus clientes</li>
              </ul>
            </motion.div>
          </form>
        )}
      </div>
{/* ===== MODAL CUPÓN ===== */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-card rounded-theme-xl p-6 w-full max-w-lg shadow-2xl pointer-events-auto max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-text">
                    {editingCoupon ? 'Editar Cupón' : 'Nuevo Cupón'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-full hover:bg-secondary/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-text/60" />
                  </button>
                </div>

                <form onSubmit={handleSubmitCoupon} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      Código del Cupón *
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text/30" />
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="Ej: HYUK10, BIENVENIDA, 2X1JUEVES"
                        className="w-full pl-10 pr-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-text font-mono font-bold uppercase focus:outline-none focus:border-primary transition-colors"
                        required
                      />
                    </div>
                    <p className="text-xs text-text/40 mt-1">Sin espacios, todo en mayúsculas</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">Tipo de Descuento</label>
                      <select
                        value={formData.discount_type}
                        onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                        className="w-full px-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors"
                      >
                        <option value="percent">Porcentaje (%)</option>
                        <option value="fixed">Monto fijo ($)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">Valor *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text/40 font-bold">
                          {formData.discount_type === 'percent' ? '%' : '$'}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.discount_value}
                          onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">
                        Límite de Usos
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.max_uses}
                        onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                        placeholder="Ilimitado"
                        className="w-full px-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-2">Fecha de Expiración</label>
                      <input
                        type="date"
                        value={formData.expires_at}
                        onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                        className="w-full px-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-text focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-text">Cupón activo</span>
                  </label>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-3 rounded-theme-lg border border-secondary/10 text-text font-medium hover:bg-secondary/5 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 rounded-theme-lg bg-primary text-white font-bold shadow-lg hover:shadow-xl transition-all"
                    >
                      {editingCoupon ? 'Guardar Cambios' : 'Crear Cupón'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}