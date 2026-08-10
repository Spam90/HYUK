'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Loader2, Check, Image as ImageIcon } from 'lucide-react';

export default function ImageUploader({
  value,
  onChange,
  bucket = 'store-assets',
  folder = 'products',
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(value || null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadImage = useCallback(async (file) => {
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño
    if (file.size > maxSize) {
      setError(`La imagen no debe superar los ${maxSize / 1024 / 1024}MB`);
      return;
    }

    setError('');
    setIsUploading(true);

    try {
      // Lazy load Supabase client
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Obtener usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Debes estar autenticado para subir imágenes');
        setIsUploading(false);
        return;
      }

      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${folder}/${fileName}`;

      // Subir archivo a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Actualizar preview y valor
      setPreview(publicUrl);
      onChange(publicUrl);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err.message || 'Error al subir la imagen');
    } finally {
      setIsUploading(false);
    }
  }, [bucket, folder, maxSize, onChange]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Mostrar preview local inmediatamente
      const localPreview = URL.createObjectURL(file);
      setPreview(localPreview);
      uploadImage(file);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const localPreview = URL.createObjectURL(file);
      setPreview(localPreview);
      uploadImage(file);
    }
  }, [uploadImage]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleRemove = () => {
    setPreview(null);
    onChange('');
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative aspect-video rounded-theme-lg overflow-hidden border-2 border-secondary/10"
          >
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <label
                htmlFor="image-replace"
                className="cursor-pointer px-4 py-2 bg-white rounded-theme-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Cambiar
              </label>
              <button
                onClick={handleRemove}
                className="p-2 bg-red-500 text-white rounded-theme-lg hover:bg-red-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              id="image-replace"
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="hidden"
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative aspect-video rounded-theme-lg border-2 border-dashed
              flex flex-col items-center justify-center gap-3 p-6
              transition-all cursor-pointer
              ${isDragging 
                ? 'border-primary bg-primary/5 scale-[1.02]' 
                : 'border-secondary/20 hover:border-primary/40 hover:bg-secondary/5'
              }
            `}
          >
            <input
              id="image-upload"
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="hidden"
            />
            
            <label htmlFor="image-upload" className="cursor-pointer w-full h-full flex flex-col items-center justify-center gap-3">
              {isUploading ? (
                <>
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <p className="text-sm text-text/60">Subiendo imagen...</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-text mb-1">
                      Arrastra una imagen o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-text/50">
                      PNG, JPG, WEBP hasta {maxSize / 1024 / 1024}MB
                    </p>
                  </div>
                </>
              )}
            </label>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-500 text-sm mt-2 flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          {error}
        </motion.p>
      )}

      {preview && !isUploading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1 text-green-600 text-sm mt-2"
        >
          <Check className="w-4 h-4" />
          Imagen subida correctamente
        </motion.div>
      )}
    </div>
  );
}