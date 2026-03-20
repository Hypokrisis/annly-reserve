import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import { Input } from '@/components/common/Input';
import { ImageUploadWithCrop } from '@/components/common/ImageUploadWithCrop';
import { Store, Check, Info, Save, MapPin, Sparkles, Map, Loader2, ChevronLeft } from 'lucide-react';

export default function BusinessSettingsPage() {
    const navigate = useNavigate();
    const { currentBusiness } = useAuth();
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
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
                })
                .eq('id', currentBusiness.id);

            if (error) throw error;

            setMessage({ type: 'success', text: 'Configuración guardada exitosamente.' });
            
            // Give time for feedback before potential refresh or just staying
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
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-10">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-space-primary border border-white/10">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white uppercase tracking-tight leading-none">WhatsApp & Automatización</h2>
                                <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest mt-1.5 opacity-70">Controla tu bot y recordatorios</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                             <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/10">
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-tight">Bot de Reservas</h3>
                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Habilita notificaciones automáticas</p>
                                </div>
                                <button
                                    onClick={() => setFormData(p => ({ ...p, whatsapp_bot_active: !p.whatsapp_bot_active }))}
                                    className={`w-14 h-8 rounded-full relative transition-all duration-300 ${formData.whatsapp_bot_active ? 'bg-space-primary' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${formData.whatsapp_bot_active ? 'left-7 shadow-[0_0_15px_rgba(74,132,99,0.5)]' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] ml-2 block">Link de Reserva para WA (Opcional)</label>
                                    <input 
                                        type="text"
                                        name="whatsapp_booking_link"
                                        value={formData.whatsapp_booking_link}
                                        onChange={handleChange}
                                        placeholder={`Default: ${window.location.origin}/book/${formData.slug}`}
                                        className="w-full h-14 bg-white/5 border-2 border-white/10 rounded-2xl px-6 text-sm font-medium text-white focus:bg-white/10 focus:border-space-primary outline-none transition-all placeholder:text-white/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] ml-2 block">Mensaje de Recordatorio ("Toca Recorte")</label>
                                    <textarea
                                        name="whatsapp_reminder_template"
                                        value={formData.whatsapp_reminder_template}
                                        onChange={handleChange}
                                        rows={4}
                                        className="w-full px-6 py-4 bg-white/5 border-2 border-white/10 rounded-[1.5rem] text-sm font-medium text-white focus:bg-white/10 focus:border-space-primary transition-all outline-none placeholder:text-white/20 resize-none min-h-[120px]"
                                        placeholder="Ej: ¡Hola {{customer_name}}! Ya toca recorte..."
                                    />
                                    <div className="flex flex-wrap gap-2 mt-2 px-2">
                                        {['{{customer_name}}', '{{business_name}}', '{{booking_link}}'].map(tag => (
                                            <span key={tag} className="text-[9px] font-black text-space-primary uppercase tracking-widest bg-space-primary/10 px-2 py-1 rounded-md border border-space-primary/20 pointer-events-none">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
