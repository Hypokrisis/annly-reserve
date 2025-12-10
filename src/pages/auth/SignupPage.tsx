import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isValidEmail, isValidSlug, generateSlug } from '@/utils';

export default function SignupPage() {
    const navigate = useNavigate();
    const { signup } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        businessName: '',
        businessSlug: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setFormData({
            ...formData,
            [name]: value,
        });

        // Auto-generate slug from business name
        if (name === 'businessName') {
            setFormData(prev => ({
                ...prev,
                businessName: value,
                businessSlug: generateSlug(value),
            }));
        }

        setError(''); // Clear error on input change
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.email || !formData.password || !formData.confirmPassword || !formData.businessName) {
            setError('Por favor completa todos los campos');
            return;
        }

        if (!isValidEmail(formData.email)) {
            setError('Por favor ingresa un email válido');
            return;
        }

        if (formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (!isValidSlug(formData.businessSlug)) {
            setError('El slug del negocio solo puede contener letras minúsculas, números y guiones');
            return;
        }

        setLoading(true);

        try {
            await signup({
                email: formData.email,
                password: formData.password,
                businessName: formData.businessName,
                businessSlug: formData.businessSlug,
            });
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Signup error:', err);

            // Handle specific errors
            if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
                setError('Este email o slug ya está en uso');
            } else {
                setError(err.message || 'Error al crear la cuenta. Intenta nuevamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4 py-12">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-indigo-600 mb-2">Annly Reserve</h1>
                    <p className="text-gray-600">Crea tu cuenta y comienza a gestionar reservas</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                                Nombre del Negocio
                            </label>
                            <input
                                type="text"
                                id="businessName"
                                name="businessName"
                                value={formData.businessName}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="Mi Barbería"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label htmlFor="businessSlug" className="block text-sm font-medium text-gray-700 mb-2">
                                URL del Negocio
                            </label>
                            <div className="flex items-center">
                                <span className="text-gray-500 text-sm mr-2">annly-reserve.com/book/</span>
                                <input
                                    type="text"
                                    id="businessSlug"
                                    name="businessSlug"
                                    value={formData.businessSlug}
                                    onChange={handleChange}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                    placeholder="mi-barberia"
                                    disabled={loading}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Solo letras minúsculas, números y guiones</p>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="tu@email.com"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="••••••••"
                                disabled={loading}
                            />
                            <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                Confirmar Contraseña
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="••••••••"
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            ¿Ya tienes cuenta?{' '}
                            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold transition">
                                Inicia Sesión
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
