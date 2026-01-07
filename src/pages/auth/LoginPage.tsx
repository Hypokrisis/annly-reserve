import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isValidEmail } from '@/utils';
import { Scissors } from 'lucide-react';

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    // Destination logic: root or where they came from
    const from = location.state?.from?.pathname || '/';

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError(''); // Clear error on input change
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.email || !formData.password) {
            setError('Por favor completa todos los campos');
            return;
        }

        if (!isValidEmail(formData.email)) {
            setError('Por favor ingresa un email válido');
            return;
        }

        setLoading(true);

        try {
            await login(formData.email, formData.password);
            navigate(from, { replace: true });
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg px-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-space-primary/10 rounded-full blur-3xl animate-float"></div>
                <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-space-purple/10 rounded-full blur-3xl animate-float-slow"></div>
            </div>

            <div className="max-w-md w-full relative z-10 animate-fade-in">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-space-primary to-space-purple rounded-2xl flex items-center justify-center text-white shadow-lg mx-auto mb-4">
                        <Scissors size={24} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Acceso a Spacey</h1>
                    <p className="text-space-muted">Inicia sesión para gestionar tus reservas</p>
                </div>

                <div className="glass-effect border border-space-border rounded-3xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-space-danger/10 border border-space-danger/30 text-space-danger px-4 py-3 rounded-xl text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-space-muted mb-2">
                                Email
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

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label htmlFor="password" className="block text-sm font-medium text-space-muted">
                                    Contraseña
                                </label>
                                <Link
                                    to="/forgot-password"
                                    className="text-xs text-space-primary hover:text-space-primary/80 transition font-medium"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
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
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-space-primary to-space-purple text-white py-3.5 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-space-primary/20"
                        >
                            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-space-border">
                        <p className="text-space-muted text-sm">
                            ¿No tienes cuenta?{' '}
                            <Link to="/signup" className="text-space-primary hover:text-space-primary/80 font-bold transition">
                                Regístrate
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
