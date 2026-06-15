import { Link } from 'react-router-dom';

const LAST_UPDATED = 'Junio 2026';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-space-bg text-space-text font-sans">
            {/* Header */}
            <header className="border-b border-space-border">
                <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg overflow-hidden" style={{ background: `linear-gradient(135deg, rgb(var(--space-primary-light)), rgb(var(--space-primary)))` }}>
                            <img src="/logo.png" alt="Spacey" className="w-full h-full object-cover object-top scale-110" />
                        </div>
                        <span className="font-bold text-space-text">Spacey Reserve</span>
                    </Link>
                    <Link to="/" className="text-sm text-space-muted hover:text-space-text transition">← Volver al inicio</Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-3xl mx-auto px-6 py-12">
                <div className="mb-10">
                    <h1 className="text-3xl font-black tracking-tight mb-2">Términos de Servicio</h1>
                    <p className="text-space-muted text-sm">Última actualización: {LAST_UPDATED}</p>
                </div>

                <div className="space-y-8 text-space-text/90 leading-relaxed">

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">1. Descripción del Servicio</h2>
                        <p>Spacey Reserve es una plataforma de software como servicio (SaaS) que permite a propietarios de barberías y salones gestionar reservas en línea, administrar clientes, configurar horarios y enviar recordatorios automáticos por WhatsApp a sus clientes. El servicio es operado por <strong>Loann Santiago</strong> ("nosotros", "nuestro").</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">2. Aceptación de Términos</h2>
                        <p>Al crear una cuenta o utilizar Spacey Reserve, aceptas estos Términos de Servicio en su totalidad. Si no estás de acuerdo con alguna parte, no debes usar el servicio. Estos términos constituyen un acuerdo legal vinculante entre tú y Spacey Reserve.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">3. Elegibilidad</h2>
                        <p>Para usar Spacey Reserve como operador de negocio debes: (a) tener al menos 18 años de edad; (b) operar un negocio legítimo; (c) proporcionar información veraz y completa al registrarte. El uso del servicio por parte de menores de 18 años como titulares de cuenta no está permitido.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">4. Suscripción y Facturación</h2>
                        <ul className="space-y-2 list-disc list-inside text-space-text/80">
                            <li><strong>Período de prueba:</strong> Al crear tu cuenta, recibes 14 días de acceso gratuito. No se requiere método de pago durante el trial.</li>
                            <li><strong>Planes de pago:</strong> Starter ($19/mes), Essential ($39/mes), Premium ($79/mes). Los detalles de cada plan están en nuestra página de precios.</li>
                            <li><strong>Renovación automática:</strong> Los pagos se procesan mensualmente de forma automática a través de Stripe hasta que canceles.</li>
                            <li><strong>Cambio de plan:</strong> Puedes cambiar de plan en cualquier momento. Los cambios aplican en el siguiente ciclo de facturación.</li>
                            <li><strong>Impuestos:</strong> Los precios no incluyen impuestos aplicables. Eres responsable de los impuestos correspondientes a tu jurisdicción.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">5. Cancelación</h2>
                        <ul className="space-y-2 list-disc list-inside text-space-text/80">
                            <li>Puedes cancelar tu suscripción en cualquier momento desde el portal de facturación en <strong>/dashboard/billing</strong>.</li>
                            <li>Al cancelar, mantendrás acceso al servicio hasta el final del período pagado actual. No realizamos reembolsos por períodos parciales.</li>
                            <li>Si el pago falla, el acceso puede ser suspendido. Recibirás una notificación para actualizar tu método de pago.</li>
                            <li>Podemos terminar o suspender tu cuenta si violas estos términos.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">6. Obligaciones del Usuario</h2>
                        <p className="mb-3">Al usar Spacey Reserve te comprometes a:</p>
                        <ul className="space-y-2 list-disc list-inside text-space-text/80">
                            <li>Obtener el consentimiento de tus clientes antes de enviarles mensajes de WhatsApp a través de la plataforma.</li>
                            <li>No usar el servicio para enviar spam, mensajes no solicitados o comunicaciones ilegales.</li>
                            <li>Mantener la confidencialidad de las credenciales de tu cuenta.</li>
                            <li>Proporcionar información veraz sobre tu negocio y servicios.</li>
                            <li>Cumplir con todas las leyes y regulaciones aplicables, incluyendo las leyes de telecomunicaciones (TCPA) y protección de datos.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">7. Disponibilidad del Servicio</h2>
                        <p>Nos esforzamos por mantener Spacey Reserve disponible las 24 horas del día, 7 días a la semana. Sin embargo, no garantizamos disponibilidad ininterrumpida. Las interrupciones por mantenimiento, actualizaciones o causas fuera de nuestro control (incluyendo fallas de terceros como Twilio, Stripe o Supabase) pueden ocurrir. No seremos responsables por pérdidas causadas por interrupciones del servicio.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">8. Propiedad Intelectual</h2>
                        <p>Spacey Reserve, su diseño, logotipos y código son propiedad de <strong>Loann Santiago</strong>. Los datos que ingresas a la plataforma (información de tu negocio, clientes, citas) son de tu propiedad. Nos concedes una licencia limitada para procesar esos datos con el fin de prestar el servicio.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">9. Limitación de Responsabilidad</h2>
                        <p className="uppercase text-sm font-bold text-space-muted mb-2">Cláusula de responsabilidad limitada</p>
                        <p>En la medida máxima permitida por la ley aplicable, Spacey Reserve no será responsable por daños indirectos, incidentales, especiales o consecuentes que resulten del uso o imposibilidad de uso del servicio. Nuestra responsabilidad total ante ti por cualquier reclamación no excederá el importe que hayas pagado en los últimos tres (3) meses.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">10. Modificaciones a los Términos</h2>
                        <p>Podemos actualizar estos términos de servicio. Te notificaremos por correo electrónico con al menos 30 días de anticipación antes de que los cambios entren en vigor. El uso continuado del servicio después de la fecha efectiva constituye tu aceptación de los nuevos términos.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">11. Ley Aplicable y Jurisdicción</h2>
                        <p>Estos términos se rigen por las leyes del Estado Libre Asociado de Puerto Rico y las leyes federales de los Estados Unidos aplicables. Cualquier disputa se resolverá en los tribunales competentes de Puerto Rico.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">12. Contacto</h2>
                        <p>Para preguntas sobre estos términos: <a href="mailto:loann.santiago@gmail.com" className="text-space-primary hover:opacity-80 transition">loann.santiago@gmail.com</a></p>
                    </section>

                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-space-border mt-16">
                <div className="max-w-3xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-space-muted">© {new Date().getFullYear()} Spacey Reserve · Puerto Rico</p>
                    <div className="flex gap-5 text-xs text-space-muted">
                        <Link to="/terms" className="hover:text-space-text transition font-medium text-space-primary">Términos</Link>
                        <Link to="/privacy" className="hover:text-space-text transition">Privacidad</Link>
                        <Link to="/" className="hover:text-space-text transition">Inicio</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
