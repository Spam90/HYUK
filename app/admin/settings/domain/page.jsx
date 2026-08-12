'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, Search, Check, X, Info, Link2, Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

const EXAMPLE_DOMAINS = ['com', 'net', 'org', 'store', 'shop', 'mx', 'cl', 'pe', 'co'];

const checkDomainAvailability = (domain) => {
  const takenSuffixes = ['com'];
  const suffix = domain.split('.').pop();
  return !takenSuffixes.includes(suffix) || domain.includes('hyuk');
};

export default function DomainPage() {
  const [domainInput, setDomainInput] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [supabase, setSupabase] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      setSupabase(createClient());
    });
  }, []);

  const handleCheckDomain = async () => {
    if (!domainInput.trim()) return;
    setIsChecking(true);
    setAvailability(null);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const isAvailable = checkDomainAvailability(domainInput.trim());
    setAvailability({
      domain: domainInput.trim(),
      available: isAvailable,
      suggestions: isAvailable ? null : generateSuggestions(domainInput.trim())
    });
        setIsChecking(false);
  };

  const generateSuggestions = (domain) => {
    const base = domain.replace(/\.[^/.]+$/, '');
    const suggestions = [];
    EXAMPLE_DOMAINS.forEach(ext => {
      suggestions.push(`${base}.${ext}`);
    });
    return suggestions;
  };

  const handleSelectDomain = (domain) => {
    setSelectedDomain(domain);
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSaveDomain = async () => {
    if (!selectedDomain || !supabase) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Debes iniciar sesión');
      const { error } = await supabase
        .from('profiles')
        .update({
          settings: { domain: selectedDomain }
        })
        .eq('id', user.id);
      if (error) throw error;
      setSaveSuccess(true);
    } catch (error) {
      setSaveError(error.message || 'Error al guardar el dominio');
      console.error('Error saving domain:', error);
    } finally {
            setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2 flex items-center gap-3">
            <Globe className="w-8 h-8 text-primary" />
            Dominio Personalizado
          </h1>
          <p className="text-text/60">Vincula tu propio dominio .com o similares para personalizar tu tienda.</p>
        </motion.div>

        {/* Sección de búsqueda */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-theme-xl shadow-lg border border-secondary/10 p-6 mb-6">
          <h2 className="text-xl font-semibold text-text mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Verificar Disponibilidad de Dominio
          </h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCheckDomain()}
              placeholder="tutienda.com"
              className="flex-1 px-4 py-3 rounded-theme-lg border border-secondary/10 bg-background text-sm text-text placeholder:text-text/30 focus:outline-none focus:border-primary/50 transition-colors"
            />
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleCheckDomain}
              disabled={isChecking || !domainInput.trim()}
              className="px-6 py-3 rounded-theme-lg bg-primary text-white font-semibold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Verificar
            </motion.button>
          </div>
                    <p className="text-sm text-text/50">Ingresa el dominio que deseas verificar (ej. mi-tienda.com)</p>
        </motion.div>

        {/* Resultados de verificación */}
        {availability && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-theme-xl shadow-lg border border-secondary/10 p-6 mb-6">
            <h3 className="text-lg font-semibold text-text mb-4">Resultados de Búsqueda</h3>
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-4 rounded-theme-lg border mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {availability.available ? (
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-500" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                      <X className="w-5 h-5 text-red-500" />
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-text">{availability.domain}</span>
                    <p className={`text-sm ${availability.available ? 'text-green-600' : 'text-red-600'}`}>
                      {availability.available ? '✓ Disponible' : '✗ No disponible'}
                    </p>
                  </div>
                </div>
                {availability.available && (
                  <motion.button whileTap={{ scale: 0.98 }} onClick={() => handleSelectDomain(availability.domain)} className="px-4 py-2 rounded-theme-lg bg-primary text-white font-medium hover:shadow-lg transition-all">
                    Seleccionar
                  </motion.button>
                )}
              </div>
            </motion.div>

            {availability.suggestions && (
              <div>
                <p className="text-sm text-text/60 mb-3">Alternativas sugeridas:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availability.suggestions.map((suggestion, index) => (
                    <motion.button key={index} whileHover={{ scale: 1.02 }} onClick={() => { setDomainInput(suggestion); setAvailability(null); }} className="p-3 rounded-theme-lg border border-secondary/10 hover:border-primary/30 hover:bg-primary/5 transition-all text-left">
                      <span className="text-sm font-medium text-text">{suggestion}</span>
                      <p className="text-xs text-green-600">Disponible</p>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
                    </motion.div>
        )}

        {/* Dominio seleccionado */}
        {selectedDomain && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-theme-xl shadow-lg border border-secondary/10 p-6 mb-6">
            <h3 className="text-lg font-semibold text-text mb-4">Dominio Seleccionado</h3>
            <div className="flex items-center justify-between p-4 rounded-theme-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-3">
                <Globe className="w-6 h-6 text-primary" />
                <span className="font-semibold text-text text-lg">{selectedDomain}</span>
              </div>
              <button onClick={() => setSelectedDomain(null)} className="p-1 rounded-lg hover:bg-secondary/10 transition-colors">
                <X className="w-4 h-4 text-text/50" />
              </button>
            </div>

            {saveError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-theme-lg flex items-center gap-2">
                <Info className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-700">{saveError}</p>
              </div>
            )}

            {saveSuccess && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-theme-lg flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <p className="text-sm text-green-700">Dominio guardado correctamente</p>
              </div>
            )}

            <motion.button whileTap={{ scale: 0.98 }} onClick={handleSaveDomain} disabled={saving} className="w-full mt-4 py-3 rounded-theme-lg bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Link2 className="w-5 h-5" />}
              {saving ? 'Guardando...' : 'Guardar Dominio Personalizado'}
            </motion.button>
          </motion.div>
        )}

        {/* Información */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-theme-xl p-6">
          <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Información sobre Dominios Personalizados
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
            <li>• Con un dominio personalizado, tus clientes accederán a tu tienda usando tu propio .com</li>
            <li>• Ejemplo: en lugar de mitienda.hyuk.app, usarás www.mitienda.com</li>
            <li>• La verificación de disponibilidad es una simulación en este momento</li>
            <li>• Para conectar tu dominio, necesitarás configururar los registros DNS de tu proveedor</li>
            <li>• Los dominios .com tienen prioridad en disponibilidad en producción</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}