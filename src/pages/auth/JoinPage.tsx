import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Input } from '@/components/common/Input';
import { Scissors, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Invitation {
    id: string;
    business_id: string;
    name: string;
    email: string;
    role: string;
    temp_password: string;
    invitation_code: string;
    expires_at: string;
    is_used: boolean;
    businesses: { name: string } | null;
}

const ROLE_LABELS: Record<string, string> = {
    barber: 'Barbero',
    admin: 'Administrador',
    member: 'Recepcionista',
};

export default function JoinPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const code = params.get('code');

    const [loading, setLoading] = useState(true);
    const [invitation, setInvitation] = useState<Invitation | null>(null);
    const [fatalError, setFatalError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!code) {
            setFatalError('Enlace de activación inválido.');
            setLoading(false);
            return;
        }
        loadInvitation(code);
    }, [code]);

    const loadInvitation = async (invCode: string) => {
        try {
            const { data, error } = await supabase
                .from('staff_invitations')
                .select('*, businesses(name)')
                .eq('invitation_code', invCode)
                .maybeSingle();

            if (error) throw error;
            if (!data) { setFatalError('Invitación no encontrada.'); return; }
            if (data.is_used) { setFatalError('Esta invitación ya fue utilizada.'); return; }
            if (new Date(data.expires_at) < new Date()) { setFatalError('Esta invitación ha expirado. Pide una nueva al administrador.'); return; }

            setInvitation(data as Invitation);
        } catch (e: any) {
            setFatalError(e.message || 'Error al cargar la invitación.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invitation) return;
        setFormError(null);

        if (password.length < 6) { setFormError('La contraseña debe tener al menos 6 caracteres.'); return; }
        if (password !== confirmPassword) { setFormError('Las contraseñas no coinciden.'); return; }

        setSubmitting(true);
        try {
            let userId: string;

            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: invitation.email,
                password,
            });

            if (signUpError) {
                const msg = signUpError.message.toLowerCase();
                if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('email already')) {
                    // User exists — authenticate with temp password, then update
                    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                        email: invitation.email,
                        password: invitation.temp_password,
                    });
                    if (signInError) throw new Error('El email ya está registrado. Contacta al administrador.');
                    userId = signInData.user.id;
                    await supabase.auth.updateUser({ password });
                } else {
                    throw signUpError;
                }
            } else {
                if (!signUpData.user) throw new Error('No se pudo crear la cuenta. Intenta de nuevo.');
                userId = signUpData.user.id;
            }

            // Link user to business with the assigned role
            const { error: ubError } = await supabase.from('users_businesses').insert({
                user_id: userId,
                business_id: invitation.business_id,
                role: invitation.role,
                is_active: true,
            });
            if (ubError && !ubError.message.includes('duplicate')) throw ubError;

            // If barber role, link user_id to the barbers record
            if (invitation.role === 'barber') {
                await supabase
                    .from('barbers')
                    .update({ user_id: userId })
                    .eq('business_id', invitation.business_id)
                    .ilike('email', invitation.email);
            }

            // Mark invitation consumed
            await supabase
                .from('staff_invitations')
                .update({ is_used: true })
                .eq('id', invitation.id);

            setDone(true);
            setTimeout(() => navigate('/staff'), 2200);
        } catch (e: any) {
            setFormError(e.message || 'Error al activar la cuenta. Intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg">
            <LoadingSpinner />
        </div>
    );

    if (fatalError) return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg px-4">
            <div className="bg-space-card border border-space-border rounded-3xl p-8 max-w-sm w-full text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
                    <AlertCircle size={24} className="text-red-400" />
                </div>
                <h1 className="text-lg font-extrabold text-space-text">Invitación inválida</h1>
                <p className="text-space-muted text-sm">{fatalError}</p>
                <a href="/" className="btn-secondary block text-center text-sm py-2.5 px-6 rounded-xl">Volver al inicio</a>
            </div>
        </div>
    );

    if (done) return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg px-4">
            <div className="bg-space-card border border-space-border rounded-3xl p-8 max-w-sm w-full text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={24} className="text-green-500" />
                </div>
                <h1 className="text-lg font-extrabold text-space-text">¡Cuenta activada!</h1>
                <p className="text-space-muted text-sm">Redirigiendo a tu panel de trabajo...</p>
                <LoadingSpinner />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg px-4 py-10">
            <div className="bg-space-card border border-space-border rounded-3xl p-8 max-w-sm w-full space-y-6 animate-fade-up">
                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-space-primary/10 flex items-center justify-center mx-auto">
                        <Scissors size={24} className="text-space-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-space-text">Activa tu cuenta</h1>
                        <p className="text-space-muted text-sm mt-1">
                            Fuiste invitado a <strong className="text-space-text">{invitation?.businesses?.name}</strong> como{' '}
                            <strong className="text-space-text">{ROLE_LABELS[invitation?.role || ''] || invitation?.role}</strong>.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Nombre"
                        value={invitation?.name || ''}
                        onChange={() => {}}
                        disabled
                    />
                    <Input
                        label="Email"
                        type="email"
                        value={invitation?.email || ''}
                        onChange={() => {}}
                        disabled
                    />
                    <Input
                        label="Nueva contraseña"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        required
                    />
                    <Input
                        label="Confirmar contraseña"
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repite la contraseña"
                        required
                    />
                    {formError && (
                        <p className="text-red-400 text-xs font-semibold flex items-center gap-1.5">
                            <AlertCircle size={12} /> {formError}
                        </p>
                    )}
                    <button type="submit" disabled={submitting} className="btn-primary w-full h-11">
                        {submitting ? 'Activando...' : 'Activar cuenta'}
                    </button>
                </form>
            </div>
        </div>
    );
}
