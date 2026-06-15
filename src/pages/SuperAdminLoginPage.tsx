import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Lock, KeyRound, Mail, Loader2, ShieldAlert, Eye, EyeOff } from 'lucide-react';

const ADMIN_EMAIL = 'loann.santiago@gmail.com';
const SA_SESSION_KEY = 'spacey_sa_session';
const SESSION_MS = 4 * 60 * 60 * 1000; // 4 hours

export function setSuperAdminSession() {
    localStorage.setItem(SA_SESSION_KEY, JSON.stringify({ expires: Date.now() + SESSION_MS }));
}

export function checkSuperAdminSession(): boolean {
    try {
        const raw = localStorage.getItem(SA_SESSION_KEY);
        if (!raw) return false;
        const { expires } = JSON.parse(raw);
        if (Date.now() > expires) { localStorage.removeItem(SA_SESSION_KEY); return false; }
        return true;
    } catch { return false; }
}

export function clearSuperAdminSession() {
    localStorage.removeItem(SA_SESSION_KEY);
}

type Step = 'password' | 'otp';

export default function SuperAdminLoginPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>('password');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [locked, setLocked] = useState<{ until: number } | null>(null);

    const lockMinsLeft = locked ? Math.ceil((locked.until - Date.now()) / 60000) : 0;

    const handlePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) return;
        setLoading(true);
        setError('');
        try {
            const { data, error: fnErr } = await supabase.functions.invoke('superadmin-auth', {
                body: { action: 'request', password },
            });
            if (fnErr) throw fnErr;

            if (data.locked) {
                setLocked({ until: Date.now() + data.unlock_minutes * 60000 });
                return;
            }
            if (!data.ok) {
                const left = data.attempts_left;
                setError(`Contraseña incorrecta.${left > 0 ? ` ${left} intento${left !== 1 ? 's' : ''} restante${left !== 1 ? 's' : ''}.` : ' Cuenta bloqueada.'}`);
                return;
            }
            // Password OK → OTP sent to email
            setStep('otp');
            setError('');
        } catch (e: any) {
            setError(e.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const handleOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) { setError('El código debe tener 6 dígitos'); return; }
        setLoading(true);
        setError('');
        try {
            const { error: verifyErr } = await supabase.auth.verifyOtp({
                email: ADMIN_EMAIL,
                token: otp,
                type: 'email',
            });
            if (verifyErr) {
                setError('Código incorrecto o expirado. Inténtalo de nuevo.');
                return;
            }
            setSuperAdminSession();
            navigate('/superadmin', { replace: true });
        } catch (e: any) {
            setError(e.message || 'Error al verificar el código');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 font-sans"
            style={{ background: `rgb(var(--space-bg))` }}>

            <div className="w-full max-w-sm">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{ background: `rgba(var(--space-primary), 0.12)` }}>
                        <ShieldAlert size={28} style={{ color: `rgb(var(--space-primary))` }} />
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.3em] font-bold mb-1"
                        style={{ color: `rgb(var(--space-primary))` }}>Spacey Reserve</div>
                    <h1 className="text-xl font-black" style={{ color: `rgb(var(--space-text))` }}>
                        Acceso Superadmin
                    </h1>
                </div>

                {/* Lock screen */}
                {locked && lockMinsLeft > 0 && (
                    <div className="rounded-2xl p-6 text-center"
                        style={{ background: `rgba(var(--space-danger), 0.08)`, border: `1px solid rgba(var(--space-danger), 0.3)` }}>
                        <Lock size={24} className="mx-auto mb-3" style={{ color: `rgb(var(--space-danger))` }} />
                        <p className="font-black text-base mb-1" style={{ color: `rgb(var(--space-danger))` }}>
                            Acceso bloqueado
                        </p>
                        <p className="text-sm" style={{ color: `rgb(var(--space-muted))` }}>
                            Demasiados intentos fallidos. Intenta de nuevo en{' '}
                            <strong style={{ color: `rgb(var(--space-text))` }}>{lockMinsLeft} min</strong>.
                        </p>
                    </div>
                )}

                {/* Step 1: Password */}
                {!locked && step === 'password' && (
                    <form onSubmit={handlePassword}
                        className="rounded-2xl p-8 shadow-xl"
                        style={{ background: `rgb(var(--space-card))`, border: `1px solid rgb(var(--space-border))` }}>

                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                                style={{ background: `rgb(var(--space-primary))`, color: 'white' }}>1</div>
                            <span className="text-xs font-bold uppercase tracking-widest"
                                style={{ color: `rgb(var(--space-muted))` }}>Contraseña de administrador</span>
                        </div>

                        <div className="relative mb-4">
                            <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2"
                                style={{ color: `rgb(var(--space-muted))` }} />
                            <input
                                type={showPwd ? 'text' : 'password'}
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(''); }}
                                className="input-field pl-10 pr-11"
                                placeholder="Contraseña admin"
                                autoFocus
                                autoComplete="off"
                            />
                            <button type="button" onClick={() => setShowPwd(!showPwd)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:opacity-70 transition"
                                style={{ color: `rgb(var(--space-muted))` }}>
                                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>

                        {error && (
                            <p className="text-xs mb-3 px-3 py-2 rounded-lg"
                                style={{ background: `rgba(var(--space-danger), 0.1)`, color: `rgb(var(--space-danger))` }}>
                                {error}
                            </p>
                        )}

                        <button type="submit" disabled={loading || !password.trim()}
                            className="btn-primary w-full h-11 flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
                            Verificar
                        </button>
                    </form>
                )}

                {/* Step 2: OTP */}
                {!locked && step === 'otp' && (
                    <form onSubmit={handleOtp}
                        className="rounded-2xl p-8 shadow-xl"
                        style={{ background: `rgb(var(--space-card))`, border: `1px solid rgb(var(--space-border))` }}>

                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                                style={{ background: `rgb(var(--space-primary))`, color: 'white' }}>2</div>
                            <span className="text-xs font-bold uppercase tracking-widest"
                                style={{ color: `rgb(var(--space-muted))` }}>Código de verificación</span>
                        </div>

                        <div className="flex items-center gap-2 mb-5 p-3 rounded-xl"
                            style={{ background: `rgba(var(--space-primary), 0.07)` }}>
                            <Mail size={14} style={{ color: `rgb(var(--space-primary))` }} />
                            <p className="text-xs" style={{ color: `rgb(var(--space-muted))` }}>
                                Código enviado a <strong style={{ color: `rgb(var(--space-text))` }}>{ADMIN_EMAIL}</strong>
                            </p>
                        </div>

                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            value={otp}
                            onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                            className="input-field text-center text-2xl font-black tracking-[0.4em] mb-4"
                            placeholder="000000"
                            autoFocus
                            autoComplete="one-time-code"
                        />

                        {error && (
                            <p className="text-xs mb-3 px-3 py-2 rounded-lg"
                                style={{ background: `rgba(var(--space-danger), 0.1)`, color: `rgb(var(--space-danger))` }}>
                                {error}
                            </p>
                        )}

                        <button type="submit" disabled={loading || otp.length !== 6}
                            className="btn-primary w-full h-11 flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={15} />}
                            Acceder
                        </button>

                        <button type="button" onClick={() => { setStep('password'); setOtp(''); setError(''); }}
                            className="w-full mt-3 text-xs font-bold transition"
                            style={{ color: `rgb(var(--space-muted))` }}>
                            ← Volver
                        </button>
                    </form>
                )}

                <p className="text-center text-[10px] mt-6"
                    style={{ color: `rgba(var(--space-muted), 0.35)` }}>
                    SPACEY RESERVE · ACCESO RESTRINGIDO
                </p>
            </div>
        </div>
    );
}
