import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import { useToast } from '@/contexts/ToastContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
    Sparkles, MessageCircle, Zap, Clock, Check, RefreshCw,
    Send, AlertTriangle, Copy, Bot, Shield, Bell, Users,
    BarChart3, ChevronRight, ExternalLink, Power, Repeat
} from 'lucide-react';

// ─── Plan feature matrix (matches barberbot/index.js tier logic) ────────────
const PLAN_FEATURES = {
    basic: {
        label: 'Básico',
        color: 'space-primary',
        features: [
            { icon: MessageCircle, text: 'Bot con keywords (hola, cita, reagendar, cancelar)', active: true },
            { icon: Clock,         text: 'Flujo de agendado de 6 pasos (nombre→servicio→barbero→fecha→hora→confirma)', active: true },
            { icon: Repeat,        text: 'Reagendar y cancelar citas por WhatsApp', active: true },
            { icon: Bot,           text: 'IA conversacional (Groq / llama-3.1-8b-instant)', active: false },
            { icon: BarChart3,     text: 'Reportes cada 2h al barbero por WhatsApp', active: false },
            { icon: Bell,          text: 'Re-engagement proactivo a clientes inactivos', active: false },
        ],
    },
    pro: {
        label: 'Pro',
        color: 'space-primary',
        features: [
            { icon: MessageCircle, text: 'Todo lo Básico +', active: true },
            { icon: Bot,           text: 'IA con Groq para preguntas generales del negocio', active: true },
            { icon: BarChart3,     text: 'Reportes cada 2h al owner: citas del día + ingresos', active: true },
            { icon: Clock,         text: 'Reporte de cierre 8PM', active: true },
            { icon: Bell,          text: 'Re-engagement proactivo (Premium solo)', active: false },
        ],
    },
    premium: {
        label: 'Premium',
        color: 'space-yellow',
        features: [
            { icon: MessageCircle, text: 'Todo lo Pro +', active: true },
            { icon: Bell,          text: 'Re-engagement semanal a clientes inactivos', active: true },
            { icon: Users,         text: 'Mensaje de conversión invitado → registrado', active: true },
            { icon: BarChart3,     text: 'Reporte diario de cierre por WhatsApp', active: true },
        ],
    },
    trial: {
        label: 'Trial',
        color: 'space-muted',
        features: [
            { icon: MessageCircle, text: 'Bot con keywords básicos', active: true },
            { icon: Bot,           text: 'IA conversacional', active: false },
            { icon: BarChart3,     text: 'Reportes automáticos', active: false },
        ],
    },
};

// ─── Simulator responses (match barberbot real logic) ───────────────────────
function simulateBot(input: string, bookingLink: string, offer: string, services: any[], businessName: string): string {
    const lower = input.toLowerCase().trim();
    const svcList = services.length > 0
        ? services.slice(0, 4).map(s => `• ${s.name}: $${s.price} (${s.duration_minutes} min)`).join('\n')
        : '• Corte moderno: $25 (15 min)\n• Barba: $24 (57 min)';

    if (['hola','hi','buenas','hey','buenos dias'].some(g => lower.includes(g))) {
        return `¡Hola! Soy el asistente de *${businessName}* 💈\n\n*Servicios:*\n${svcList}\n\nEscribe *"cita"* para agendar 📅 o *"cambiar mi cita"* para reagendar.`;
    }
    if (['cita','reservar','agendar','turno','reserva'].some(w => lower.includes(w))) {
        return `¡Perfecto! 💈 ¿Cuál es tu nombre?`;
    }
    if (['cambiar mi cita','reagendar','cambiarla','moverla'].some(w => lower.includes(w))) {
        return `📅 Voy a buscar tu cita activa...\n\nNo encontré una cita para tu número. ¿Quieres *agendar* una nueva? Escribe *"cita"*.`;
    }
    if (['cancelar mi cita','quiero cancelar'].some(w => lower.includes(w))) {
        return `⚠️ Para cancelar, voy a buscar tu cita activa por tu número de teléfono.\n\nNo encontré citas activas. Escribe *"cita"* para agendar.`;
    }
    if (['precio','servicio','cuanto','costo','cuesta'].some(w => lower.includes(w))) {
        return `Nuestros servicios:\n\n${svcList}\n\n¿Quieres agendar? Escribe *"cita"* 📅`;
    }
    if (['oferta','promo','descuento','especial'].some(w => lower.includes(w))) {
        return offer ? `🎁 Promoción activa:\n\n"${offer}"\n\n🔗 ${bookingLink}` : `No hay promociones activas en este momento. ¿Quieres agendar? Escribe *"cita"*.`;
    }
    if (['donde','ubicacion','direccion','maps'].some(w => lower.includes(w))) {
        return `📍 Encuéntranos en nuestra ubicación. Puedes también reservar online:\n🔗 ${bookingLink}`;
    }
    // IA response (Pro/Premium)
    return `Entendido. Para cualquier duda adicional visita:\n🔗 ${bookingLink}\n\nO escribe *"cita"* para agendar ahora.`;
}

