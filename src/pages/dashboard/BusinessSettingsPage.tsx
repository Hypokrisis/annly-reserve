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
        if (!formData.slug.trim() || !/^[a-z0-9-]+$/.test(formData.slug)) {
            setMessage({ type: 'error', text: 'El slug es inválido (solo letras minúsculas, números y guiones).' });
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
                    // updated_at: new Date().toISOString(), // Removed to avoid schema error
                })
                .eq('id', currentBusiness.id);

            if (error) throw error;

            setMessage({ type: 'success', text: 'Configuración guardada exitosamente.' });

            // Reload page to reflect changes in context naturally or force refresh if needed
            // For now, let's just let the user see the success message
            // Ideally AuthContext should subscribe to changes or we manually update it, 
            // but a reload is the simplestway to ensure all context (slugs in URL) are clean.

        } catch (error: any) {
            console.error('Error updating business:', error);
            setMessage({ type: 'error', text: error.message || 'Error al guardar.' });
        } finally {
            setLoading(false);
        }
    };

    if (!currentBusiness) return <div>Cargando...</div>;

    return (
        <div className="max-w-4xl mx-auto animate-fade-up">
            <div className="mb-6">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center text-space-muted hover:text-space-primary transition font-medium"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al Dashboard
                </button>
            </div>

            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-space-primary-light rounded-2xl flex items-center justify-center text-space-primary">
                    <Store size={24} />
                </div>
                <div>
                    <h1 className="page-title m-0">Configuración del Negocio</h1>
                    <p className="page-subtitle mt-1">Administra la información pública de tu barbería</p>
                </div>
            </div>

            <div className="card p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {message && (
                        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-space-success/10 text-space-success' : 'bg-space-danger/10 text-space-danger'
                            }`}>
                            {message.type === 'success' ? <Check size={18} /> : <Info size={18} />}
                            {message.text}
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <Input
                                    label="Nombre de la Barbería"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                                <p className="text-xs text-space-muted mt-1 ml-1">
                                    El nombre visible para tus clientes.
                                </p>
                            </div>

                            <div>
                                <Input
                                    label="Teléfono del Negocio"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Input
                                    label="URL Personalizado (Slug)"
                                    name="slug"
                                    value={formData.slug}
                                    onChange={handleChange}
                                    required
                                    className="font-mono text-sm"
                                />
                                <p className="text-xs text-space-muted mt-1 ml-1">
                                    Tus clientes reservan en: <strong>annly.com/book/{formData.slug || '...'}</strong>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="input-label">Descripción / Bio</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            className="input-field resize-none"
                            placeholder="Describe tu barbería en pocas palabras..."
                        />
                    </div>

                    <div className="pt-4 border-t border-space-border flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full sm:w-auto px-8"
                        >
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
