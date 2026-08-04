'use client';

import { MessageCircle, User, MapPin, CreditCard, Bike, Plus, X, Check } from 'lucide-react';

export default function WhatsAppControls({ settings, updateSettings }) {
  const { whatsapp_checkout: config } = settings;

  // Toggle helper
  const Toggle = ({ label, description, value, onChange }) => (
    <label className="flex items-center justify-between p-3 bg-card rounded-theme-lg border border-secondary/10 cursor-pointer">
      <div>
        <p className="text-sm font-medium text-text">{label}</p>
        {description && <p className="text-xs text-text/40">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-primary' : 'bg-secondary/20'}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-6' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );

  // Agregar opción de pago
  const addPaymentOption = () => {
    const newOption = `Opción ${config.paymentOptions.length + 1}`;
    updateSettings('whatsapp_checkout', {
      paymentOptions: [...config.paymentOptions, newOption],
    });
  };

  // Remover opción de pago
  const removePaymentOption = (index) => {
    const newOptions = config.paymentOptions.filter((_, i) => i !== index);
    updateSettings('whatsapp_checkout', { paymentOptions: newOptions });
  };

  // Actualizar opción de pago
  const updatePaymentOption = (index, value) => {
    const newOptions = [...config.paymentOptions];
    newOptions[index] = value;
    updateSettings('whatsapp_checkout', { paymentOptions: newOptions });
  };

  // Agregar método de entrega
  const addDeliveryMethod = () => {
    const newMethod = `Método ${config.deliveryMethods.length + 1}`;
    updateSettings('whatsapp_checkout', {
      deliveryMethods: [...config.deliveryMethods, newMethod],
    });
  };

  // Remover método de entrega
  const removeDeliveryMethod = (index) => {
    const newMethods = config.deliveryMethods.filter((_, i) => i !== index);
    updateSettings('whatsapp_checkout', { deliveryMethods: newMethods });
  };

  // Actualizar método de entrega
  const updateDeliveryMethod = (index, value) => {
    const newMethods = [...config.deliveryMethods];
    newMethods[index] = value;
    updateSettings('whatsapp_checkout', { deliveryMethods: newMethods });
  };

  return (
    <div className="space-y-6">
      {/* Mensaje personalizado */}
      <div>
        <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Mensaje Personalizado
        </h4>
        <textarea
          value={config.customMessageHeader}
          onChange={(e) => updateSettings('whatsapp_checkout', { customMessageHeader: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 rounded-theme-lg border border-secondary/10 bg-card text-sm text-text placeholder:text-text/30 focus:outline-none focus:border-primary/50 transition-colors resize-none"
          placeholder="🛒 *¡NUEVO PEDIDO DE CLIENTE!*"
        />
        <p className="text-xs text-text/40 mt-1.5">
          Este mensaje aparecerá al inicio del pedido en WhatsApp
        </p>
      </div>

      {/* Campos requeridos */}
      <div>
        <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <User className="w-4 h-4" />
          Campos del Formulario
        </h4>
        <div className="space-y-2">
          <Toggle
            label="Requerir nombre del cliente"
            description="El cliente debe ingresar su nombre"
            value={config.requireClientName}
            onChange={(value) => updateSettings('whatsapp_checkout', { requireClientName: value })}
          />
          <Toggle
            label="Solicitar dirección"
            description="El cliente debe ingresar su dirección"
            value={config.askForAddress}
            onChange={(value) => updateSettings('whatsapp_checkout', { askForAddress: value })}
          />
          <Toggle
            label="Solicitar método de pago"
            description="El cliente selecciona cómo pagará"
            value={config.askForPaymentMethod}
            onChange={(value) => updateSettings('whatsapp_checkout', { askForPaymentMethod: value })}
          />
        </div>
      </div>

      {/* Métodos de entrega */}
      <div>
        <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <Bike className="w-4 h-4" />
          Métodos de Entrega
        </h4>
        <div className="space-y-2">
          {config.deliveryMethods.map((method, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={method}
                onChange={(e) => updateDeliveryMethod(index, e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-theme-lg border border-secondary/10 bg-card text-sm text-text focus:outline-none focus:border-primary/50 transition-colors"
              />
              <button
                onClick={() => removeDeliveryMethod(index)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text/30 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addDeliveryMethod}
            className="w-full py-2.5 rounded-theme-lg border-2 border-dashed border-secondary/20 text-sm text-text/50 hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Agregar método
          </button>
        </div>
      </div>

      {/* Opciones de pago */}
      {config.askForPaymentMethod && (
        <div>
          <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Opciones de Pago
          </h4>
          <div className="space-y-2">
            {config.paymentOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updatePaymentOption(index, e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-theme-lg border border-secondary/10 bg-card text-sm text-text focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  onClick={() => removePaymentOption(index)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-text/30 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addPaymentOption}
              className="w-full py-2.5 rounded-theme-lg border-2 border-dashed border-secondary/20 text-sm text-text/50 hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Agregar opción
            </button>
          </div>
        </div>
      )}
    </div>
  );
}