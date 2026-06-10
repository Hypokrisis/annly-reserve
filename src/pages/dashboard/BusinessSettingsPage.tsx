import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import { Input } from '@/components/common/Input';
import { ImageUploadWithCrop } from '@/components/common/ImageUploadWithCrop';
import { useToast } from '@/contexts/ToastContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Store, Check, Info, Save, MapPin, Sparkles, Map, Loader2, ChevronLeft, Eye, Gift, Zap, Crown, MessageSquare, Send } from 'lucide-react';

export default function BusinessSettingsPage() {
    const navigate = useNavigate();
    const { currentBusiness } = useAuth();
    const { business, subscription, services } = useBusiness();
    const toast = useToast();
    const [previewOpen, setPreviewOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        phone: '',
        description: '',
        address: '',
        city: '',
        state: 'PR',
        zip_code: '',
        business_type: 'barberia',
        latitude: '',
        longitude: '',
        logo_url: '',
        banner_url: '',
        instagram_url: '',
        website_url: '',
        gallery: [] as string[],
        whatsapp_bot_active: true,
        whatsapp_reminder_template: '',
        whatsapp_booking_link: '',
        whatsapp_offer: '',
        whatsapp_marketing_active: true,
        whatsapp_bot_personality: 'quick',
        // New features:
        whatsapp_bot_auto_schedule: false,
        whatsapp_bot_start_hour: '09:00',
        whatsapp_bot_end_hour: '18:00',
        whatsapp_bot_anti_collision: true,
        whatsapp_device_connected: false,
        whatsapp_bot_prompt: '',
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'public' | 'gallery' | 'location' | 'bot'>('profile');

    // QR connection states
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [isGeneratingQr, setIsGeneratingQr] = useState(false);
    const [qrSimulatedScan, setQrSimulatedScan] = useState(false);

    // ── WhatsApp Simulator State ──
    const [simulatorMessages, setSimulatorMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string; time: string }>>([
        { sender: 'bot', text: '¡Hola! 💈 Bienvenido al bot de atención automática. Escribe "hola", "precios", "ubicación" o "oferta" para simular cómo respondo a tus clientes.', time: '11:00 AM' }
    ]);
    const [simulatorInput, setSimulatorInput] = useState('');
    const [isBotTyping, setIsBotTyping] = useState(false);

    const handleSendSimulatorMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!simulatorInput.trim()) return;

        const userMsg = simulatorInput.trim();
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Add user message
        setSimulatorMessages(prev => [...prev, { sender: 'user', text: userMsg, time: currentTime }]);
        setSimulatorInput('');
        setIsBotTyping(true);

        setTimeout(() => {
            let botText = '';
            const lower = userMsg.toLowerCase();
            const businessName = formData.name || 'Nuestra Barbería';
            const bookingLink = formData.whatsapp_booking_link || `${window.location.origin}/book/${formData.slug}`;
            const address = formData.address || 'nuestra dirección';
            const city = formData.city || '';
            const offer = formData.whatsapp_offer || '';

            // Anti-collision alert simulator
            if (formData.whatsapp_bot_anti_collision && (lower.includes('barbero') || lower.includes('humano') || lower.includes('atencion'))) {
                botText = `[🔇 Bot en silencio temporal]\n\nHe detectado que deseas hablar con un barbero real. El bot se ha silenciado automáticamente para evitar interrumpir tu conversación con el staff. ¡En unos instantes te atenderemos de forma manual!`;
                setSimulatorMessages(prev => [...prev, { sender: 'bot', text: botText, time: currentTime }]);
                setIsBotTyping(false);
                return;
            }

            // Personality prefix helper
            const getPersonalityGreeting = () => {
                const prefix = formData.whatsapp_bot_prompt 
                    ? `[🧠 Simulación de IA leyendo tu prompt personalizado...]\n\n`
                    : '';
                if (formData.whatsapp_bot_personality === 'cool') {
                    return `${prefix}¡Qué lo qué mi hermano! 💈 Activo en ${businessName}. ¿Listo para el flow? 😎`;
                } else if (formData.whatsapp_bot_personality === 'executive') {
                    return `${prefix}Estimado cliente, bienvenido al portal oficial de ${businessName}. Es un honor asistirle el día de hoy.`;
                } else {
                    return `${prefix}¡Hola! Bienvenido a ${businessName}. ¿En qué te puedo ayudar hoy?`;
                }
            };

            const getPersonalityOffer = () => {
                if (!offer) return 'Por el momento no tenemos ofertas activas, pero siempre tenemos la mejor atención lista para ti.';
                if (formData.whatsapp_bot_personality === 'cool') {
                    return `¡Durísimo! 🔥 Tenemos esta promo activa hoy: "${offer}". ¡Aprovéchala ya!`;
                } else if (formData.whatsapp_bot_personality === 'executive') {
                    return `Le complacemos en informarle que disponemos de la siguiente cortesía exclusiva: "${offer}".`;
                } else {
                    return `¡Sí! Tenemos la siguiente promoción activa hoy: "${offer}".`;
                }
            };

            const getPersonalityBooking = () => {
                if (formData.whatsapp_bot_personality === 'cool') {
                    return `¡Agenda tu cita de una en este link y separa tu espacio! 🔗 ${bookingLink} 🚀✂️`;
                } else if (formData.whatsapp_bot_personality === 'executive') {
                    return `Le invitamos a seleccionar su servicio y horario de preferencia mediante nuestro enlace de reserva: 🔗 ${bookingLink}`;
                } else {
                    return `Puedes reservar tu cita en segundos ingresando a este enlace: 🔗 ${bookingLink} 📅`;
                }
            };

            // Intent mapping
            const aiPrefix = formData.whatsapp_bot_prompt 
                ? `[🧠 IA usando tu prompt: "${formData.whatsapp_bot_prompt.substring(0, 30)}..."]\n\n`
                : '';

            if (lower.includes('hola') || lower.includes('buenos') || lower.includes('buenas')) {
                botText = `${getPersonalityGreeting()}\n\nEscribe "precios", "ubicación", "ofertas" o "reservar" para asistirte.`;
            } else if (lower.includes('precio') || lower.includes('servicio') || lower.includes('cuesta')) {
                const serviceList = services && services.length > 0 
                    ? services.slice(0, 4).map(s => `• ${s.name}: $${s.price}`).join('\n')
                    : '• Corte de Cabello: $20\n• Afeitado Clásico: $15\n• Combo Flow Completo: $30';
                
                botText = `${aiPrefix}Claro, estos son algunos de nuestros servicios principales:\n\n${serviceList}\n\n${getPersonalityBooking()}`;
            } else if (lower.includes('donde') || lower.includes('ubicacion') || lower.includes('direccion') || lower.includes('como llego')) {
                botText = `${aiPrefix}Nos encontramos ubicados en: 📍 ${address}${city ? ', ' + city : ''}.\n\n¡Te esperamos! Recuerda reservar antes para asegurar tu espacio.`;
            } else if (lower.includes('oferta') || lower.includes('promo') || lower.includes('descuento')) {
                botText = `${aiPrefix}${getPersonalityOffer()}\n\n${getPersonalityBooking()}`;
            } else if (lower.includes('reserva') || lower.includes('cita') || lower.includes('agendar')) {
                botText = `${aiPrefix}${getPersonalityBooking()}`;
            } else {
                botText = `${aiPrefix}Entendido. Para cualquier consulta adicional o para agendar de inmediato, puedes usar nuestro portal de reservas en segundos: \n\n🔗 ${bookingLink}\n\n¡Esperamos verte pronto! 💈`;
            }

            setSimulatorMessages(prev => [...prev, { sender: 'bot', text: botText, time: currentTime }]);
            setIsBotTyping(false);
        }, 1200);
    };

    useEffect(() => {
        if (currentBusiness) {
            setFormData({
                name: currentBusiness.name || '',
                slug: currentBusiness.slug || '',
                phone: currentBusiness.phone || '',
                description: currentBusiness.description || '',
                address: currentBusiness.address || '',
                city: currentBusiness.city || '',
                state: (currentBusiness as any).state || 'PR',
                zip_code: (currentBusiness as any).zip_code || '',
                business_type: (currentBusiness as any).business_type || 'barberia',
                latitude: currentBusiness.latitude?.toString() || '',
                longitude: currentBusiness.longitude?.toString() || '',
                logo_url: currentBusiness.logo_url || '',
                banner_url: currentBusiness.banner_url || '',
                instagram_url: currentBusiness.instagram_url || '',
                website_url: currentBusiness.website_url || '',
                gallery: currentBusiness.gallery || [],
                whatsapp_bot_active: currentBusiness.whatsapp_bot_active ?? true,
                whatsapp_reminder_template: currentBusiness.whatsapp_reminder_template || '',
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
        }
    }, [currentBusiness]);

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
            // Fallback: revert local state on failure
            setFormData(p => ({ ...p, whatsapp_bot_active: !newVal }));
            toast.error('No se pudo cambiar el estado del bot. Intente de nuevo.');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setMessage(null);
    };

    const handleDetectLocation = () => {
        if (!navigator.geolocation) {
            setMessage({ type: 'error', text: 'Tu navegador no soporta geolocalización.' });
            return;
        }

        setMessage({ type: 'success', text: 'Detectando ubicación...' });
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setFormData(prev => ({
                    ...prev,
                    latitude: pos.coords.latitude.toString(),
                    longitude: pos.coords.longitude.toString()
                }));
                setMessage({ type: 'success', text: 'Ubicación detectada correctamente.' });
            },
            (err) => {
                console.error('Geo error:', err);
                setMessage({ type: 'error', text: 'No se pudo obtener la ubicación. Asegúrate de dar permisos.' });
            }
        );
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setMessage(null);

        if (!currentBusiness) return;
        if (!formData.name.trim()) {
            setMessage({ type: 'error', text: 'El nombre es requerido.' });
            return;
        }
        
        setLoading(true);
        try {
            // Check slug uniqueness if changed
            if (formData.slug !== currentBusiness.slug) {
                const { data: existing } = await supabase
                    .from('businesses')
                    .select('id')
                    .eq('slug', formData.slug)
                    .neq('id', currentBusiness.id)
                    .maybeSingle();

                if (existing) {
                    throw new Error('Este URL (slug) ya está ocupado por otra barbería.');
                }
            }

            const { error } = await supabase
                .from('businesses')
                .update({
                    name: formData.name.trim(),
                    slug: formData.slug.trim(),
                    phone: formData.phone.trim(),
                    description: formData.description.trim(),
                    address: formData.address.trim(),
                    city: formData.city.trim(),
                    state: formData.state.trim() || 'PR',
                    zip_code: formData.zip_code.trim(),
                    business_type: formData.business_type,
                    latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                    longitude: formData.longitude ? parseFloat(formData.longitude) : null,
                    logo_url: formData.logo_url,
                    banner_url: formData.banner_url,
                    instagram_url: formData.instagram_url.trim(),
                    website_url: formData.website_url.trim(),
                    gallery: formData.gallery,
                    whatsapp_bot_active: formData.whatsapp_bot_active,
                    whatsapp_reminder_template: formData.whatsapp_reminder_template.trim(),
                    whatsapp_booking_link: formData.whatsapp_booking_link.trim(),
                    whatsapp_offer: formData.whatsapp_offer.trim(),
                    whatsapp_marketing_active: formData.whatsapp_marketing_active,
                    whatsapp_bot_personality: formData.whatsapp_bot_personality,
                    whatsapp_bot_auto_schedule: formData.whatsapp_bot_auto_schedule,
                    whatsapp_bot_start_hour: formData.whatsapp_bot_start_hour,
                    whatsapp_bot_end_hour: formData.whatsapp_bot_end_hour,
                    whatsapp_bot_anti_collision: formData.whatsapp_bot_anti_collision,
                    whatsapp_bot_prompt: formData.whatsapp_bot_prompt.trim(),
                })
                .eq('id', currentBusiness.id);

            if (error) throw error;

            toast.success('¡Configuración guardada!');
            setMessage({ type: 'success', text: 'Configuración guardada exitosamente.' });
            setTimeout(() => setMessage(null), 3000);

        } catch (error: any) {
            console.error('Error updating business:', error);
            setMessage({ type: 'error', text: error.message || 'Error al guardar.' });
        } finally {
            setLoading(false);
        }
    };

    if (!currentBusiness) return (
        <DashboardLayout>
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-space-primary" />
            </div>
        </DashboardLayout>
    );

    const TABS = [
        { id: 'profile',  label: 'Perfil',         icon: Store },
        { id: 'public',   label: 'Perfil Público', icon: Eye },
        { id: 'gallery',  label: 'Galería',        icon: Sparkles },
        { id: 'location', label: 'Ubicación',      icon: MapPin },
        { id: 'bot',      label: 'Bot IA',         icon: Zap },
    ] as const;

    return (
        <DashboardLayout>
        <div className="max-w-3xl mx-auto animate-fade-up pb-20">

            {/* ── Page header ─────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-space-card2 rounded-2xl flex items-center justify-center text-space-primary flex-shrink-0">
                        <Store size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-space-text tracking-tight">Mi Negocio</h1>
                        <p className="text-space-muted text-[10px] font-bold uppercase tracking-widest">{currentBusiness?.name}</p>
                    </div>
                </div>
                <button
                    onClick={() => handleSubmit()}
                    disabled={loading}
                    className="btn-primary h-11 px-6 gap-2 shadow-md shadow-space-primary/20 disabled:opacity-50"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {loading ? 'Guardando...' : 'Guardar'}
                </button>
            </div>

            {/* ── Status message ──────────────────────── */}
            {message && (
                <div className={`mb-5 p-4 rounded-2xl flex items-center gap-3 animate-fade-in text-sm font-bold ${
                    message.type === 'success'
                    ? 'bg-space-success/10 border border-space-success/25 text-space-success'
                    : 'bg-space-danger/10 border border-space-danger/25 text-space-danger'
                }`}>
                    {message.type === 'success' ? <Check size={16} /> : <Info size={16} />}
                    {message.text}
                </div>
            )}

            {/* ── Tabs ────────────────────────────────── */}
            <div className="flex gap-1 p-1 bg-space-card2/60 rounded-2xl mb-7 overflow-x-auto scrollbar-hide">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 flex-shrink-0 ${
                            activeTab === id
                            ? 'bg-space-card text-space-text shadow-sm'
                            : 'text-space-muted hover:text-space-text'
                        }`}
                    >
                        <Icon size={13} className={activeTab === id ? 'text-space-primary' : ''} />
                        {label}
                    </button>
                ))}
            </div>

            {/* ── Tab content ─────────────────────────── */}

            {/* PERFIL */}
            {activeTab === 'profile' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Images */}
                    <div className="bg-space-card rounded-2xl p-6 border border-space-border">
                        <h2 className="text-sm font-black text-space-text uppercase tracking-wide mb-5 flex items-center gap-2">
                            <Sparkles size={14} className="text-space-primary" />Identidad Visual
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ImageUploadWithCrop label="Logo (1:1)" value={formData.logo_url}
                                onUploadComplete={(url) => setFormData(p => ({ ...p, logo_url: url }))} aspect={1} />
                            <ImageUploadWithCrop label="Banner (21:9)" value={formData.banner_url}
                                onUploadComplete={(url) => setFormData(p => ({ ...p, banner_url: url }))} aspect={21/9} />
                        </div>
                    </div>

                    {/* Info */}
                    <div className="bg-space-card rounded-2xl p-6 border border-space-border space-y-5">
                        <h2 className="text-sm font-black text-space-text uppercase tracking-wide flex items-center gap-2">
                            <Info size={14} className="text-space-primary" />Información General
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input label="Nombre del Negocio" name="name" value={formData.name} onChange={handleChange} required placeholder="Ej: Barbería El Jefe" />
                            <Input label="URL de Reserva (slug)" name="slug" value={formData.slug} onChange={handleChange} required placeholder="ej-barberia" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Input label="Teléfono" name="phone" value={formData.phone} onChange={handleChange} placeholder="(809) 555-5555" />
                            <Input label="Instagram (URL)" name="instagram_url" value={formData.instagram_url} onChange={handleChange} placeholder="https://instagram.com/..." />
                            <Input label="Sitio Web" name="website_url" value={formData.website_url} onChange={handleChange} placeholder="https://..." />
                        </div>
                        <div>
                            <label className="input-label">Descripción</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows={3}
                                className="input-field resize-none min-h-[90px]"
                                placeholder="Cuéntanos sobre tu barbería..." />
                        </div>
                    </div>
                </div>
            )}

            {/* PERFIL PÚBLICO */}
            {activeTab === 'public' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Preview link banner */}
                    <div className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-space-primary/20" style={{ background: 'rgba(var(--space-primary), 0.06)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-space-primary/15 flex items-center justify-center flex-shrink-0">
                                <Eye size={18} className="text-space-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-extrabold text-space-text">Tu perfil público</p>
                                <p className="text-[11px] text-space-muted">Así te ven los clientes en el directorio de Spacey.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => window.open(`/business/${formData.slug}`, '_blank')}
                            disabled={!formData.slug}
                            className="btn-secondary text-xs px-5 py-2.5 gap-2 flex-shrink-0 disabled:opacity-50"
                        >
                            <Eye size={14} /> Ver cómo me ven los clientes
                        </button>
                    </div>

                    <div className="bg-space-card rounded-2xl p-6 border border-space-border space-y-5">
                        <h2 className="text-sm font-black text-space-text uppercase tracking-wide flex items-center gap-2">
                            <Store size={14} className="text-space-primary" />Tipo y dirección
                        </h2>

                        {/* Business type selector */}
                        <div>
                            <label className="input-label">Tipo de negocio</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'barberia', label: 'Barbería', emoji: '💈' },
                                    { id: 'salon', label: 'Salón', emoji: '✂️' },
                                    { id: 'nails', label: 'Nail Salon', emoji: '💅' },
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, business_type: t.id }))}
                                        className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                                            formData.business_type === t.id
                                            ? 'border-space-primary bg-space-primary/5 text-space-primary'
                                            : 'border-space-border text-space-muted hover:border-space-primary/40'
                                        }`}
                                    >
                                        <span className="text-lg">{t.emoji}</span>
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Address */}
                        <Input label="Dirección física" name="address" value={formData.address} onChange={handleChange} placeholder="Calle Principal #123" />

                        {/* City / ZIP / State */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Input label="Ciudad" name="city" value={formData.city} onChange={handleChange} placeholder="Aibonito" />
                            <Input label="ZIP / Código postal" name="zip_code" value={formData.zip_code} onChange={handleChange} placeholder="00705" />
                            <Input label="Estado" name="state" value={formData.state} onChange={handleChange} placeholder="PR" />
                        </div>

                        <p className="text-[10px] text-space-muted">
                            La ciudad y el ZIP permiten que los clientes te encuentren en la búsqueda del directorio. Las coordenadas GPS del mapa se configuran en la pestaña "Ubicación".
                        </p>
                    </div>
                </div>
            )}

            {/* GALERÍA */}
            {activeTab === 'gallery' && (
                <div className="bg-space-card rounded-2xl p-6 border border-space-border animate-fade-in">
                    <h2 className="text-sm font-black text-space-text uppercase tracking-wide mb-5 flex items-center gap-2">
                        <Sparkles size={14} className="text-space-primary" />Galería de Trabajos
                    </h2>
                    <p className="text-space-muted text-xs mb-5">Sube hasta 8 fotos de tus mejores trabajos. Se muestran en tu perfil público.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {formData.gallery.map((url, idx) => (
                            <div key={idx} className="relative group/item aspect-square rounded-xl overflow-hidden border border-space-border/30">
                                <img src={url} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
                                    <button onClick={() => setFormData(p => ({ ...p, gallery: p.gallery.filter((_, i) => i !== idx) }))}
                                        className="w-9 h-9 bg-space-danger rounded-xl flex items-center justify-center text-white hover:bg-red-600 transition-colors">
                                        <ChevronLeft size={14} className="rotate-[-45deg]" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {formData.gallery.length < 8 && (
                            <ImageUploadWithCrop label="Añadir" value=""
                                onUploadComplete={(url) => setFormData(p => ({ ...p, gallery: [...p.gallery, url] }))}
                                aspect={1} />
                        )}
                    </div>
                </div>
            )}

            {/* UBICACIÓN */}
            {activeTab === 'location' && (
                <div className="bg-space-card rounded-2xl p-6 border border-space-border animate-fade-in space-y-5">
                    <h2 className="text-sm font-black text-space-text uppercase tracking-wide flex items-center gap-2">
                        <MapPin size={14} className="text-space-primary" />Ubicación & GPS
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Dirección Física" name="address" value={formData.address} onChange={handleChange} placeholder="Calle Principal #123" />
                        <Input label="Ciudad" name="city" value={formData.city} onChange={handleChange} placeholder="Santo Domingo" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Latitud" name="latitude" type="number" step="any" value={formData.latitude} onChange={handleChange} placeholder="18.4861" />
                        <Input label="Longitud" name="longitude" type="number" step="any" value={formData.longitude} onChange={handleChange} placeholder="-69.9312" />
                    </div>
                    <button onClick={handleDetectLocation}
                        className="w-full h-12 bg-space-card2 border border-space-primary/30 text-space-primary hover:bg-space-primary hover:text-space-card transition-all rounded-xl font-extrabold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                        <MapPin size={14} /> Detectar mi ubicación (GPS)
                    </button>
                    <p className="text-[10px] text-space-muted text-center">Las coordenadas GPS activan el filtro "Cerca de mí" en el directorio público.</p>
                </div>
            )}

            {/* BOT IA */}
            {activeTab === 'bot' && (
                <div className="animate-fade-in">
                    <div className="rounded-2xl p-8 relative overflow-hidden text-center" style={{ background: '#1a2e28' }}>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-space-primary/10 rounded-full blur-3xl -mr-20 -mt-20" />
                        <div className="relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-space-primary/20 border border-space-primary/30 flex items-center justify-center mx-auto mb-4">
                                <Zap size={24} className="text-space-primary-light animate-pulse" />
                            </div>
                            <span className="text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-space-primary/25 text-space-primary mb-3 inline-block" style={{ background: 'rgba(var(--space-primary), 0.1)' }}>Panel dedicado</span>
                            <h2 className="text-xl font-black uppercase tracking-tight mt-3 mb-2" style={{ color: '#e8f4e0' }}>Asistente de IA WhatsApp</h2>
                            <p className="text-xs font-semibold leading-relaxed mb-6 max-w-sm mx-auto" style={{ color: 'rgba(232,244,224,0.5)' }}>
                                Configura el bot, prueba respuestas en vivo, activa/desactiva el asistente y revisa el historial de conversaciones.
                            </p>
                            <button onClick={() => navigate('/dashboard/ai-assistant')}
                                className="btn-primary px-8 py-3 shadow-xl shadow-space-primary/20">
                                🤖 Ir al Panel de IA <ChevronLeft size={15} className="rotate-180" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </DashboardLayout>
    );
}
