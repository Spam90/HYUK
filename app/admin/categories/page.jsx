'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Search, FolderOpen, ArrowLeft, GripVertical } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    icon: '',
    image_url: '',
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', user.id)
        .order('sort_order');

      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const categoryData = {
        ...formData,
        slug: formData.slug || generateSlug(formData.name),
        store_id: user.id,
      };

      if (editingCategory) {
        await supabase.from('categories').update(categoryData).eq('id', editingCategory.id);
      } else {
        await supabase.from('categories').insert(categoryData);
      }

      setShowModal(false);
      setEditingCategory(null);
      resetForm();
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría? Los productos asociados quedarán sin categoría.')) return;
    await supabase.from('categories').delete().eq('id', id);
    loadCategories();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      icon: '',
      image_url: '',
      is_active: true,
      sort_order: 0,
    });
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug || '',
      icon: category.icon || '',
      image_url: category.image_url || '',
      is_active: category.is_active,
      sort_order: category.sort_order || 0,
    });
    setShowModal(true);
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-secondary/10 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary/5 hover:bg-secondary/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-text">Categorías</h1>
              <p className="text-sm text-text/40">Organiza tus productos por categorías</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setEditingCategory(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-theme-lg bg-primary text-white font-medium shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Nueva Categoría
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text/30" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar categorías..."
            className="w-full md:w-96 pl-10 pr-4 py-2.5 rounded-theme-lg border border-secondary/10 bg-card text-sm focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-text/60">Cargando categorías...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-theme-xl border border-secondary/10">
            <FolderOpen className="w-12 h-12 text-text/20 mx-auto mb-4" />
            <p className="text-text/60">No hay categorías aún</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-primary font-medium hover:underline"
            >
              Crear tu primera categoría
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-theme-xl p-4 border border-secondary/10 hover:border-primary/40 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-theme-lg bg-primary/10 flex items-center justify-center text-2xl">
                      {category.icon || '📦'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-text mb-1">{category.name}</h3>
                      <p className="text-xs text-text/50">/{category.slug}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => openEditModal(category)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary/5 hover:bg-secondary/10 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    category.is_active
                      ? 'bg-green-50 text-green-600'
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {category.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                  <span className="text-xs text-text/40">Orden: {category.sort_order}</span>
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
            className="bg-card rounded-theme-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-text mb-4">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  onBlur={(e) => !editingCategory && setFormData({ ...formData, slug: generateSlug(e.target.value) })}
                  required
                  className="w-full px-4 py-2.5 rounded-theme-lg border border-secondary/10 bg-background text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Slug (URL)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="Se genera automáticamente"
                  className="w-full px-4 py-2.5 rounded-theme-lg border border-secondary/10 bg-background text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Icono (emoji)</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="🍕"
                    maxLength={2}
                    className="w-full px-4 py-2.5 rounded-theme-lg border border-secondary/10 bg-background text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Orden</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-theme-lg border border-secondary/10 bg-background text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">URL de Imagen (opcional)</label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-theme-lg border border-secondary/10 bg-background text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-secondary/20 text-primary focus:ring-primary"
                />
                <label htmlFor="is_active" className="text-sm text-text cursor-pointer">
                  Categoría activa
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingCategory(null); resetForm(); }}
                  className="flex-1 px-4 py-2.5 rounded-theme-lg border border-secondary/10 text-text font-medium hover:bg-secondary/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-theme-lg bg-primary text-white font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}