'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Wand2, Check, X, Image as ImageIcon } from 'lucide-react';

/**
 * AiCustomizePanel - "Personalizar con IA".
 * Sube una imagen de referencia y la IA (Gemini) genera automáticamente
 * la paleta de colores y el estilo del catálogo, aplicándolo en tiempo real.
 */
export default function AiCustomizePanel({ settings, updateSettings }) {
  const [showUploader, setShowUploader] = useState(false);
  const [preview, setPreview] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen (PNG, JPG, WEBP)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen es demasiado grande. Máximo 10MB.');
      return;
    }
    setError(null);
    setDone(false);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const generateTheme = async () => {
    if (!preview) return;
    setIsGenerating(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch('/api/ai/generate-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: preview }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Error al generar el diseño');
      updateSettings('theme', result.data);
      setDone(true);
    } catch (err) {
      setError(err.message || 'No se pudo generar el diseño. Intenta con otra imagen.');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetAll = () => {
    setShowUploader(false);
    setPreview(null);
    setError(null);
    setDone(false);
  };

  if (!showUploader) {
    return (
      <div className="space-y-4">
        {/* Botón grande destacado */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowUploader(true)}
          className="w-full py-5 rounded-theme-xl text-white font-bold shadow-xl flex items-center justify-center gap-3 text-lg transition-transform hover:scale-[1.02]"
          style={{
            backgroundColor: settings.theme.primaryColor,
            boxShadow: `0 8px 24px ${settings.theme.primaryColor}40`,
          }}
        >
          <Sparkles className="w-6 h-6" />
          Personalizar con IA
        </motion.button>
        <p className="text-xs text-text/40 text-center">
          Sube una imagen de referencia y la IA generará la paleta de colores y el estilo de tu catálogo.
        </p>
      </div>
    );
  }

    return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Generar diseño con IA
        </h4>
        <button onClick={resetAll} className="p-1.5 rounded-lg hover:bg-secondary/10" title="Cancelar">
          <X className="w-4 h-4 text-text/50" />
        </button>
      </div>

      {!preview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer?.files?.[0]); }}
          onClick={() => document.getElementById('ai-customize-image')?.click()}
          className={`flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-theme-xl cursor-pointer transition-all ${
            isDragging
              ? 'border-primary bg-primary/10 scale-[1.02]'
              : 'border-secondary/30 hover:border-primary/50 hover:bg-primary/5'
          }`}
        >
          <ImageIcon className="w-10 h-10 text-text/40 mb-3" />
          <span className="text-sm font-medium text-text/70">
            {isDragging ? '¡Suelta la imagen!' : 'Arrastra o haz clic para subir'}
          </span>
          <span className="text-xs text-text/40 mt-1">PNG, JPG o WEBP · Máximo 10MB</span>
          <input
            id="ai-customize-image"
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative rounded-theme-xl overflow-hidden border border-secondary/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Referencia" className="w-full h-40 object-cover" />
          <button
            onClick={() => setPreview(null)}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
            title="Quitar imagen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-theme-lg p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {done && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-theme-lg p-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
          <Check className="w-4 h-4" /> ¡Diseño aplicado! Revisa la vista previa y pulsa Guardar.
        </div>
      )}

      {preview && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={generateTheme}
          disabled={isGenerating}
          className="w-full py-3.5 rounded-theme-xl text-white font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: settings.theme.primaryColor }}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Generando diseño...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" /> Generar diseño con IA
            </>
          )}
        </motion.button>
      )}
    </div>
  );
}