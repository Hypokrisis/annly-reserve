import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { UserPlus, Scissors, Shield, User, Send, Copy, Check, Clock, Mail } from 'lucide-react';

interface Invitation {
    id: string;
    email: string;
    name: string;
    role: string;
    invitation_code: string;
    temp_password: string;
    expires_at: string;
    is_used: boolean;
    created_at: string;
}

interface Member {
    user_id: string;
    role: string;
    name?: string;
    email?: string;
}

const ROLE_META: Record<string, { label: string; icon: typeof Scissors; color: string }> = {
    barber: { label: 'Barbero', icon: Scissors, color: 'text-space-primary' },
    admin: { label: 'Admin', icon: Shield, color: 'text-space-yellow' },
    member: { label: 'Recepcionista', icon: User, color: 'text-space-muted' },
    owner: { label: 'Dueño', icon: Shield, color: 'text-space-primary' },
};

export default function TeamPage() {
    const { currentBusiness } = useAuth();
    const toast = useToast();

    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', role: 'barber', phone: '' });
    const [submitting, setSubmitting] = useState(false);
    const [createdInvite, setCreatedInvite] = useState<Invitation | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (currentBusiness?.id) load();
    }, [currentBusiness?.id]);

    const load = async () => {
        if (!currentBusiness?.id) return;
        setLoading(true);
        try {
            const [invRes, barbRes] = await Promise.all([
                supabase.from('staff_invitations')
                    .select('*')
                    .eq('business_id', currentBusiness.id)
                    .order('created_at', { ascending: false }),
                supabase.from('barbers')
                    .select('user_id, name, email')
                    .eq('business_id', currentBusiness.id)
                    .eq('is_active', true)
                    .not('user_id', 'is', null),
            ]);
            setInvitations(invRes.data || []);
            setMembers((barbRes.data || []).map(b => ({
                user_id: b.user_id!, role: 'barber', name: b.name, email: b.email,
            })));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const genTempPassword = () =>
        Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 4).toUpperCase();

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim()) {
            toast.error('Nombre y email son requeridos.');
            return;
        }
        if (!currentBusiness?.id) return;
        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const tempPassword = genTempPassword();
            const { data, error } = await supabase
                .from('staff_invitations')
                .insert({
                    business_id: currentBusiness.id,
                    name: form.name.trim(),
                    email: form.email.trim().toLowerCase(),
                    role: form.role,
                    phone: form.phone.trim() || null,
                    temp_password: tempPassword,
                    created_by: user?.id,
                })
                .select()
                .single();

            if (error) throw error;

            // Auto-create barber record so slot availability works immediately
            if (form.role === 'barber') {
                const { data: existing } = await supabase
                    .from('barbers')
                    .select('id')
                    .eq('business_id', currentBusiness.id)
                    .ilike('email', form.email.trim())
                    .maybeSingle();
                if (!existing) {
                    await supabase.from('barbers').insert({
                        business_id: currentBusiness.id,
                        name: form.name.trim(),
                        email: form.email.trim().toLowerCase(),
                        phone: form.phone.trim() || null,
                        is_active: true,
                    });
                }
            }

            setCreatedInvite(data);
            await load();
        } catch (e: any) {
            toast.error(e.message || 'No se pudo crear la invitación.');
        } finally {
            setSubmitting(false);
        }
    };

    const buildJoinLink = (code: string) => `${window.location.origin}/join?code=${code}`;

    const buildWhatsAppMessage = (inv: Invitation) => {
        const link = buildJoinLink(inv.invitation_code);
        const msg = `Hola ${inv.name}! Te invité a unirte a ${currentBusiness?.name} en Spacey.\n\nActiva tu cuenta aquí:\n${link}\n\nTu contraseña temporal: ${inv.temp_password}\n\nEl enlace expira en 48 horas.`;
        return `https://wa.me/?text=${encodeURIComponent(msg)}`;
    };

    const closeModal = () => {
        setModalOpen(false);
        setCreatedInvite(null);
        setForm({ name: '', email: '', role: 'barber', phone: '' });
        setCopied(false);
    };

    const copyLink = (code: string) => {
        navigator.clipboard.writeText(buildJoinLink(code));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const pendingInvites = invitations.filter(i => !i.is_used && new Date(i.expires_at) > new Date());

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto animate-fade-up pb-20">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-black text-space-text tracking-tight">Equipo</h1>
                        <p className="text-space-muted text-[10px] font-bold uppercase tracking-widest">
                            Invita y gestiona tu staff
                        </p>
                    </div>
                    <button onClick={() => setModalOpen(true)} className="btn-primary h-11 px-5 gap-2">
                        <UserPlus size={16} /> Invitar al equipo
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><LoadingSpinner /></div>
                ) : (
                    <div className="space-y-8">
                        {/* Active members */}
                        <section>
                            <h2 className="text-sm font-black text-space-text uppercase tracking-wide mb-3">
                                Miembros activos ({members.length})
                            </h2>
                            {members.length === 0 ? (
                                <div className="bg-space-card border border-space-border rounded-2xl p-8 text-center">
                                    <p className="text-space-muted text-sm">Aún no hay miembros activos. Invita a tu primer empleado.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {members.map(m => {
                                        const isOwner = m.user_id === (currentBusiness as any)?.owner_id;
                                        const displayRole = isOwner ? 'owner' : m.role;
                                        const meta = ROLE_META[displayRole] || ROLE_META.member;
                                        const Icon = meta.icon;
                                        return (
                                            <div key={m.user_id} className="bg-space-card border border-space-border rounded-2xl p-4 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-space-card2 flex items-center justify-center text-sm font-bold text-space-text flex-shrink-0">
                                                    {m.name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-space-text text-sm truncate">
                                                        {m.name}
                                                        {isOwner && <span className="ml-2 text-[9px] font-extrabold uppercase tracking-widest text-space-muted">(tú)</span>}
                                                    </p>
                                                    <p className="text-[11px] text-space-muted truncate">{m.email}</p>
                                                </div>
                                                <span className={`flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider ${meta.color}`}>
                                                    <Icon size={12} /> {meta.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {/* Pending invitations */}
                        {pendingInvites.length > 0 && (
                            <section>
                                <h2 className="text-sm font-black text-space-text uppercase tracking-wide mb-3">
                                    Invitaciones pendientes ({pendingInvites.length})
                                </h2>
                                <div className="space-y-2">
                                    {pendingInvites.map(inv => {
                                        const meta = ROLE_META[inv.role] || ROLE_META.member;
                                        return (
                                            <div key={inv.id} className="bg-space-card border border-space-border/60 border-dashed rounded-2xl p-4 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-space-yellow/10 flex items-center justify-center flex-shrink-0">
                                                    <Clock size={16} className="text-space-yellow" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-space-text text-sm truncate">{inv.name}</p>
                                                    <p className="text-[11px] text-space-muted truncate flex items-center gap-1">
                                                        <Mail size={10} /> {inv.email} · {meta.label}
                                                    </p>
                                                </div>
                                                <a
                                                    href={buildWhatsAppMessage(inv)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-space-primary/10 text-space-primary text-[10px] font-extrabold uppercase tracking-wider hover:bg-space-primary hover:text-space-card transition-all flex-shrink-0"
                                                >
                                                    <Send size={12} /> WhatsApp
                                                </a>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>

            {/* Invite Modal */}
            <Modal isOpen={modalOpen} onClose={closeModal} title={createdInvite ? '¡Invitación creada!' : 'Invitar al equipo'}>
                {!createdInvite ? (
                    <form onSubmit={handleCreate} className="space-y-4">
                        <Input
                            label="Nombre del empleado"
                            value={form.name}
                            onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="Ej: Pacheco"
                            required
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                            placeholder="pacheco@email.com"
                            required
                        />
                        <Input
                            label="Teléfono (opcional)"
                            type="tel"
                            value={form.phone}
                            onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                            placeholder="787-555-1234"
                        />
                        <div>
                            <label className="input-label">Rol</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'barber', label: 'Barbero', icon: Scissors },
                                    { id: 'member', label: 'Recepción', icon: User },
                                    { id: 'admin', label: 'Admin', icon: Shield },
                                ].map(r => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => setForm(p => ({ ...p, role: r.id }))}
                                        className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                                            form.role === r.id
                                                ? 'border-space-primary bg-space-primary/5 text-space-primary'
                                                : 'border-space-border text-space-muted hover:border-space-primary/40'
                                        }`}
                                    >
                                        <r.icon size={16} />
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider">{r.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button type="submit" disabled={submitting} className="btn-primary w-full h-11">
                            {submitting ? 'Generando...' : 'Generar invitación'}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-5">
                        <div className="bg-space-card2/50 rounded-2xl p-4 space-y-3">
                            <div>
                                <p className="text-[9px] font-extrabold uppercase tracking-widest text-space-muted mb-1">Enlace de activación</p>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs text-space-text break-all flex-1 bg-space-card rounded-lg p-2 border border-space-border/50">
                                        {buildJoinLink(createdInvite.invitation_code)}
                                    </code>
                                    <button onClick={() => copyLink(createdInvite.invitation_code)} className="p-2 text-space-primary hover:opacity-70 flex-shrink-0">
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] font-extrabold uppercase tracking-widest text-space-muted mb-1">Contraseña temporal</p>
                                <code className="text-sm font-bold text-space-text bg-space-card rounded-lg p-2 border border-space-border/50 inline-block">
                                    {createdInvite.temp_password}
                                </code>
                            </div>
                            <p className="text-[10px] text-space-muted">El enlace expira en 48 horas. El empleado establecerá su contraseña definitiva al activar.</p>
                        </div>

                        <a
                            href={buildWhatsAppMessage(createdInvite)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary w-full h-11 gap-2"
                        >
                            <Send size={16} /> Compartir por WhatsApp
                        </a>
                        <button onClick={closeModal} className="btn-secondary w-full h-11">
                            Listo
                        </button>
                    </div>
                )}
            </Modal>
        </DashboardLayout>
    );
}
