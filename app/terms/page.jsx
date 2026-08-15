export const metadata = {
  title: 'Términos de servicio - HYUK',
  description: 'Términos y condiciones de uso de HYUK Catálogo Digital.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-white mb-6">Términos de servicio</h1>
        <p className="text-sm text-zinc-400 mb-8">Última actualización: {new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })}</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Aceptación</h2>
            <p>Al usar HYUK ("el Servicio") aceptas estos términos. Si no estás de acuerdo, no utilices el Servicio.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. El Servicio</h2>
            <p>HYUK permite crear catálogos digitales con pedidos vía WhatsApp. El contenido publicado es responsabilidad de cada comerciante.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Cuentas</h2>
            <p>Eres responsable de mantener la confidencialidad de tus credenciales y de toda actividad bajo tu cuenta. Las sesiones pueden ser cerradas por uso indebido.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Pagos y planes</h2>
            <p>Los planes gratuitos y de pago se detallan en la landing. Los cobros, cuando apliquen, se procesan mediante pasarelas autorizadas según el país de operación.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Limitación de responsabilidad</h2>
            <p>El Servicio se ofrece "tal cual". No garantizamos disponibilidad ininterrumpida ni nos hacemos responsables de daños indirectos derivados de su uso.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Contacto</h2>
            <p>Para consultas legales: soporte@hyuk.app</p>
          </section>
        </div>
      </div>
    </div>
  );
}