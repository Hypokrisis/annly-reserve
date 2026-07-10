import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import { useToast } from '@/contexts/ToastContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
    Sparkles, MessageCircle, Zap, Clock, Check, RefreshCw,
    Send, Copy, Bot, Shield, Bell, Users,
    BarChart3, ChevronRight, ExternalLink, Repeat
} from 'lucide-react';

const PLAN_FEATURES = {
    basic: {
        label: 'Básico',
        features: [
            { icon: MessageCircle, text: 'Bot con keywords (hola, cita, reagendar, cancelar)', active: true },
            { icon: Clock,         text: 'Flujo de agendado de 6 pasos', active: true },
            { icon: Repeat,        text: 'Reagendar y cancelar citas por WhatsApp', active: true },
            { icon: Bot,           text: 'IA conversacional (Groq / llama-3.1-8b-instant)', active: false },
            { icon: BarChart3,     text: 'Reportes cada 2h al barbero por WhatsApp', active: false },
            { icon: Bell,          text: 'Re-engagement proactivo a clientes inactivos', active: false },
        ],
    },
    pro: {
        label: 'Pro',
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
        features: [
            { icon: MessageCircle, text: 'Todo lo Pro +', active: true },
            { icon: Bell,          text: 'Re-engagement semanal a clientes inactivos', active: true },
            { icon: Users,         text: 'Mensaje de conversión invitado → registrado', active: true },
            { icon: BarChart3,     text: 'Reporte diario de cierre por WhatsApp', active: true },
        ],
    },
    trial: {
        label: 'Trial',
        features: [
            { icon: MessageCircle, text: 'Bot con keywords básicos', active: true },
            { icon: Bot,           text: 'IA conversacional', active: false },
            { icon: BarChart3,     text: 'Reportes automáticos', active: false },
        ],
    },
};

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
    return `Entendido. Para cualquier duda adicional visita:\n🔗 ${bookingLink}\n\nO escribe *"cita"* para agendar ahora.`;
}

