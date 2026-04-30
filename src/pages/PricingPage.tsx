import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Zap, Star, Crown, ArrowRight, MessageCircle, Calendar, Users, BarChart3, ShieldCheck, Scissors } from 'lucide-react';

const plans = [
    {
        id: 'starter',
        name: 'Starter',
        price: { monthly: 19, annual: 15 },
        description: 'Para profesionales independientes que están comenzando.',
        icon: Star,
        color: 'text-gray-500',
        bg: 'bg-gray-100',
        border: 'border-space-border',
        buttonClass: 'bg-space-text text-white hover:bg-space-text/90',
        features: [
            { text: '1 Empleado / Barbero', ok: true },
            { text: 'Reservas online ilimitadas', ok: true },
            { text: 'Página web personalizada', ok: true },
            { text: 'Dashboard de administración', ok: true },
            { text: 'Recordatorios por WhatsApp', ok: false },
            { text: 'Campañas de marketing masivo', ok: false },
            { text: 'Pasarela de pagos Stripe', ok: false },
            { text: 'Estadísticas avanzadas', ok: false },
        ],
        popular: false,
    },
    {
        id: 'essential',
        name: 'Essential',
        price: { monthly: 39, annual: 32 },
        description: 'El plan más popular para barberías y salones activos.',
        icon: Zap,
        color: 'text-space-primary',
        bg: 'bg-space-primary/10',
        border: 'border-space-primary',
        buttonClass: 'bg-space-primary text-white hover:bg-space-primary/90',
        features: [
            { text: 'Hasta 3 Empleados', ok: true },
            { text: 'Reservas online ilimitadas', ok: true },
            { text: 'Página web personalizada', ok: true },
            { text: 'Dashboard de administración', ok: true },
            { text: 'Recordatorios por WhatsApp (500/mes)', ok: true },
            { text: 'Campañas de marketing masivo', ok: true },
            { text: 'Pasarela de pagos Stripe', ok: false },
            { text: 'Estadísticas avanzadas', ok: false },
        ],
        popular: true,
    },
    {
        id: 'premium',
        name: 'Premium',
        price: { monthly: 79, annual: 65 },
        description: 'Control absoluto para negocios consolidados que quieren cobrar online.',
        icon: Crown,
        color: 'text-yellow-500',
        bg: 'bg-yellow-400/10',
        border: 'border-yellow-400/40',
        buttonClass: 'bg-gradient-to-r from-yellow-500 to-amber-400 text-black hover:opacity-90 font-black',
        features: [
            { text: 'Empleados Ilimitados', ok: true },
            { text: 'Reservas online ilimitadas', ok: true },
            { text: 'Página web personalizada', ok: true },
            { text: 'Dashboard de administración', ok: true },
            { text: 'Recordatorios por WhatsApp (ilimitados)', ok: true },
            { text: 'Campañas de marketing masivo', ok: true },
            { text: 'Pasarela de pagos Stripe + Depósitos', ok: true },
            { text: 'Estadísticas financieras avanzadas', ok: true },
        ],
        popular: false,
    },
];

