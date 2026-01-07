import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isValidEmail } from '@/utils';
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
                role: userType, // Pass selected role to backend
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
            <div className="min-h-screen flex items-center justify-center bg-space-bg px-4 py-12">
                <div className="max-w-md w-full glass-effect border border-space-border rounded-3xl shadow-2xl p-8 text-center">
                    <div className="w-20 h-20 bg-space-success/20 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-space-success/10">
                        <svg className="w-10 h-10 text-space-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">¡Cuenta creada exitosamente!</h2>
                    <p className="text-space-muted mb-8">
                        Hemos enviado un enlace de confirmación a <strong className="text-space-text">{formData.email}</strong>.
                        <br /><br />
                        {userType === 'owner'
                            ? "Una vez confirmes tu email, podrás iniciar sesión y configurar tu barbería."
                            : "Una vez confirmes tu email, podrás iniciar sesión y empezar a reservar citas."}
                    </p>
                    <Link
                        to="/login"
                        className="inline-block w-full bg-space-text text-space-bg py-3 rounded-xl font-bold hover:bg-white transition shadow-lg shadow-white/10"
                    >
                        Ir al inicio de sesión
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg px-4 py-12 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-space-primary/10 rounded-full blur-3xl animate-float-slow"></div>
                <div className="absolute bottom-1/3 left-1/3 w-72 h-72 bg-space-purple/10 rounded-full blur-3xl animate-float"></div>
            </div>

            <div className="max-w-md w-full relative z-10 animate-fade-in">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-space-primary to-space-purple bg-clip-text text-transparent mb-2">Spacey</h1>
                    <p className="text-space-muted">
                        {userType === 'client' ? 'Crea tu cuenta para reservar citas' : 'Crea tu cuenta para administrar tu negocio'}
                    </p>
                </div>

                <div className="glass-effect border border-space-border rounded-3xl shadow-2xl overflow-hidden">
                    {/* Role Selection Tabs */}
                    <div className="grid grid-cols-2 p-1 bg-space-card2/50 border-b border-space-border">
                        <button
                            type="button"
                            onClick={() => setUserType('client')}
                            className={`flex flex-col items-center justify-center py-4 text-sm font-bold transition-all rounded-xl ${userType === 'client'
                                ? 'bg-space-card text-space-primary shadow-sm ring-1 ring-space-border'
                                : 'text-space-muted hover:text-space-text hover:bg-space-card2/50'
                                }`}
                        >
                            <User className="mb-2" size={24} />
                            Soy Cliente
                        </button>
                        <button
                            type="button"
                            onClick={() => setUserType('owner')}
                            className={`flex flex-col items-center justify-center py-4 text-sm font-bold transition-all rounded-xl ${userType === 'owner'
                                ? 'bg-space-card text-space-purple shadow-sm ring-1 ring-space-border'
                                : 'text-space-muted hover:text-space-text hover:bg-space-card2/50'
                                }`}
                        >
                            <Scissors className="mb-2" size={24} />
                            Soy Dueño
                        </button>
                    </div>

                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-space-danger/10 border border-space-danger/30 text-space-danger px-4 py-3 rounded-xl text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-space-muted mb-2">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-space-bg border border-space-border rounded-xl text-space-text placeholder-space-muted/50 focus:ring-2 focus:ring-space-primary focus:border-transparent transition outline-none"
                                        placeholder="tu@email.com"
                                        disabled={loading}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-space-muted mb-2">
                                            Contraseña *
                                        </label>
                                        <input
                                            type="password"
                                            id="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-space-bg border border-space-border rounded-xl text-space-text placeholder-space-muted/50 focus:ring-2 focus:ring-space-primary focus:border-transparent transition outline-none"
                                            placeholder="••••••••"
                                            disabled={loading}
                                        />
                                        <p className="text-[10px] text-space-muted mt-1">Mínimo 6 caracteres</p>
                                    </div>

                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-space-muted mb-2">
                                            Confirmar *
                                        </label>
                                        <input
                                            type="password"
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-space-bg border border-space-border rounded-xl text-space-text placeholder-space-muted/50 focus:ring-2 focus:ring-space-primary focus:border-transparent transition outline-none"
                                            placeholder="••••••••"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-space-border">
                                <h3 className="text-xs font-bold text-space-muted uppercase tracking-widest">Información Personal (Opcional)</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="full_name" className="block text-sm font-medium text-space-muted mb-2">
                                            Nombre Completo
                                        </label>
                                        <input
                                            type="text"
                                            id="full_name"
                                            name="full_name"
                                            value={formData.full_name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-space-bg border border-space-border rounded-xl text-space-text placeholder-space-muted/50 focus:ring-2 focus:ring-space-primary focus:border-transparent transition outline-none"
                                            placeholder="Juan Pérez"
                                            disabled={loading}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="phone" className="block text-sm font-medium text-space-muted mb-2">
                                            Teléfono
                                        </label>
                                        <input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-space-bg border border-space-border rounded-xl text-space-text placeholder-space-muted/50 focus:ring-2 focus:ring-space-primary focus:border-transparent transition outline-none"
                                            placeholder="809-123-4567"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full text-white py-3.5 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${userType === 'owner' ? 'bg-gradient-to-r from-space-purple to-space-pink shadow-space-purple/20' : 'bg-gradient-to-r from-space-primary to-space-purple shadow-space-primary/20'
                                    }`}
                            >
                                {loading ? 'Creando cuenta...' : (userType === 'owner' ? 'Crear Cuenta de Negocio' : 'Crear Cuenta de Cliente')}
                            </button>
                        </form>
                    </div>

                    <div className="px-8 pb-8 text-center bg-space-bg/30 pt-4 border-t border-space-border">
                        <p className="text-space-muted text-sm">
                            ¿Ya tienes cuenta?{' '}
                            <Link to="/login" className="text-space-primary hover:text-space-primary/80 font-bold transition">
                                Inicia Sesión
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <Link to="/" className="text-sm text-space-muted hover:text-white transition">← Volver al inicio</Link>
                </div>
            </div>
        </div>
    );
}
