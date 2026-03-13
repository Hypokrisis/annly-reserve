import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isValidEmail } from '@/utils';
import { Scissors, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const from = location.state?.from?.pathname || '/dashboard';

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.email || !formData.password) {
            setError('Por favor completa todos los campos.');
            return;
        }
        if (!isValidEmail(formData.email)) {
            setError('Por favor ingresa un email válido.');
            return;
        }

        setLoading(true);
        try {
            await login(formData.email, formData.password);
            navigate(from, { replace: true });
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">

            {/* ── Left: Branding ─────────────────────────────── */}
            <div className="hidden lg:flex lg:w-1/2 bg-space-primary flex-col justify-between p-12 relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full -ml-32 -mb-32" />

                {/* Top logo */}
                <div className="relative flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <Scissors size={20} className="text-white" />
                    </div>
                    <span className="text-white font-bold text-xl tracking-tight">Spacey</span>
                </div>

                {/* Center copy */}
                <div className="relative">
                    <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
                        La plataforma de reservas para tu negocio
                    </h2>
                    <p className="text-white/75 text-lg leading-relaxed">
                        Gestiona citas, barberos y servicios desde un solo lugar. Simple, rápido y profesional.
                    </p>

                    {/* Feature badges */}
                    <div className="flex flex-wrap gap-3 mt-8">
                        {['📅 Reservas 24/7', '💬 WhatsApp automático', '📊 Control total'].map(f => (
                            <span key={f} className="bg-white/15 text-white text-sm font-medium px-4 py-2 rounded-full border border-white/20">
                                {f}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Bottom footer */}
                <p className="relative text-white/50 text-sm">© 2025 Spacey · Todos los derechos reservados</p>
            </div>

            {/* ── Right: Form ────────────────────────────────── */}
            <div className="flex-1 flex items-center justify-center px-6 py-12 bg-space-bg">
                <div className="w-full max-w-md animate-fade-up">

                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-2 mb-8">
                        <div className="w-9 h-9 bg-space-primary rounded-xl flex items-center justify-center shadow-btn">
                            <Scissors size={18} className="text-white" />
                        </div>
                        <span className="font-bold text-space-text text-xl">Spacey</span>
                    </div>

                    <h1 className="text-2xl font-bold text-space-text mb-1">Bienvenido de vuelta</h1>
                    <p className="text-space-muted text-sm mb-8">Inicia sesión para gestionar tu negocio</p>

                    <div className="card p-8 shadow-card-lg">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-space-danger px-4 py-3 rounded-xl text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="input-label">Email</label>
                                <input
                                    type="email" id="email" name="email"
                                    value={formData.email} onChange={handleChange}
                                    className="input-field" placeholder="tu@email.com"
                                    disabled={loading} autoComplete="email"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label htmlFor="password" className="input-label mb-0">Contraseña</label>
                                    <Link to="/forgot-password" className="text-xs text-space-primary hover:text-space-primary-dark font-medium transition">
                                        ¿Olvidaste tu contraseña?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPwd ? 'text' : 'password'}
                                        id="password" name="password"
                                        value={formData.password} onChange={handleChange}
                                        className="input-field pr-12" placeholder="••••••••"
                                        disabled={loading} autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPwd(!showPwd)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-space-muted hover:text-space-primary transition"
                                    >
                                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                        </svg>
                                        Iniciando sesión...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">Iniciar Sesión <ArrowRight size={16} /></span>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 pt-5 border-t border-space-border text-center">
                            <p className="text-space-muted text-sm">
                                ¿No tienes cuenta?{' '}
                                <Link to="/signup" className="text-space-primary hover:text-space-primary-dark font-semibold transition">
                                    Regístrate gratis
                                </Link>
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <Link to="/" className="text-sm text-space-muted hover:text-space-primary transition">
                            ← Volver al inicio
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
