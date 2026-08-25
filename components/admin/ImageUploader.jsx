'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Loader2, Check, Image as ImageIcon, Camera } from 'lucide-react';

export default function ImageUploader({
  value,
  onChange,
  bucket = 'products',
  folder = 'products',
  maxSize = 8 * 1024 * 1024, // 8MB
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(value || null);

  const uploadImage = useCallback(async (file) => {
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño
    if (file.size > maxSize) {
      setError(`La imagen no debe superar los ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }

    setError('');
    setIsUploading(true);

    // Preview local instantáneo (la cámara del celular trae un blob)
    try {
      setPreview(URL.createObjectURL(file));
    } catch { /* noop */ }

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);

      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
      if (!result.ok) throw new Error(result.error || 'Error al subir la imagen');

      setPreview(result.url);
      onChange(result.url);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err.message || 'Error al subir la imagen');
    } finally {
      setIsUploading(false);
    }
  }, [folder, maxSize, onChange]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
    // Permite volver a elegir el mismo archivo/captura
    e.target.value = '';
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) uploadImage(file);
  }, [uploadImage]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.add('ring-2', 'ring-primary');
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-2', 'ring-primary');
  }, []);

  const handleRemove = () => {
    setPreview(null);
    onChange('');
  };

  const uid = typeof window !== 'undefined' ? `${folder}` : folder;

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
{preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative rounded-theme-lg overflow-hidden border border-secondary/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Vista previa"
              className="w-full aspect-video object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              <label
                htmlFor={`image-gallery-${uid}`}
                className="cursor-pointer px-3 py-2 rounded-lg bg-white text-sm font-medium hover:bg-gray-100 transition-colors shadow"
              >
                Cambiar
              </label>
              <button
                type="button"
                onClick={handleRemove}
                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow"
                aria-label="Quitar imagen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              id={`image-gallery-${uid}`}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative aspect-video rounded-theme-lg border-2 border-dashed
              flex flex-col items-center justify-center gap-3 p-6
              transition-all
              ${isUploading
                ? 'border-primary bg-primary/5'
                : 'border-secondary/20 hover:border-primary/40 hover:bg-secondary/5'
              }
            `}
          >
            {isUploading ? (
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
                <p className="text-sm text-text/60">Subiendo imagen...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-text mb-1">
                    Arrastra una imagen o sube desde tu dispositivo
                  </p>
                  <p className="text-xs text-text/50">
                    PNG, JPG, WEBP hasta {Math.round(maxSize / 1024 / 1024)}MB
                  </p>
                </div>

                {/* Botones: galería + cámara */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  <label
                    htmlFor={`image-gallery-${uid}`}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
                  >
                    <Upload className="w-4 h-4" />
                    Subir foto
                  </label>
                  <label
                    htmlFor={`image-camera-${uid}`}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2.5 bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
                  >
                    <Camera className="w-4 h-4" />
                    Tomar foto
                  </label>
                </div>
              </>
            )}

            <input
              id={`image-gallery-${uid}`}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              id={`image-camera-${uid}`}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
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
          Imagen lista
        </motion.div>
      )}
    </div>
  );
}