// ─── Toggle component ────────────────────────────────────────────────────────
const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
        type="button"
        onClick={onChange}
        className="w-11 h-6 rounded-full relative transition-all duration-200 flex-shrink-0"
        style={{ background: value ? `rgb(var(--space-primary))` : `rgb(var(--space-border))` }}
    >
        <div
            className="absolute top-0.5 w-5 h-5 rounded-full shadow-sm transition-all duration-200"
            style={{ left: value ? '1.375rem' : '0.125rem', background: 'white' }}
        />
    </button>
);

export default function AIAssistantPage() {
    const { currentBusiness } = useAuth();
    const { subscription, services } = useBusiness();
    const toast = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [config, setConfig] = useState({
        whatsapp_bot_active: true,
        whatsapp_booking_link: '',
        whatsapp_offer: '',
        whatsapp_marketing_active: false,
        reminder_inactive_days: 30,
        whatsapp_bot_prompt: '',
    });

    const [simInput, setSimInput] = useState('');
    const [simMessages, setSimMessages] = useState([
        { from: 'bot' as const, text: '¡Hola! Soy el asistente de WhatsApp 💈 Escribe algo para probar cómo responde el bot.' }
    ]);
    const [simTyping, setSimTyping] = useState(false);

    const plan = ((currentBusiness as any)?.plan_status || 'basic').toLowerCase() as keyof typeof PLAN_FEATURES;
    const planData = PLAN_FEATURES[plan] || PLAN_FEATURES.basic;
    const isProOrPremium = plan === 'pro' || plan === 'premium';
    const isPremium = plan === 'premium';

    const WEBHOOK_URL = 'https://barberbot-production-d3ca.up.railway.app/webhook';
    const HEALTH_URL = 'https://barberbot-production-d3ca.up.railway.app/health';

    useEffect(() => {
        if (currentBusiness) {
            setConfig({
                whatsapp_bot_active: (currentBusiness as any).whatsapp_bot_active ?? true,
                whatsapp_booking_link: currentBusiness.whatsapp_booking_link || `https://spaceyreserve.netlify.app/book/${currentBusiness.slug}`,
                whatsapp_offer: (currentBusiness as any).whatsapp_offer || '',
                whatsapp_marketing_active: (currentBusiness as any).whatsapp_marketing_active ?? false,
                reminder_inactive_days: (currentBusiness as any).reminder_inactive_days ?? 30,
                whatsapp_bot_prompt: (currentBusiness as any).whatsapp_bot_prompt || '',
            });
            setLoading(false);
        }
    }, [currentBusiness]);

    const handleToggleBot = async () => {
        const newVal = !config.whatsapp_bot_active;
        setConfig(p => ({ ...p, whatsapp_bot_active: newVal }));
        if (!currentBusiness) return;
        const { error } = await supabase.from('businesses').update({ whatsapp_bot_active: newVal }).eq('id', currentBusiness.id);
        if (error) {
            setConfig(p => ({ ...p, whatsapp_bot_active: !newVal }));
            toast.error('No se pudo cambiar el estado.');
        } else {
            toast.success(newVal ? '🤖 Bot activado' : '🔇 Bot pausado');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentBusiness) return;
        setSaving(true);
        const { error } = await supabase.from('businesses').update({
            whatsapp_booking_link: config.whatsapp_booking_link,
            whatsapp_offer: config.whatsapp_offer,
            whatsapp_marketing_active: config.whatsapp_marketing_active,
            reminder_inactive_days: config.reminder_inactive_days,
            whatsapp_bot_prompt: config.whatsapp_bot_prompt,
        }).eq('id', currentBusiness.id);
        setSaving(false);
        if (error) { toast.error('Error al guardar.'); } else { toast.success('✓ Configuración guardada'); }
    };

    const applyPreset = (type: 'casual' | 'premium' | 'quick') => {
        const presets = {
            casual: 'Responde con tono casual y amistoso. Usa emojis. Sé directo y breve. Máximo 2 líneas.',
            premium: 'Responde con tono profesional y elegante. Trato respetuoso. Máximo 2 líneas.',
            quick: 'Responde muy breve. Solo lo esencial. Sin saludos largos. Directo al punto.',
        };
        setConfig(p => ({ ...p, whatsapp_bot_prompt: presets[type] }));
        toast.success('Plantilla aplicada');
    };

    const handleSendSim = (e: React.FormEvent) => {
        e.preventDefault();
        if (!simInput.trim()) return;
        const userMsg = simInput;
        setSimMessages(p => [...p, { from: 'user', text: userMsg }]);
        setSimInput('');
        setSimTyping(true);
        setTimeout(() => {
            const botReply = simulateBot(
                userMsg,
                config.whatsapp_booking_link || `https://spaceyreserve.netlify.app/book/${currentBusiness?.slug}`,
                config.whatsapp_offer,
                services || [],
                currentBusiness?.name || 'Spacey Barber'
            );
            setSimMessages(p => [...p, { from: 'bot', text: botReply }]);
            setSimTyping(false);
        }, 900);
    };

    if (loading) return (
        <DashboardLayout>
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin" size={24} style={{ color: `rgb(var(--space-primary))` }} />
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div className="animate-fade-up pb-12 space-y-8">

                {/* ── Header ──────────────────────────────────── */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: `rgb(var(--space-text))` }}>
                                Asistente IA
                            </h1>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: `rgba(var(--space-primary), 0.1)`, color: `rgb(var(--space-primary))` }}>
                                {planData.label}
                            </span>
                        </div>
                        <p className="text-xs font-medium" style={{ color: `rgb(var(--space-muted))` }}>
                            Bot de WhatsApp · Twilio + Groq (llama-3.1-8b-instant)
                        </p>
                    </div>

                    {/* Bot on/off */}
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: `rgb(var(--space-card))`, border: `1px solid rgb(var(--space-border))` }}>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `rgb(var(--space-muted))` }}>Bot WhatsApp</p>
                            <p className="text-xs font-bold" style={{ color: config.whatsapp_bot_active ? `rgb(var(--space-success))` : `rgb(var(--space-muted))` }}>
                                {config.whatsapp_bot_active ? '● Activo' : '○ Pausado'}
                            </p>
                        </div>
                        <Toggle value={config.whatsapp_bot_active} onChange={handleToggleBot} />
                    </div>
                </div>

                {/* ── Plan features ───────────────────────────── */}
                <div className="dash-card">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-bold" style={{ color: `rgb(var(--space-text))` }}>
                            Features de tu plan · <span style={{ color: `rgb(var(--space-primary))` }}>{planData.label}</span>
                        </h2>
                        {!isPremium && (
                            <Link to="/dashboard/billing" className="flex items-center gap-1 text-[10px] font-bold hover:opacity-70 transition-opacity" style={{ color: `rgb(var(--space-primary))` }}>
                                <Sparkles size={11} /> Subir plan →
                            </Link>
                        )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {planData.features.map((f, i) => (
                            <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg" style={{ background: f.active ? `rgba(var(--space-primary), 0.05)` : `rgba(var(--space-border), 0.3)`, opacity: f.active ? 1 : 0.5 }}>
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: f.active ? `rgba(var(--space-primary), 0.15)` : `rgba(var(--space-muted), 0.1)` }}>
                                    {f.active
                                        ? <Check size={11} style={{ color: `rgb(var(--space-primary))` }} />
                                        : <f.icon size={10} style={{ color: `rgb(var(--space-muted))` }} />
                                    }
                                </div>
                                <p className="text-xs font-medium" style={{ color: f.active ? `rgb(var(--space-text))` : `rgb(var(--space-muted))` }}>{f.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Main grid ───────────────────────────────── */}
                <div className="grid lg:grid-cols-2 gap-6">

                    {/* LEFT: Config form */}
                    <div className="space-y-6">
                        <form onSubmit={handleSave} className="dash-card space-y-5">
                            <h2 className="text-sm font-bold" style={{ color: `rgb(var(--space-text))` }}>Configuración del bot</h2>

                            {/* Booking link */}
                            <div>
                                <label className="input-label">Link de reservas</label>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={config.whatsapp_booking_link}
                                        onChange={e => setConfig(p => ({ ...p, whatsapp_booking_link: e.target.value }))}
                                        className="input-field flex-1"
                                        placeholder="https://spaceyreserve.netlify.app/book/mi-barberia"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => { navigator.clipboard.writeText(config.whatsapp_booking_link); toast.success('Copiado'); }}
                                        className="p-2.5 rounded-xl transition-opacity hover:opacity-70 flex-shrink-0"
                                        style={{ background: `rgb(var(--space-card2))`, border: `1px solid rgb(var(--space-border))`, color: `rgb(var(--space-muted))` }}
                                    >
                                        <Copy size={14} />
                                    </button>
                                </div>
                                <p className="text-[10px] mt-1.5 font-medium" style={{ color: `rgb(var(--space-muted))` }}>
                                    El bot incluye este link cuando confirma una cita o el cliente pregunta por reservas.
                                </p>
                            </div>

                            {/* Promo offer */}
                            <div>
                                <label className="input-label">Promoción activa <span className="font-normal opacity-60">(opcional)</span></label>
                                <input
                                    type="text"
                                    value={config.whatsapp_offer}
                                    onChange={e => setConfig(p => ({ ...p, whatsapp_offer: e.target.value }))}
                                    className="input-field"
                                    placeholder="Ej: 10% off los martes en corte + barba"
                                />
                                <p className="text-[10px] mt-1.5 font-medium" style={{ color: `rgb(var(--space-muted))` }}>
                                    Se incluye en el mensaje de re-engagement a clientes inactivos (Premium).
                                </p>
                            </div>

                            {/* AI Prompt — Pro/Premium only */}
                            <div style={{ opacity: isProOrPremium ? 1 : 0.45 }}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="input-label mb-0">Instrucciones de IA</label>
                                    {!isProOrPremium && (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md" style={{ background: `rgba(var(--space-muted), 0.1)`, color: `rgb(var(--space-muted))` }}>Pro / Premium</span>
                                    )}
                                </div>
                                <textarea
                                    value={config.whatsapp_bot_prompt}
                                    onChange={e => setConfig(p => ({ ...p, whatsapp_bot_prompt: e.target.value }))}
                                    disabled={!isProOrPremium}
                                    rows={3}
                                    className="input-field resize-none"
                                    placeholder="Ej: Responde con tono amistoso. Máximo 2 líneas. Menciona el precio siempre."
                                />
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {[['casual','💬 Casual'],['premium','👑 Premium'],['quick','⚡ Rápido']].map(([k, label]) => (
                                        <button
                                            key={k}
                                            type="button"
                                            disabled={!isProOrPremium}
                                            onClick={() => applyPreset(k as any)}
                                            className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:cursor-not-allowed"
                                            style={{ background: `rgb(var(--space-card2))`, border: `1px solid rgb(var(--space-border))`, color: `rgb(var(--space-muted))` }}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ borderTop: `1px solid rgb(var(--space-border))`, paddingTop: '1rem' }}>
                                {/* Marketing active (Premium) */}
                                <div className="flex items-center justify-between" style={{ opacity: isPremium ? 1 : 0.45 }}>
                                    <div>
                                        <p className="text-xs font-bold" style={{ color: `rgb(var(--space-text))` }}>Re-engagement proactivo</p>
                                        <p className="text-[10px] font-medium mt-0.5" style={{ color: `rgb(var(--space-muted))` }}>
                                            Manda mensaje semanal a clientes inactivos · <span style={{ color: `rgb(var(--space-primary))` }}>Premium</span>
                                        </p>
                                    </div>
                                    <Toggle value={config.whatsapp_marketing_active && isPremium} onChange={() => { if (isPremium) setConfig(p => ({ ...p, whatsapp_marketing_active: !p.whatsapp_marketing_active })); }} />
                                </div>

                                {config.whatsapp_marketing_active && isPremium && (
                                    <div className="mt-4">
                                        <label className="input-label">Días de inactividad antes de enviar</label>
                                        <input
                                            type="number"
                                            min={7} max={90}
                                            value={config.reminder_inactive_days}
                                            onChange={e => setConfig(p => ({ ...p, reminder_inactive_days: Number(e.target.value) }))}
                                            className="input-field"
                                        />
                                    </div>
                                )}
                            </div>

                            <button type="submit" disabled={saving} className="btn-primary w-full">
                                {saving ? <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Guardando...</span> : <span className="flex items-center gap-2"><Check size={14} />Guardar cambios</span>}
                            </button>
                        </form>

                        {/* Twilio status */}
                        <div className="dash-card space-y-4">
                            <h2 className="text-sm font-bold" style={{ color: `rgb(var(--space-text))` }}>Estado del servidor (Railway)</h2>

                            <div className="space-y-2">
                                {[
                                    { label: 'Webhook activo en Railway', url: WEBHOOK_URL, ok: true },
                                    { label: 'Health check', url: HEALTH_URL, ok: true },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: `rgba(var(--space-card2), 0.6)` }}>
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-2 h-2 rounded-full" style={{ background: `rgb(var(--space-success))` }} />
                                            <p className="text-xs font-medium" style={{ color: `rgb(var(--space-text))` }}>{item.label}</p>
                                        </div>
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[10px] font-bold hover:opacity-70 transition-opacity"
                                            style={{ color: `rgb(var(--space-primary))` }}
                                        >
                                            <ExternalLink size={11} /> Ver
                                        </a>
                                    </div>
                                ))}
                            </div>

                            <div className="px-3 py-3 rounded-xl" style={{ background: `rgba(var(--space-primary), 0.06)`, border: `1px solid rgba(var(--space-primary), 0.15)` }}>
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: `rgb(var(--space-primary))` }}>Twilio webhook URL</p>
                                <div className="flex items-center gap-2">
                                    <code className="text-[10px] flex-1 truncate font-mono" style={{ color: `rgb(var(--space-text))` }}>{WEBHOOK_URL}</code>
                                    <button onClick={() => { navigator.clipboard.writeText(WEBHOOK_URL); toast.success('Copiado'); }} className="p-1 rounded hover:opacity-70 transition-opacity flex-shrink-0" style={{ color: `rgb(var(--space-muted))` }}>
                                        <Copy size={12} />
                                    </button>
                                </div>
                            </div>

                            <div className="px-3 py-3 rounded-xl" style={{ background: `rgba(var(--space-muted), 0.06)`, border: `1px solid rgba(var(--space-border))` }}>
                                <p className="text-[10px] font-medium" style={{ color: `rgb(var(--space-muted))` }}>
                                    El bot corre en Railway y recibe mensajes vía Twilio WhatsApp. Para cambiar la configuración avanzada del servidor, usa Railway variables.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Simulator */}
                    <div className="space-y-6">
                        <div className="dash-card flex flex-col" style={{ height: 'calc(100% - 0px)', minHeight: '520px' }}>
                            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                <div>
                                    <h2 className="text-sm font-bold" style={{ color: `rgb(var(--space-text))` }}>Simulador del bot</h2>
                                    <p className="text-[10px] font-medium mt-0.5" style={{ color: `rgb(var(--space-muted))` }}>Prueba cómo responde a mensajes reales</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSimMessages([{ from: 'bot', text: '¡Hola! Soy el asistente de WhatsApp 💈 Escribe algo para probar.' }])}
                                    className="p-2 rounded-lg transition-opacity hover:opacity-70"
                                    style={{ background: `rgb(var(--space-card2))`, border: `1px solid rgb(var(--space-border))`, color: `rgb(var(--space-muted))` }}
                                    title="Reiniciar conversación"
                                >
                                    <RefreshCw size={13} />
                                </button>
                            </div>

                            {/* Chat area */}
                            <div
                                className="flex-1 overflow-y-auto space-y-2.5 p-3 rounded-xl scrollbar-hide"
                                style={{ background: `rgb(var(--space-card2))`, minHeight: '340px', maxHeight: '380px' }}
                            >
                                {simMessages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                        <div
                                            className="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs font-medium leading-relaxed whitespace-pre-line"
                                            style={msg.from === 'bot'
                                                ? { background: `rgb(var(--space-card))`, color: `rgb(var(--space-text))`, border: `1px solid rgb(var(--space-border))` }
                                                : { background: `rgb(var(--space-primary))`, color: 'white' }
                                            }
                                        >
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {simTyping && (
                                    <div className="flex justify-start animate-fade-in">
                                        <div className="px-3.5 py-2.5 rounded-2xl flex gap-1 items-center" style={{ background: `rgb(var(--space-card))`, border: `1px solid rgb(var(--space-border))` }}>
                                            {[0, 150, 300].map(d => (
                                                <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: `rgb(var(--space-muted))`, animationDelay: `${d}ms` }} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Quick test buttons */}
                            <div className="flex flex-wrap gap-1.5 mt-3 flex-shrink-0">
                                {['hola','cita','precios','ofertas','cambiar mi cita'].map(q => (
                                    <button
                                        key={q}
                                        type="button"
                                        onClick={() => { setSimInput(q); }}
                                        className="text-[10px] font-bold px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                                        style={{ background: `rgba(var(--space-primary), 0.1)`, color: `rgb(var(--space-primary))`, border: `1px solid rgba(var(--space-primary), 0.2)` }}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>

                            {/* Input */}
                            <form onSubmit={handleSendSim} className="flex gap-2 mt-3 flex-shrink-0">
                                <input
                                    type="text"
                                    value={simInput}
                                    onChange={e => setSimInput(e.target.value)}
                                    className="input-field flex-1"
                                    placeholder="Escribe un mensaje..."
                                    disabled={simTyping}
                                />
                                <button
                                    type="submit"
                                    disabled={simTyping || !simInput.trim()}
                                    className="p-3 rounded-xl flex-shrink-0 transition-opacity disabled:opacity-40"
                                    style={{ background: `rgb(var(--space-primary))`, color: 'white' }}
                                >
                                    <Send size={16} />
                                </button>
                            </form>
                        </div>

                        {/* Setup checklist */}
                        <div className="dash-card space-y-4">
                            <h2 className="text-sm font-bold" style={{ color: `rgb(var(--space-text))` }}>Checklist de configuración</h2>
                            {[
                                { done: services && services.length > 0, text: 'Servicios con precios añadidos', link: '/dashboard/services' },
                                { done: true, text: 'Horarios configurados para tus barberos', link: '/dashboard/schedules' },
                                { done: !!config.whatsapp_booking_link, text: 'Link de reservas configurado (arriba)', link: null },
                                { done: config.whatsapp_bot_active, text: 'Bot activo', link: null },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: item.done ? `rgba(var(--space-success), 0.15)` : `rgba(var(--space-border), 0.5)` }}>
                                        {item.done
                                            ? <Check size={11} style={{ color: `rgb(var(--space-success))` }} />
                                            : <span className="w-2 h-2 rounded-full" style={{ background: `rgb(var(--space-muted))` }} />
                                        }
                                    </div>
                                    <p className="text-xs font-medium flex-1" style={{ color: item.done ? `rgb(var(--space-text))` : `rgb(var(--space-muted))` }}>
                                        {item.text}
                                    </p>
                                    {item.link && !item.done && (
                                        <Link to={item.link} className="text-[10px] font-bold hover:opacity-70 transition-opacity flex items-center gap-1" style={{ color: `rgb(var(--space-primary))` }}>
                                            Ir <ChevronRight size={11} />
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
