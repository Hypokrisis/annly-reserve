import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Store, Check, Info, ArrowLeft } from 'lucide-react';

export default function BusinessSettingsPage() {
    const navigate = useNavigate();
    const { currentBusiness, user } = useAuth();
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
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center text-gray-500 hover:text-indigo-600 transition font-medium"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al Dashboard
                </button>
            </div>

            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Configuración del Negocio</h1>
                    <p className="text-gray-500">Administra la información pública de tu barbería</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {message && (
                        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
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
                                    className="h-12"
                                />
                                <p className="text-xs text-gray-500 mt-1 ml-1">
                                    El nombre visible para tus clientes.
                                </p>
                            </div>

                            <div>
                                <Input
                                    label="Teléfono del Negocio"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="h-12"
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
                                    className="h-12 font-mono text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1 ml-1">
                                    Tus clientes reservan en: <strong>annly.com/book/{formData.slug}</strong>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Descripción / Bio</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-none"
                            placeholder="Describe tu barbería en pocas palabras..."
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto px-8 h-12 rounded-xl text-sm font-black uppercase tracking-widest bg-black text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                        >
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
