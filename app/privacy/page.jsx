export const metadata = {
  title: 'Política de privacidad - HYUK',
  description: 'Cómo HYUK trata tus datos personales.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-white mb-6">Política de privacidad</h1>
        <p className="text-sm text-zinc-400 mb-8">Última actualización: {new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })}</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Datos que recopilamos</h2>
            <p>Recopilamos datos de cuenta (nombre, email), datos de tu negocio (nombre, teléfono, productos) y datos de pedidos (nombre, teléfono y dirección del cliente).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Uso de los datos</h2>
            <p>Usamos los datos para operar el catálogo, procesar pedidos, brindar soporte y mejorar el Servicio. No vendemos datos personales a terceros.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Herramientas de IA</h2>
            <p>Cuando usas las funciones de IA (escaneo de menús o generación de diseños), las imágenes se envían a proveedores de IA (Google Gemini) únicamente para procesar tu solicitud.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Almacenamiento y seguridad</h2>
            <p>Los datos se alojan en infraestructura cifrada (Supabase/Vercel). El acceso a áreas administrativas está protegido por autenticación.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Tus derechos</h2>
            <p>Puedes solicitar acceso, rectificación o eliminación de tus datos escribiendo a soporte@hyuk.app.</p>
          </section>
        </div>
      </div>
    </div>
  );
}