import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/common/Input';
import { Scissors, ArrowLeft, Sparkles } from 'lucide-react';

export default function CreateBusinessPage() {
    const navigate = useNavigate();
    const { createBusiness } = useAuth();

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        phone: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        // Auto-generate slug from name
        if (name === 'name') {
            const autoSlug = value
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
            setFormData({
                ...formData,
                name: value,
                slug: autoSlug,
            });
        } else {
            setFormData({
                ...formData,
                [name]: value,
            });
        }
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name.trim()) {
            setError('El nombre de la barbería es requerido');
            return;
        }

        if (!formData.slug.trim()) {
            setError('El slug (URL) es requerido');
            return;
        }

        // Validate slug format
        if (!/^[a-z0-9-]+$/.test(formData.slug)) {
            setError('El slug solo puede contener letras minúsculas, números y guiones');
            return;
        }

        setLoading(true);

        try {
            await createBusiness(formData.name.trim(), formData.slug.trim());
            // createBusiness will refresh the auth state and redirect to dashboard
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Create business error:', err);
            if (err.message?.includes('duplicate') || err.message?.includes('already exists')) {
                setError('Este slug ya está en uso. Por favor elige otro.');
            } else {
                setError(err.message || 'Error al crear la barbería. Intenta nuevamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg px-4 py-12 relative overflow-hidden font-sans">
            <div className="max-w-2xl w-full relative z-10 animate-fade-up">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-space-primary-light rounded-full mb-6">
                        <Scissors size={40} className="text-space-primary" />
                    </div>
                    <h1 className="text-4xl font-black text-space-text mb-3 tracking-tight">Crea tu Barbería</h1>
                    <p className="text-space-muted font-light max-w-md mx-auto">
                        Configura tu negocio en minutos y comienza a recibir reservas <span className="text-space-primary font-bold">online</span>
                    </p>
                </div>

                {/* Form Card */}
                <div className="card p-8 md:p-12">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-space-danger/10 border border-space-danger/30 text-space-danger px-4 py-3 rounded-xl text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <div>
                            <Input
                                label="Nombre de la Barbería"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Ej: Golden Cuts Barbershop"
                                required
                                disabled={loading}
                            />
                            <p className="text-xs text-space-muted mt-2 ml-1">
                                Este es el nombre que verán tus clientes
                            </p>
                        </div>

                        <div>
                            <Input
                                label="URL de Reservas (Slug)"
                                name="slug"
                                value={formData.slug}
                                onChange={handleChange}
                                placeholder="golden-cuts"
                                required
                                disabled={loading}
                                className="font-mono"
                            />
                            <p className="text-xs text-space-muted mt-2 ml-1">
                                Tu página de reservas será: <span className="font-semibold text-space-text">annlyreserve.com/book/{formData.slug || 'tu-slug'}</span>
                            </p>
                        </div>

                        <div>
                            <Input
                                label="Teléfono (Opcional)"
                                name="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="809-123-4567"
                                disabled={loading}
                            />
                        </div>

                        {/* Benefits */}
                        <div className="bg-space-bg rounded-2xl p-6 space-y-3 border border-space-border">
                            <div className="flex items-start gap-3">
                                <Sparkles size={18} className="text-space-primary mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-space-text text-sm">Empieza Gratis</h3>
                                    <p className="text-xs text-space-muted">Período de prueba sin costo</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Sparkles size={18} className="text-space-primary mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-space-text text-sm">Reservas 24/7</h3>
                                    <p className="text-xs text-space-muted">Tus clientes pueden reservar en cualquier momento</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Sparkles size={18} className="text-space-primary mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-space-text text-sm">Gestión Completa</h3>
                                    <p className="text-xs text-space-muted">Servicios, barberos, horarios y más</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => navigate('/home')}
                                disabled={loading}
                                className="btn-secondary w-full sm:w-auto text-space-muted"
                            >
                                <ArrowLeft size={18} className="mr-2" />
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full sm:flex-1 text-base uppercase tracking-wider h-12"
                            >
                                {loading ? 'Creando...' : 'Crear Mi Barbería'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer Note */}
                <p className="text-center text-xs text-space-muted mt-6 opacity-50">
                    Al crear tu barbería, aceptas nuestros términos de servicio
                </p>
            </div>
        </div>
    );
}
