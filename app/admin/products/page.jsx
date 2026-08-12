'use client';

import { useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Plus, Edit2, Trash2, Search, Package, ArrowLeft, Image as ImageIcon, X, Upload, GripVertical, ChevronUp, ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  });
  const [generatingDescription, setGeneratingDescription] = useState(false);

  useEffect(() => {
    if (supabase) {
      loadData();
    }
  }, [supabase]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [categoriesRes, productsRes] = await Promise.all([
        supabase.from('categories').select('*').eq('store_id', user.id).order('sort_order'),
        supabase.from('products').select('*').eq('store_id', user.id).order('sort_order'),
      ]);

      setCategories(categoriesRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!formData.name.trim()) {
      alert('Primero escribe el nombre del producto');
      return;
    }
    setGeneratingDescription(true);
    try {
      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: formData.name }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Error al generar la descripción');
      }
      setFormData((prev) => ({ ...prev, description: result.description }));
    } catch (error) {
      console.error('Error generando descripción con IA:', error);
      alert(error.message || 'No se pudo generar la descripción');
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Debes iniciar sesión para guardar productos');
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
        alert(`Error al guardar: ${error.message || 'Verifica que el schema SQL esté ejecutado correctamente'}`);
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
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
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
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Productos</h1>
              <p className="text-sm text-gray-500">Gestiona tu catálogo</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setEditingProduct(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-medium shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo</span>
          </button>
        </div>
      </div>

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

        {/* Products List - Mobile First Cards */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No hay productos aún</p>
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
                      <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
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
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={generatingDescription || !formData.name.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#8B5CF6' }}
                  >
                    {generatingDescription ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {generatingDescription ? 'Generando...' : 'Generar con IA'}
                  </button>
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Precio de Oferta *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Precio Original (opcional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.original_price}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                    placeholder="Para mostrar descuento"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Categoría</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-primary/50"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Badge</label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="Ej: Popular, Nuevo"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">URL de Imagen</label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_available}
                    onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Disponible</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Destacado</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingProduct(null); resetForm(); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}