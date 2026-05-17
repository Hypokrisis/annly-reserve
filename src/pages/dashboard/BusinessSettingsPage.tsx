import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import { Input } from '@/components/common/Input';
import { ImageUploadWithCrop } from '@/components/common/ImageUploadWithCrop';
import { useToast } from '@/contexts/ToastContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { Store, Check, Info, Save, MapPin, Sparkles, Map, Loader2, ChevronLeft, Eye, Gift, Zap, Crown } from 'lucide-react';

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
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

            // Personality prefix helper
            const getPersonalityGreeting = () => {
                if (formData.whatsapp_bot_personality === 'cool') {
                    return `¡Qué lo qué mi hermano! 💈 Activo en ${businessName}. ¿Listo para el flow? 😎`;
                } else if (formData.whatsapp_bot_personality === 'executive') {
                    return `Estimado cliente, bienvenido al portal oficial de ${businessName}. Es un honor asistirle el día de hoy.`;
                } else {
                    return `¡Hola! Bienvenido a ${businessName}. ¿En qué te puedo ayudar hoy?`;
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
            if (lower.includes('hola') || lower.includes('buenos') || lower.includes('buenas')) {
                botText = `${getPersonalityGreeting()}\n\nEscribe "precios", "ubicación", "ofertas" o "reservar" para asistirte.`;
            } else if (lower.includes('precio') || lower.includes('servicio') || lower.includes('cuesta')) {
                const serviceList = services && services.length > 0 
                    ? services.slice(0, 4).map(s => `• ${s.name}: $${s.price}`).join('\n')
                    : '• Corte de Cabello: $20\n• Afeitado Clásico: $15\n• Combo Flow Completo: $30';
                
                botText = `Claro, estos son algunos de nuestros servicios principales:\n\n${serviceList}\n\n${getPersonalityBooking()}`;
            } else if (lower.includes('donde') || lower.includes('ubicacion') || lower.includes('direccion') || lower.includes('como llego')) {
                botText = `Nos encontramos ubicados en: 📍 ${address}${city ? ', ' + city : ''}.\n\n¡Te esperamos! Recuerda reservar antes para asegurar tu espacio.`;
            } else if (lower.includes('oferta') || lower.includes('promo') || lower.includes('descuento')) {
                botText = `${getPersonalityOffer()}\n\n${getPersonalityBooking()}`;
            } else if (lower.includes('reserva') || lower.includes('cita') || lower.includes('agendar')) {
                botText = getPersonalityBooking();
            } else {
                botText = `Entendido. Para cualquier consulta adicional o para agendar de inmediato, puedes usar nuestro portal de reservas en segundos: \n\n🔗 ${bookingLink}\n\n¡Esperamos verte pronto! 💈`;
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
            });
        }
    }, [currentBusiness]);

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
        <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-space-primary" />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto animate-fade-up px-4 sm:px-6 lg:px-8 pb-20">
            {/* Action Bar */}
            <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-4 z-40">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="group w-full sm:w-auto flex items-center gap-3 bg-white border-2 border-space-border/40 hover:border-space-primary/40 px-6 py-4 rounded-2xl transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 group"
                >
                    <div className="w-8 h-8 rounded-xl bg-space-card2 flex items-center justify-center text-space-primary group-hover:scale-110 transition-transform">
                        <ChevronLeft size={20} />
                    </div>
                    <span className="font-black uppercase tracking-widest text-[11px] text-space-text">Volver al Dashboard</span>
                </button>

                <button
                    onClick={() => handleSubmit()}
                    disabled={loading}
                    className="w-full sm:w-auto flex btn-primary h-16 px-10 items-center justify-center gap-3 shadow-xl shadow-space-primary/25 active:scale-95 disabled:opacity-50 transition-all font-black uppercase tracking-[0.2em] text-xs"
                >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    {loading ? 'Guardando...' : 'Guardar Todo'}
                </button>
            </div>

            {/* Title Section */}
            <div className="flex items-center gap-5 mb-10 pl-2">
                <div className="w-12 h-12 bg-space-card2 rounded-2xl flex items-center justify-center text-space-primary rotate-3">
                    <Store size={26} className="-rotate-3" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-space-text tracking-tight uppercase">Mi Negocio</h1>
                    <p className="text-space-muted text-[10px] font-bold uppercase tracking-widest mt-0.5">Configuración y presencia pública</p>
                </div>
            </div>

            {/* Main Form Content */}
            <div className="space-y-8">
                {/* Status Message */}
                {message && (
                    <div className={`p-5 rounded-3xl flex items-center gap-4 animate-fade-in shadow-sm ${
                        message.type === 'success' 
                        ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' 
                        : 'bg-red-50 border border-red-100 text-red-800'
                    }`}>
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                            message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                            {message.type === 'success' ? <Check size={20} /> : <Info size={20} />}
                        </div>
                        <p className="text-xs font-black uppercase tracking-tight leading-relaxed">{message.text}</p>
                    </div>
                )}

                {/* Section 1: Visual Identity */}
                <section className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-space-border/20 shadow-[0_20px_60px_rgba(0,0,0,0.035)] group">
                    <div className="flex items-center gap-3 mb-10 overflow-hidden">
                        <div className="w-12 h-12 rounded-2xl bg-space-card2 flex items-center justify-center text-space-primary group-hover:bg-space-primary group-hover:text-white transition-all duration-500">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-space-text uppercase tracking-tight leading-none">Identidad Visual</h2>
                            <p className="text-[10px] text-space-muted uppercase font-bold tracking-widest mt-1.5 opacity-70">Haz que tu perfil destaque</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <ImageUploadWithCrop 
                            label="Logo Principal (1:1)"
                            value={formData.logo_url}
                            onUploadComplete={(url) => setFormData(p => ({ ...p, logo_url: url }))}
                            aspect={1}
                        />
                        <ImageUploadWithCrop 
                            label="Banner de Portada (21:9)"
                            value={formData.banner_url}
                            onUploadComplete={(url) => setFormData(p => ({ ...p, banner_url: url }))}
                            aspect={21 / 9}
                        />
                    </div>
                </section>

                {/* Section 2: General Info */}
                <section className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-space-border/20 shadow-[0_20px_60px_rgba(0,0,0,0.035)]">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-12 h-12 rounded-2xl bg-space-card2 flex items-center justify-center text-space-primary">
                            <Info size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-space-text uppercase tracking-tight leading-none">Información General</h2>
                            <p className="text-[10px] text-space-muted uppercase font-bold tracking-widest mt-1.5 opacity-70">Detalles básicos del negocio</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="Nombre del Negocio" name="name" value={formData.name} onChange={handleChange} required placeholder="Ej: Barbería El Jefe" />
                            <Input label="URL de Reserva (Slug)" name="slug" value={formData.slug} onChange={handleChange} required placeholder="ej-barberia" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <Input label="Teléfono de contacto" name="phone" value={formData.phone} onChange={handleChange} placeholder="(809) 555-5555" />
                             <Input label="Instagram (URL)" name="instagram_url" value={formData.instagram_url} onChange={handleChange} placeholder="https://instagram.com/tu_barberia" />
                             <Input label="Sitio Web" name="website_url" value={formData.website_url} onChange={handleChange} placeholder="https://www.tuweb.com" />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-space-muted uppercase tracking-[0.2em] ml-2 mb-2 block">Descripción</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                className="w-full px-6 py-4 bg-neutral-50/50 border-2 border-transparent rounded-[1.5rem] text-sm font-medium text-space-text focus:bg-white focus:ring-4 focus:ring-space-primary/10 focus:border-space-primary transition-all outline-none placeholder-neutral-300 resize-none min-h-[120px]"
                                placeholder="Cuéntanos un poco sobre tu barbería y lo que la hace especial..."
                            />
                        </div>
                    </div>
                </section>

                {/* Section 3: Gallery */}
                <section className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-space-border/20 shadow-[0_20px_60px_rgba(0,0,0,0.035)] group">
                    <div className="flex items-center gap-3 mb-10 overflow-hidden">
                        <div className="w-12 h-12 rounded-2xl bg-space-card2 flex items-center justify-center text-space-primary group-hover:bg-space-primary group-hover:text-white transition-all duration-500">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-space-text uppercase tracking-tight leading-none">Trabajos Reales (Galería)</h2>
                            <p className="text-[10px] text-space-muted uppercase font-bold tracking-widest mt-1.5 opacity-70">Muestra lo que sabes hacer</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                        {formData.gallery.map((url, idx) => (
                            <div key={idx} className="relative group/item aspect-[3/4] rounded-2xl overflow-hidden border-2 border-space-border/20">
                                <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
                                    <button 
                                        onClick={() => setFormData(p => ({ ...p, gallery: p.gallery.filter((_, i) => i !== idx) }))}
                                        className="bg-white/20 text-white p-2 rounded-xl hover:bg-space-danger transition-colors"
                                    >
                                        <Info size={16} /> {/* Using Info as a placeholder for trash icon if not imported, but let's assume X is better */}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {formData.gallery.length < 8 && (
                            <ImageUploadWithCrop 
                                label="Añadir Foto"
                                value=""
                                onUploadComplete={(url) => setFormData(p => ({ ...p, gallery: [...p.gallery, url] }))}
                                aspect={3 / 4}
                            />
                        )}
                    </div>
                </section>

                {/* Section 4: Location */}
                <section className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-space-border/20 shadow-[0_20px_60px_rgba(0,0,0,0.035)]">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-12 h-12 rounded-2xl bg-space-card2 flex items-center justify-center text-space-primary">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-space-text uppercase tracking-tight leading-none">Ubicación & GPS</h2>
                            <p className="text-[10px] text-space-muted uppercase font-bold tracking-widest mt-1.5 opacity-70">Ayuda a tus clientes a llegarte</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="Dirección Física" name="address" value={formData.address} onChange={handleChange} placeholder="Calle Principal #123" />
                            <Input label="Ciudad" name="city" value={formData.city} onChange={handleChange} placeholder="Santo Domingo" />
                        </div>

                        <div className="p-8 bg-neutral-50/80 rounded-[2rem] border border-neutral-100 flex flex-col items-center">
                            <div className="w-full flex flex-col md:flex-row gap-8 items-center mb-6">
                                <div className="md:w-1/3">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Map size={18} className="text-space-primary" />
                                        <h3 className="text-xs font-black uppercase tracking-widest text-space-text">GPS Coordenadas</h3>
                                    </div>
                                    <p className="text-[10px] text-space-muted leading-relaxed font-bold">
                                        Esencial para el filtro de "Cerca de mí" y el mapa interactivo. 
                                    </p>
                                </div>
                                
                                <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                    <Input label="Latitud" name="latitude" type="number" step="any" value={formData.latitude} onChange={handleChange} placeholder="18.4861" />
                                    <Input label="Longitud" name="longitude" type="number" step="any" value={formData.longitude} onChange={handleChange} placeholder="-69.9312" />
                                </div>
                            </div>
                            
                            <button
                                onClick={handleDetectLocation}
                                className="w-full py-4 bg-white border-2 border-space-primary/30 text-space-primary hover:bg-space-primary hover:text-white transition-all rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-sm"
                            >
                                <MapPin size={16} />
                                Detectar mi ubicación actual (GPS)
                            </button>
                        </div>
                    </div>
                </section>

                {/* Section 5: WhatsApp & Automation */}
                <section className="bg-space-text rounded-[2.5rem] p-6 sm:p-10 border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-space-primary/10 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:bg-space-primary/20 transition-all duration-700" />
                    
                    {/* Glassmorphic Gating Overlay */}
                    {!subscription?.subscription_tiers?.has_whatsapp_bot && (
                        <div className="absolute inset-0 bg-[#0d1117]/85 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center space-y-6">
                            <div className="w-14 h-14 bg-white/10 text-space-primary border border-white/10 rounded-full flex items-center justify-center shadow-lg">
                                <Zap size={28} />
                            </div>
                            <div className="space-y-2 max-w-sm">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Recordatorios por WhatsApp</h3>
                                <p className="text-white/60 text-xs font-semibold leading-relaxed uppercase">
                                    Esta sección está bloqueada para tu plan actual. Sube a un plan superior para habilitar el bot de recordatorios automáticos de citas por WhatsApp.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard/billing')}
                                className="px-8 py-3 bg-space-primary hover:bg-space-primary-dark text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-space-primary/25"
                            >
                                Habilitar WhatsApp
                            </button>
                        </div>
                    )}

                    <div className={`relative z-10 ${!subscription?.subscription_tiers?.has_whatsapp_bot ? 'blur-sm pointer-events-none' : ''}`}>
                        <div className="flex items-center gap-3 mb-10">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-space-primary border border-white/10">
                                <MessageSquare size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white uppercase tracking-tight leading-none">Centro de Control WhatsApp Bot</h2>
                                <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest mt-1.5 opacity-70">Personaliza la personalidad de tu bot y simula chats en vivo</p>
                            </div>
                        </div>

                        {/* Split Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            
                            {/* LEFT COLUMN: Controls & Setup */}
                            <div className="lg:col-span-7 space-y-8">
                                
                                {/* Switches */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10">
                                        <div>
                                            <h3 className="text-xs font-black text-white uppercase tracking-tight">Bot de Reservas</h3>
                                            <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-0.5">Respuestas automáticas</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, whatsapp_bot_active: !p.whatsapp_bot_active }))}
                                            className={`w-12 h-7 rounded-full relative transition-all duration-300 ${formData.whatsapp_bot_active ? 'bg-space-primary' : 'bg-white/10'}`}
                                        >
                                            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-all duration-300 ${formData.whatsapp_bot_active ? 'left-5.5' : 'left-0.5'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10">
                                        <div>
                                            <h3 className="text-xs font-black text-white uppercase tracking-tight">Campañas de Marketing</h3>
                                            <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-0.5">Envíos masivos programados</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, whatsapp_marketing_active: !p.whatsapp_marketing_active }))}
                                            className={`w-12 h-7 rounded-full relative transition-all duration-300 ${formData.whatsapp_marketing_active ? 'bg-amber-500' : 'bg-white/10'}`}
                                        >
                                            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-all duration-300 ${formData.whatsapp_marketing_active ? 'left-5.5' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Custom Inputs */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] ml-2 block">Link de Reserva para WA (Opcional)</label>
                                        <input 
                                            type="text"
                                            name="whatsapp_booking_link"
                                            value={formData.whatsapp_booking_link}
                                            onChange={handleChange}
                                            placeholder={`Default: ${window.location.origin}/book/${formData.slug}`}
                                            className="w-full h-12 bg-white/5 border-2 border-white/10 rounded-xl px-4 text-xs font-medium text-white focus:bg-white/10 focus:border-space-primary outline-none transition-all placeholder:text-white/20"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                            <Gift size={12} className="text-amber-400" />
                                            Oferta / Promo Activa (Opcional)
                                        </label>
                                        <input 
                                            type="text"
                                            name="whatsapp_offer"
                                            value={formData.whatsapp_offer}
                                            onChange={handleChange}
                                            placeholder="Ej: 20% de descuento en tu próximo corte hoy"
                                            className="w-full h-12 bg-white/5 border-2 border-white/10 rounded-xl px-4 text-xs font-medium text-white focus:bg-white/10 focus:border-amber-400/50 outline-none transition-all placeholder:text-white/20"
                                        />
                                    </div>
                                </div>

                                {/* PERSONALITY SELECTOR */}
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] ml-2 block">Personalidad / Tono del Bot</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'quick', name: 'Asistente Rápido', desc: 'Directo y servicial', emoji: '🤖', color: 'border-space-primary/40 bg-space-primary/10 text-space-primary' },
                                            { id: 'cool', name: 'Barbero Colega', desc: 'Flow y jerga amigable', emoji: '💈', color: 'border-amber-500/40 bg-amber-500/10 text-amber-500' },
                                            { id: 'executive', name: 'Salón Ejecutivo', desc: 'Elegante y respetuoso', emoji: '👑', color: 'border-purple-500/40 bg-purple-500/10 text-purple-500' },
                                        ].map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, whatsapp_bot_personality: p.id }))}
                                                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                                                    formData.whatsapp_bot_personality === p.id 
                                                        ? `${p.color} border-2 scale-[1.02] shadow-lg` 
                                                        : 'border-white/10 hover:border-white/20 bg-white/5 text-white/70'
                                                }`}
                                            >
                                                <span className="text-xl block mb-2">{p.emoji}</span>
                                                <h4 className="text-[10px] font-black uppercase tracking-wider">{p.name}</h4>
                                                <p className="text-[8px] opacity-60 font-medium leading-tight mt-1">{p.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Notification Template Textarea */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-2 mr-1">
                                        <label className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] block">Mensaje de Recordatorio ("Toca Recorte")</label>
                                    </div>
                                    <textarea
                                        name="whatsapp_reminder_template"
                                        value={formData.whatsapp_reminder_template}
                                        onChange={handleChange}
                                        rows={3}
                                        className="w-full px-5 py-3.5 bg-white/5 border-2 border-white/10 rounded-xl text-xs font-medium text-white focus:bg-white/10 focus:border-space-primary transition-all outline-none placeholder:text-white/20 resize-none min-h-[90px]"
                                        placeholder="Ej: ¡Hola {{customer_name}}! Ya toca recorte en {{business_name}}. {{offer}} Reserva aquí: {{booking_link}}"
                                    />
                                    <div className="flex flex-wrap gap-2 mt-2 px-1">
                                        {[
                                            { tag: '{{customer_name}}', label: 'Nombre cliente', icon: '👤' },
                                            { tag: '{{business_name}}', label: 'Tu negocio', icon: '✂️' },
                                            { tag: '{{booking_link}}', label: 'Link reserva', icon: '🔗' },
                                            { tag: '{{offer}}', label: 'Oferta activa', icon: '🎁' },
                                        ].map(({ tag, label, icon }) => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => setFormData(p => ({
                                                    ...p,
                                                    whatsapp_reminder_template: p.whatsapp_reminder_template + ' ' + tag
                                                }))}
                                                className="text-[8px] font-black text-space-primary uppercase tracking-widest bg-space-primary/10 hover:bg-space-primary/20 px-2.5 py-1.5 rounded-lg border border-space-primary/20 transition-all flex items-center gap-1"
                                            >
                                                <span>{icon}</span> {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            {/* RIGHT COLUMN: WhatsApp Live Mockup Simulator */}
                            <div className="lg:col-span-5 flex flex-col items-center justify-center">
                                
                                {/* SmartPhone Frame */}
                                <div className="w-full max-w-[320px] bg-neutral-900 rounded-[2.5rem] p-3 border-4 border-neutral-800 shadow-2xl relative">
                                    {/* Notch */}
                                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-5 bg-neutral-900 rounded-full z-30 flex items-center justify-center">
                                        <div className="w-3 h-3 bg-neutral-800 rounded-full mr-2" />
                                        <div className="w-8 h-1 bg-neutral-800 rounded-full" />
                                    </div>

                                    {/* Screen */}
                                    <div className="w-full aspect-[9/16] bg-[#efeae2] rounded-[2rem] overflow-hidden flex flex-col relative border border-black/10">
                                        
                                        {/* WhatsApp Header */}
                                        <div className="bg-[#075e54] text-white pt-7 pb-3 px-4 flex items-center gap-2.5 shadow-md relative z-10">
                                            <div className="w-8 h-8 rounded-full bg-white/20 border border-white/10 flex items-center justify-center font-black text-xs">
                                                💈
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black tracking-wide uppercase leading-tight">{formData.name || 'Bot de Reservas'}</h4>
                                                <p className="text-[7px] text-[#25d366] font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#25d366] animate-pulse" />
                                                    En línea (Bot Asistente)
                                                </p>
                                            </div>
                                        </div>

                                        {/* Chat Bubbles Scroll View */}
                                        <div className="flex-1 overflow-y-auto p-3 space-y-3 flex flex-col justify-start">
                                            {simulatorMessages.map((msg, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                                                >
                                                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-[9px] font-semibold leading-relaxed shadow-sm relative ${
                                                        msg.sender === 'user' 
                                                            ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-none' 
                                                            : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                                                    }`}
                                                    style={{ whiteSpace: 'pre-wrap' }}
                                                    >
                                                        {msg.text}
                                                        <span className="text-[6px] text-slate-400 block text-right mt-1 font-mono">{msg.time}</span>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Typing indicator */}
                                            {isBotTyping && (
                                                <div className="flex justify-start">
                                                    <div className="bg-white rounded-2xl rounded-tl-none px-3 py-2 border border-slate-100 flex items-center gap-1 shadow-sm">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Bottom Message Input Bar */}
                                        <form onSubmit={handleSendSimulatorMessage} className="p-2 bg-[#f0f0f0] border-t border-slate-200 flex items-center gap-2">
                                            <input 
                                                type="text" 
                                                value={simulatorInput}
                                                onChange={(e) => setSimulatorInput(e.target.value)}
                                                placeholder="Escribe 'precios', 'hola'..."
                                                className="flex-1 h-8 bg-white border border-slate-300 rounded-full px-3 text-[9px] font-medium text-slate-800 outline-none placeholder:text-slate-400"
                                            />
                                            <button 
                                                type="submit" 
                                                className="w-8 h-8 rounded-full bg-[#128c7e] hover:bg-[#075e54] active:scale-95 transition-all text-white flex items-center justify-center shadow-sm"
                                            >
                                                <Send size={12} />
                                            </button>
                                        </form>

                                    </div>
                                </div>

                                <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest text-center mt-3 max-w-[240px] leading-relaxed">
                                    💡 Interactúa con el bot escribiendo en el teléfono simulado para probar sus respuestas al instante.
                                </p>

                            </div>
                        </div>

                    </div>
                </section>
            </div>
        </div>
    );
}
