import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import { Input } from '@/components/common/Input';
import { ImageUploadWithCrop } from '@/components/common/ImageUploadWithCrop';
import { useToast } from '@/contexts/ToastContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Store, Check, Info, Save, MapPin, Sparkles, Loader2, ChevronLeft, Eye, Zap } from 'lucide-react';

export default function BusinessSettingsPage() {
    const navigate = useNavigate();
    const { currentBusiness } = useAuth();
    const { business, subscription, services } = useBusiness();
    const toast = useToast();
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
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'public' | 'gallery' | 'location' | 'bot'>('profile');

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
                setFormData(prev => ({ ...prev, latitude: pos.coords.latitude.toString(), longitude: pos.coords.longitude.toString() }));
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
            if (formData.slug !== currentBusiness.slug) {
                const { data: existing } = await supabase
                    .from('businesses')
                    .select('id')
                    .eq('slug', formData.slug)
                    .neq('id', currentBusiness.id)
                    .maybeSingle();
                if (existing) throw new Error('Este URL (slug) ya está ocupado por otra barbería.');
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
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#9bc287' }} />
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

    const cardStyle = { background: '#131c17', border: '1px solid #243529', borderRadius: '16px', padding: '1.5rem' };

    return (
        <DashboardLayout>
        <div className="max-w-3xl mx-auto pb-20">

            {/* Page header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#1d2a23', color: '#9bc287' }}>
                        <Store size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-[#f0f4ee]">Mi Negocio</h1>
                        <p className="text-[#95ab8a] text-[10px] font-bold uppercase tracking-widest">{currentBusiness?.name}</p>
                    </div>
                </div>
                <button
                    onClick={() => handleSubmit()}
                    disabled={loading}
                    className="h-11 px-6 rounded-full font-bold text-sm flex items-center gap-2 transition disabled:opacity-50"
                    style={{ background: '#9bc287', color: '#22321c' }}
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {loading ? 'Guardando...' : 'Guardar'}
                </button>
            </div>

            {/* Status message */}
            {message && (
                <div className="mb-5 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold"
                    style={message.type === 'success'
                        ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }
                        : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }
                    }>
                    {message.type === 'success' ? <Check size={16} /> : <Info size={16} />}
                    {message.text}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-2xl mb-7 overflow-x-auto" style={{ background: 'rgba(29,42,35,0.6)' }}>
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 flex-shrink-0"
                        style={{
                            background: activeTab === id ? '#131c17' : 'transparent',
                            color: activeTab === id ? '#f0f4ee' : '#95ab8a',
                        }}
                    >
                        <Icon size={13} style={{ color: activeTab === id ? '#9bc287' : '#95ab8a' }} />
                        {label}
                    </button>
                ))}
            </div>

            {/* PERFIL */}
            {activeTab === 'profile' && (
                <div className="space-y-6">
                    <div style={cardStyle}>
                        <h2 className="text-sm font-black uppercase tracking-wide mb-5 flex items-center gap-2 text-[#f0f4ee]">
                            <Sparkles size={14} style={{ color: '#9bc287' }} /> Identidad Visual
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ImageUploadWithCrop label="Logo (1:1)" value={formData.logo_url}
                                onUploadComplete={(url) => setFormData(p => ({ ...p, logo_url: url }))} aspect={1} />
                            <ImageUploadWithCrop label="Banner (21:9)" value={formData.banner_url}
                                onUploadComplete={(url) => setFormData(p => ({ ...p, banner_url: url }))} aspect={21/9} />
                        </div>
                    </div>

                    <div className="space-y-5" style={cardStyle}>
                        <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2 text-[#f0f4ee]">
                            <Info size={14} style={{ color: '#9bc287' }} /> Información General
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
                <div className="space-y-6">
                    <div className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        style={{ background: 'rgba(155,194,135,0.05)', border: '1px solid rgba(155,194,135,0.2)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(155,194,135,0.15)', color: '#9bc287' }}>
                                <Eye size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-extrabold text-[#f0f4ee]">Tu perfil público</p>
                                <p className="text-[11px] text-[#95ab8a]">Así te ven los clientes en el directorio de Spacey.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => window.open(`/business/${formData.slug}`, '_blank')}
                            disabled={!formData.slug}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition border disabled:opacity-50"
                            style={{ borderColor: '#243529', color: '#95ab8a' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#9bc287'; e.currentTarget.style.color = '#9bc287'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#243529'; e.currentTarget.style.color = '#95ab8a'; }}
                        >
                            <Eye size={14} /> Ver cómo me ven los clientes
                        </button>
                    </div>

                    <div className="space-y-5" style={cardStyle}>
                        <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2 text-[#f0f4ee]">
                            <Store size={14} style={{ color: '#9bc287' }} /> Tipo y dirección
                        </h2>

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
                                        className="h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2"
                                        style={{
                                            borderColor: formData.business_type === t.id ? '#9bc287' : '#243529',
                                            background: formData.business_type === t.id ? 'rgba(155,194,135,0.05)' : 'transparent',
                                            color: formData.business_type === t.id ? '#9bc287' : '#95ab8a',
                                        }}
                                    >
                                        <span className="text-lg">{t.emoji}</span>
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Input label="Dirección física" name="address" value={formData.address} onChange={handleChange} placeholder="Calle Principal #123" />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Input label="Ciudad" name="city" value={formData.city} onChange={handleChange} placeholder="Aibonito" />
                            <Input label="ZIP / Código postal" name="zip_code" value={formData.zip_code} onChange={handleChange} placeholder="00705" />
                            <Input label="Estado" name="state" value={formData.state} onChange={handleChange} placeholder="PR" />
                        </div>
                        <p className="text-[10px] text-[#95ab8a]">
                            La ciudad y el ZIP permiten que los clientes te encuentren en la búsqueda del directorio.
                        </p>
                    </div>
                </div>
            )}

            {/* GALERÍA */}
            {activeTab === 'gallery' && (
                <div style={cardStyle}>
                    <h2 className="text-sm font-black uppercase tracking-wide mb-5 flex items-center gap-2 text-[#f0f4ee]">
                        <Sparkles size={14} style={{ color: '#9bc287' }} /> Galería de Trabajos
                    </h2>
                    <p className="text-[#95ab8a] text-xs mb-5">Sube hasta 8 fotos de tus mejores trabajos. Se muestran en tu perfil público.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {formData.gallery.map((url, idx) => (
                            <div key={idx} className="relative group/item aspect-square rounded-xl overflow-hidden border" style={{ borderColor: '#243529' }}>
                                <img src={url} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center" style={{ background: 'rgba(9,13,11,0.7)' }}>
                                    <button onClick={() => setFormData(p => ({ ...p, gallery: p.gallery.filter((_, i) => i !== idx) }))}
                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-colors"
                                        style={{ background: '#ef4444' }}>
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
                <div className="space-y-5" style={cardStyle}>
                    <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2 text-[#f0f4ee]">
                        <MapPin size={14} style={{ color: '#9bc287' }} /> Ubicación & GPS
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
                        className="w-full h-12 rounded-xl font-extrabold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 border transition-all"
                        style={{ background: '#1d2a23', borderColor: 'rgba(155,194,135,0.3)', color: '#9bc287' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#9bc287'; e.currentTarget.style.color = '#22321c'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#1d2a23'; e.currentTarget.style.color = '#9bc287'; }}>
                        <MapPin size={14} /> Detectar mi ubicación (GPS)
                    </button>
                    <p className="text-[10px] text-[#95ab8a] text-center">Las coordenadas GPS activan el filtro "Cerca de mí" en el directorio público.</p>
                </div>
            )}

            {/* BOT IA */}
            {activeTab === 'bot' && (
                <div className="rounded-2xl p-8 relative overflow-hidden text-center" style={{ background: '#131c17', border: '1px solid rgba(155,194,135,0.2)' }}>
                    <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(155,194,135,0.08)', marginRight: '-5rem', marginTop: '-5rem' }} />
                    <div className="relative z-10">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(155,194,135,0.15)', border: '1px solid rgba(155,194,135,0.3)', color: '#9bc287' }}>
                            <Zap size={24} className="animate-pulse" />
                        </div>
                        <span className="text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border inline-block mb-3"
                            style={{ background: 'rgba(155,194,135,0.1)', borderColor: 'rgba(155,194,135,0.25)', color: '#9bc287' }}>
                            Panel dedicado
                        </span>
                        <h2 className="text-xl font-black uppercase tracking-tight mt-3 mb-2 text-[#f0f4ee]">Asistente de IA WhatsApp</h2>
                        <p className="text-xs font-semibold leading-relaxed mb-6 max-w-sm mx-auto text-[#95ab8a]">
                            Configura el bot, prueba respuestas en vivo, activa/desactiva el asistente y revisa el historial de conversaciones.
                        </p>
                        <button onClick={() => navigate('/dashboard/ai-assistant')}
                            className="px-8 py-3 rounded-full font-extrabold text-sm flex items-center justify-center gap-2 mx-auto transition"
                            style={{ background: '#9bc287', color: '#22321c' }}>
                            Ir al Panel de IA <ChevronLeft size={15} className="rotate-180" />
                        </button>
                    </div>
                </div>
            )}
        </div>
        </DashboardLayout>
    );
}
