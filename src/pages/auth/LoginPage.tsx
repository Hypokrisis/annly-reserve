import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isValidEmail } from '@/utils';
import { Eye, EyeOff, ArrowRight, Building2, Scissors } from 'lucide-react';

const LS_LAST_EMAIL = 'spacey_last_email';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [loginAs, setLoginAs] = useState<'owner' | 'staff'>('owner');
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const [lastEmail, setLastEmail] = useState('');

    // Pre-fill last used email (for "continuar como" UX)
    useEffect(() => {
        const saved = localStorage.getItem(LS_LAST_EMAIL);
        if (saved) {
            setLastEmail(saved);
            setFormData(p => ({ ...p, email: saved }));
        }
    }, []);

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
            localStorage.setItem(LS_LAST_EMAIL, formData.email);
            navigate('/auth-redirect', { replace: true });
        } catch (err: any) {
            setError(err.message || 'Credenciales incorrectas.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 font-sans bg-space-bg">
            {/* Ambient orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: `rgba(var(--space-primary-light), 0.1)` }} />
                <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: `rgba(var(--space-primary), 0.06)` }} />
            </div>

            <div className="relative w-full max-w-[400px]">
                {/* Logo */}
                <div className="flex justify-center mb-7">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg" style={{ background: `linear-gradient(135deg, rgb(var(--space-primary-light)), rgb(var(--space-primary)))` }}>
                            <img src="/logo.png" alt="Spacey" className="w-full h-full object-cover object-top scale-110" />
                        </div>
                        <span className="text-xl font-extrabold tracking-tight" style={{ color: `rgb(var(--space-text))` }}>Spacey</span>
                    </Link>
                </div>

                {/* Role selector */}
                <div className="flex gap-2 p-1 bg-space-card2/50 rounded-2xl mb-5 border border-space-border/40">
                    <button
                        type="button"
                        onClick={() => setLoginAs('owner')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${loginAs === 'owner' ? 'bg-space-card text-space-text shadow-sm' : 'text-space-muted hover:text-space-text'}`}
                    >
                        <Building2 size={13} className={loginAs === 'owner' ? 'text-space-primary' : ''} />
                        Dueño / Admin
                    </button>
                    <button
                        type="button"
                        onClick={() => setLoginAs('staff')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${loginAs === 'staff' ? 'bg-space-card text-space-text shadow-sm' : 'text-space-muted hover:text-space-text'}`}
                    >
                        <Scissors size={13} className={loginAs === 'staff' ? 'text-space-primary' : ''} />
                        Staff / Barbero
                    </button>
                </div>

                {/* Card */}
                <div className="rounded-2xl p-7 shadow-xl bg-space-card border border-space-border">
                    <div className="mb-6">
                        <h1 className="text-xl font-extrabold tracking-tight mb-1 text-space-text">
                            {loginAs === 'owner' ? 'Acceso para negocios' : 'Acceso para staff'}
                        </h1>
                        <p className="text-sm font-medium text-space-muted">
                            {loginAs === 'owner'
                                ? 'Gestiona tu barbería desde el dashboard'
                                : 'Accede a tu agenda y horarios'}
                        </p>
                    </div>

                    {/* "Continuar como" shortcut */}
                    {lastEmail && formData.email === lastEmail && (
                        <div className="mb-5 p-3.5 rounded-xl border border-space-border/50 bg-space-bg flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[9px] font-extrabold uppercase tracking-widest text-space-muted mb-0.5">Último acceso</p>
                                <p className="text-xs font-bold text-space-text truncate">{lastEmail}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, email: lastEmail }))}
                                className="text-[9px] font-extrabold uppercase tracking-widest text-space-primary hover:underline flex-shrink-0"
                            >
                                Usar este
                            </button>
                        </div>
                    )}

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
                                autoFocus={!lastEmail}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="input-label mb-0">Contraseña</label>
                                <Link to="/forgot-password" className="text-[11px] font-semibold text-space-primary hover:opacity-80 transition-opacity">
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
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-space-muted hover:opacity-70 transition-opacity"
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

                        <button type="submit" disabled={loading} className="btn-primary w-full h-11 mt-1">
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

                    {loginAs === 'owner' && (
                        <p className="mt-5 text-center text-sm font-medium text-space-muted">
                            ¿No tienes cuenta?{' '}
                            <Link to="/signup" className="font-bold text-space-primary hover:opacity-80 transition-opacity">
                                Registra tu barbería gratis
                            </Link>
                        </p>
                    )}
                </div>

                {/* Client link */}
                <div className="mt-5 text-center">
                    <p className="text-xs text-space-muted/60">
                        ¿Eres cliente?{' '}
                        <Link to="/#explore" className="font-bold text-space-primary/70 hover:text-space-primary transition-colors">
                            Explora las barberías →
                        </Link>
                    </p>
                </div>

                <p className="mt-5 text-center text-xs text-space-muted/40">
                    © {new Date().getFullYear()} Spacey · Puerto Rico
                </p>
            </div>
        </div>
    );
}
