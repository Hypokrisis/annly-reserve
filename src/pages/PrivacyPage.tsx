import { Link } from 'react-router-dom';

const LAST_UPDATED = 'Junio 2026';

export default function PrivacyPage() {
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
                    <h1 className="text-3xl font-black tracking-tight mb-2">Política de Privacidad</h1>
                    <p className="text-space-muted text-sm">Última actualización: {LAST_UPDATED}</p>
                </div>

                <div className="space-y-8 text-space-text/90 leading-relaxed">

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">1. Introducción</h2>
                        <p>Spacey Reserve ("nosotros", "nuestro"), operado por <strong>Loann Santiago</strong>, toma en serio la privacidad de sus usuarios. Esta política explica qué información recopilamos, cómo la usamos, con quién la compartimos y cuáles son tus derechos. Al usar Spacey Reserve, aceptas las prácticas descritas en esta política.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">2. Información que Recopilamos</h2>

                        <h3 className="font-semibold text-space-text mb-2 mt-4">Datos de propietarios de negocios:</h3>
                        <ul className="space-y-1.5 list-disc list-inside text-space-text/80 mb-4">
                            <li>Nombre completo y dirección de correo electrónico</li>
                            <li>Contraseña (almacenada de forma cifrada; nunca la vemos en texto plano)</li>
                            <li>Información del negocio: nombre, dirección, teléfono, logotipo</li>
                            <li>Información de pago: procesada exclusivamente por Stripe. No almacenamos números de tarjeta ni datos bancarios.</li>
                        </ul>

                        <h3 className="font-semibold text-space-text mb-2">Datos de clientes finales (ingresados por los negocios):</h3>
                        <ul className="space-y-1.5 list-disc list-inside text-space-text/80 mb-4">
                            <li>Nombre y número de teléfono celular</li>
                            <li>Dirección de correo electrónico (cuando se proporciona)</li>
                            <li>Historial de citas: fecha, servicio solicitado, barbero/estilista asignado</li>
                        </ul>

                        <h3 className="font-semibold text-space-text mb-2">Datos de uso:</h3>
                        <ul className="space-y-1.5 list-disc list-inside text-space-text/80">
                            <li>Actividad dentro de la plataforma (páginas visitadas, funciones utilizadas) para mejora del servicio</li>
                            <li>Registros de mensajes enviados (cantidad, fecha) para facturación y cumplimiento de límites de plan</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">3. Cómo Usamos la Información</h2>
                        <ul className="space-y-2 list-disc list-inside text-space-text/80">
                            <li><strong>Gestión de citas:</strong> mostrar, crear, modificar y cancelar reservas</li>
                            <li><strong>Recordatorios automáticos:</strong> enviar confirmaciones y recordatorios de citas por WhatsApp a los clientes finales</li>
                            <li><strong>Facturación:</strong> procesar pagos y gestionar suscripciones a través de Stripe</li>
                            <li><strong>Comunicaciones de cuenta:</strong> notificar sobre actualizaciones del servicio, alertas de seguridad y cambios en los términos</li>
                            <li><strong>Mejora del servicio:</strong> analizar el uso para identificar y corregir errores y desarrollar nuevas funcionalidades</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">4. Mensajes de WhatsApp</h2>
                        <p className="mb-3">Spacey Reserve envía mensajes de WhatsApp a los clientes finales de los negocios que usan nuestra plataforma, a través de <strong>Twilio, Inc.</strong> Estos mensajes incluyen:</p>
                        <ul className="space-y-1.5 list-disc list-inside text-space-text/80 mb-3">
                            <li>Confirmación de cita al momento de agendar</li>
                            <li>Recordatorios automáticos (24 horas y 30 minutos antes de la cita)</li>
                            <li>Notificaciones de cancelación o cambio de cita</li>
                        </ul>
                        <p className="mb-3">Al proporcionar su número de teléfono al momento de agendar una cita, el cliente final otorga consentimiento para recibir estos mensajes relacionados con su cita.</p>
                        <p><strong>Para cancelar los mensajes:</strong> los clientes finales pueden solicitar al negocio correspondiente que dejen de enviarles mensajes, o responder <strong>STOP</strong> al número de Twilio. Los negocios son responsables de gestionar las solicitudes de exclusión de sus clientes.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">5. Compartir Información con Terceros</h2>
                        <p className="mb-3">Compartimos datos únicamente con los proveedores de servicio necesarios para operar la plataforma:</p>
                        <ul className="space-y-2 list-disc list-inside text-space-text/80 mb-4">
                            <li><strong>Stripe, Inc.:</strong> procesamiento de pagos y suscripciones</li>
                            <li><strong>Twilio, Inc.:</strong> envío de mensajes de WhatsApp y SMS</li>
                            <li><strong>Supabase, Inc.:</strong> almacenamiento seguro de datos en la nube</li>
                        </ul>
                        <p className="font-semibold text-space-primary">No vendemos, arrendamos ni comercializamos tu información personal ni la de tus clientes a terceros con fines de marketing u otros propósitos.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">6. Seguridad de los Datos</h2>
                        <p>Implementamos medidas técnicas y organizativas razonables para proteger los datos, incluyendo: cifrado en tránsito (HTTPS/TLS), cifrado en reposo, control de acceso basado en roles (RLS de Supabase) y políticas de contraseñas seguras. Sin embargo, ningún sistema de transmisión o almacenamiento electrónico es 100% seguro. En caso de una brecha de seguridad que afecte tus datos, te notificaremos según lo requieran las leyes aplicables.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">7. Retención de Datos</h2>
                        <ul className="space-y-2 list-disc list-inside text-space-text/80">
                            <li>Los datos de cuenta se retienen mientras la cuenta esté activa.</li>
                            <li>Tras la cancelación, los datos se conservan por 90 días para permitir la recuperación, luego se eliminan de forma permanente.</li>
                            <li>Los registros de transacciones pueden retenerse por el período requerido por ley (generalmente 7 años para registros financieros).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">8. Tus Derechos</h2>
                        <p className="mb-3">Tienes derecho a:</p>
                        <ul className="space-y-2 list-disc list-inside text-space-text/80 mb-3">
                            <li><strong>Acceso:</strong> solicitar una copia de los datos que tenemos sobre ti</li>
                            <li><strong>Corrección:</strong> solicitar la corrección de datos inexactos</li>
                            <li><strong>Eliminación:</strong> solicitar que eliminemos tus datos ("derecho al olvido")</li>
                            <li><strong>Portabilidad:</strong> solicitar tus datos en un formato estructurado y legible</li>
                            <li><strong>Oposición:</strong> oponerte al procesamiento de tus datos en ciertas circunstancias</li>
                        </ul>
                        <p>Para ejercer cualquiera de estos derechos, contáctanos en <a href="mailto:loann.santiago@gmail.com" className="text-space-primary hover:opacity-80 transition">loann.santiago@gmail.com</a>. Responderemos en un plazo de 30 días.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">9. Datos de Clientes Finales</h2>
                        <p>Si eres cliente de una barbería que usa Spacey Reserve (no el dueño del negocio), el negocio actúa como <em>controlador</em> de tus datos y Spacey Reserve actúa como <em>procesador</em> en su nombre. Para ejercer tus derechos sobre tus datos, contacta directamente al negocio donde agendaste tu cita.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">10. Menores de Edad</h2>
                        <p>Spacey Reserve no está dirigido a menores de 13 años como titulares de cuenta. No recopilamos intencionalmente datos personales de menores de 13 años. Si detectamos que hemos recopilado datos de un menor sin el consentimiento parental apropiado, los eliminaremos.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">11. Cambios a esta Política</h2>
                        <p>Podemos actualizar esta Política de Privacidad. Publicaremos los cambios en esta página y, cuando sean significativos, te notificaremos por correo electrónico con al menos 30 días de anticipación.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-space-text mb-3">12. Contacto</h2>
                        <p className="mb-1">Para preguntas sobre privacidad, solicitudes de datos o cualquier inquietud:</p>
                        <p><strong>Loann Santiago</strong></p>
                        <p>Email: <a href="mailto:loann.santiago@gmail.com" className="text-space-primary hover:opacity-80 transition">loann.santiago@gmail.com</a></p>
                        <p>Puerto Rico, Estados Unidos</p>
                    </section>

                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-space-border mt-16">
                <div className="max-w-3xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-space-muted">© {new Date().getFullYear()} Spacey Reserve · Puerto Rico</p>
                    <div className="flex gap-5 text-xs text-space-muted">
                        <Link to="/terms" className="hover:text-space-text transition">Términos</Link>
                        <Link to="/privacy" className="hover:text-space-text transition font-medium text-space-primary">Privacidad</Link>
                        <Link to="/" className="hover:text-space-text transition">Inicio</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
