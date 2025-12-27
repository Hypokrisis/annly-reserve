import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isValidEmail } from '@/utils';

// ... imports
import { Scissors, User } from 'lucide-react';

export default function SignupPage() {
    const { signup } = useAuth();

    const [userType, setUserType] = useState<'client' | 'owner'>('client'); // 'client' or 'owner'
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        phone: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.email || !formData.password || !formData.confirmPassword) {
            setError('Por favor completa los campos obligatorios (*)');
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

        setLoading(true);

        try {
            await signup({
                email: formData.email,
                password: formData.password,
                full_name: formData.full_name,
                phone: formData.phone,
            });
            // Guardamos la intención del usuario para redirigirlo después del login
            localStorage.setItem('intended_role', userType);
            setSuccess(true);
        } catch (err: any) {
            console.error('Signup error:', err);
            if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
                setError('Este email ya está en uso');
            } else {
                setError(err.message || 'Error al crear la cuenta. Intenta nuevamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Cuenta creada exitosamente!</h2>
                    <p className="text-gray-600 mb-8">
                        Hemos enviado un enlace de confirmación a <strong>{formData.email}</strong>.
                        <br /><br />
                        {userType === 'owner'
                            ? "Una vez confirmes tu email, podrás iniciar sesión y configurar tu barbería."
                            : "Una vez confirmes tu email, podrás iniciar sesión y empezar a reservar citas."}
                    </p>
                    <Link
                        to="/login"
                        className="inline-block w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
                    >
                        Ir al inicio de sesión
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4 py-12">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-indigo-600 mb-2">Annly Reserve</h1>
                    <p className="text-gray-600">
                        {userType === 'client' ? 'Crea tu cuenta para reservar citas' : 'Crea tu cuenta para administrar tu negocio'}
                    </p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                    {/* Role Selection Tabs */}
                    <div className="grid grid-cols-2 p-1 bg-gray-50 border-b border-gray-200">
                        <button
                            type="button"
                            onClick={() => setUserType('client')}
                            className={`flex flex-col items-center justify-center py-4 text-sm font-bold transition-all ${userType === 'client'
                                    ? 'bg-white text-indigo-600 shadow-sm rounded-xl ring-1 ring-black/5'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                                }`}
                        >
                            <User className="mb-2" size={24} />
                            Soy Cliente
                        </button>
                        <button
                            type="button"
                            onClick={() => setUserType('owner')}
                            className={`flex flex-col items-center justify-center py-4 text-sm font-bold transition-all ${userType === 'owner'
                                    ? 'bg-white text-indigo-600 shadow-sm rounded-xl ring-1 ring-black/5'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                                }`}
                        >
                            <Scissors className="mb-2" size={24} />
                            Soy Dueño
                        </button>
                    </div>

                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                        Email *
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

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                            Contraseña *
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
                                        <p className="text-[10px] text-gray-500 mt-1">Mínimo 6 caracteres</p>
                                    </div>

                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                            Confirmar *
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
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Información Personal (Opcional)</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                                            Nombre Completo
                                        </label>
                                        <input
                                            type="text"
                                            id="full_name"
                                            name="full_name"
                                            value={formData.full_name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                            placeholder="Juan Pérez"
                                            disabled={loading}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                                            Teléfono
                                        </label>
                                        <input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                            placeholder="809-123-4567"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
                            >
                                {loading ? 'Creando cuenta...' : (userType === 'owner' ? 'Crear Cuenta de Negocio' : 'Crear Cuenta de Cliente')}
                            </button>
                        </form>
                    </div>

                    <div className="px-8 pb-8 text-center bg-gray-50/50 pt-4 border-t border-gray-100">
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
