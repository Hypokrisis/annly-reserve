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
    barber: { label: 'Barbero', icon: Scissors, color: 'text-[#9bc287]' },
    admin: { label: 'Admin', icon: Shield, color: 'text-[#f59e0b]' },
    member: { label: 'Recepcionista', icon: User, color: 'text-[#95ab8a]' },
    owner: { label: 'Dueño', icon: Shield, color: 'text-[#9bc287]' },
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
            <div className="max-w-4xl mx-auto pb-20">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-[#f0f4ee]">Equipo</h1>
                        <p className="text-[#95ab8a] text-[10px] font-bold uppercase tracking-widest mt-0.5">
                            Invita y gestiona tu staff
                        </p>
                    </div>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="h-11 px-5 rounded-full text-sm font-extrabold flex items-center gap-2 transition"
                        style={{ background: '#9bc287', color: '#22321c' }}
                    >
                        <UserPlus size={16} /> Invitar al equipo
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><LoadingSpinner /></div>
                ) : (
                    <div className="space-y-8">
                        {/* Active members */}
                        <section>
                            <h2 className="text-sm font-black uppercase tracking-wide mb-3 text-[#f0f4ee]">
                                Miembros activos ({members.length})
                            </h2>
                            {members.length === 0 ? (
                                <div className="rounded-[20px] p-8 text-center border" style={{ background: '#131c17', borderColor: '#243529' }}>
                                    <p className="text-sm text-[#95ab8a]">Aún no hay miembros activos. Invita a tu primer empleado.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {members.map(m => {
                                        const isOwner = m.user_id === (currentBusiness as any)?.owner_id;
                                        const displayRole = isOwner ? 'owner' : m.role;
                                        const meta = ROLE_META[displayRole] || ROLE_META.member;
                                        const Icon = meta.icon;
                                        return (
                                            <div key={m.user_id} className="rounded-2xl p-4 flex items-center gap-3 border"
                                                style={{ background: '#131c17', borderColor: '#243529' }}>
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                                                    style={{ background: '#1d2a23', color: '#f0f4ee' }}>
                                                    {m.name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm truncate text-[#f0f4ee]">
                                                        {m.name}
                                                        {isOwner && <span className="ml-2 text-[9px] font-extrabold uppercase tracking-widest text-[#95ab8a]">(tú)</span>}
                                                    </p>
                                                    <p className="text-[11px] text-[#95ab8a] truncate">{m.email}</p>
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
                                <h2 className="text-sm font-black uppercase tracking-wide mb-3 text-[#f0f4ee]">
                                    Invitaciones pendientes ({pendingInvites.length})
                                </h2>
                                <div className="space-y-2">
                                    {pendingInvites.map(inv => {
                                        const meta = ROLE_META[inv.role] || ROLE_META.member;
                                        return (
                                            <div key={inv.id} className="rounded-2xl p-4 flex items-center gap-3 border border-dashed"
                                                style={{ background: '#131c17', borderColor: '#243529' }}>
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                                    style={{ background: 'rgba(245,158,11,0.1)' }}>
                                                    <Clock size={16} style={{ color: '#f59e0b' }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm truncate text-[#f0f4ee]">{inv.name}</p>
                                                    <p className="text-[11px] text-[#95ab8a] truncate flex items-center gap-1">
                                                        <Mail size={10} /> {inv.email} · {meta.label}
                                                    </p>
                                                </div>
                                                <a
                                                    href={buildWhatsAppMessage(inv)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all flex-shrink-0"
                                                    style={{ background: 'rgba(155,194,135,0.1)', color: '#9bc287', border: '1px solid rgba(155,194,135,0.2)' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#9bc287'; e.currentTarget.style.color = '#22321c'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(155,194,135,0.1)'; e.currentTarget.style.color = '#9bc287'; }}
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
                            <label className="mb-1.5 ml-2 block text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#95ab8a]">Rol</label>
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
                                        className="h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2"
                                        style={{
                                            borderColor: form.role === r.id ? '#9bc287' : '#243529',
                                            background: form.role === r.id ? 'rgba(155,194,135,0.05)' : 'transparent',
                                            color: form.role === r.id ? '#9bc287' : '#95ab8a',
                                        }}
                                    >
                                        <r.icon size={16} />
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider">{r.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full h-11 rounded-full text-sm font-extrabold transition disabled:opacity-50"
                            style={{ background: '#9bc287', color: '#22321c' }}
                        >
                            {submitting ? 'Generando...' : 'Generar invitación'}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-5">
                        <div className="rounded-2xl p-4 space-y-3" style={{ background: '#1d2a23', border: '1px solid #243529' }}>
                            <div>
                                <p className="text-[9px] font-extrabold uppercase tracking-widest mb-1 text-[#95ab8a]">Enlace de activación</p>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs break-all flex-1 p-2 rounded-lg border text-[#f0f4ee]"
                                        style={{ background: '#131c17', borderColor: '#243529' }}>
                                        {buildJoinLink(createdInvite.invitation_code)}
                                    </code>
                                    <button onClick={() => copyLink(createdInvite.invitation_code)}
                                        className="p-2 flex-shrink-0 transition-opacity hover:opacity-70"
                                        style={{ color: '#9bc287' }}>
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] font-extrabold uppercase tracking-widest mb-1 text-[#95ab8a]">Contraseña temporal</p>
                                <code className="text-sm font-bold p-2 rounded-lg border inline-block text-[#f0f4ee]"
                                    style={{ background: '#131c17', borderColor: '#243529' }}>
                                    {createdInvite.temp_password}
                                </code>
                            </div>
                            <p className="text-[10px] text-[#95ab8a]">El enlace expira en 48 horas. El empleado establecerá su contraseña definitiva al activar.</p>
                        </div>

                        <a
                            href={buildWhatsAppMessage(createdInvite)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-11 rounded-full text-sm font-extrabold flex items-center justify-center gap-2 transition"
                            style={{ background: '#9bc287', color: '#22321c' }}
                        >
                            <Send size={16} /> Compartir por WhatsApp
                        </a>
                        <button
                            onClick={closeModal}
                            className="w-full h-11 rounded-full text-sm font-bold border transition"
                            style={{ borderColor: '#243529', color: '#95ab8a' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#9bc287'; e.currentTarget.style.color = '#9bc287'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#243529'; e.currentTarget.style.color = '#95ab8a'; }}
                        >
                            Listo
                        </button>
                    </div>
                )}
            </Modal>
        </DashboardLayout>
    );
}
