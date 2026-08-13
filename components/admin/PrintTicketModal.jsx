'use client';

import { motion } from 'framer-motion';
import { X, Printer } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { buildThermalTicketHTML } from '@/lib/print/thermal-ticket';

/**
 * PrintTicketModal - Componente visual para imprimir pedidos en impresoras
 * térmicas (58/80mm). Reutiliza buildThermalTicketHTML de lib/print.
 * Diseño estricto: blanco y negro, monospace, líneas divisorias con guiones.
 */
export default function PrintTicketModal({ open, onClose, order, store }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!open || !order || !iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    const storeName = store?.business_name || store?.store_name || 'Mi Tienda';
    const storePhone = store?.phone_whatsapp || store?.phone || '';
    doc.open();
    doc.write(buildThermalTicketHTML({ order, storeName, storePhone }));
    doc.close();
  }, [open, order, store]);

  if (!open) return null;

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    // Disparar la impresión con @media print que oculta el resto de la UI
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-800">
          <h3 className="font-bold text-gray-900 dark:text-white">Ticket térmico del pedido</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium shadow hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#111827' }}
            >
              <Printer className="w-4 h-4" /> Imprimir ticket
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-zinc-800">
          <iframe
            ref={iframeRef}
            title="Ticket térmico"
            className="w-full h-[70vh] bg-white mx-auto"
            style={{ maxWidth: '80mm' }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}