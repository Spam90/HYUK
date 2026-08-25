'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Loader2 } from 'lucide-react';
import ImageUploader from '@/components/admin/ImageUploader';

/**
 * ProductModal - Modal de creación/edición de productos.
 * Incluye generador de descripciones con IA (Gemini 1.5 Flash).
 *
 * Props:
 * - open: boolean que controla la visibilidad
 * - formData: objeto con los campos del formulario
 * - setFormData: función para actualizar formData
 * - onSubmit: (e) => void, manejador del submit del formulario
 * - onClose: () => void, cierra el modal
 * - categories: array de categorías del comerciante
 * - editingProduct: producto en edición o null para crear
 */
export default function ProductModal({
  open,
  formData,
  setFormData,
  onSubmit,
  onClose,
  categories = [],
  editingProduct = null,
}) {
  const [generatingDescription, setGeneratingDescription] = useState(false);

  if (!open) return null;

  // Generar descripción de producto con IA
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nombre</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Ej: Pizza Pepperoni"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Descripción
              </label>
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
              placeholder="Descripción vendedora del producto..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Precio *</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                min="0"
                placeholder="0.00"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              🖼️ Imagen del producto
            </label>
            <ImageUploader
              value={formData.image_url}
              onChange={(url) => setFormData({ ...formData, image_url: url })}
              folder="products"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                ⚡ Oferta relámpago (fecha límite)
              </label>
              <input
                type="datetime-local"
                value={formData.flash_sale_end ? new Date(formData.flash_sale_end).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, flash_sale_end: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Precio flash (opcional)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.flash_sale_price || ''}
                onChange={(e) => setFormData({ ...formData, flash_sale_price: e.target.value })}
                placeholder="Precio especial durante la oferta"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
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
              onClick={onClose}
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
  );
}