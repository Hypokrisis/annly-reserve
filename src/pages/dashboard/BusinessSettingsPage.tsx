import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import { Input } from '@/components/common/Input';
import { Store, Check, Info, ArrowLeft } from 'lucide-react';

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
            });
        }
    }, [currentBusiness]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setMessage(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
                    logo_url: formData.logo_url.trim(),
                    banner_url: formData.banner_url.trim(),
                })
                .eq('id', currentBusiness.id);

            if (error) throw error;

            setMessage({ type: 'success', text: 'Configuración guardada exitosamente.' });
            setTimeout(() => window.location.reload(), 1500);

        } catch (error: any) {
            console.error('Error updating business:', error);
            setMessage({ type: 'error', text: error.message || 'Error al guardar.' });
        } finally {
            setLoading(false);
        }
    };

    if (!currentBusiness) return (
        <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-space-primary"></div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto animate-fade-up pb-20">
            <div className="mb-8">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="group inline-flex items-center text-space-muted hover:text-space-primary transition-all font-black uppercase tracking-widest text-[10px]"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Volver al Dashboard
                </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-gradient-to-br from-space-primary to-space-primary-dark rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-space-primary/20 rotate-3">
                        <Store size={28} className="-rotate-3" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-space-text tracking-tighter uppercase italic">Configuración</h1>
                        <p className="text-space-muted text-xs font-bold uppercase tracking-widest mt-1">Personaliza la cara pública de tu negocio</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-neutral-100 overflow-hidden">
                <form onSubmit={handleSubmit}>
                    {/* Status Message */}
                    {message && (
                        <div className={`mx-8 mt-8 p-5 rounded-2xl flex items-center gap-3 animate-fade-in ${
                            message.type === 'success' 
                            ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' 
                            : 'bg-red-50 border border-red-100 text-red-700'
                        }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                            }`}>
                                {message.type === 'success' ? <Check size={16} /> : <Info size={16} />}
                            </div>
                            <p className="text-xs font-black uppercase tracking-tight">{message.text}</p>
                        </div>
                    )}

                    <div className="p-8 sm:p-10 space-y-10">
                        {/* Section: Basic Info */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-1.5 h-6 bg-space-primary rounded-full"></div>
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-space-text">Información General</h2>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <Input label="Nombre del Negocio" name="name" value={formData.name} onChange={handleChange} required placeholder="Ej: Barbería El Jefe" />
                                <Input label="URL Personalizado (Slug)" name="slug" value={formData.slug} onChange={handleChange} required placeholder="ej-barberia" className="font-mono" />
                            </div>
                            <Input label="Teléfono de Contacto" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 234 567 890" />
                            <div>
                                <label className="text-[10px] font-black text-space-muted uppercase tracking-[0.2em] ml-2 mb-1.5 block">Descripción / Biografía</label>
                                <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full px-5 py-3 bg-neutral-50 border-transparent rounded-2xl text-sm font-medium text-space-text focus:bg-white focus:ring-2 focus:ring-space-primary/10 focus:border-space-primary transition-all outline-none placeholder-neutral-300 resize-none" placeholder="Cuenta la historia de tu barbería..." />
                            </div>
                        </div>

                        {/* Section: Location */}
                        <div className="space-y-6 pt-10 border-t border-neutral-50">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-1.5 h-6 bg-space-purple rounded-full"></div>
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-space-text">Ubicación Geográfica</h2>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <Input label="Dirección Física" name="address" value={formData.address} onChange={handleChange} placeholder="Calle Principal #123" />
                                <Input label="Ciudad" name="city" value={formData.city} onChange={handleChange} placeholder="Santo Domingo" />
                            </div>
                            <div className="bg-neutral-50 p-6 rounded-[2rem] border border-neutral-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <Info size={14} className="text-space-primary" />
                                    <p className="text-[9px] font-black text-space-muted uppercase tracking-widest">Coordenadas para el mapa (Opcional)</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Latitud" name="latitude" type="number" step="any" value={formData.latitude} onChange={handleChange} placeholder="18.4861" />
                                    <Input label="Longitud" name="longitude" type="number" step="any" value={formData.longitude} onChange={handleChange} placeholder="-69.9312" />
                                </div>
                                <p className="mt-4 text-[9px] text-space-muted font-bold leading-relaxed px-2">
                                    * Estas coordenadas permiten que tu negocio aparezca en el filtro "Cerca de mí". Puedes obtenerlas de Google Maps (clic derecho sobre tu local → copiar coordenadas).
                                </p>
                            </div>
                        </div>

                        {/* Section: Visuals */}
                        <div className="space-y-6 pt-10 border-t border-neutral-50">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-1.5 h-6 bg-amber-400 rounded-full"></div>
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-space-text">Identidad Visual</h2>
                            </div>
                            <div className="space-y-6">
                                <Input label="URL del Logo (Cuadrado)" name="logo_url" value={formData.logo_url} onChange={handleChange} placeholder="https://ejemplo.com/logo.png" />
                                <Input label="URL del Banner (Horizontal)" name="banner_url" value={formData.banner_url} onChange={handleChange} placeholder="https://ejemplo.com/banner.jpg" />
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="aspect-square bg-neutral-100 rounded-3xl border border-dashed border-neutral-300 flex items-center justify-center overflow-hidden">
                                    {formData.logo_url ? <img src={formData.logo_url} className="w-full h-full object-cover" alt="Logo Preview" /> : <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Logo Preview</p>}
                                </div>
                                <div className="aspect-video bg-neutral-100 rounded-3xl border border-dashed border-neutral-300 flex items-center justify-center overflow-hidden">
                                    {formData.banner_url ? <img src={formData.banner_url} className="w-full h-full object-cover" alt="Banner Preview" /> : <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Banner Preview</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-neutral-50 p-8 sm:p-10 flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div className="text-center sm:text-left">
                            <p className="text-xs font-bold text-space-text tracking-tight italic">¿Listo para brillar?</p>
                            <p className="text-[9px] text-space-muted font-bold uppercase tracking-widest mt-0.5">Los cambios se reflejarán instantáneamente en tu página de reservas.</p>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full sm:w-auto h-16 px-12 rounded-[1.25rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-space-primary/30 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : 'Guardar Configuración'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
