import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isValidEmail } from '@/utils';
import { Scissors, User, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
    const { signup, user } = useAuth();
    const navigate = useNavigate();

    const [userType, setUserType] = useState<'client' | 'owner'>('client');
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
    const [showPwd, setShowPwd] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.email || !formData.password || !formData.confirmPassword) {
            setError('Por favor completa los campos obligatorios (*)'); return;
        }
        if (!isValidEmail(formData.email)) {
            setError('Por favor ingresa un email válido'); return;
        }
        if (formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres'); return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden'); return;
        }

        setLoading(true);
        try {
            await signup({
                email: formData.email,
                password: formData.password,
                full_name: formData.full_name,
                phone: formData.phone,
                role: userType,
            });
            localStorage.setItem('intended_role', userType);
            setSuccess(true);
        } catch (err: any) {
            if (err.message?.includes('already') || err.message?.includes('duplicate')) {
                setError('Este email ya está en uso');
            } else {
                setError(err.message || 'Error al crear la cuenta. Intenta nuevamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Listen for email confirmation or instant auto-login
    React.useEffect(() => {
        if (success && user) {
            const role = user.user_metadata?.role || localStorage.getItem('intended_role');
            navigate(role === 'owner' ? '/dashboard' : '/');
        }
    }, [success, user, navigate]);

    // ── Success Screen
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-space-bg px-4">
                <div className="max-w-md w-full card p-10 text-center shadow-card-lg animate-fade-up border-2 border-space-primary/20">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 bg-space-primary/10 rounded-full animate-ping opacity-75"></div>
                        <div className="relative w-full h-full bg-space-primary rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-space-text uppercase tracking-tight mb-2">¡Revisa tu Email!</h2>
                    <p className="text-space-muted mb-2 text-sm">
                        Hemos enviado un enlace de confirmación a{' '}
                        <strong className="text-space-text">{formData.email}</strong>.
                    </p>
                    <p className="text-space-muted font-bold text-sm mb-6 mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                        <span className="flex items-center justify-center gap-2 mb-1 text-amber-700">
                           <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                           Esperando confirmación...
                        </span>
                        Esta página se actualizará automáticamente en cuanto confirmes tu email.
                    </p>
                    <Link to="/login" className="text-[10px] uppercase font-black tracking-widest text-space-muted hover:text-space-primary transition-colors">
                        Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">

            {/* ── Left Branding ──────────────────────────────── */}
            <div className="hidden lg:flex lg:w-5/12 bg-space-primary flex-col justify-between p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full -ml-24 -mb-24" />

                <div className="relative flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <Scissors size={20} className="text-white" />
                    </div>
                    <span className="text-white font-bold text-xl tracking-tight">Spacey</span>
                </div>

                <div className="relative">
                    <h2 className="text-3xl font-extrabold text-white leading-snug mb-4">
                        {userType === 'owner'
                            ? 'Haz crecer tu negocio sin esfuerzo'
                            : 'Reserva tu cita en segundos'}
                    </h2>
                    <p className="text-white/75 leading-relaxed">
                        {userType === 'owner'
                            ? 'Citas automatizadas, notificaciones por WhatsApp y control total desde tu panel.'
                            : 'Elige tu barbero favorito y recibe confirmación al instante.'}
                    </p>
                    <div className="flex gap-2 mt-6">
                        {['Gratis para empezar', 'Sin tarjeta de crédito'].map(f => (
                            <span key={f} className="bg-white/15 text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20">
                                ✓ {f}
                            </span>
                        ))}
                    </div>
                </div>

                <p className="relative text-white/50 text-sm">© 2025 Spacey</p>
            </div>

            {/* ── Right Form ─────────────────────────────────── */}
            <div className="flex-1 flex items-center justify-center px-6 py-12 bg-space-bg overflow-y-auto">
                <div className="w-full max-w-md animate-fade-up">

                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-2 mb-8">
                        <div className="w-9 h-9 bg-space-primary rounded-xl flex items-center justify-center shadow-btn">
                            <Scissors size={18} className="text-white" />
                        </div>
                        <span className="font-bold text-space-text text-xl">Spacey</span>
                    </div>

                    <h1 className="text-2xl font-bold text-space-text mb-1">Crea tu cuenta</h1>
                    <p className="text-space-muted text-sm mb-6">Es gratis y solo toma un momento</p>

                    {/* Role toggle */}
                    <div className="flex gap-2 p-1 bg-space-card2 rounded-xl mb-6 border border-space-border">
                        {[
                            { type: 'client' as const, label: 'Soy Cliente', icon: User },
                            { type: 'owner' as const,  label: 'Soy Dueño',  icon: Scissors }
                        ].map(({ type, label, icon: Icon }) => (
                            <button
                                key={type} type="button"
                                onClick={() => setUserType(type)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                                    ${userType === type ? 'bg-white text-space-primary shadow-card' : 'text-space-muted hover:text-space-text'}`}
                            >
                                <Icon size={15} /> {label}
                            </button>
                        ))}
                    </div>

                    <div className="card p-7 shadow-card-lg">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-space-danger px-4 py-3 rounded-xl text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="input-label">Email *</label>
                                <input type="email" id="email" name="email"
                                    value={formData.email} onChange={handleChange}
                                    className="input-field" placeholder="tu@email.com"
                                    disabled={loading} autoComplete="email"
                                />
                            </div>

                            {/* Passwords */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="password" className="input-label">Contraseña *</label>
                                    <div className="relative">
                                        <input type={showPwd ? 'text' : 'password'}
                                            id="password" name="password"
                                            value={formData.password} onChange={handleChange}
                                            className="input-field pr-10" placeholder="Min. 6 chars"
                                            disabled={loading}
                                        />
                                        <button type="button" onClick={() => setShowPwd(!showPwd)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-space-muted hover:text-space-primary transition">
                                            {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="confirmPassword" className="input-label">Confirmar *</label>
                                    <input type="password" id="confirmPassword" name="confirmPassword"
                                        value={formData.confirmPassword} onChange={handleChange}
                                        className="input-field" placeholder="Repetir"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            {/* Optional info */}
                            <div className="pt-3 border-t border-space-border">
                                <p className="text-xs font-semibold text-space-muted uppercase tracking-wider mb-3">Opcional</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="full_name" className="input-label">Nombre</label>
                                        <input type="text" id="full_name" name="full_name"
                                            value={formData.full_name} onChange={handleChange}
                                            className="input-field" placeholder="Juan Pérez"
                                            disabled={loading}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="phone" className="input-label">Teléfono</label>
                                        <input type="tel" id="phone" name="phone"
                                            value={formData.phone} onChange={handleChange}
                                            className="input-field" placeholder="809-123-4567"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-2">
                                {loading ? 'Creando cuenta...' : (
                                    <span className="flex items-center gap-2">
                                        {userType === 'owner' ? 'Crear Cuenta de Negocio' : 'Crear mi Cuenta'}
                                        <ArrowRight size={16} />
                                    </span>
                                )}
                            </button>
                        </form>

                        <div className="mt-5 pt-4 border-t border-space-border text-center">
                            <p className="text-space-muted text-sm">
                                ¿Ya tienes cuenta?{' '}
                                <Link to="/login" className="text-space-primary hover:text-space-primary-dark font-semibold transition">
                                    Inicia Sesión
                                </Link>
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 text-center">
                        <Link to="/" className="text-sm text-space-muted hover:text-space-primary transition">← Volver al inicio</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