const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
        type="button"
        onClick={onChange}
        className="w-11 h-6 rounded-full relative transition-all duration-200 flex-shrink-0"
        style={{ background: value ? '#9bc287' : '#243529' }}
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
        whatsapp_bot_personality: 'quick',
        whatsapp_bot_auto_schedule: false,
        whatsapp_bot_start_hour: '09:00',
        whatsapp_bot_end_hour: '18:00',
    });

    const [simInput, setSimInput] = useState('');
    const [simMessages, setSimMessages] = useState([
        { from: 'bot' as const, text: '¡Hola! Soy el asistente de WhatsApp 💈 Escribe algo para probar cómo responde el bot.' }
    ]);
    const [simTyping, setSimTyping] = useState(false);

    const [twilio, setTwilio] = useState({ account_sid: '', auth_token: '', whatsapp_from: '', is_active: false });
    const [twilioExists, setTwilioExists] = useState(false);
    const [savingTwilio, setSavingTwilio] = useState(false);
    const [testNumber, setTestNumber] = useState('');
    const [testingTwilio, setTestingTwilio] = useState(false);

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
                whatsapp_bot_personality: (currentBusiness as any).whatsapp_bot_personality || 'quick',
                whatsapp_bot_auto_schedule: (currentBusiness as any).whatsapp_bot_auto_schedule ?? false,
                whatsapp_bot_start_hour: (currentBusiness as any).whatsapp_bot_start_hour || '09:00',
                whatsapp_bot_end_hour: (currentBusiness as any).whatsapp_bot_end_hour || '18:00',
            });
            setLoading(false);
            loadTwilio();
        }
    }, [currentBusiness]);

    const loadTwilio = async () => {
        if (!currentBusiness?.id) return;
        const { data } = await supabase
            .from('twilio_settings')
            .select('account_sid, auth_token, whatsapp_from, is_active')
            .eq('business_id', currentBusiness.id)
            .maybeSingle();
        if (data) {
            setTwilio({ account_sid: data.account_sid || '', auth_token: data.auth_token || '', whatsapp_from: data.whatsapp_from || '', is_active: data.is_active ?? false });
            setTwilioExists(true);
        }
    };

    const handleSaveTwilio = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentBusiness?.id) return;
        if (!twilio.account_sid.trim() || !twilio.auth_token.trim() || !twilio.whatsapp_from.trim()) {
            toast.error('Completa Account SID, Auth Token y número de WhatsApp.');
            return;
        }
        setSavingTwilio(true);
        const { error } = await supabase.from('twilio_settings').upsert({
            business_id: currentBusiness.id,
            account_sid: twilio.account_sid.trim(),
            auth_token: twilio.auth_token.trim(),
            whatsapp_from: twilio.whatsapp_from.trim(),
            is_active: true,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'business_id' });
        setSavingTwilio(false);
        if (error) {
            toast.error('No se pudo guardar: ' + error.message);
        } else {
            setTwilioExists(true);
            setTwilio(p => ({ ...p, is_active: true }));
            toast.success('✓ Credenciales de Twilio guardadas');
        }
    };

    const handleTestTwilio = async () => {
        if (!twilio.account_sid.trim() || !twilio.auth_token.trim() || !twilio.whatsapp_from.trim()) {
            toast.error('Completa las credenciales antes de probar.');
            return;
        }
        if (!testNumber.trim()) {
            toast.error('Escribe un número de prueba (tu WhatsApp).');
            return;
        }
        setTestingTwilio(true);
        try {
            const { data, error } = await supabase.functions.invoke('test-twilio', {
                body: { account_sid: twilio.account_sid.trim(), auth_token: twilio.auth_token.trim(), whatsapp_from: twilio.whatsapp_from.trim(), to: testNumber.trim() },
            });
            if (error) throw error;
            if (data?.success) { toast.success('✅ ¡Mensaje de prueba enviado! Revisa tu WhatsApp.'); }
            else { toast.error(data?.error || 'No se pudo enviar el mensaje de prueba.'); }
        } catch (err: any) {
            toast.error(err.message || 'Error al probar la conexión.');
        } finally {
            setTestingTwilio(false);
        }
    };

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
            whatsapp_bot_personality: config.whatsapp_bot_personality,
            whatsapp_bot_auto_schedule: config.whatsapp_bot_auto_schedule,
            whatsapp_bot_start_hour: config.whatsapp_bot_start_hour,
            whatsapp_bot_end_hour: config.whatsapp_bot_end_hour,
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
                <RefreshCw className="animate-spin" size={24} style={{ color: '#9bc287' }} />
            </div>
        </DashboardLayout>
    );

    // Shared card style
    const cardStyle = { background: '#131c17', border: '1px solid #243529', borderRadius: '20px', padding: '1.25rem' };

    return (
        <DashboardLayout>
            <div className="pb-12 space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-xl font-extrabold tracking-tight text-[#f0f4ee]">
                                Asistente IA
                            </h1>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'rgba(155,194,135,0.1)', color: '#9bc287' }}>
                                {planData.label}
                            </span>
                        </div>
                        <p className="text-xs font-medium text-[#95ab8a]">
                            Bot de WhatsApp · Twilio + Groq (llama-3.1-8b-instant)
                        </p>
                    </div>

                    {/* Bot on/off */}
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: '#131c17', border: '1px solid #243529' }}>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#95ab8a]">Bot WhatsApp</p>
                            <p className="text-xs font-bold" style={{ color: config.whatsapp_bot_active ? '#22c55e' : '#95ab8a' }}>
                                {config.whatsapp_bot_active ? '● Activo' : '○ Pausado'}
                            </p>
                        </div>
                        <Toggle value={config.whatsapp_bot_active} onChange={handleToggleBot} />
                    </div>
                </div>

                {/* Plan features */}
                <div style={cardStyle}>
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-bold text-[#f0f4ee]">
                            Features de tu plan · <span style={{ color: '#9bc287' }}>{planData.label}</span>
                        </h2>
                        {!isPremium && (
                            <Link to="/dashboard/billing" className="flex items-center gap-1 text-[10px] font-bold hover:opacity-70 transition-opacity" style={{ color: '#9bc287' }}>
                                <Sparkles size={11} /> Subir plan →
                            </Link>
                        )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {planData.features.map((f, i) => (
                            <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg" style={{ background: f.active ? 'rgba(155,194,135,0.05)' : 'rgba(36,53,41,0.3)', opacity: f.active ? 1 : 0.5 }}>
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: f.active ? 'rgba(155,194,135,0.15)' : 'rgba(149,171,138,0.1)' }}>
                                    {f.active
                                        ? <Check size={11} style={{ color: '#9bc287' }} />
                                        : <f.icon size={10} style={{ color: '#95ab8a' }} />
                                    }
                                </div>
                                <p className="text-xs font-medium" style={{ color: f.active ? '#f0f4ee' : '#95ab8a' }}>{f.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main grid */}
                <div className="grid lg:grid-cols-2 gap-6">

                    {/* LEFT: Config form */}
                    <div className="space-y-6">
                        <form onSubmit={handleSave} className="space-y-5" style={cardStyle}>
                            <h2 className="text-sm font-bold text-[#f0f4ee]">Configuración del bot</h2>

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
                                        style={{ background: '#1d2a23', border: '1px solid #243529', color: '#95ab8a' }}
                                    >
                                        <Copy size={14} />
                                    </button>
                                </div>
                                <p className="text-[10px] mt-1.5 font-medium text-[#95ab8a]">
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
                                <p className="text-[10px] mt-1.5 font-medium text-[#95ab8a]">
                                    Se incluye en el mensaje de re-engagement a clientes inactivos (Premium).
                                </p>
                            </div>

                            {/* Personality */}
                            <div>
                                <label className="input-label">Personalidad del bot</label>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    {[
                                        { id: 'quick',   emoji: '⚡', label: 'Rápido',  desc: 'Directo y breve' },
                                        { id: 'casual',  emoji: '💬', label: 'Casual',  desc: 'Amistoso y cercano' },
                                        { id: 'cool',    emoji: '😎', label: 'Cool',    desc: 'Relajado, con flow' },
                                        { id: 'premium', emoji: '👑', label: 'Premium', desc: 'Elegante y formal' },
                                    ].map(opt => {
                                        const active = config.whatsapp_bot_personality === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setConfig(p => ({ ...p, whatsapp_bot_personality: opt.id }))}
                                                className="text-left px-3 py-2.5 rounded-xl border transition-all"
                                                style={{
                                                    background: active ? 'rgba(155,194,135,0.08)' : '#1d2a23',
                                                    borderColor: active ? '#9bc287' : '#243529',
                                                }}
                                            >
                                                <p className="text-xs font-bold text-[#f0f4ee]">{opt.emoji} {opt.label}</p>
                                                <p className="text-[10px] mt-0.5 text-[#95ab8a]">{opt.desc}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* AI Prompt */}
                            <div style={{ opacity: isProOrPremium ? 1 : 0.45 }}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="input-label mb-0">Instrucciones de IA</label>
                                    {!isProOrPremium && (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'rgba(149,171,138,0.1)', color: '#95ab8a' }}>Pro / Premium</span>
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
                                            style={{ background: '#1d2a23', border: '1px solid #243529', color: '#95ab8a' }}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid #243529', paddingTop: '1rem' }}>
                                <div className="flex items-center justify-between" style={{ opacity: isPremium ? 1 : 0.45 }}>
                                    <div>
                                        <p className="text-xs font-bold text-[#f0f4ee]">Re-engagement proactivo</p>
                                        <p className="text-[10px] font-medium mt-0.5 text-[#95ab8a]">
                                            Manda mensaje semanal a clientes inactivos · <span style={{ color: '#9bc287' }}>Premium</span>
                                        </p>
                                    </div>
                                    <Toggle value={config.whatsapp_marketing_active && isPremium} onChange={() => { if (isPremium) setConfig(p => ({ ...p, whatsapp_marketing_active: !p.whatsapp_marketing_active })); }} />
                                </div>

                                {config.whatsapp_marketing_active && isPremium && (
                                    <div className="mt-4">
                                        <label className="input-label">Días de inactividad antes de enviar</label>
                                        <input
                                            type="number" min={7} max={90}
                                            value={config.reminder_inactive_days}
                                            onChange={e => setConfig(p => ({ ...p, reminder_inactive_days: Number(e.target.value) }))}
                                            className="input-field"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Business hours */}
                            <div style={{ borderTop: '1px solid #243529', paddingTop: '1rem' }}>
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold text-[#f0f4ee]">Horario de atención del bot</p>
                                        <p className="text-[10px] font-medium mt-0.5 text-[#95ab8a]">
                                            Fuera de este horario, el bot responde un mensaje automático con el link de reserva.
                                        </p>
                                    </div>
                                    <Toggle
                                        value={config.whatsapp_bot_auto_schedule}
                                        onChange={() => setConfig(p => ({ ...p, whatsapp_bot_auto_schedule: !p.whatsapp_bot_auto_schedule }))}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-4" style={{ opacity: config.whatsapp_bot_auto_schedule ? 1 : 0.45 }}>
                                    <div>
                                        <label className="input-label">Abre</label>
                                        <input type="time" value={config.whatsapp_bot_start_hour} disabled={!config.whatsapp_bot_auto_schedule}
                                            onChange={e => setConfig(p => ({ ...p, whatsapp_bot_start_hour: e.target.value }))} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="input-label">Cierra</label>
                                        <input type="time" value={config.whatsapp_bot_end_hour} disabled={!config.whatsapp_bot_auto_schedule}
                                            onChange={e => setConfig(p => ({ ...p, whatsapp_bot_end_hour: e.target.value }))} className="input-field" />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" disabled={saving} className="btn-primary w-full">
                                {saving
                                    ? <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Guardando...</span>
                                    : <span className="flex items-center gap-2"><Check size={14} />Guardar cambios</span>}
                            </button>
                        </form>

                        {/* Railway status */}
                        <div className="space-y-4" style={cardStyle}>
                            <h2 className="text-sm font-bold text-[#f0f4ee]">Estado del servidor (Railway)</h2>
                            <div className="space-y-2">
                                {[
                                    { label: 'Webhook activo en Railway', url: WEBHOOK_URL },
                                    { label: 'Health check', url: HEALTH_URL },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: 'rgba(29,42,35,0.6)' }}>
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
                                            <p className="text-xs font-medium text-[#f0f4ee]">{item.label}</p>
                                        </div>
                                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[10px] font-bold hover:opacity-70 transition-opacity" style={{ color: '#9bc287' }}>
                                            <ExternalLink size={11} /> Ver
                                        </a>
                                    </div>
                                ))}
                            </div>

                            <div className="px-3 py-3 rounded-xl" style={{ background: 'rgba(155,194,135,0.06)', border: '1px solid rgba(155,194,135,0.15)' }}>
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9bc287' }}>Twilio webhook URL</p>
                                <div className="flex items-center gap-2">
                                    <code className="text-[10px] flex-1 truncate font-mono text-[#f0f4ee]">{WEBHOOK_URL}</code>
                                    <button onClick={() => { navigator.clipboard.writeText(WEBHOOK_URL); toast.success('Copiado'); }}
                                        className="p-1 rounded hover:opacity-70 transition-opacity flex-shrink-0" style={{ color: '#95ab8a' }}>
                                        <Copy size={12} />
                                    </button>
                                </div>
                            </div>

                            <div className="px-3 py-3 rounded-xl" style={{ background: 'rgba(149,171,138,0.06)', border: '1px solid #243529' }}>
                                <p className="text-[10px] font-medium text-[#95ab8a]">
                                    El bot corre en Railway y recibe mensajes vía Twilio WhatsApp. Para cambiar la configuración avanzada del servidor, usa Railway variables.
                                </p>
                            </div>
                        </div>

                        {/* Twilio credentials */}
                        <div className="space-y-4" style={cardStyle}>
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-[#f0f4ee]">Conexión de WhatsApp (Twilio)</h2>
                                {twilioExists && (
                                    <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider" style={{ color: '#22c55e' }}>
                                        <Check size={12} /> Guardada
                                    </span>
                                )}
                            </div>

                            <form onSubmit={handleSaveTwilio} className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#95ab8a]">Account SID</label>
                                    <input value={twilio.account_sid} onChange={(e) => setTwilio(p => ({ ...p, account_sid: e.target.value }))}
                                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="input-field mt-1 font-mono text-xs" autoComplete="off" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#95ab8a]">Auth Token</label>
                                    <input type="password" value={twilio.auth_token} onChange={(e) => setTwilio(p => ({ ...p, auth_token: e.target.value }))}
                                        placeholder="••••••••••••••••••••••••••••••••" className="input-field mt-1 font-mono text-xs" autoComplete="off" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#95ab8a]">Número de WhatsApp Business</label>
                                    <input value={twilio.whatsapp_from} onChange={(e) => setTwilio(p => ({ ...p, whatsapp_from: e.target.value }))}
                                        placeholder="+1 939 555 1234" className="input-field mt-1 font-mono text-xs" autoComplete="off" />
                                </div>
                                <button type="submit" disabled={savingTwilio} className="btn-primary w-full">
                                    {savingTwilio ? 'Guardando…' : 'Guardar credenciales'}
                                </button>
                            </form>

                            <div className="pt-3 border-t" style={{ borderColor: '#243529' }}>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-[#95ab8a]">Número de prueba (tu WhatsApp)</label>
                                <div className="flex gap-2 mt-1">
                                    <input value={testNumber} onChange={(e) => setTestNumber(e.target.value)}
                                        placeholder="+1 787 555 1234" className="input-field flex-1 font-mono text-xs" autoComplete="off" />
                                    <button type="button" onClick={handleTestTwilio} disabled={testingTwilio}
                                        className="btn-secondary flex-shrink-0 flex items-center gap-1.5">
                                        <Send size={13} /> {testingTwilio ? 'Enviando…' : 'Probar conexión'}
                                    </button>
                                </div>
                            </div>

                            <div className="px-3 py-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                                <p className="text-[10px] font-medium leading-relaxed text-[#95ab8a]">
                                    Guardar tus credenciales valida y habilita el botón de prueba. El bot en vivo (Railway) y los recordatorios automáticos usan por ahora la cuenta Twilio de la plataforma.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Simulator */}
                    <div className="space-y-6">
                        <div className="flex flex-col" style={{ ...cardStyle, minHeight: '520px' }}>
                            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                <div>
                                    <h2 className="text-sm font-bold text-[#f0f4ee]">Simulador del bot</h2>
                                    <p className="text-[10px] font-medium mt-0.5 text-[#95ab8a]">Prueba cómo responde a mensajes reales</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSimMessages([{ from: 'bot', text: '¡Hola! Soy el asistente de WhatsApp 💈 Escribe algo para probar.' }])}
                                    className="p-2 rounded-lg transition-opacity hover:opacity-70"
                                    style={{ background: '#1d2a23', border: '1px solid #243529', color: '#95ab8a' }}
                                    title="Reiniciar conversación"
                                >
                                    <RefreshCw size={13} />
                                </button>
                            </div>

                            {/* Chat area */}
                            <div className="flex-1 overflow-y-auto space-y-2.5 p-3 rounded-xl" style={{ background: '#1d2a23', minHeight: '340px', maxHeight: '380px' }}>
                                {simMessages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div
                                            className="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs font-medium leading-relaxed whitespace-pre-line"
                                            style={msg.from === 'bot'
                                                ? { background: '#131c17', color: '#f0f4ee', border: '1px solid #243529' }
                                                : { background: '#9bc287', color: '#22321c' }
                                            }
                                        >
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {simTyping && (
                                    <div className="flex justify-start">
                                        <div className="px-3.5 py-2.5 rounded-2xl flex gap-1 items-center" style={{ background: '#131c17', border: '1px solid #243529' }}>
                                            {[0, 150, 300].map(d => (
                                                <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#95ab8a', animationDelay: `${d}ms` }} />
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
                                        style={{ background: 'rgba(155,194,135,0.1)', color: '#9bc287', border: '1px solid rgba(155,194,135,0.2)' }}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>

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
                                    style={{ background: '#9bc287', color: '#22321c' }}
                                >
                                    <Send size={16} />
                                </button>
                            </form>
                        </div>

                        {/* Setup checklist */}
                        <div className="space-y-4" style={cardStyle}>
                            <h2 className="text-sm font-bold text-[#f0f4ee]">Checklist de configuración</h2>
                            {[
                                { done: services && services.length > 0, text: 'Servicios con precios añadidos', link: '/dashboard/services' },
                                { done: true, text: 'Horarios configurados para tus barberos', link: '/dashboard/schedules' },
                                { done: !!config.whatsapp_booking_link, text: 'Link de reservas configurado (arriba)', link: null },
                                { done: config.whatsapp_bot_active, text: 'Bot activo', link: null },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ background: item.done ? 'rgba(34,197,94,0.15)' : 'rgba(36,53,41,0.5)' }}>
                                        {item.done
                                            ? <Check size={11} style={{ color: '#22c55e' }} />
                                            : <span className="w-2 h-2 rounded-full" style={{ background: '#95ab8a' }} />
                                        }
                                    </div>
                                    <p className="text-xs font-medium flex-1" style={{ color: item.done ? '#f0f4ee' : '#95ab8a' }}>{item.text}</p>
                                    {item.link && !item.done && (
                                        <Link to={item.link} className="text-[10px] font-bold hover:opacity-70 transition-opacity flex items-center gap-1" style={{ color: '#9bc287' }}>
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
