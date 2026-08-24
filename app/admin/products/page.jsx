'use client';

import { useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Plus, Edit2, Trash2, Search, Package, Image as ImageIcon, X, Upload, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ProductModal from '@/components/admin/ProductModal';
import { getDbStatus } from '@/lib/db-status';
import { getProductLimit, isTrialActive } from '@/lib/config/plans';
import { getStockLevels, STOCK_LOW_THRESHOLD } from '@/lib/inventory';

export const dynamic = 'force-dynamic';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const router = useRouter();
  
    const [supabase, setSupabase] = useState(null);
  const [plan, setPlan] = useState('free');
  const [trialEndsAt, setTrialEndsAt] = useState(null);
  // Map product_id -> { total, low } (cargado de product_skus; null si tabla inexistente)
  const [stockLevels, setStockLevels] = useState(null);

  // Regla de negocio v2: el límite de productos SOLO aplica al CREAR, y solo para
  // cuentas Free con trial vencido. Durante el trial (28 días) hay acceso Pro.
  const trialActive = isTrialActive(trialEndsAt);
  const limitedPlan = plan === 'free' && !trialActive;
  const productLimit = limitedPlan ? getProductLimit('free') : Infinity;
  const planReached = limitedPlan && products.length >= productLimit;
  
  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      setSupabase(createClient());
    });
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    original_price: '',
    category_id: '',
    is_available: true,
    is_featured: false,
    badge: '',
    image_url: '',
    flash_sale_end: '',
    flash_sale_price: '',
  });

  useEffect(() => {
    if (supabase) {
      loadData();
    }
  }, [supabase]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const db = await getDbStatus();
      const cols = [];
      if (db.planColumn) cols.push(db.planColumn);
      if (db.trialEnds) cols.push('trial_ends_at');
      const profileQuery = cols.length
        ? supabase.from('profiles').select(cols.join(', ')).eq('id', user.id).maybeSingle()
        : Promise.resolve({ data: null });
      const [categoriesRes, productsRes, profileRes] = await Promise.all([
        supabase.from('categories').select('*').eq('store_id', user.id).order('sort_order'),
        supabase.from('products').select('*').eq('store_id', user.id).order('sort_order'),
        profileQuery,
      ]);

            const profile = profileRes.data;
      setCategories(categoriesRes.data || []);
      setProducts(productsRes.data || []);
      setTrialEndsAt(profile?.trial_ends_at || null);

      // Inventario (SKUs) — tolera la tabla inexistente (migración 09)
      try {
        const levels = await getStockLevels(user.id, supabase);
        setStockLevels(levels);
      } catch (invErr) {
        setStockLevels(null);
      }
      setPlan(profile?.[db.planColumn || 'plan_type'] || profile?.plan_type || profile?.plan || 'free');
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Debes iniciar sesiÃ³n para guardar productos');
        return;
      }

      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        store_id: user.id,
        category_id: formData.category_id || null,
        badge: formData.badge || null,
      };

      let error;
      if (editingProduct) {
        const result = await supabase.from('products').update(productData).eq('id', editingProduct.id);
        error = result.error;
      } else {
        const result = await supabase.from('products').insert(productData);
        error = result.error;
      }

      if (error) {
        console.error('Error saving product:', error);
        alert(`Error al guardar: ${error.message || 'Verifica que el schema SQL estÃ© ejecutado correctamente'}`);
        return;
      }

      setShowModal(false);
      setEditingProduct(null);
      resetForm();
      loadData();
      alert('Producto guardado exitosamente');
    } catch (error) {
      console.error('Error saving product:', error);
      alert(`Error inesperado: ${error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Â¿EstÃ¡s seguro de eliminar este producto?')) return;
    await supabase.from('products').delete().eq('id', id);
    loadData();
  };

  const toggleAvailability = async (product) => {
    const { error } = await supabase
      .from('products')
      .update({ is_available: !product.is_available })
      .eq('id', product.id);
    
    if (!error) {
      loadData();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      original_price: '',
      category_id: '',
      is_available: true,
      is_featured: false,
      badge: '',
      image_url: '',
      flash_sale_end: '',
      flash_sale_price: '',
    });
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      original_price: product.original_price?.toString() || '',
      category_id: product.category_id || '',
      is_available: product.is_available,
      is_featured: product.is_featured,
      badge: product.badge || '',
      image_url: product.image_url || '',
      flash_sale_end: product.flash_sale_end || '',
      flash_sale_price: product.flash_sale_price || '',
    });
    setShowModal(true);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || p.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Productos</h1>
              <p className="text-sm text-gray-500">Gestiona tu catÃ¡logo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-semibold text-gray-500 dark:text-gray-400">
              {trialActive ? '✨ Prueba Pro · sin límite de productos'
                : plan === 'free' ? `Plan Gratuito · ${products.length}/${productLimit} productos`
                : '✦ Plan Pro'}
            </span>
            <button
              onClick={() => { if (planReached) return; resetForm(); setEditingProduct(null); setShowModal(true); }}
              disabled={planReached}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-medium shadow-lg hover:shadow-xl transition-all ${planReached ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Límite de plan: tarjeta promocional */}
      {planReached && (
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 p-4">
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                ⚡ Has alcanzado el límite del Plan Gratuito ({products.length}/{productLimit})
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                Tus productos siguen siendo visibles en tu catálogo. Actualizá a Pro para seguir creando.
              </p>
            </div>
            <a
              href="/admin/settings"
              className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors"
            >
              Mejorar a Pro
            </a>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search and Filter - Tiendanube Style */}
        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar productos..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filterCategory === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-800'
                }`}
              >
                Todas
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    filterCategory === cat.id
                      ? 'bg-primary text-white'
                      : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-800'
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

          {/* Banner de alerta de stock bajo */}
          {stockLevels &&
            (() => {
              const low = Array.from(stockLevels.values()).filter((v) => v.low).length;
              if (low === 0) return null;
              return (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                  <Package className="w-4 h-4" />
                  <span>⚠ {low} producto(s) con stock bajo (≤ {STOCK_LOW_THRESHOLD}).</span>
                </div>
              );
            })()}

        {/* Products List - Mobile First Cards */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No hay productos aÃºn</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-primary font-medium hover:underline"
            >
              Crear tu primer producto
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-gray-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex gap-3">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden relative shrink-0 bg-gray-100 dark:bg-zinc-800">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">ðŸ½ï¸</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {product.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                          {product.description}
                        </p>
                                                <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-sm font-bold text-primary">
                            ${parseFloat(product.price).toFixed(2)}
                          </span>
                          {product.original_price && (
                            <span className="text-xs text-gray-400 line-through">
                              ${parseFloat(product.original_price).toFixed(2)}
                            </span>
                          )}
                          {/* Badge de stock (SKU) */}
                          {stockLevels?.has(product.id) ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                stockLevels.get(product.id).low
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                              title="Stock disponible (suma de SKUs activos)"
                            >
                              <Package className="w-3 h-3 mr-0.5" />
                              {stockLevels.get(product.id).total}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                              Sin SKU
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Toggle Switch */}
                        <button
                          onClick={() => toggleAvailability(product)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            product.is_available ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-700'
                          }`}
                        >
                          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                            product.is_available ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => openEditModal(product)}
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="px-3 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-xs font-medium text-red-600 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <ProductModal
        open={showModal}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        onClose={() => { setShowModal(false); setEditingProduct(null); resetForm(); }}
        categories={categories}
        editingProduct={editingProduct}
      />
    </div>
  );
}