const faqs = [
    { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí, puedes cancelar cuando quieras desde tu panel de suscripción. No hay contratos ni penalidades.' },
    { q: '¿Cómo funcionan los 14 días gratis?', a: 'Al registrarte tienes acceso completo al plan que elijas durante 14 días sin necesidad de ingresar tarjeta. Al vencer, se cobra automáticamente.' },
    { q: '¿Puedo cambiar de plan después?', a: 'Totalmente. Puedes subir o bajar de plan en cualquier momento desde tu Dashboard y el cambio aplica en el próximo ciclo.' },
    { q: '¿Qué pasa si no tengo cuenta de Twilio?', a: 'Los recordatorios de WhatsApp requieren una cuenta de Twilio (gratis para empezar). Te ayudamos a configurarla en menos de 10 minutos.' },
    { q: '¿Funciona para restaurantes o spas también?', a: 'Sí. Spacey está diseñado para cualquier negocio de servicios: barberías, salones de uñas, spas, tutorías, clínicas, y más.' },
];

export default function PricingPage() {
    const [annual, setAnnual] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <div className="min-h-screen bg-space-bg text-space-text font-sans">
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-space-border">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-space-primary rounded-xl flex items-center justify-center">
                            <Scissors size={16} className="text-white" />
                        </div>
                        <span className="font-black text-space-text tracking-tight uppercase text-lg">Spacey</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link to="/how-it-works" className="text-sm font-semibold text-space-muted hover:text-space-primary transition">Cómo Funciona</Link>
                        <Link to="/login" className="text-sm font-semibold text-space-muted hover:text-space-text transition">Entrar</Link>
                        <Link to="/signup" className="btn-primary text-xs px-5 py-2.5 rounded-xl">Empezar Gratis →</Link>
                    </div>
                </div>
            </nav>

            <section className="max-w-4xl mx-auto text-center px-6 pt-20 pb-12">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-space-primary/10 border border-space-primary/20 text-space-primary text-xs font-black uppercase tracking-widest mb-6">
                    <ShieldCheck size={12} /> 14 Días Gratis — Sin Tarjeta
                </div>
                <h1 className="text-5xl md:text-6xl font-black tracking-tight text-space-text leading-none mb-4">
                    Precios <span className="text-space-primary">simples</span>,<br />resultados reales.
                </h1>
                <p className="text-lg text-space-muted max-w-2xl mx-auto leading-relaxed">
                    Más barato que Booksy, Fresha y cualquier plataforma grande — con las mismas (o más) funciones.
                </p>
                <div className="flex items-center justify-center gap-4 mt-10">
                    <span className={`text-sm font-bold ${!annual ? 'text-space-text' : 'text-space-muted'}`}>Mensual</span>
                    <button onClick={() => setAnnual(!annual)} className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${annual ? 'bg-space-primary' : 'bg-space-border'}`}>
                        <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${annual ? 'translate-x-7' : 'translate-x-0'}`} />
                    </button>
                    <span className={`text-sm font-bold ${annual ? 'text-space-text' : 'text-space-muted'}`}>
                        Anual <span className="text-space-primary text-xs font-black">–20%</span>
                    </span>
                </div>
            </section>

            <section className="max-w-6xl mx-auto px-6 pb-24">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                    {plans.map((plan) => {
                        const Icon = plan.icon;
                        const price = annual ? plan.price.annual : plan.price.monthly;
                        return (
                            <div key={plan.id} className={`relative bg-white rounded-3xl border-2 p-8 flex flex-col transition-all duration-300 ${plan.border} ${plan.popular ? 'shadow-2xl md:-translate-y-4' : 'shadow-sm hover:shadow-lg'}`}>
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-space-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg whitespace-nowrap">
                                        ⚡ Más Popular
                                    </div>
                                )}
                                <div className={`w-12 h-12 rounded-2xl ${plan.bg} ${plan.color} flex items-center justify-center mb-5`}>
                                    <Icon size={24} />
                                </div>
                                <h3 className="text-xl font-black text-space-text mb-1">Spacey {plan.name}</h3>
                                <p className="text-sm text-space-muted leading-snug mb-6 min-h-[40px]">{plan.description}</p>
                                <div className="flex items-end gap-1 mb-8">
                                    <span className="text-5xl font-black text-space-text tracking-tighter">${price}</span>
                                    <span className="text-space-muted font-medium mb-1.5">/mes</span>
                                </div>
                                <Link to="/signup" className={`w-full py-4 rounded-2xl text-center text-xs font-black uppercase tracking-widest transition-all duration-200 active:scale-95 mb-8 flex items-center justify-center gap-2 ${plan.buttonClass}`}>
                                    Empezar Gratis <ArrowRight size={14} />
                                </Link>
                                <div className="space-y-3">
                                    {plan.features.map((f, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            {f.ok
                                                ? <div className="w-5 h-5 rounded-full bg-space-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"><Check size={11} className="text-space-primary" /></div>
                                                : <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5"><X size={11} className="text-gray-400" /></div>
                                            }
                                            <span className={`text-sm leading-snug ${f.ok ? 'text-space-text' : 'text-space-muted/60'}`}>{f.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="bg-white border-t border-b border-space-border py-20">
                <div className="max-w-4xl mx-auto px-6">
                    <h2 className="text-3xl font-black text-center text-space-text uppercase tracking-tight mb-12">¿Por qué elegir <span className="text-space-primary">Spacey</span>?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: MessageCircle, title: 'WhatsApp Nativo', desc: 'Recordatorios automáticos y campañas de marketing directo al WhatsApp de tus clientes.', color: 'text-green-500 bg-green-50' },
                            { icon: Calendar, title: 'Reservas 24/7', desc: 'Tus clientes reservan solos desde su celular, sin llamadas, sin confusiones.', color: 'text-blue-500 bg-blue-50' },
                            { icon: Users, title: 'Multi-Empleado', desc: 'Gestiona todo tu equipo, sus horarios y sus citas en un solo panel.', color: 'text-purple-500 bg-purple-50' },
                            { icon: BarChart3, title: 'Estadísticas Reales', desc: 'Ve quiénes son tus mejores clientes, qué servicios venden más y cuándo ocupas más.', color: 'text-orange-500 bg-orange-50' },
                            { icon: ShieldCheck, title: 'Seguro y Confiable', desc: 'Base de datos cifrada, backups automáticos y 99.9% de uptime garantizado.', color: 'text-red-500 bg-red-50' },
                            { icon: Zap, title: 'Setup en 5 Minutos', desc: 'Regístrate, configura tus servicios y comparte tu link. Así de fácil.', color: 'text-space-primary bg-space-primary/10' },
                        ].map((item, i) => {
                            const Icon = item.icon;
                            return (
                                <div key={i} className="p-6 rounded-2xl border border-space-border bg-space-bg hover:shadow-md transition-all">
                                    <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-4`}><Icon size={20} /></div>
                                    <h3 className="font-black text-space-text text-sm uppercase tracking-tight mb-2">{item.title}</h3>
                                    <p className="text-xs text-space-muted leading-relaxed">{item.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="max-w-2xl mx-auto px-6 py-20">
                <h2 className="text-3xl font-black text-center text-space-text uppercase tracking-tight mb-12">Preguntas Frecuentes</h2>
                <div className="space-y-3">
                    {faqs.map((faq, i) => (
                        <div key={i} className="bg-white border border-space-border rounded-2xl overflow-hidden">
                            <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-6 py-5 text-left gap-4">
                                <span className="font-black text-space-text text-sm">{faq.q}</span>
                                <span className={`text-space-primary transition-transform duration-200 flex-shrink-0 ${openFaq === i ? 'rotate-90' : ''}`}><ArrowRight size={16} /></span>
                            </button>
                            {openFaq === i && <div className="px-6 pb-5"><p className="text-sm text-space-muted leading-relaxed">{faq.a}</p></div>}
                        </div>
                    ))}
                </div>
            </section>

            <section className="bg-space-text text-white py-20">
                <div className="max-w-2xl mx-auto text-center px-6">
                    <h2 className="text-4xl font-black uppercase tracking-tight mb-4">Empieza hoy, <span className="text-space-primary">gratis.</span></h2>
                    <p className="text-white/60 mb-8 text-lg">14 días completos. Sin tarjeta. Sin trucos.</p>
                    <Link to="/signup" className="inline-flex items-center gap-3 bg-space-primary text-white font-black text-sm uppercase tracking-widest px-8 py-4 rounded-2xl hover:bg-space-primary/90 transition-all active:scale-95 shadow-xl">
                        Crear mi cuenta gratis <ArrowRight size={18} />
                    </Link>
                </div>
            </section>
        </div>
    );
}
