import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Scissors, ArrowLeft, Sparkles } from 'lucide-react';

export default function CreateBusinessPage() {
    const navigate = useNavigate();
    const { createBusiness, user, loading: authLoading } = useAuth();

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        phone: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // 1. Show loading state if auth is still being determined
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // 2. Redirect if not logged in
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 3. Block access for users registered as 'client' - use a very safe UI here
    const userRole = user?.user_metadata?.role;
    if (userRole === 'client') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center border border-gray-100">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 font-bold">
                        !
                    </div>
                    <h2 className="text-xl font-bold mb-2 text-gray-900">Acceso Restringido</h2>
                    <p className="mb-6 text-gray-600">
                        Tu cuenta está registrada como <strong>Cliente</strong>.
                        Solo las cuentas de Dueño pueden crear barberías.
                    </p>
                    <button
                        onClick={() => navigate('/home')}
                        className="w-full bg-black text-white rounded-xl py-3 font-semibold hover:bg-gray-800 transition"
                    >
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 px-4 py-12">
            <div className="max-w-2xl w-full">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-6 shadow-2xl shadow-indigo-500/30">
                        <Scissors size={40} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">Crea tu Barbería</h1>
                    <p className="text-gray-600 font-medium max-w-md mx-auto">
                        Configura tu negocio en minutos y comienza a recibir reservas online
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-gray-100">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
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
                                className="h-14 rounded-xl text-lg"
                            />
                            <p className="text-xs text-gray-500 mt-2 ml-1">
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
                                className="h-14 rounded-xl font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-2 ml-1">
                                Tu página de reservas será: <span className="font-semibold">annlyreserve.com/book/{formData.slug || 'tu-slug'}</span>
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
                                className="h-14 rounded-xl"
                            />
                        </div>

                        {/* Benefits */}
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 space-y-3">
                            <div className="flex items-start gap-3">
                                <Sparkles size={20} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">Empieza Gratis</h3>
                                    <p className="text-xs text-gray-600">Período de prueba sin costo</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Sparkles size={20} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">Reservas 24/7</h3>
                                    <p className="text-xs text-gray-600">Tus clientes pueden reservar en cualquier momento</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Sparkles size={20} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">Gestión Completa</h3>
                                    <p className="text-xs text-gray-600">Servicios, barberos, horarios y más</p>
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
                                className="w-full sm:w-auto rounded-xl h-14 px-8"
                            >
                                <ArrowLeft size={18} className="mr-2" />
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:flex-1 rounded-xl h-14 text-base font-black uppercase tracking-wider shadow-xl shadow-indigo-500/30"
                            >
                                {loading ? 'Creando...' : 'Crear Mi Barbería'}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Footer Note */}
                <p className="text-center text-xs text-gray-500 mt-6">
                    Al crear tu barbería, aceptas nuestros términos de servicio
                </p>
            </div>
        </div>
    );
}
