import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Scissors, ArrowRight, Calendar, MessageCircle,
    Users, Bell, Megaphone, ChevronRight,
    CheckCircle2, BarChart3, Globe, Smartphone, Star, Play
} from 'lucide-react';

const steps = [
    {
        number: '01',
        title: 'Crea tu cuenta en 60 segundos',
        subtitle: 'Sin tarjeta. Sin burocracia.',
        desc: 'Regístrate con tu email, pon el nombre de tu negocio, y ya tienes tu propio sistema de reservas funcionando.',
        icon: Globe,
        demo: (
            <div className="bg-white rounded-2xl border-2 border-space-border p-6 shadow-sm">
                <p className="text-[10px] font-black text-space-muted uppercase tracking-widest mb-4">Configuración Inicial</p>
                <div className="space-y-3">
                    {[
                        { label: 'Nombre del Negocio', value: 'Barbería El Rey' },
                        { label: 'Ciudad', value: 'San Juan, PR' },
                        { label: 'Tu URL personalizada', value: 'spaceyreserve.app/barberiaelrey' },
                    ].map((field, i) => (
                        <div key={i}>
                            <p className="text-[9px] font-black text-space-muted uppercase tracking-widest mb-1">{field.label}</p>
                            <div className="h-10 bg-space-bg border border-space-border rounded-xl flex items-center px-4">
                                <span className="text-sm font-semibold text-space-text">{field.value}</span>
                            </div>
                        </div>
                    ))}
                    <div className="h-12 bg-space-primary rounded-xl flex items-center justify-center gap-2 mt-2">
                        <CheckCircle2 size={16} className="text-white" />
                        <span className="text-white font-black text-xs uppercase tracking-widest">¡Listo! Tu negocio está activo</span>
                    </div>
                </div>
            </div>
        ),
    },
    {
        number: '02',
        title: 'Agrega tus servicios y equipo',
        subtitle: 'Todo bajo control desde el dashboard.',
        desc: 'Crea tus servicios con precios y duración, añade a tus barberos o empleados, y configura los horarios de atención. Todo en minutos.',
        icon: Users,
        demo: (
            <div className="bg-white rounded-2xl border-2 border-space-border p-6 shadow-sm">
                <p className="text-[10px] font-black text-space-muted uppercase tracking-widest mb-4">Tus Servicios</p>
                <div className="space-y-2">
                    {[
                        { name: 'Corte + Barba', duration: '45 min', price: '$20' },
                        { name: 'Solo Corte', duration: '30 min', price: '$15' },
                        { name: 'Diseño Líneas', duration: '20 min', price: '$12' },
                    ].map((svc, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-space-bg rounded-xl border border-space-border">
                            <div>
                                <p className="text-xs font-black text-space-text">{svc.name}</p>
                                <p className="text-[9px] text-space-muted font-bold">{svc.duration}</p>
                            </div>
                            <span className="text-sm font-black text-space-primary">{svc.price}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-2 p-3 border-2 border-dashed border-space-border rounded-xl justify-center text-space-muted">
                        <span className="text-[10px] font-black uppercase tracking-widest">+ Añadir servicio</span>
                    </div>
                </div>
            </div>
        ),
    },
    {
        number: '03',
        title: 'Comparte tu link de reservas',
        subtitle: 'Tus clientes reservan desde su celular.',
        desc: 'Comparte tu link personalizado en Instagram, WhatsApp o Google. Tus clientes eligen servicio, barbero, fecha y hora en segundos.',
        icon: Smartphone,
        demo: (
            <div className="bg-white rounded-2xl border-2 border-space-border overflow-hidden shadow-sm">
                <div className="bg-space-text p-4 flex items-center gap-3">
                    <div className="w-8 h-8 bg-space-primary rounded-lg flex items-center justify-center">
                        <Scissors size={14} className="text-white" />
                    </div>
                    <div>
                        <p className="text-white font-black text-xs">Barbería El Rey</p>
                        <p className="text-white/50 text-[9px] font-bold">San Juan, PR</p>
                    </div>
                </div>
                <div className="p-4 space-y-2">
                    <p className="text-[9px] font-black text-space-muted uppercase tracking-widest">Selecciona un servicio</p>
                    {['Corte + Barba — $20', 'Solo Corte — $15'].map((s, i) => (
                        <div key={i} className={`p-3 rounded-xl border text-xs font-bold text-space-text ${i === 0 ? 'border-space-primary bg-space-primary/5' : 'border-space-border'}`}>{s}</div>
                    ))}
                    <div className="h-10 bg-space-primary rounded-xl flex items-center justify-center mt-2">
                        <span className="text-white font-black text-[10px] uppercase tracking-widest">Seleccionar Fecha →</span>
                    </div>
                </div>
            </div>
        ),
    },
    {
        number: '04',
        title: 'WhatsApp automático las 24 horas',
        subtitle: 'Tú duermes, el sistema trabaja.',
        desc: 'En el momento que se hace una reserva, el cliente recibe una confirmación por WhatsApp. El día anterior, recibe un recordatorio. Tú no haces nada.',
        icon: MessageCircle,
        demo: (
            <div className="bg-[#0B141A] rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <MessageCircle size={14} className="text-white" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-xs">Spacey Bot</p>
                        <p className="text-green-400 text-[9px] font-bold">En línea</p>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="bg-[#1F2C34] rounded-2xl rounded-tl-none p-3 max-w-[85%]">
                        <p className="text-white text-[11px] leading-relaxed">¡Hola <strong>Carlos</strong>! Tu cita en <strong>Barbería El Rey</strong> está confirmada para <strong>Mañana</strong> a las <strong>3:00 PM</strong>.</p>
                        <p className="text-[9px] text-white/40 mt-1 text-right">10:05 AM ✓✓</p>
                    </div>
                    <div className="bg-[#1F2C34] rounded-2xl rounded-tl-none p-3 max-w-[85%]">
                        <p className="text-white text-[11px] leading-relaxed">Puedes ver o cancelar tu cita aquí: <span className="text-blue-400 underline">spaceyreserve.app/book/rey</span></p>
                        <p className="text-[9px] text-white/40 mt-1 text-right">10:05 AM ✓✓</p>
                    </div>
                </div>
            </div>
        ),
    },
    {
        number: '05',
        title: 'Marketing automático para llenar tu agenda',
        subtitle: 'Recupera clientes inactivos con un clic.',
        desc: 'El sistema detecta clientes que no visitan hace +14 días y te permite enviarles una oferta personalizada por WhatsApp masivo.',
        icon: Megaphone,
        demo: (
            <div className="bg-white rounded-2xl border-2 border-space-border p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-space-muted uppercase tracking-widest">Campaña: Lunes Flash</p>
                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Pendiente</span>
                </div>
                <div className="bg-[#E3FFCA] rounded-2xl rounded-tr-none p-4 border border-[#C5EB9E] mb-4">
                    <p className="text-[12px] text-[#111b21] leading-relaxed">
                        ¡Hola <strong>Carlos</strong>! Soy el staff de <strong>Barbería El Rey</strong>. Te tenemos: <em>"Hoy 2x1 en cortes de barba, hasta las 8pm 🔥"</em>. Reserva aquí: <span className="text-blue-500 underline">spaceyreserve.app/book/rey</span>
                    </p>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black">
                    <span className="text-space-muted uppercase tracking-widest">Audiencia: 12 inactivos</span>
                    <div className="flex items-center gap-2 text-space-primary">
                        <CheckCircle2 size={12} />
                        <span>Listo para enviar</span>
                    </div>
                </div>
            </div>
        ),
    },
];

const testimonials = [
    { name: 'Marcos D.', biz: 'Barbería Elite, San Juan', quote: 'Antes perdía reservas por WhatsApp. Ahora todo es automático y mis clientes aman que les llegue la confirmación al instante.', stars: 5 },
    { name: 'Carlos R.', biz: 'The Barber Room, NYC', quote: 'En una semana ya tenía mi página de reservas funcionando. Mis clientes habituales volvieron con la primera campaña de marketing.', stars: 5 },
    { name: 'Yanira M.', biz: 'Salón Luxury Nails, Miami', quote: 'El recordatorio automático de WhatsApp eliminó casi todas las no-shows. Es la mejor inversión que hice en mi negocio.', stars: 5 },
];

export default function HowItWorksPage() {
    const [activeStep, setActiveStep] = useState(0);

    return (
        <div className="min-h-screen bg-space-bg text-space-text font-sans">
            {/* ── Nav ─────────────────────────────────────────── */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-space-border">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-space-primary rounded-xl flex items-center justify-center">
                            <Scissors size={16} className="text-space-bg" />
                        </div>
                        <span className="font-black text-space-text tracking-tight uppercase text-lg">Spacey</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link to="/pricing" className="text-sm font-semibold text-space-muted hover:text-space-primary transition">
                            Precios
                        </Link>
                        <Link to="/login" className="text-sm font-semibold text-space-muted hover:text-space-text transition">
                            Entrar
                        </Link>
                        <Link to="/signup" className="btn-primary text-xs px-5 py-2.5 rounded-xl">
                            Empezar Gratis →
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── Hero ────────────────────────────────────────── */}
            <section className="max-w-4xl mx-auto text-center px-6 pt-20 pb-16">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-space-primary/10 border border-space-primary/20 text-space-primary text-xs font-black uppercase tracking-widest mb-6">
                    <Play size={12} /> Demo Interactivo
                </div>
                <h1 className="text-5xl md:text-6xl font-black tracking-tight text-space-text leading-none mb-4">
                    Así funciona <span className="text-space-primary">Spacey</span>
                </h1>
                <p className="text-lg text-space-muted max-w-2xl mx-auto leading-relaxed mb-8">
                    De cero a tu negocio digitalizado en menos de 10 minutos. Sin código. Sin técnicos. Sin complicaciones.
                </p>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                    <Link to="/signup" className="inline-flex items-center gap-2 bg-space-primary text-white font-black text-sm uppercase tracking-widest px-6 py-3.5 rounded-2xl hover:bg-space-primary/90 transition-all active:scale-95 shadow-lg">
                        Empezar Ahora <ArrowRight size={16} />
                    </Link>
                    <Link to="/pricing" className="inline-flex items-center gap-2 bg-white text-space-text border-2 border-space-border font-black text-sm uppercase tracking-widest px-6 py-3.5 rounded-2xl hover:border-space-primary transition-all">
                        Ver Precios
                    </Link>
                </div>
            </section>

            {/* ── Interactive Steps ────────────────────────────── */}
            <section className="max-w-6xl mx-auto px-6 pb-24">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Steps sidebar */}
                    <div className="lg:w-[380px] flex-shrink-0 space-y-2">
                        {steps.map((step, i) => {
                            const Icon = step.icon;
                            const isActive = activeStep === i;
                            return (
                                <button
                                    key={i}
                                    onClick={() => setActiveStep(i)}
                                    className={`w-full flex items-start gap-4 p-5 rounded-2xl text-left transition-all duration-200 border-2 ${
                                        isActive
                                            ? 'bg-white border-space-primary shadow-md'
                                            : 'bg-white border-transparent hover:border-space-border hover:shadow-sm'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? 'bg-space-primary' : 'bg-space-bg'}`}>
                                        <Icon size={18} className={isActive ? 'text-white' : 'text-space-muted'} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-space-primary' : 'text-space-muted'}`}>{step.number}</span>
                                        </div>
                                        <p className={`font-black text-sm leading-snug ${isActive ? 'text-space-text' : 'text-space-muted'}`}>{step.title}</p>
                                        {isActive && <p className="text-[10px] text-space-muted font-bold mt-0.5">{step.subtitle}</p>}
                                    </div>
                                    <ChevronRight size={16} className={`flex-shrink-0 mt-1 transition-colors ${isActive ? 'text-space-primary' : 'text-space-border'}`} />
                                </button>
                            );
                        })}
                    </div>

                    {/* Demo panel */}
                    <div className="flex-1 bg-white rounded-3xl border-2 border-space-border p-8 shadow-sm">
                        <div className="mb-6">
                            <span className="text-[10px] font-black text-space-primary uppercase tracking-widest">{steps[activeStep].number} / 05</span>
                            <h2 className="text-2xl font-black text-space-text tracking-tight mt-1">{steps[activeStep].title}</h2>
                            <p className="text-space-muted mt-2 leading-relaxed">{steps[activeStep].desc}</p>
                        </div>
                        <div className="max-w-md">
                            {steps[activeStep].demo}
                        </div>
                        <div className="flex items-center justify-between mt-6 pt-6 border-t border-space-border">
                            <button
                                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                                disabled={activeStep === 0}
                                className="text-sm font-bold text-space-muted hover:text-space-text transition disabled:opacity-30 flex items-center gap-2"
                            >
                                ← Anterior
                            </button>
                            {activeStep < steps.length - 1 ? (
                                <button
                                    onClick={() => setActiveStep(activeStep + 1)}
                                    className="flex items-center gap-2 bg-space-primary text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-space-primary/90 transition-all active:scale-95"
                                >
                                    Siguiente Paso <ArrowRight size={14} />
                                </button>
                            ) : (
                                <Link
                                    to="/signup"
                                    className="flex items-center gap-2 bg-space-primary text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-space-primary/90 transition-all active:scale-95"
                                >
                                    ¡Empezar Gratis! <ArrowRight size={14} />
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Feature Pills ────────────────────────────────── */}
            <section className="bg-white border-t border-b border-space-border py-12">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="flex flex-wrap gap-3 justify-center">
                        {[
                            '✅ Reservas 24/7',
                            '📲 WhatsApp Automático',
                            '📣 Marketing Masivo',
                            '👥 Multi-Empleado',
                            '📅 Calendario en Tiempo Real',
                            '🔒 100% Seguro',
                            '⚡ Setup en 5 Minutos',
                            '💳 Cobros Online (Premium)',
                            '📊 Estadísticas Completas',
                            '🌐 Página Web Incluida',
                        ].map((pill, i) => (
                            <span key={i} className="px-4 py-2 bg-space-bg border border-space-border rounded-full text-sm font-bold text-space-text">
                                {pill}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Testimonials ────────────────────────────────── */}
            <section className="max-w-5xl mx-auto px-6 py-20">
                <h2 className="text-3xl font-black text-center text-space-text uppercase tracking-tight mb-12">
                    Lo que dicen nuestros negocios
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {testimonials.map((t, i) => (
                        <div key={i} className="bg-white border-2 border-space-border rounded-3xl p-6 hover:shadow-md transition-all">
                            <div className="flex gap-0.5 mb-4">
                                {Array.from({ length: t.stars }).map((_, j) => (
                                    <Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />
                                ))}
                            </div>
                            <p className="text-sm text-space-text leading-relaxed mb-4 italic">"{t.quote}"</p>
                            <div>
                                <p className="font-black text-space-text text-sm">{t.name}</p>
                                <p className="text-[10px] text-space-muted font-bold uppercase tracking-widest">{t.biz}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA Bottom ──────────────────────────────────── */}
            <section className="bg-space-text text-white py-20">
                <div className="max-w-2xl mx-auto text-center px-6">
                    <div className="w-16 h-16 bg-space-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Scissors size={28} className="text-white" />
                    </div>
                    <h2 className="text-4xl font-black uppercase tracking-tight mb-4">
                        Tu negocio merece <span className="text-space-primary">más clientes.</span>
                    </h2>
                    <p className="text-white/60 mb-8 text-lg">14 días gratis. Sin tarjeta. Cancela cuando quieras.</p>
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        <Link
                            to="/signup"
                            className="inline-flex items-center gap-3 bg-space-primary text-space-bg font-black text-sm uppercase tracking-widest px-8 py-4 rounded-2xl hover:bg-space-primary/90 transition-all active:scale-95 shadow-xl"
                        >
                            Crear mi cuenta gratis <ArrowRight size={18} />
                        </Link>
                        <Link to="/pricing" className="text-white/60 hover:text-white text-sm font-bold transition">
                            Ver precios →
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
