import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isValidEmail } from '@/utils';
import { Eye, EyeOff, ArrowLeft, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { signup } = useAuth();

    // Pre-fill data if coming from guest booking flow
    const prefill = (location.state as any)?.prefill || {};

    const [formData, setFormData] = useState({
        full_name: prefill.name || '',
        email: prefill.email || '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.full_name.trim()) { setError('El nombre es requerido.'); return; }
        if (!formData.email || !isValidEmail(formData.email)) { setError('Email inválido.'); return; }
        if (formData.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }

        setLoading(true);
        try {
            await signup({ email: formData.email, password: formData.password, full_name: formData.full_name });
            navigate('/', { replace: true });
        } catch (err: any) {
            // Block staff self-registration
            if (err.message?.includes('already registered')) {
                setError('Este email ya tiene una cuenta. Inicia sesión.');
            } else {
                setError(err.message || 'No se pudo crear la cuenta.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-space-bg">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: `rgba(var(--space-primary-light), 0.1)` }} />
                <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: `rgba(var(--space-primary), 0.06)` }} />
            </div>

            <div className="relative w-full max-w-[400px]">
                {/* Back button */}
                <Link to="/" className="flex items-center gap-2 text-space-muted hover:text-space-text text-sm font-bold mb-7 transition-colors w-fit">
                    <ArrowLeft size={16} /> Volver al inicio
                </Link>

                {/* Logo */}
                <div className="flex justify-center mb-7">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg" style={{ background: `linear-gradient(135deg, rgb(var(--space-primary-light)), rgb(var(--space-primary)))` }}>
                            <img src="/logo.png" alt="Spacey" className="w-full h-full object-cover object-top scale-110" />
                        </div>
                        <span className="text-xl font-extrabold tracking-tight text-space-text">Spacey</span>
                    </Link>
                </div>

                <div className="bg-space-card rounded-2xl p-7 shadow-xl border border-space-border">
                    <div className="mb-6">
                        <h1 className="text-xl font-extrabold tracking-tight text-space-text mb-1">Crea tu cuenta</h1>
                        <p className="text-sm font-medium text-space-muted">
                            {prefill.name ? 'Guarda tus citas y lleva tu historial.' : 'Reserva barberías y lleva tu historial.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="input-label">Nombre completo</label>
                            <input name="full_name" type="text" value={formData.full_name} onChange={handleChange}
                                className="input-field" placeholder="Juan Pérez" autoComplete="name" autoFocus={!prefill.name} />
                        </div>
                        <div>
                            <label className="input-label">Email</label>
                            <input name="email" type="email" value={formData.email} onChange={handleChange}
                                className="input-field" placeholder="tu@email.com" autoComplete="email" />
                        </div>
                        <div>
                            <label className="input-label">Contraseña</label>
                            <div className="relative">
                                <input name="password" type={showPwd ? 'text' : 'password'} value={formData.password}
                                    onChange={handleChange} className="input-field pr-11" placeholder="Mínimo 6 caracteres"
                                    autoComplete="new-password" />
                                <button type="button" onClick={() => setShowPwd(!showPwd)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-space-muted hover:opacity-70 transition-opacity">
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
                                    Creando cuenta...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Crear cuenta gratis <ArrowRight size={15} />
                                </span>
                            )}
                        </button>
                    </form>

                    <p className="mt-5 text-center text-sm font-medium text-space-muted">
                        ¿Ya tienes cuenta?{' '}
                        <Link to="/login" className="font-bold text-space-primary hover:opacity-80 transition-opacity">
                            Iniciar sesión
                        </Link>
                    </p>
                </div>

                <p className="mt-5 text-center text-[11px] text-space-muted/50">
                    ¿Eres del equipo de una barbería?{' '}
                    <span className="font-bold">Necesitas una invitación del dueño.</span>
                </p>

                <p className="mt-3 text-center text-xs text-space-muted/40">
                    © {new Date().getFullYear()} Spacey · Puerto Rico
                </p>
            </div>
        </div>
    );
}
