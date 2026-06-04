import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isValidEmail } from '@/utils';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
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
        if (!formData.email || !formData.password) { setError('Completa todos los campos.'); return; }
        if (!isValidEmail(formData.email)) { setError('Email inválido.'); return; }
        setLoading(true);
        try {
            await login(formData.email, formData.password);
            navigate('/auth-redirect', { replace: true });
        } catch (err: any) {
            setError(err.message || 'Credenciales incorrectas.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center px-4 py-12 font-sans"
            style={{ background: `rgb(var(--space-bg))` }}
        >
            {/* Ambient orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: `rgba(var(--space-primary-light), 0.1)` }} />
                <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: `rgba(var(--space-primary), 0.06)` }} />
            </div>

            <div className="relative w-full max-w-[400px]">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg" style={{ background: `linear-gradient(135deg, rgb(var(--space-primary-light)), rgb(var(--space-primary)))` }}>
                            <img src="/logo.png" alt="Spacey" className="w-full h-full object-cover object-top scale-110" />
                        </div>
                        <span className="text-xl font-extrabold tracking-tight" style={{ color: `rgb(var(--space-text))` }}>Spacey</span>
                    </Link>
                </div>

                {/* Card */}
                <div
                    className="rounded-2xl p-8 shadow-xl"
                    style={{
                        background: `rgb(var(--space-card))`,
                        border: `1px solid rgb(var(--space-border))`,
                    }}
                >
                    <div className="mb-7">
                        <h1 className="text-xl font-extrabold tracking-tight mb-1" style={{ color: `rgb(var(--space-text))` }}>
                            Bienvenido de vuelta
                        </h1>
                        <p className="text-sm font-medium" style={{ color: `rgb(var(--space-muted))` }}>
                            Inicia sesión en tu cuenta de Spacey
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="input-label">Email</label>
                            <input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="tu@email.com"
                                autoComplete="email"
                                autoFocus
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="input-label mb-0">Contraseña</label>
                                <Link to="/forgot-password" className="text-[11px] font-semibold transition-colors hover:opacity-80" style={{ color: `rgb(var(--space-primary))` }}>
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showPwd ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input-field pr-11"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd(!showPwd)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-opacity hover:opacity-70"
                                    style={{ color: `rgb(var(--space-muted))` }}
                                >
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: `rgba(var(--space-danger), 0.1)`, color: `rgb(var(--space-danger))`, border: `1px solid rgba(var(--space-danger), 0.2)` }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full h-11 mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    Entrando...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Iniciar sesión <ArrowRight size={15} />
                                </span>
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm font-medium" style={{ color: `rgb(var(--space-muted))` }}>
                        ¿No tienes cuenta?{' '}
                        <Link to="/signup" className="font-bold transition-colors hover:opacity-80" style={{ color: `rgb(var(--space-primary))` }}>
                            Crear cuenta gratis
                        </Link>
                    </p>
                </div>

                <p className="mt-6 text-center text-xs font-medium" style={{ color: `rgba(var(--space-muted), 0.6)` }}>
                    © {new Date().getFullYear()} Spacey · Hecho en Puerto Rico
                </p>
            </div>
        </div>
    );
}
