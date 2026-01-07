import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/common/Button';
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
            {/* Geometric Background (Luxury Theme) */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full border border-space-gold/20 opacity-60"></div>
                <div className="absolute -bottom-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full border border-space-gold/20 opacity-60"></div>
                <div className="absolute top-0 left-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-space-gold/30 to-transparent"></div>
                <div className="absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-space-gold/30 to-transparent"></div>
                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#d4af37 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            </div>

            <div className="max-w-2xl w-full relative z-10">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-space-gold to-yellow-600 rounded-full mb-6 shadow-2xl shadow-space-gold/20 animate-pulse-subtle">
                        <Scissors size={40} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white mb-3 tracking-tight font-serif">Crea tu Barbería</h1>
                    <p className="text-space-muted font-light max-w-md mx-auto">
                        Configura tu negocio en minutos y comienza a recibir reservas <span className="text-space-gold font-bold">online</span>
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-space-card/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 md:p-12 border border-space-gold/20">
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
                                className="h-14 rounded-xl text-lg bg-space-card2 border-space-border/50 text-white placeholder-space-muted/50 focus:border-space-gold/50"
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
                                className="h-14 rounded-xl font-mono text-sm bg-space-card2 border-space-border/50 text-space-gold placeholder-space-muted/50 focus:border-space-gold/50"
                            />
                            <p className="text-xs text-space-muted mt-2 ml-1">
                                Tu página de reservas será: <span className="font-semibold text-white">annlyreserve.com/book/{formData.slug || 'tu-slug'}</span>
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
                                className="h-14 rounded-xl bg-space-card2 border-space-border/50 text-white placeholder-space-muted/50 focus:border-space-gold/50"
                            />
                        </div>

                        {/* Benefits */}
                        <div className="bg-space-card2 rounded-2xl p-6 space-y-3 border border-space-gold/10">
                            <div className="flex items-start gap-3">
                                <Sparkles size={20} className="text-space-gold mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-white text-sm">Empieza Gratis</h3>
                                    <p className="text-xs text-space-muted">Período de prueba sin costo</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Sparkles size={20} className="text-space-gold mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-white text-sm">Reservas 24/7</h3>
                                    <p className="text-xs text-space-muted">Tus clientes pueden reservar en cualquier momento</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Sparkles size={20} className="text-space-gold mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-white text-sm">Gestión Completa</h3>
                                    <p className="text-xs text-space-muted">Servicios, barberos, horarios y más</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => navigate('/home')}
                                disabled={loading}
                                className="w-full sm:w-auto rounded-xl h-14 px-8 bg-space-card2 text-space-muted hover:text-white border-transparent hover:border-space-gold/30"
                            >
                                <ArrowLeft size={18} className="mr-2" />
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:flex-1 rounded-xl h-14 text-base font-black uppercase tracking-wider shadow-lg shadow-space-gold/20 bg-gradient-to-r from-space-gold to-yellow-600 border-none text-white hover:brightness-110"
                            >
                                {loading ? 'Creando...' : 'Crear Mi Barbería'}
                            </Button>
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
