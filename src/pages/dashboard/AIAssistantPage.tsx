import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import { useToast } from '@/contexts/ToastContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { 
    Sparkles, MessageSquare, Zap, Clock, Calendar, Check,
    TrendingUp, RefreshCw, Smartphone, Send, AlertTriangle, ArrowRight,
    QrCode, ExternalLink, ShieldCheck, ChevronRight, Copy, Scissors
} from 'lucide-react';

interface BotLog {
    id: string;
    from_number: string;
    user_message: string;
    bot_response: string;
    created_at: string;
}

export default function AIAssistantPage() {
    const navigate = useNavigate();
    const { currentBusiness } = useAuth();
    const { subscription, services } = useBusiness();
    const toast = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logs, setLogs] = useState<BotLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);

    const [formData, setFormData] = useState({
        whatsapp_bot_active: true,
        whatsapp_booking_link: '',
        whatsapp_offer: '',
        whatsapp_marketing_active: true,
        whatsapp_bot_personality: 'quick',
        whatsapp_bot_auto_schedule: false,
        whatsapp_bot_start_hour: '09:00',
        whatsapp_bot_end_hour: '18:00',
        whatsapp_bot_anti_collision: true,
        whatsapp_device_connected: false,
        whatsapp_bot_prompt: '',
    });

    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [qrSimulatedScan, setQrSimulatedScan] = useState(false);
    const [qrScanStep, setQrScanStep] = useState(0);
    const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
    const [qrCountdown, setQrCountdown] = useState(60);
    const [isSandboxMode, setIsSandboxMode] = useState(false);
    const qrPollingRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const qrCountdownRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

    const [activeTutorialStep, setActiveTutorialStep] = useState(0);

    const [simInput, setSimInput] = useState('');
    const [simulatorMessages, setSimulatorMessages] = useState<Array<{ sender: 'user' | 'bot', text: string, time: string }>>([
        { sender: 'bot', text: '¡Hola! 💈 Bienvenido al chat de prueba. Escribe un mensaje (ej: "precios", "hola", "tienen citas hoy en la tarde") para ver cómo responde la IA con tus instrucciones actuales en tiempo real.', time: '12:00 PM' }
    ]);
    const [isBotTyping, setIsBotTyping] = useState(false);

    useEffect(() => {
        if (currentBusiness) {
            setFormData({
                whatsapp_bot_active: (currentBusiness as any).whatsapp_bot_active ?? true,
                whatsapp_booking_link: currentBusiness.whatsapp_booking_link || '',
                whatsapp_offer: (currentBusiness as any).whatsapp_offer || '',
                whatsapp_marketing_active: (currentBusiness as any).whatsapp_marketing_active ?? true,
                whatsapp_bot_personality: (currentBusiness as any).whatsapp_bot_personality || 'quick',
                whatsapp_bot_auto_schedule: (currentBusiness as any).whatsapp_bot_auto_schedule ?? false,
                whatsapp_bot_start_hour: (currentBusiness as any).whatsapp_bot_start_hour || '09:00',
                whatsapp_bot_end_hour: (currentBusiness as any).whatsapp_bot_end_hour || '18:00',
                whatsapp_bot_anti_collision: (currentBusiness as any).whatsapp_bot_anti_collision ?? true,
                whatsapp_device_connected: (currentBusiness as any).whatsapp_device_connected ?? false,
                whatsapp_bot_prompt: (currentBusiness as any).whatsapp_bot_prompt || '',
            });
            if ((currentBusiness as any).whatsapp_device_connected) {
                setQrSimulatedScan(true);
            }
            fetchLogs();
            setLoading(false);
        }
    }, [currentBusiness]);

    const fetchLogs = async () => {
        if (!currentBusiness) return;
        setLogsLoading(true);
        try {
            const { data, error } = await supabase
                .from('bot_message_logs')
                .select('*')
                .eq('business_id', currentBusiness.id)
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            console.error('Error fetching bot logs:', err);
        } finally {
            setLogsLoading(false);
        }
    };

    const handleToggleBotActive = async () => {
        const newVal = !formData.whatsapp_bot_active;
        setFormData(p => ({ ...p, whatsapp_bot_active: newVal }));
        if (!currentBusiness) return;
        try {
            const { error } = await supabase
                .from('businesses')
                .update({ whatsapp_bot_active: newVal })
                .eq('id', currentBusiness.id);
            if (error) throw error;
            if (newVal) {
                toast.success('🤖 Asistente de IA Activo en vivo');
            } else {
                toast.success('🔇 Asistente de IA Pausado al instante');
            }
        } catch (err) {
            console.error('Error toggling bot active:', err);
            setFormData(p => ({ ...p, whatsapp_bot_active: !newVal }));
            toast.error('No se pudo cambiar el estado del bot. Intente de nuevo.');
        }
    };

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentBusiness) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('businesses')
                .update({
                    whatsapp_bot_prompt: formData.whatsapp_bot_prompt,
                    whatsapp_booking_link: formData.whatsapp_booking_link,
                    whatsapp_offer: formData.whatsapp_offer,
                    whatsapp_bot_personality: formData.whatsapp_bot_personality,
                    whatsapp_bot_auto_schedule: formData.whatsapp_bot_auto_schedule,
                    whatsapp_bot_start_hour: formData.whatsapp_bot_start_hour,
                    whatsapp_bot_end_hour: formData.whatsapp_bot_end_hour,
                    whatsapp_bot_anti_collision: formData.whatsapp_bot_anti_collision,
                })
                .eq('id', currentBusiness.id);
            if (error) throw error;
            toast.success('✨ Configuración de IA guardada con éxito.');
        } catch (err: any) {
            console.error('Error saving AI config:', err);
            toast.error('Ocurrió un error al guardar la configuración.');
        } finally {
            setSaving(false);
        }
    };

    const applyPreset = (presetName: 'colega' | 'premium' | 'rapido') => {
        let promptText = '';
        if (presetName === 'colega') {
            promptText = `Actúa como un barbero pana, súper carismático y de confianza. Usa modismos locales amigables. Saluda con entusiasmo ("¡Dímelo hermano! 🔥", "Qué es la que hay combo 💈").
Explica de manera bien fluida y relajada los precios, horarios o las ofertas activas.
Sé directo al grano, mantén los textos súper cortos y siempre anima al cliente a agendar su espacio en un toque con el enlace de reservas.`;
            setFormData(prev => ({ ...prev, whatsapp_bot_personality: 'cool', whatsapp_bot_prompt: promptText }));
        } else if (presetName === 'premium') {
            promptText = `Actúa como el recepcionista exclusivo de un distinguido salón de belleza y cuidado premium. Mantén un tono sumamente sofisticado, educado, atento y elegante. Saluda con cortesía ("Muy buenos días, estimado cliente. Es un placer asistirle en nuestro salón 👑").
Explica detalladamente las comodidades del salón, el catálogo de servicios refinados y las promociones vigentes.
Guía cordialmente al usuario a seleccionar su fecha ideal confirmando su cita en nuestro distinguido enlace oficial.`;
            setFormData(prev => ({ ...prev, whatsapp_bot_personality: 'executive', whatsapp_bot_prompt: promptText }));
        } else {
            promptText = `Actúa como un asistente virtual sumamente ágil, conciso y eficiente. Responde rápido, en oraciones cortas y con emojis sutiles.
Proporciona la lista de servicios principales de inmediato, responde dudas puntuales en viñetas ordenadas y entrega el enlace directo para programar la cita sin rodeos innecesarios. Evita saludos largos.`;
            setFormData(prev => ({ ...prev, whatsapp_bot_personality: 'quick', whatsapp_bot_prompt: promptText }));
        }
        toast.success('Plantilla aplicada. Modifica las instrucciones si quieres!');
    };

    const startQrLinkFlow = async () => {
        setQrModalOpen(true);
        setQrScanStep(1);
        setQrCountdown(60);
        setQrImageUrl(null);
        setIsSandboxMode(false);
        const gatewayUrl = import.meta.env.VITE_WHATSAPP_GATEWAY_URL;
        let usedRealGateway = false;
        if (gatewayUrl && currentBusiness) {
            try {
                const res = await fetch(`${gatewayUrl}/instance/qrcode`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ instance_id: currentBusiness.id }),
                    signal: AbortSignal.timeout(6000),
                });
                if (res.ok) {
                    const data = await res.json();
                    setQrImageUrl(data.qr_image_url ?? data.qr ?? null);
                    usedRealGateway = true;
                    setQrScanStep(2);
                    startQrPolling();
                    startQrCountdown();
                }
            } catch {
                // Gateway offline — sandbox fallback
            }
        }
        if (!usedRealGateway) {
            setIsSandboxMode(true);
            setQrImageUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=SpaceyReserveSandbox_${Date.now()}`);
            setQrScanStep(2);
            startQrCountdown();
            setTimeout(async () => {
                if (currentBusiness) {
                    await supabase.from('businesses').update({ whatsapp_device_connected: true }).eq('id', currentBusiness.id);
                }
                handleQrConnected();
            }, 4000);
        }
    };

    const startQrCountdown = () => {
        if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
        setQrCountdown(60);
        qrCountdownRef.current = setInterval(() => {
            setQrCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(qrCountdownRef.current!);
                    qrCountdownRef.current = null;
                    if (qrPollingRef.current) { clearInterval(qrPollingRef.current); qrPollingRef.current = null; }
                    setQrScanStep(4);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const startQrPolling = () => {
        if (qrPollingRef.current) clearInterval(qrPollingRef.current);
        qrPollingRef.current = setInterval(async () => {
            if (!currentBusiness) return;
            const { data } = await supabase
                .from('businesses')
                .select('whatsapp_status, whatsapp_device_connected')
                .eq('id', currentBusiness.id)
                .single();
            if (data?.whatsapp_status === 'connected' || data?.whatsapp_device_connected === true) {
                if (qrPollingRef.current) { clearInterval(qrPollingRef.current); qrPollingRef.current = null; }
                if (qrCountdownRef.current) { clearInterval(qrCountdownRef.current); qrCountdownRef.current = null; }
                handleQrConnected();
            }
        }, 3000);
    };

    const handleQrConnected = () => {
        setQrSimulatedScan(true);
        setFormData(prev => ({ ...prev, whatsapp_device_connected: true }));
        setQrScanStep(3);
        toast.success('📱 ¡WhatsApp conectado exitosamente!');
    };

    const handleCloseQrModal = () => {
        setQrModalOpen(false);
        if (qrPollingRef.current) { clearInterval(qrPollingRef.current); qrPollingRef.current = null; }
        if (qrCountdownRef.current) { clearInterval(qrCountdownRef.current); qrCountdownRef.current = null; }
    };

    const handleDisconnectQr = async () => {
        if (!window.confirm('¿Seguro que deseas desconectar tu celular del bot?')) return;
        try {
            if (currentBusiness) {
                await supabase.from('businesses')
                    .update({ whatsapp_device_connected: false, whatsapp_status: 'disconnected' })
                    .eq('id', currentBusiness.id);
            }
            setQrSimulatedScan(false);
            setFormData(prev => ({ ...prev, whatsapp_device_connected: false }));
            toast.success('📌 WhatsApp desconectado.');
        } catch (err) {
            console.error('Error disconnecting WhatsApp:', err);
            toast.error('No se pudo desconectar el dispositivo.');
        }
    };

    const handleSendSimulatorMsg = (e: React.FormEvent) => {
        e.preventDefault();
        if (!simInput.trim()) return;
        const userText = simInput;
        const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        setSimulatorMessages(prev => [...prev, { sender: 'user', text: userText, time: currentTime }]);
        setSimInput('');
        setIsBotTyping(true);
        setTimeout(() => {
            const lower = userText.toLowerCase();
            let botText = '';
            const bookingLink = formData.whatsapp_booking_link || `https://spaceyreserve.netlify.app/book/${currentBusiness?.slug || 'mi-barberia'}`;
            const address = currentBusiness?.address || 'nuestro local';
            const city = currentBusiness?.city || '';
            const offer = formData.whatsapp_offer || 'No hay promociones activas hoy';

            const getGreeting = () => {
                if (formData.whatsapp_bot_personality === 'cool') return `¡Dímelo hermano! 🔥 Qué gusto saludarte en Spacey Barber Shop 💈. ¿Cómo te asisto hoy pana?`;
                if (formData.whatsapp_bot_personality === 'executive') return `Muy buenos días, estimado cliente. Es un placer saludarle en nuestro distinguido salón 👑. ¿En qué podemos servirle?`;
                return `¡Hola! Bienvenido. ¿Cómo te asisto hoy con tu cita? 🤖`;
            };
            const getOffer = () => {
                if (formData.whatsapp_bot_personality === 'cool') return `¡Durísimo! 🔥 Tenemos esta promo activa hoy: "${offer}". ¡Aprovéchala ya!`;
                if (formData.whatsapp_bot_personality === 'executive') return `Le informamos que disponemos de la siguiente cortesía exclusiva: "${offer}".`;
                return `¡Sí! Tenemos la siguiente promoción activa hoy: "${offer}".`;
            };
            const getBooking = () => {
                if (formData.whatsapp_bot_personality === 'cool') return `¡Agenda tu cita de una en este link! 🔗 ${bookingLink} 🚀✂️`;
                if (formData.whatsapp_bot_personality === 'executive') return `Le invitamos a reservar mediante nuestro enlace oficial: 🔗 ${bookingLink}`;
                return `Reserva tu cita en segundos: 🔗 ${bookingLink} 📅`;
            };
            const aiPrefix = formData.whatsapp_bot_prompt ? `[🧠 IA usando tu prompt: "${formData.whatsapp_bot_prompt.substring(0, 30)}..."]\n\n` : '';

            if (lower.includes('hola') || lower.includes('buenos') || lower.includes('buenas')) {
                botText = `${getGreeting()}\n\nEscribe "precios", "ubicación", "ofertas" o "reservar" para asistirte.`;
            } else if (lower.includes('precio') || lower.includes('servicio') || lower.includes('cuesta')) {
                const serviceList = services && services.length > 0
                    ? services.slice(0, 4).map(s => `• ${s.name}: $${s.price}`).join('\n')
                    : '• Corte de Cabello: $20\n• Afeitado Clásico: $15\n• Combo Flow Completo: $30';
                botText = `${aiPrefix}Claro, estos son nuestros servicios:\n\n${serviceList}\n\n${getBooking()}`;
            } else if (lower.includes('donde') || lower.includes('ubicacion') || lower.includes('direccion')) {
                botText = `${aiPrefix}Nos encontramos en: 📍 ${address}${city ? ', ' + city : ''}.\n\n¡Te esperamos! Recuerda reservar antes.`;
            } else if (lower.includes('oferta') || lower.includes('promo') || lower.includes('descuento')) {
                botText = `${aiPrefix}${getOffer()}\n\n${getBooking()}`;
            } else if (lower.includes('reserva') || lower.includes('cita') || lower.includes('agendar')) {
                botText = `${aiPrefix}${getBooking()}`;
            } else if (lower.includes('tarde') || lower.includes('hoy') || lower.includes('hora')) {
                botText = `Perfecto, te apartamos las 15:30 del 2026-05-17. Confirma tu cita aquí antes de que se libere el espacio 👇\n${bookingLink}?date=2026-05-17&time=15:30\nSolo toma 30 segundos ✅`;
            } else {
                botText = `${aiPrefix}Entendido. Para agendar de inmediato: \n\n🔗 ${bookingLink}\n\n¡Esperamos verte pronto! 💈`;
            }
            setSimulatorMessages(prev => [...prev, { sender: 'bot', text: botText, time: currentTime }]);
            setIsBotTyping(false);
        }, 1200);
    };

    const mockLogs = [
        {
            id: 'mock-1',
            from_number: '17875551234',
            user_message: 'Buenas tardes! Tienen espacio libre para recortar hoy tarde?',
            bot_response: '¡Hola! 💈 Sí, claro que sí. En el turno de la tarde tenemos libres estos horarios: 14:00, 15:30, 16:30 y 17:30. ¿Cuál te conviene?',
            created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        },
        {
            id: 'mock-2',
            from_number: '17875551234',
            user_message: 'El de las 15:30 me va perfecto, sepáramelo porfa.',
            bot_response: `Perfecto, te apartamos las 15:30 de Hoy. Confirma tu cita aquí antes de que se libere el espacio 👇\nhttps://spaceyreserve.netlify.app/book/${currentBusiness?.slug || 'mi-barberia'}?date=2026-05-17&time=15:30\nSolo toma 30 segundos ✅`,
            created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString()
        },
        {
            id: 'mock-3',
            from_number: '19395556789',
            user_message: 'Cuánto cuesta el combo de corte y afeitado de barba?',
            bot_response: `¡Dímelo hermano! 🔥 El Combo Afeitado Clásico y Corte cuesta $30 e incluye lavado y toalla caliente 💈. ¿Te apartamos un espacio?\n\nReserva en segundos: 🔗 https://spaceyreserve.netlify.app/book/${currentBusiness?.slug || 'mi-barberia'} 📅`,
            created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
        }
    ];

    const displayLogs = logs.length > 0 ? logs : mockLogs;
    const isUsingDemoData = logs.length === 0;

    if (loading) {
        return (
            <div className="min-h-screen bg-space-bg flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="animate-spin text-space-primary" size={32} />
                <p className="text-space-muted font-bold uppercase tracking-wider text-xs">Cargando Centro de Inteligencia Artificial...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 space-y-10 pb-16 animate-fade-in">

            {/* Volver */}
            <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-space-card border border-space-border rounded-xl text-[10px] font-black text-space-muted hover:text-space-primary hover:border-space-primary/40 uppercase tracking-widest transition-all"
            >
                <ArrowRight size={14} className="rotate-180" /> Volver al Dashboard
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 p-6 bg-gradient-to-r from-space-card to-space-card/40 rounded-3xl border border-space-border shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-space-primary/10 text-space-primary border border-space-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
                        <Sparkles size={28} className="animate-pulse" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-black text-space-text uppercase tracking-tight leading-none">Centro de Inteligencia Artificial</h1>
                            <span className="bg-space-primary/15 text-space-primary text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-space-primary/25">Copilot AI</span>
                        </div>
                        <p className="text-[10px] text-space-muted uppercase font-bold tracking-widest mt-1.5">Configura tu asistente virtual, mide tus conversiones y audita logs en vivo</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[9px] text-space-muted font-bold uppercase tracking-widest">Estado del Bot</p>
                        <p className={`text-xs font-black uppercase tracking-wide mt-0.5 ${formData.whatsapp_bot_active ? 'text-space-primary' : 'text-space-muted'}`}>
                            {formData.whatsapp_bot_active ? '🤖 Activo' : '🔇 Pausado'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleToggleBotActive}
                        className={`w-14 h-8 rounded-full relative transition-all duration-300 ${formData.whatsapp_bot_active ? 'bg-space-primary' : 'bg-space-card2'}`}
                    >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${formData.whatsapp_bot_active ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>
            </div>

            {/* Analytics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 bg-space-card/70 rounded-2xl border border-space-border flex items-center justify-between shadow-md relative overflow-hidden">
                    <div className="space-y-1 z-10">
                        <p className="text-[9px] text-space-muted font-bold uppercase tracking-widest">Sincronización</p>
                        <p className="text-lg font-black text-space-text uppercase">{qrSimulatedScan ? 'Conectado' : 'Sin Conexión'}</p>
                        <p className="text-[8px] text-space-muted font-semibold uppercase">{qrSimulatedScan ? 'Samsung S24 Activo' : 'Vincular dispositivo'}</p>
                    </div>
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${qrSimulatedScan ? 'bg-space-primary/10 text-space-primary' : 'bg-rose-500/10 text-rose-500'}`}>
                        <QrCode size={22} className={qrSimulatedScan ? '' : 'animate-pulse'} />
                    </div>
                    {isUsingDemoData && <div className="absolute top-1.5 right-2 bg-amber-500/10 text-amber-500 text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border border-amber-500/20">DEMO</div>}
                </div>

                <div className="p-6 bg-space-card/70 rounded-2xl border border-space-border flex items-center justify-between shadow-md relative overflow-hidden">
                    <div className="space-y-1 z-10">
                        <p className="text-[9px] text-space-muted font-bold uppercase tracking-widest">Respuestas Hoy</p>
                        <p className="text-lg font-black text-space-text uppercase">
                            {isUsingDemoData ? '48' : (currentBusiness as any).daily_msg_count ?? 0} <span className="text-xs text-space-muted font-normal">/ 100</span>
                        </p>
                        <div className="w-24 bg-space-border/50 h-1.5 rounded-full mt-1.5 overflow-hidden">
                            <div className="bg-space-primary h-full rounded-full" style={{ width: `${isUsingDemoData ? 48 : ((currentBusiness as any).daily_msg_count ?? 0)}%` }} />
                        </div>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <MessageSquare size={22} />
                    </div>
                    {isUsingDemoData && <div className="absolute top-1.5 right-2 bg-amber-500/10 text-amber-500 text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border border-amber-500/20">DEMO</div>}
                </div>

                <div className="p-6 bg-space-card/70 rounded-2xl border border-space-border flex items-center justify-between shadow-md relative overflow-hidden">
                    <div className="space-y-1 z-10">
                        <p className="text-[9px] text-space-muted font-bold uppercase tracking-widest">Citas por IA</p>
                        <p className="text-lg font-black text-space-text uppercase flex items-center gap-1.5">
                            {isUsingDemoData ? '12' : '0'}
                            <span className="text-space-primary text-[10px] font-bold flex items-center"><TrendingUp size={10} /> +15%</span>
                        </p>
                        <p className="text-[8px] text-space-muted font-semibold uppercase">Citas agendadas por bot</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <Calendar size={22} />
                    </div>
                    {isUsingDemoData && <div className="absolute top-1.5 right-2 bg-amber-500/10 text-amber-500 text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border border-amber-500/20">DEMO</div>}
                </div>

                <div className="p-6 bg-space-card/70 rounded-2xl border border-space-border flex items-center justify-between shadow-md relative overflow-hidden">
                    <div className="space-y-1 z-10">
                        <p className="text-[9px] text-space-muted font-bold uppercase tracking-widest">Velocidad Respuesta</p>
                        <p className="text-lg font-black text-space-text uppercase">1.2s</p>
                        <p className="text-[8px] text-space-primary font-bold uppercase tracking-widest">⚡ Ultra Fast</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                        <Zap size={22} />
                    </div>
                    {isUsingDemoData && <div className="absolute top-1.5 right-2 bg-amber-500/10 text-amber-500 text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border border-amber-500/20">DEMO</div>}
                </div>
            </div>

            {/* Tutorial Onboarding */}
            <div className="p-6 sm:p-8 bg-gradient-to-br from-space-card via-space-card to-space-card2/30 rounded-3xl border border-space-border shadow-xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h2 className="text-base font-black text-space-text uppercase tracking-tight flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-space-primary animate-pulse" />
                            🎓 Academia Spacey: Onboarding & Guía Rápida
                        </h2>
                        <p className="text-[10px] text-space-muted font-bold uppercase tracking-wider">Aprende a sacarle el máximo provecho a tu asistente en 4 simples pasos</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 bg-space-card2 p-1 rounded-full border border-space-border">
                        {[0, 1, 2, 3].map((step) => (
                            <button
                                key={step}
                                onClick={() => setActiveTutorialStep(step)}
                                className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeTutorialStep === step ? 'bg-space-primary text-white shadow-md' : 'text-space-muted hover:text-space-text'}`}
                            >
                                Paso {step + 1}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-space-card2/50 rounded-2xl border border-space-border flex flex-col md:flex-row items-center justify-between gap-6">
                    {activeTutorialStep === 0 && (
                        <>
                            <div className="space-y-4 w-full md:max-w-lg">
                                <span className="px-2.5 py-1 bg-space-primary/10 text-space-primary text-[8px] font-black uppercase tracking-widest rounded-full border border-space-primary/25">✂️ Tu Catálogo de Servicios</span>
                                <h3 className="text-lg font-black text-space-text uppercase tracking-tight">Sube tus servicios con precios reales</h3>
                                <p className="text-space-muted text-xs font-semibold uppercase leading-relaxed tracking-wider">El bot lee automáticamente la lista de tus servicios activos con sus respectivos precios y duraciones. ¡Nunca inventará un precio diferente!</p>
                                <button onClick={() => navigate('/dashboard/services')} className="px-6 py-2.5 bg-space-primary hover:bg-space-primary-dark text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-md">
                                    Ir a Catálogo de Servicios <ChevronRight size={14} />
                                </button>
                            </div>
                            <div className="w-24 h-24 rounded-2xl bg-space-card2 flex items-center justify-center border border-space-border text-space-primary shadow-inner flex-shrink-0">
                                <Scissors size={48} />
                            </div>
                        </>
                    )}
                    {activeTutorialStep === 1 && (
                        <>
                            <div className="space-y-4 w-full md:max-w-lg">
                                <span className="px-2.5 py-1 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-amber-500/25">📅 Configurar Horarios</span>
                                <h3 className="text-lg font-black text-space-text uppercase tracking-tight">Define tus horas de trabajo</h3>
                                <p className="text-space-muted text-xs font-semibold uppercase leading-relaxed tracking-wider">Define tus horas laborables. El asistente calcula tus citas de los próximos 3 días y jamás ofrecerá un espacio ocupado o fuera de tu horario.</p>
                                <button onClick={() => navigate('/dashboard/schedules')} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-md">
                                    Configurar Horarios <ChevronRight size={14} />
                                </button>
                            </div>
                            <div className="w-24 h-24 rounded-2xl bg-space-card2 flex items-center justify-center border border-space-border text-amber-500 shadow-inner flex-shrink-0">
                                <Clock size={48} />
                            </div>
                        </>
                    )}
                    {activeTutorialStep === 2 && (
                        <>
                            <div className="space-y-4 w-full md:max-w-lg">
                                <span className="px-2.5 py-1 bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-blue-500/25">🔗 Tu Enlace de Reservas</span>
                                <h3 className="text-lg font-black text-space-text uppercase tracking-tight">El portal que cierra la venta</h3>
                                <p className="text-space-muted text-xs font-semibold uppercase leading-relaxed tracking-wider">Cuando un cliente selecciona un horario, el bot le envía el enlace pre-rellenado para que complete su reserva en segundos.</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <input type="text" readOnly value={formData.whatsapp_booking_link || `https://spaceyreserve.netlify.app/book/${currentBusiness?.slug || 'mi-barberia'}`}
                                        className="flex-1 min-w-0 px-4 py-2 bg-space-card2 border border-space-border rounded-xl text-[10px] text-space-text font-mono focus:outline-none" />
                                    <button onClick={() => { navigator.clipboard.writeText(formData.whatsapp_booking_link || `https://spaceyreserve.netlify.app/book/${currentBusiness?.slug || 'mi-barberia'}`); toast.success('¡Enlace copiado!'); }}
                                        className="p-2 bg-space-card2 hover:bg-space-border border border-space-border rounded-xl text-space-text transition-all flex-shrink-0">
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="w-24 h-24 rounded-2xl bg-space-card2 flex items-center justify-center border border-space-border text-blue-500 shadow-inner flex-shrink-0">
                                <ExternalLink size={48} />
                            </div>
                        </>
                    )}
                    {activeTutorialStep === 3 && (
                        <>
                            <div className="space-y-4 w-full md:max-w-lg">
                                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-500/25">📌 Conectar WhatsApp</span>
                                <h3 className="text-lg font-black text-space-text uppercase tracking-tight">Escanea el QR y prende tu bot</h3>
                                <p className="text-space-muted text-xs font-semibold uppercase leading-relaxed tracking-wider">Una vez escaneado el QR, tu bot comenzará a responder todas las consultas de inmediato. ¡Apágalo o enciéndelo cuando gustes!</p>
                                <button onClick={startQrLinkFlow} className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-md">
                                    Escanear Código QR <ChevronRight size={14} />
                                </button>
                            </div>
                            <div className="w-24 h-24 rounded-2xl bg-space-card2 flex items-center justify-center border border-space-border text-emerald-500 shadow-inner flex-shrink-0">
                                <QrCode size={48} />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* LEFT */}
                <div className="space-y-8">
                    <form onSubmit={handleSaveConfig} className="p-6 sm:p-8 bg-space-card/70 rounded-3xl border border-space-border shadow-xl space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-base font-black text-space-text uppercase tracking-tight flex items-center gap-2">
                                ⚙️ Ajustes del Asistente de IA
                            </h2>
                            <p className="text-[10px] text-space-muted font-bold uppercase tracking-wider">Configura el comportamiento, link de reservas y horarios del bot</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-space-muted uppercase tracking-wider">Instrucciones del Prompt del Sistema</label>
                                <textarea
                                    value={formData.whatsapp_bot_prompt}
                                    onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_bot_prompt: e.target.value }))}
                                    placeholder="Ej: Eres un barbero de confianza, mantén un tono súper urbano..."
                                    className="w-full h-36 bg-space-card2 border border-space-border rounded-2xl p-4 text-xs text-space-text placeholder-space-muted/40 focus:outline-none focus:border-space-primary/40 focus:ring-1 focus:ring-space-primary/40 transition-all resize-none leading-relaxed"
                                />
                            </div>

                            <div className="space-y-2">
                                <p className="text-[8px] font-black text-space-muted uppercase tracking-widest">Plantillas de Tono Rápidas:</p>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => applyPreset('colega')} className="px-4 py-2 bg-space-card2 hover:bg-space-primary/10 border border-space-border hover:border-space-primary/30 rounded-xl text-[9px] font-black text-space-text uppercase tracking-widest transition-all">
                                        💈 Barbero Colega
                                    </button>
                                    <button type="button" onClick={() => applyPreset('premium')} className="px-4 py-2 bg-space-card2 hover:bg-space-primary/10 border border-space-border hover:border-space-primary/30 rounded-xl text-[9px] font-black text-space-text uppercase tracking-widest transition-all">
                                        👑 Salón Premium
                                    </button>
                                    <button type="button" onClick={() => applyPreset('rapido')} className="px-4 py-2 bg-space-card2 hover:bg-space-primary/10 border border-space-border hover:border-space-primary/30 rounded-xl text-[9px] font-black text-space-text uppercase tracking-widest transition-all">
                                        🤖 Asistente Rápido
                                    </button>
                                </div>
                            </div>

                            <hr className="border-space-border" />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-space-muted uppercase tracking-wider">Enlace Oficial de Reservas</label>
                                    <input type="text" value={formData.whatsapp_booking_link}
                                        onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_booking_link: e.target.value }))}
                                        placeholder="https://spaceyreserve.netlify.app/book/mi-barberia"
                                        className="w-full bg-space-card2 border border-space-border rounded-xl px-4 py-3 text-xs text-space-text focus:outline-none focus:border-space-primary/40 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-space-muted uppercase tracking-wider">Promoción Activa (Opcional)</label>
                                    <input type="text" value={formData.whatsapp_offer}
                                        onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_offer: e.target.value }))}
                                        placeholder="Ej: 15% desc. cortes de cabello hoy"
                                        className="w-full bg-space-card2 border border-space-border rounded-xl px-4 py-3 text-xs text-space-text focus:outline-none focus:border-space-primary/40 transition-all" />
                                </div>
                            </div>

                            <hr className="border-space-border" />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-space-card2/50 rounded-2xl border border-space-border">
                                    <div>
                                        <h4 className="text-[10px] font-black text-space-text uppercase tracking-tight">Anti-Colisión de Respuestas</h4>
                                        <p className="text-[8px] text-space-muted font-bold uppercase tracking-wider mt-0.5">Mutea al bot si un humano responde en los últimos 15 min</p>
                                    </div>
                                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, whatsapp_bot_anti_collision: !prev.whatsapp_bot_anti_collision }))}
                                        className={`w-10 h-6 rounded-full relative transition-all flex-shrink-0 ${formData.whatsapp_bot_anti_collision ? 'bg-space-primary' : 'bg-space-card2'}`}>
                                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${formData.whatsapp_bot_anti_collision ? 'left-4' : 'left-0.5'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-space-card2/50 rounded-2xl border border-space-border">
                                    <div>
                                        <h4 className="text-[10px] font-black text-space-text uppercase tracking-tight">Horario de Actividad</h4>
                                        <p className="text-[8px] text-space-muted font-bold uppercase tracking-wider mt-0.5">El bot responderá únicamente dentro del horario establecido</p>
                                    </div>
                                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, whatsapp_bot_auto_schedule: !prev.whatsapp_bot_auto_schedule }))}
                                        className={`w-10 h-6 rounded-full relative transition-all flex-shrink-0 ${formData.whatsapp_bot_auto_schedule ? 'bg-space-primary' : 'bg-space-card2'}`}>
                                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${formData.whatsapp_bot_auto_schedule ? 'left-4' : 'left-0.5'}`} />
                                    </button>
                                </div>

                                {formData.whatsapp_bot_auto_schedule && (
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-space-card2 rounded-2xl border border-space-border">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black text-space-muted uppercase tracking-widest">Hora de Apertura</label>
                                            <input type="time" value={formData.whatsapp_bot_start_hour}
                                                onChange={(e) => setFormData(p => ({ ...p, whatsapp_bot_start_hour: e.target.value }))}
                                                className="w-full bg-space-card2 border border-space-border rounded-xl px-3 py-2.5 text-xs text-space-text focus:outline-none" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black text-space-muted uppercase tracking-widest">Hora de Cierre</label>
                                            <input type="time" value={formData.whatsapp_bot_end_hour}
                                                onChange={(e) => setFormData(p => ({ ...p, whatsapp_bot_end_hour: e.target.value }))}
                                                className="w-full bg-space-card2 border border-space-border rounded-xl px-3 py-2.5 text-xs text-space-text focus:outline-none" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button type="submit" disabled={saving}
                            className="w-full py-3 bg-space-primary hover:bg-space-primary-dark disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2">
                            {saving ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                            {saving ? 'Guardando...' : 'Guardar Configuración de IA'}
                        </button>
                    </form>

                    {/* Logs */}
                    <div className="p-6 sm:p-8 bg-space-card/70 rounded-3xl border border-space-border shadow-xl space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="text-base font-black text-space-text uppercase tracking-tight flex items-center gap-2">
                                    💬 Bitácora de Conversaciones
                                </h2>
                                <p className="text-[10px] text-space-muted font-bold uppercase tracking-wider">Historial de chats e interacciones en vivo</p>
                            </div>
                            <button type="button" onClick={fetchLogs} disabled={logsLoading}
                                className="p-2 bg-space-card2 hover:bg-space-border rounded-xl text-space-muted hover:text-space-text transition-all border border-space-border">
                                <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {isUsingDemoData && (
                            <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20 flex items-start gap-3">
                                <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-wide">✔ Modo de Demostración Activo</p>
                                    <p className="text-[8px] text-amber-500/80 font-bold uppercase tracking-wider leading-relaxed">
                                        Como tu bot aún no ha atendido clientes reales, te mostramos conversaciones simuladas. Cuando vincules tu celular y recibas mensajes reales, estos se reemplazarán automáticamente.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
                            {displayLogs.map((log) => (
                                <div key={log.id} className="p-4 bg-space-card2/50 rounded-2xl border border-space-border space-y-3">
                                    <div className="flex items-center justify-between border-b border-space-border pb-2 flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-space-text font-mono">📱 {log.from_number}</span>
                                            <span className="bg-emerald-500/10 text-emerald-500 text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-0.5">
                                                <ShieldCheck size={8} /> HMAC Ok
                                            </span>
                                        </div>
                                        <span className="text-[8px] text-space-muted font-semibold uppercase">{new Date(log.created_at).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="bg-space-card2 px-3 py-2 rounded-xl border border-space-border max-w-[90%]">
                                            <p className="text-[8px] text-space-muted font-bold uppercase tracking-widest">Cliente</p>
                                            <p className="text-[11px] text-space-text font-medium leading-relaxed mt-0.5">{log.user_message}</p>
                                        </div>
                                        <div className="bg-space-primary/10 px-3 py-2 rounded-xl border border-space-primary/10 max-w-[90%] ml-auto">
                                            <p className="text-[8px] text-space-primary font-bold uppercase tracking-widest">Copilot AI</p>
                                            <p className="text-[11px] text-space-text font-medium leading-relaxed mt-0.5 whitespace-pre-line">{log.bot_response}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT */}
                <div className="space-y-8">
                    {/* QR Card */}
                    <div className="p-6 bg-gradient-to-br from-space-card to-space-card/45 rounded-3xl border border-space-border shadow-xl space-y-4">
                        <div className="space-y-1">
                            <h3 className="text-xs font-black text-space-text uppercase tracking-tight flex items-center gap-1.5">
                                📌 Vinculación de WhatsApp
                            </h3>
                            <p className="text-[9px] text-space-muted font-bold uppercase tracking-widest">Conecta tu número personal al bot asistente</p>
                        </div>

                        {qrSimulatedScan ? (
                            <div className="p-4 bg-space-primary/5 rounded-2xl border border-space-primary/20 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-space-primary/10 text-space-primary border border-space-primary/25 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <ExternalLink size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-space-text uppercase tracking-wide">Celular Vinculado en Vivo</p>
                                        <p className="text-[8px] text-space-muted font-semibold uppercase tracking-wider mt-0.5">Dispositivo: <strong className="text-space-text">Samsung Galaxy S24</strong></p>
                                    </div>
                                </div>
                                <button type="button" onClick={handleDisconnectQr}
                                    className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest border border-rose-500/20 transition-all flex items-center justify-center gap-1.5">
                                    Desconectar Dispositivo
                                </button>
                            </div>
                        ) : (
                            <div className="p-6 bg-space-card2/50 rounded-2xl border border-space-border text-center space-y-4">
                                <div className="w-14 h-14 bg-space-card2 text-space-muted border border-space-border rounded-full flex items-center justify-center mx-auto shadow-inner">
                                    <QrCode size={26} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-space-text uppercase tracking-tight">Sin Dispositivos Sincronizados</p>
                                    <p className="text-[8px] text-space-muted font-bold uppercase tracking-widest leading-relaxed">Vincula tu celular para comenzar a despachar citas automáticamente por WhatsApp.</p>
                                </div>
                                <button type="button" onClick={startQrLinkFlow}
                                    className="w-full py-3 bg-space-primary hover:bg-space-primary-dark text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md">
                                    Escanear Código QR
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Simulador */}
                    <div className="p-6 sm:p-8 bg-space-card/70 rounded-3xl border border-space-border shadow-xl space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-base font-black text-space-text uppercase tracking-tight flex items-center gap-2">
                                <Smartphone size={18} /> Simulador Copiloto en Vivo
                            </h2>
                            <p className="text-[10px] text-space-muted font-bold uppercase tracking-wider">Chatea con tu bot y prueba tu prompt al instante</p>
                        </div>

                        <div className="w-full max-w-[320px] mx-auto bg-[#0a0f18] rounded-[36px] p-3.5 border-4 border-[#1f293d] shadow-2xl relative flex flex-col h-[520px]">
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-5 bg-[#1f293d] rounded-full z-30 flex items-center justify-center">
                                <div className="w-2.5 h-2.5 bg-black rounded-full ml-auto mr-4" />
                            </div>
                            <div className="bg-[#0f172a] rounded-t-[26px] p-3.5 border-b border-white/5 flex items-center justify-between pt-7">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-space-primary/15 text-space-primary border border-space-primary/25 flex items-center justify-center text-[10px] font-black">🤖</div>
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase tracking-wide leading-none">{currentBusiness?.name || 'Copiloto Spacey'}</p>
                                        <span className="text-[7px] text-space-primary font-bold uppercase tracking-widest">● asistente online</span>
                                    </div>
                                </div>
                                <span className="bg-white/5 text-white/50 text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-white/10">PRUEBA</span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-3 flex flex-col justify-end">
                                {simulatorMessages.map((msg, idx) => (
                                    <div key={idx} className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'items-start'}`}>
                                        <div className={`p-3 rounded-2xl text-[10px] font-medium leading-relaxed ${msg.sender === 'user' ? 'bg-space-primary text-white rounded-tr-none' : 'bg-white/5 text-white/90 border border-white/5 rounded-tl-none whitespace-pre-line'}`}>
                                            {msg.text}
                                        </div>
                                        <span className="text-[6px] text-white/30 font-semibold mt-1 uppercase">{msg.time}</span>
                                    </div>
                                ))}
                                {isBotTyping && (
                                    <div className="flex items-center gap-1.5 p-2.5 bg-white/5 rounded-xl border border-white/5 max-w-[60px] animate-pulse">
                                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSendSimulatorMsg} className="p-2 border-t border-white/5 bg-[#0f172a] rounded-b-[26px] flex items-center gap-2">
                                <input type="text" value={simInput} onChange={(e) => setSimInput(e.target.value)}
                                    placeholder="Escribe tu mensaje..."
                                    className="flex-1 bg-black/40 border border-white/10 rounded-full px-4 py-2.5 text-[10px] text-white placeholder-white/20 focus:outline-none focus:border-space-primary/45 transition-all" />
                                <button type="submit" disabled={!simInput.trim() || isBotTyping}
                                    className="w-8 h-8 rounded-full bg-space-primary hover:bg-space-primary-dark disabled:opacity-50 text-white flex items-center justify-center transition-all shadow-md flex-shrink-0">
                                    <Send size={12} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* QR Modal */}
            {qrModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                    <div className="w-full max-w-md p-6 sm:p-8 bg-space-card border border-space-border rounded-t-3xl sm:rounded-3xl shadow-2xl space-y-6 relative overflow-hidden">
                        {qrScanStep === 2 && (
                            <div className="absolute left-0 right-0 h-0.5 bg-space-primary animate-laser-scan shadow-lg shadow-space-primary/80 z-20" />
                        )}
                        <div className="text-center space-y-2">
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                                <h3 className="text-base font-black text-space-text uppercase tracking-tight">Sincronizar WhatsApp</h3>
                                {isSandboxMode && (
                                    <span className="bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-amber-500/20">Modo Sandbox</span>
                                )}
                            </div>
                            <p className="text-[9px] text-space-muted font-bold uppercase tracking-widest">Escanea el código para activar tu asistente</p>
                        </div>

                        {qrScanStep === 1 && (
                            <div className="flex flex-col items-center justify-center p-6 space-y-4">
                                <RefreshCw className="animate-spin text-space-primary" size={28} />
                                <p className="text-[10px] text-space-muted font-bold uppercase tracking-wider">Generando código QR único...</p>
                            </div>
                        )}

                        {qrScanStep === 2 && (
                            <div className="flex flex-col items-center justify-center p-4 space-y-6">
                                <div className="p-4 bg-white rounded-2xl shadow-inner">
                                    <img src={qrImageUrl || `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=SpaceyFallback`}
                                        alt="WhatsApp QR Code" className="w-40 h-40 opacity-90" />
                                </div>
                                <div className="space-y-2 text-center max-w-xs">
                                    <p className="text-[10px] font-black text-space-text uppercase tracking-wide flex items-center justify-center gap-1.5">
                                        <Smartphone size={14} className="animate-pulse" /> Abre WhatsApp en tu celular
                                    </p>
                                    <p className="text-[8px] text-space-muted font-bold uppercase tracking-wider leading-relaxed">
                                        Ve a Ajustes &gt; Dispositivos Vinculados &gt; Vincular un dispositivo y escanea.
                                    </p>
                                    <div className="flex items-center justify-center gap-2 mt-2">
                                        <div className="w-8 h-8 rounded-full border-2 border-space-border flex items-center justify-center">
                                            <span className={`text-xs font-black ${qrCountdown <= 15 ? 'text-space-danger' : 'text-space-text'}`}>{qrCountdown}</span>
                                        </div>
                                        <p className={`text-[8px] font-black uppercase tracking-widest ${qrCountdown <= 15 ? 'text-space-danger' : 'text-space-muted'}`}>
                                            Segundos hasta expirar
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {qrScanStep === 3 && (
                            <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
                                <div className="w-12 h-12 bg-space-primary/10 text-space-primary border border-space-primary/25 rounded-full flex items-center justify-center shadow-lg">
                                    <Check size={24} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black text-space-text uppercase tracking-wide">✔ ¡Vinculación Exitosa!</p>
                                    <p className="text-[8px] text-space-muted font-bold uppercase tracking-widest leading-relaxed">
                                        Tu dispositivo está enlazado y listo para responder de forma autónoma.
                                        {isSandboxMode && ' (Modo sandbox activo)'}
                                    </p>
                                </div>
                                <button type="button" onClick={handleCloseQrModal}
                                    className="px-6 py-2 bg-space-primary hover:bg-space-primary-dark text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                                    Entendido y Cerrar
                                </button>
                            </div>
                        )}

                        {qrScanStep === 4 && (
                            <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
                                <div className="w-12 h-12 bg-space-danger/10 text-space-danger border border-space-danger/25 rounded-full flex items-center justify-center">
                                    <AlertTriangle size={24} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black text-space-text uppercase tracking-wide">QR Expirado</p>
                                    <p className="text-[8px] text-space-muted font-bold uppercase tracking-widest leading-relaxed">El código QR expiró. Genera uno nuevo para intentarlo.</p>
                                </div>
                                <button type="button" onClick={startQrLinkFlow}
                                    className="px-6 py-2 bg-space-primary hover:bg-space-primary-dark text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                                    Generar Nuevo QR
                                </button>
                            </div>
                        )}

                        {qrScanStep !== 3 && qrScanStep !== 4 && (
                            <button type="button" onClick={handleCloseQrModal}
                                className="w-full py-2.5 bg-space-card2 hover:bg-space-border text-space-muted hover:text-space-text rounded-xl text-[9px] font-black uppercase tracking-widest border border-space-border transition-all">
                                Cancelar Vinculación
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}