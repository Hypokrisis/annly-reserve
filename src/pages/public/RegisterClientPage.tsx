import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';
import { isValidEmail, normalizePhoneE164 } from '@/utils';
import { Eye, EyeOff, ArrowLeft, ArrowRight, Mail, CalendarCheck, Phone, CheckCircle2 } from 'lucide-react';

type Step = 'form' | 'verify' | 'done';

/**
 * Registro de CLIENTE (role='client').
 * Paso 1 — Datos: nombre, email, teléfono, contraseña.
 * Paso 2 — Verificación: código SMS de 4 dígitos enviado al teléfono.
 * Paso 3 — Éxito: redirige a /client.
 * Si el usuario no pone teléfono, salta directo a /client tras el registro.
 */
export default function RegisterClientPage() {
    const navigate   = useNavigate();
    const location   = useLocation();
    const { signup } = useAuth();

    const prefill = (location.state as any)?.prefill || {};

    // ── Step 1: form ─────────────────────────────────────────────────
    const [formData, setFormData] = useState({
        full_name: prefill.name  || '',
        email:     prefill.email || '',
        phone:     prefill.phone || '',
        password:  '',
    });
    const [showPwd,   setShowPwd]   = useState(false);
    const [formError, setFormError] = useState('');
    const [loading,   setLoading]   = useState(false);

    // ── Step 2: verify ───────────────────────────────────────────────
    const [step,       setStep]       = useState<Step>('form');
    const [phoneE164,  setPhoneE164]  = useState('');
    const [code,       setCode]       = useState('');
    const [codeError,  setCodeError]  = useState('');
    const [verifying,  setVerifying]  = useState(false);
    const [resending,  setResending]  = useState(false);

    // ── Helpers ───────────────────────────────────────────────────────
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setFormError('');
    };

    // Llama a la edge function para enviar el SMS
    const sendVerificationSMS = async (phone: string): Promise<void> => {
        const { data: { session } } = await supabase.auth.getSession();
        const resp = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-verification`,
            {
                method:  'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token ?? ''}`,
                    'Content-Type':  'application/json',
                },
                body: JSON.stringify({ phone }),
            }
        );
        const json = await resp.json();
        if (!json.success) throw new Error(json.error || 'Error al enviar SMS');
    };

    // ── Submit paso 1 ────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.full_name.trim())                        { setFormError('El nombre es requerido.'); return; }
        if (!formData.email || !isValidEmail(formData.email))  { setFormError('Email inválido.'); return; }
        if (formData.password.length < 6)                      { setFormError('La contraseña debe tener al menos 6 caracteres.'); return; }

        setLoading(true);
        try {
            const normalized = formData.phone ? normalizePhoneE164(formData.phone) : undefined;
            const { hasSession } = await signup({
                email:     formData.email,
                password:  formData.password,
                full_name: formData.full_name,
                phone:     normalized,
                role:      'client',
            });

            if (!hasSession) {
                // Email confirmation pendiente → mostrar pantalla de email
                setStep('done');
                return;
            }

            // Si puso teléfono → ir a verificación
            if (normalized) {
                setPhoneE164(normalized);
                await sendVerificationSMS(normalized);
                setStep('verify');
            } else {
                navigate('/client', { replace: true });
            }
        } catch (err: any) {
            if (err.message?.includes('already registered')) {
                setFormError('Este email ya tiene una cuenta. Inicia sesión.');
            } else {
                setFormError(err.message || 'No se pudo crear la cuenta.');
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Submit paso 2 — verificar código ─────────────────────────────
    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length !== 4) { setCodeError('El código tiene 4 dígitos.'); return; }
        setVerifying(true);
        setCodeError('');
        try {
            const { data, error } = await supabase.rpc('verify_phone_code', { p_code: code });
            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'Código inválido');
            navigate('/client', { replace: true });
        } catch (err: any) {
            setCodeError(err.message || 'Código inválido o expirado.');
        } finally {
            setVerifying(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        setCodeError('');
        try {
            await sendVerificationSMS(phoneE164);
        } catch (err: any) {
            setCodeError(err.message || 'Error al reenviar.');
        } finally {
            setResending(false);
        }
    };

    // ── Email pendiente de confirmación ───────────────────────────────
    if (step === 'done') {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-space-bg">
                <div className="w-full max-w-[400px]">
                    <div className="bg-space-card rounded-2xl p-8 shadow-xl border border-space-border text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-space-primary/12 flex items-center justify-center mb-5">
                            <Mail size={28} className="text-space-primary" />
                        </div>
                        <h2 className="text-xl font-extrabold tracking-tight text-space-text mb-2">Revisa tu email</h2>
                        <p className="text-sm font-medium text-space-muted mb-6">
                            Enviamos un enlace de confirmación a <strong className="text-space-text">{formData.email}</strong>. Confírmalo para acceder a tu cuenta.
                        </p>
                        <Link to="/login" className="btn-secondary w-full">Ir al inicio de sesión</Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── Paso 2: verificar código ──────────────────────────────────────
    if (step === 'verify') {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-space-bg">
                <div className="fixed inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: `rgba(var(--space-primary-light), 0.1)` }} />
                </div>
                <div className="relative w-full max-w-[400px]">
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
                            <div className="w-11 h-11 rounded-xl bg-space-primary/10 flex items-center justify-center mb-4">
                                <Phone size={22} className="text-space-primary" />
                            </div>
                            <h1 className="text-xl font-extrabold tracking-tight text-space-text mb-1">Verifica tu teléfono</h1>
                            <p className="text-sm font-medium text-space-muted">
                                Enviamos un código de 4 dígitos por SMS a <span className="text-space-text font-bold">{phoneE164}</span>.
                            </p>
                        </div>

                        <form onSubmit={handleVerify} className="space-y-4">
                            <div>
                                <label className="input-label">Código de verificación</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]{4}"
                                    maxLength={4}
                                    value={code}
                                    onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setCodeError(''); }}
                                    className="input-field text-center text-2xl font-extrabold tracking-[0.5em]"
                                    placeholder="····"
                                    autoFocus
                                />
                            </div>

                            {codeError && (
                                <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: `rgba(var(--space-danger), 0.1)`, color: `rgb(var(--space-danger))`, border: `1px solid rgba(var(--space-danger), 0.2)` }}>
                                    {codeError}
                                </div>
                            )}

                            <button type="submit" disabled={verifying || code.length < 4} className="btn-primary w-full h-11 mt-1">
                                {verifying ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        Verificando...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Confirmar <ArrowRight size={15} />
                                    </span>
                                )}
                            </button>
                        </form>

                        <div className="mt-5 flex flex-col items-center gap-2">
                            <button
                                onClick={handleResend}
                                disabled={resending}
                                className="text-sm font-bold text-space-primary hover:opacity-70 transition-opacity disabled:opacity-40"
                            >
                                {resending ? 'Enviando...' : 'Reenviar código'}
                            </button>
                            <button
                                onClick={() => navigate('/client', { replace: true })}
                                className="text-xs font-medium text-space-muted hover:opacity-70 transition-opacity"
                            >
                                Verificar más tarde →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Paso 1: formulario de registro ────────────────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-space-bg">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: `rgba(var(--space-primary-light), 0.1)` }} />
                <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: `rgba(var(--space-primary), 0.06)` }} />
            </div>

            <div className="relative w-full max-w-[400px]">
                <Link to="/" className="flex items-center gap-2 text-space-muted hover:text-space-text text-sm font-bold mb-7 transition-colors w-fit">
                    <ArrowLeft size={16} /> Volver al inicio
                </Link>

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
                        <div className="w-11 h-11 rounded-xl bg-space-primary/10 flex items-center justify-center mb-4">
                            <CalendarCheck size={22} className="text-space-primary" />
                        </div>
                        <h1 className="text-xl font-extrabold tracking-tight text-space-text mb-1">Crea tu cuenta</h1>
                        <p className="text-sm font-medium text-space-muted">
                            Guarda y gestiona todas tus citas en un solo lugar.
                        </p>
                    </div>

                    {/* Indicador de pasos (solo si hay teléfono) */}
                    {formData.phone && (
                        <div className="flex items-center gap-2 mb-5">
                            {(['Datos', 'Código', 'Listo'] as const).map((label, i) => (
                                <React.Fragment key={label}>
                                    <div className={`flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider ${i === 0 ? 'text-space-primary' : 'text-space-muted/40'}`}>
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold ${i === 0 ? 'bg-space-primary text-space-card' : 'bg-space-card2 text-space-muted/40'}`}>
                                            {i + 1}
                                        </div>
                                        <span className="hidden sm:block">{label}</span>
                                    </div>
                                    {i < 2 && <div className="flex-1 h-px bg-space-border" />}
                                </React.Fragment>
                            ))}
                        </div>
                    )}

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
                            <label className="input-label">
                                Teléfono{' '}
                                <span className="text-space-muted/60 font-normal">(recomendado — verifica tus citas de WhatsApp)</span>
                            </label>
                            <input name="phone" type="tel" value={formData.phone} onChange={handleChange}
                                className="input-field" placeholder="787 123 4567" autoComplete="tel" />
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

                        {formData.phone && (
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-space-primary/6 border border-space-primary/15">
                                <CheckCircle2 size={14} className="text-space-primary mt-0.5 shrink-0" />
                                <p className="text-[11px] font-medium text-space-muted leading-relaxed">
                                    Te enviaremos un código por SMS para verificar tu número y vincular tus citas de WhatsApp.
                                </p>
                            </div>
                        )}

                        {formError && (
                            <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: `rgba(var(--space-danger), 0.1)`, color: `rgb(var(--space-danger))`, border: `1px solid rgba(var(--space-danger), 0.2)` }}>
                                {formError}
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
                                    {formData.phone ? 'Crear cuenta y enviar código' : 'Crear cuenta gratis'}
                                    <ArrowRight size={15} />
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
                    ¿Tienes una barbería?{' '}
                    <Link to="/register" className="font-bold hover:opacity-80">Regístrala aquí</Link>.
                </p>
                <p className="mt-3 text-center text-[10px] text-space-muted/40 leading-relaxed">
                    Al crear una cuenta aceptas nuestros{' '}
                    <Link to="/terms" className="underline hover:opacity-80">Términos de Servicio</Link>
                    {' '}y{' '}
                    <Link to="/privacy" className="underline hover:opacity-80">Política de Privacidad</Link>.
                </p>
            </div>
        </div>
    );
}
