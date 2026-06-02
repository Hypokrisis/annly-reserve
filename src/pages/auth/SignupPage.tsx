import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isValidEmail } from '@/utils';
import { Eye, EyeOff, ArrowRight, Check, Mail } from 'lucide-react';

export default function SignupPage() {
    const { signup, user } = useAuth();
    const navigate = useNavigate();

    const [userType, setUserType] = useState<'client' | 'owner'>('client');
    const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', full_name: '', phone: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!formData.email || !formData.password || !formData.confirmPassword) { setError('Completa todos los campos.'); return; }
        if (!isValidEmail(formData.email)) { setError('Email inválido.'); return; }
        if (formData.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
        if (formData.password !== formData.confirmPassword) { setError('Las contraseñas no coinciden.'); return; }

        setLoading(true);
        try {
            await signup({ email: formData.email, password: formData.password, full_name: formData.full_name, phone: formData.phone, role: userType });
            localStorage.setItem('intended_role', userType);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message?.includes('already') || err.message?.includes('duplicate') ? 'Este email ya está en uso.' : (err.message || 'Error al crear la cuenta.'));
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (success && user) {
            const role = user.user_metadata?.role || localStorage.getItem('intended_role');
            navigate(role === 'owner' ? '/dashboard' : '/');
        }
    }, [success, user, navigate]);

    if (success) return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: `rgb(var(--space-bg))` }}>
            <div className="max-w-sm w-full rounded-2xl p-10 text-center animate-fade-up" style={{ background: `rgb(var(--space-card))`, border: `1px solid rgb(var(--space-border))` }}>
                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5" style={{ background: `rgba(var(--space-primary), 0.12)` }}>
                    <Mail size={28} style={{ color: `rgb(var(--space-primary))` }} />
                </div>
                <h2 className="text-xl font-extrabold tracking-tight mb-2" style={{ color: `rgb(var(--space-text))` }}>Revisa tu email</h2>
                <p className="text-sm font-medium mb-6" style={{ color: `rgb(var(--space-muted))` }}>
                    Enviamos un enlace de confirmación a <strong style={{ color: `rgb(var(--space-text))` }}>{formData.email}</strong>
                </p>
                <Link to="/login" className="btn-secondary w-full">Ir al inicio de sesión</Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 font-sans" style={{ background: `rgb(var(--space-bg))` }}>
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: `rgba(var(--space-primary-light), 0.1)` }} />
                <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: `rgba(var(--space-primary), 0.06)` }} />
            </div>

            <div className="relative w-full max-w-[420px]">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg" style={{ background: `linear-gradient(135deg, rgb(var(--space-primary-light)), rgb(var(--space-primary)))` }}>
                            <img src="/logo.png" alt="Spacey" className="w-full h-full object-cover object-top scale-110" />
                        </div>
                        <span className="text-xl font-extrabold tracking-tight" style={{ color: `rgb(var(--space-text))` }}>Spacey</span>
                    </Link>
                </div>

                <div className="rounded-2xl p-8 shadow-xl" style={{ background: `rgb(var(--space-card))`, border: `1px solid rgb(var(--space-border))` }}>
                    <div className="mb-6">
                        <h1 className="text-xl font-extrabold tracking-tight mb-1" style={{ color: `rgb(var(--space-text))` }}>Crear cuenta gratis</h1>
                        <p className="text-sm font-medium" style={{ color: `rgb(var(--space-muted))` }}>30 días gratis, sin tarjeta de crédito</p>
                    </div>

                    {/* Type toggle */}
                    <div className="flex gap-2 p-1 rounded-xl mb-6" style={{ background: `rgb(var(--space-card2))` }}>
                        {(['client', 'owner'] as const).map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setUserType(t)}
                                className="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200"
                                style={userType === t
                                    ? { background: `rgb(var(--space-card))`, color: `rgb(var(--space-text))`, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                                    : { color: `rgb(var(--space-muted))` }
                                }
                            >
                                {t === 'client' ? '👤 Soy cliente' : '✂️ Tengo negocio'}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="input-label">Nombre completo</label>
                            <input name="full_name" type="text" value={formData.full_name} onChange={handleChange} className="input-field" placeholder="Juan Pérez" autoComplete="name" />
                        </div>
                        <div>
                            <label className="input-label">Email *</label>
                            <input name="email" type="email" value={formData.email} onChange={handleChange} className="input-field" placeholder="tu@email.com" autoComplete="email" required />
                        </div>
                        <div>
                            <label className="input-label">Teléfono</label>
                            <input name="phone" type="tel" value={formData.phone} onChange={handleChange} className="input-field" placeholder="(939) 555-5555" autoComplete="tel" />
                        </div>
                        <div>
                            <label className="input-label">Contraseña *</label>
                            <div className="relative">
                                <input name="password" type={showPwd ? 'text' : 'password'} value={formData.password} onChange={handleChange} className="input-field pr-11" placeholder="Mínimo 6 caracteres" autoComplete="new-password" required />
                                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:opacity-70 transition-opacity" style={{ color: `rgb(var(--space-muted))` }}>
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="input-label">Confirmar contraseña *</label>
                            <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} className="input-field" placeholder="Repite la contraseña" autoComplete="new-password" required />
                        </div>

                        {error && (
                            <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: `rgba(var(--space-danger), 0.1)`, color: `rgb(var(--space-danger))`, border: `1px solid rgba(var(--space-danger), 0.2)` }}>
                                {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="btn-primary w-full h-11 mt-2">
                            {loading
                                ? <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creando cuenta...</span>
                                : <span className="flex items-center gap-2">Crear cuenta <ArrowRight size={15} /></span>
                            }
                        </button>
                    </form>

                    <p className="mt-5 text-center text-sm font-medium" style={{ color: `rgb(var(--space-muted))` }}>
                        ¿Ya tienes cuenta?{' '}
                        <Link to="/login" className="font-bold hover:opacity-80 transition-opacity" style={{ color: `rgb(var(--space-primary))` }}>
                            Iniciar sesión
                        </Link>
                    </p>
                </div>

                <p className="mt-6 text-center text-xs font-medium" style={{ color: `rgba(var(--space-muted), 0.6)` }}>
                    © {new Date().getFullYear()} Spacey · Puerto Rico
                </p>
            </div>
        </div>
    );
}
