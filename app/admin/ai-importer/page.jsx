'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Scan, Check, Trash2, Plus, Save, Loader2, X, AlertCircle, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function AiImporterPage() {
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [supabase, setSupabase] = useState(null);

  useEffect(() => {
    const loadSupabase = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        setSupabase(createClient());
      } catch (err) {
        console.error('Error loading supabase:', err);
      }
    };
    loadSupabase();
  }, []);

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setScanError('El archivo debe ser una imagen (PNG, JPG, WEBP)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setScanError('La imagen es demasiado grande. Máximo 10MB.');
      return;
    }
    setImageFile(file);
    setScanError(null);
    setExtractedData(null);
    setImportSuccess(false);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Drag & drop
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    handleFileSelect(file);
  };

  const handleImageUpload = (e) => {
    handleFileSelect(e.target.files?.[0]);
  };

  const handleScanMenu = async () => {
    if (!imageFile) return;
    setIsScanning(true);
    setScanError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const imageBase64 = reader.result;
      try {
        const response = await fetch('/api/ai/scan-menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64 }),
        });
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Error desconocido');
        }
        setExtractedData(result.data);
      } catch (error) {
        setScanError(error.message || 'No se pudo procesar la imagen.');
      } finally {
        setIsScanning(false);
      }
    };
        reader.readAsDataURL(imageFile);
  };

  const handleImport = async () => {
    if (!extractedData || !supabase) return;
    setIsImporting(true);
    setImportError(null);
    setImportSuccess(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Debes iniciar sesión para importar datos');
      for (const category of extractedData.categories) {
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .insert({
            store_id: user.id,
            name: category.name,
            slug: category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
            sort_order: 0,
            is_active: true
          })
          .select('id')
          .single();
        if (catError) continue;
        for (const product of category.products) {
          await supabase.from('products').insert({
            store_id: user.id,
            category_id: catData.id,
            name: product.name,
            description: product.description || '',
            price: parseFloat(product.price) || 0,
            image_url: '',
            is_available: true,
            is_featured: false,
            badge: '',
            sort_order: 0,
            options: []
          });
        }
      }
      setImportSuccess(true);
      setTimeout(() => router.push('/admin/products'), 2000);
    } catch (error) {
      setImportError(error.message || 'Error al importar los datos');
    } finally {
      setIsImporting(false);
    }
  };

  const updateCategoryName = (index, newName) => {
    const updated = { ...extractedData };
    updated.categories[index].name = newName;
    setExtractedData(updated);
  };

  const updateProductName = (catIndex, prodIndex, newName) => {
    const updated = { ...extractedData };
    updated.categories[catIndex].products[prodIndex].name = newName;
    setExtractedData(updated);
  };

  const updateProductPrice = (catIndex, prodIndex, newPrice) => {
    const updated = { ...extractedData };
    updated.categories[catIndex].products[prodIndex].price = parseFloat(newPrice) || 0;
    setExtractedData(updated);
  };

  const removeCategory = (index) => {
    if (!extractedData) return;
    const updated = { ...extractedData };
    updated.categories.splice(index, 1);
    setExtractedData(updated);
  };

  const removeProduct = (catIndex, prodIndex) => {
    if (!extractedData) return;
    const updated = { ...extractedData };
    updated.categories[catIndex].products.splice(prodIndex, 1);
    setExtractedData(updated);
  };

  const addCategory = () => {
    if (!extractedData) return;
    const updated = { ...extractedData };
    updated.categories.push({ name: 'Nueva Categoría', products: [] });
    setExtractedData(updated);
  };

  const addProductToCategory = (catIndex) => {
    if (!extractedData) return;
    const updated = { ...extractedData };
    updated.categories[catIndex].products.push({ name: 'Nuevo Producto', price: 0, description: '' });
    setExtractedData(updated);
  };

  const resetAll = () => {
    setImagePreview(null);
    setImageFile(null);
    setScanError(null);
    setExtractedData(null);
    setImportError(null);
    setImportSuccess(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            Importador de Menús con IA
          </h1>
          <p className="text-text/60">
            Sube una foto de tu menú o volante y la IA extraerá categorías, productos y precios automáticamente.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-theme-xl shadow-lg border border-secondary/10 p-6 mb-6">
          {!imagePreview ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-theme-lg cursor-pointer transition-all ${
                isDragging
                  ? 'border-primary bg-primary/10 scale-[1.02]'
                  : 'border-secondary/30 hover:border-primary/50 hover:bg-primary/5'
              }`}
              onClick={() => document.getElementById('ai-image-input')?.click()}
            >
              <ImageIcon className="w-12 h-12 text-text/40 mb-4" />
              <span className="text-lg font-medium text-text/70 mb-2">
                {isDragging ? '¡Suelta tu menú aquí!' : 'Arrastra o haz clic para subir la foto'}
              </span>
              <span className="text-sm text-text/40">PNG, JPG o WEBP - Máximo 10MB</span>
              <input
                id="ai-image-input"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <img src={imagePreview} alt="Preview" className="w-24 h-24 rounded-lg object-cover border border-secondary/10" />
              <div className="flex-1">
                <p className="font-medium text-text">Imagen cargada</p>
                <p className="text-sm text-text/50">{imageFile?.name}</p>
              </div>
              <button onClick={resetAll} className="p-2 rounded-lg hover:bg-secondary/10" title="Eliminar imagen">
                <X className="w-5 h-5 text-text/50" />
              </button>
            </div>
          )}

          {imagePreview && !isScanning && !extractedData && (
            <motion.button whileTap={{ scale: 0.98 }} onClick={handleScanMenu} className="w-full mt-4 py-3 rounded-theme-lg bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
              <Scan className="w-5 h-5" />
              Escanear Menú con IA
            </motion.button>
          )}
        </motion.div>

        {isScanning && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-theme-xl shadow-lg border border-secondary/10 p-8 mb-6 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold text-text mb-2">La IA está leyendo tu menú...</h3>
            <p className="text-text/60">Analizando la imagen y extrayendo categorías, productos y precios.</p>
          </motion.div>
        )}

        {scanError && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-theme-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-400">{scanError}</p>
          </motion.div>
        )}

        {extractedData && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-text">Datos Extraídos</h2>
              <button onClick={addCategory} className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-secondary/10 hover:bg-secondary/20">
                <Plus className="w-4 h-4" /> Agregar Categoría
              </button>
            </div>

            {extractedData.categories.map((category, catIndex) => (
              <motion.div key={catIndex} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: catIndex * 0.1 }} className="bg-card rounded-theme-xl shadow-lg border border-secondary/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <input type="text" value={category.name} onChange={(e) => updateCategoryName(catIndex, e.target.value)} className="text-lg font-semibold bg-transparent border-b-2 border-transparent focus:border-primary outline-none flex-1 text-text" />
                  <div className="flex gap-2">
                    <button onClick={() => addProductToCategory(catIndex)} className="p-1.5 rounded-lg bg-secondary/10" title="Agregar producto">
                      <Plus className="w-4 h-4 text-text/60" />
                    </button>
                    <button onClick={() => removeCategory(catIndex)} className="p-1.5 rounded-lg bg-red-100" title="Eliminar categoría">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {category.products.map((product, prodIndex) => (
                    <motion.div key={prodIndex} className="flex items-center gap-3 p-3 bg-secondary/5 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr] gap-2 flex-1">
                        <input type="text" value={product.name} onChange={(e) => updateProductName(catIndex, prodIndex, e.target.value)} placeholder="Nombre del producto" className="px-3 py-2 rounded-lg border border-secondary/10 bg-card text-sm outline-none focus:border-primary text-text" />
                        <input type="number" value={product.price} onChange={(e) => updateProductPrice(catIndex, prodIndex, e.target.value)} placeholder="Precio" min="0" step="0.01" className="px-3 py-2 rounded-lg border border-secondary/10 bg-card text-sm outline-none focus:border-primary text-text" />
                        <input type="text" value={product.description || ''} onChange={(e) => { const updated = { ...extractedData }; updated.categories[catIndex].products[prodIndex].description = e.target.value; setExtractedData(updated); }} placeholder="Descripción (opcional)" className="px-3 py-2 rounded-lg border border-secondary/10 bg-card text-sm outline-none focus:border-primary text-text" />
                      </div>
                      <button onClick={() => removeProduct(catIndex, prodIndex)} className="p-1.5 rounded-lg bg-red-100" title="Eliminar producto">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}

            {importError && (
              <div className="bg-red-50 border border-red-200 rounded-theme-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-700">{importError}</p>
              </div>
            )}

            {importSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-theme-lg p-4 flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500" />
                <p className="text-sm text-green-700">¡Importación completada! Redirigiendo a la gestión de productos...</p>
              </div>
            )}

            <div className="flex gap-3">
              <motion.button whileTap={{ scale: 0.98 }} onClick={handleImport} disabled={isImporting || importSuccess} className="flex-1 py-3 rounded-theme-lg bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-60">
                {isImporting ? (<><Loader2 className="w-5 h-5 animate-spin" />Importando...</>) : (<><Save className="w-5 h-5" />Confirmar e Importar a mi Tienda</>)}
              </motion.button>
              <button onClick={resetAll} disabled={isImporting} className="px-4 py-2 rounded-theme-lg border border-secondary/20 text-text hover:bg-secondary/5">
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}