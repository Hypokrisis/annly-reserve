import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { checkSuperAdminSession, clearSuperAdminSession } from './SuperAdminLoginPage';
import {
    Loader2, RefreshCw, CalendarPlus, Building2, TrendingUp, AlertTriangle,
    CheckCircle2, Ban, Trash2, X, ExternalLink, LogOut, ChevronRight,
    Scissors, Users, Calendar, Globe
} from 'lucide-react';

const ADMIN_EMAIL = 'loann.santiago@gmail.com';

interface BusinessRow {
    business_id: string;
    business_name: string;
    owner_email: string;
    tier_id: string;
    sub_status: string;
    current_period_end: string | null;
    days_remaining: number | null;
    stripe_customer_id: string | null;
    created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function statusBadge(row: BusinessRow) {
    if (!row.sub_status || row.sub_status === 'none') return { label: 'Sin suscripción', color: 'text-gray-400 bg-gray-400/10' };
    if (row.sub_status === 'active') return { label: 'Activo', color: 'text-green-400 bg-green-400/10' };
    if (row.sub_status === 'past_due') return { label: 'Pago vencido', color: 'text-red-400 bg-red-400/10' };
    if (row.sub_status === 'canceled') return { label: 'Cancelado', color: 'text-gray-400 bg-gray-400/10' };
    if (row.sub_status === 'trialing') {
        return (row.days_remaining ?? 0) < 0
            ? { label: 'Trial expirado', color: 'text-orange-400 bg-orange-400/10' }
            : { label: 'Trial activo', color: 'text-blue-400 bg-blue-400/10' };
    }
    return { label: row.sub_status, color: 'text-gray-400 bg-gray-400/10' };
}

const PLAN_LABEL: Record<string, string> = {
    starter: 'Starter $19', essential: 'Essential $39', premium: 'Premium $79', none: '—'
};

// ── Confirm modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ msg, onConfirm, onCancel }: { msg: string; onConfirm: () => void; onCancel: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="max-w-sm w-full mx-4 rounded-2xl p-7 shadow-2xl"
                style={{ background: 'rgb(var(--space-card))', border: '1px solid rgb(var(--space-border))' }}>
                <p className="font-bold text-space-text mb-6 leading-relaxed">{msg}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl border border-space-border text-space-muted text-sm font-bold hover:text-space-text transition">
                        Cancelar
                    </button>
                    <button onClick={onConfirm}
                        className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-black hover:bg-red-600 transition">
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Extend modal ───────────────────────────────────────────────────────────────
function ExtendModal({ biz, onClose, onSuccess }: { biz: BusinessRow; onClose: () => void; onSuccess: () => void }) {
    const [days, setDays] = useState(14);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');
    const handle = async () => {
        setLoading(true); setErr('');
        const { error } = await supabase.rpc('extend_business_trial', { p_business_id: biz.business_id, p_days: days });
        if (error) { setErr(error.message); setLoading(false); return; }
        onSuccess(); onClose();
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="max-w-sm w-full mx-4 rounded-2xl p-7 shadow-2xl"
                style={{ background: 'rgb(var(--space-card))', border: '1px solid rgb(var(--space-border))' }}>
                <h3 className="font-black text-lg text-space-text mb-1">Extender Trial</h3>
                <p className="text-space-muted text-sm mb-5">{biz.business_name} · {biz.owner_email}</p>
                <label className="block text-xs font-bold uppercase tracking-widest text-space-muted mb-2">Días a agregar</label>
                <div className="flex gap-2 mb-2">
                    {[7, 14, 30].map(d => (
                        <button key={d} onClick={() => setDays(d)}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${days === d ? 'bg-space-primary text-white' : 'bg-space-bg text-space-muted hover:text-space-text'}`}>
                            {d}d
                        </button>
                    ))}
                </div>
                <input type="number" min={1} max={365} value={days}
                    onChange={e => setDays(Math.max(1, Math.min(365, +e.target.value)))}
                    className="input-field mb-4" />
                {err && <p className="text-red-400 text-xs mb-3">{err}</p>}
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-space-border text-space-muted text-sm font-bold hover:text-space-text transition">Cancelar</button>
                    <button onClick={handle} disabled={loading}
                        className="flex-1 py-2.5 rounded-xl bg-space-primary text-white text-sm font-black flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <CalendarPlus size={14} />} Extender
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Detail modal ───────────────────────────────────────────────────────────────
function DetailModal({ biz, onClose }: { biz: BusinessRow; onClose: () => void }) {
    const [detail, setDetail] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.rpc('get_business_detail_admin', { p_id: biz.business_id })
            .then(({ data }) => { setDetail(data); setLoading(false); });
    }, [biz.business_id]);

    const b = detail?.business;
    const slug = b?.slug;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
            <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
                style={{ background: 'rgb(var(--space-card))', border: '1px solid rgb(var(--space-border))' }}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-space-border">
                    <h3 className="font-black text-space-text">{biz.business_name}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70 transition text-space-muted"><X size={16} /></button>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-space-primary" /></div>
                ) : (
                    <div className="p-6 space-y-5">
                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { icon: Users, label: 'Barberos', val: detail?.barbers ?? 0 },
                                { icon: Scissors, label: 'Servicios', val: detail?.services ?? 0 },
                                { icon: Calendar, label: 'Citas este mes', val: detail?.apts_month ?? 0 },
                                { icon: Calendar, label: 'Citas total', val: detail?.apts_total ?? 0 },
                            ].map(({ icon: Icon, label, val }) => (
                                <div key={label} className="rounded-xl p-3 text-center"
                                    style={{ background: 'rgb(var(--space-bg))', border: '1px solid rgb(var(--space-border))' }}>
                                    <Icon size={14} className="mx-auto mb-1 text-space-primary" />
                                    <p className="text-xl font-black text-space-text">{val}</p>
                                    <p className="text-[10px] text-space-muted mt-0.5">{label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Info */}
                        <div className="space-y-2 text-sm">
                            {[
                                ['Owner', biz.owner_email],
                                ['Slug', b?.slug || '—'],
                                ['Plan', PLAN_LABEL[biz.tier_id] || biz.tier_id],
                                ['Status sub.', biz.sub_status],
                                ['is_active', b?.is_active ? 'Sí' : 'No — SUSPENDIDO'],
                                ['Creado', b?.created_at ? new Date(b.created_at).toLocaleDateString('es-PR') : '—'],
                                ['Stripe Customer', biz.stripe_customer_id || '—'],
                            ].map(([k, v]) => (
                                <div key={k} className="flex items-center justify-between py-1.5 border-b border-space-border/40">
                                    <span className="text-space-muted text-xs font-medium">{k}</span>
                                    <span className={`text-xs font-bold ${v?.toString().includes('SUSPENDIDO') ? 'text-red-400' : 'text-space-text'}`}>{v}</span>
                                </div>
                            ))}
                        </div>

                        {/* Links */}
                        <div className="flex gap-2 pt-1">
                            {slug && (
                                <>
                                    <a href={`/business/${slug}`} target="_blank" rel="noreferrer"
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border border-space-border text-space-muted hover:text-space-text transition">
                                        <Globe size={13} /> Perfil público
                                    </a>
                                    <a href={`/book/${slug}`} target="_blank" rel="noreferrer"
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-space-primary/10 text-space-primary hover:bg-space-primary/20 transition">
                                        <ExternalLink size={13} /> Página de reservas
                                    </a>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main page ──────────────────────────────────────────────────────────────────
type Modal =
    | { type: 'extend'; biz: BusinessRow }
    | { type: 'detail'; biz: BusinessRow }
    | { type: 'confirm'; msg: string; onConfirm: () => void };

export default function SuperAdminPage() {
    const navigate = useNavigate();
    const [authReady, setAuthReady] = useState(false);
    const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modal, setModal] = useState<Modal | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // ── Session + email guard ──────────────────────────────────────────────────
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            const isAdmin = session?.user?.email === ADMIN_EMAIL;
            const hasSession = checkSuperAdminSession();
            if (!isAdmin || !hasSession) {
                navigate('/superadmin/login', { replace: true });
            } else {
                setAuthReady(true);
            }
        });
    }, [navigate]);

    const fetchData = useCallback(async () => {
        setLoading(true); setError('');
        const { data, error: e } = await supabase.rpc('get_all_businesses_admin');
        if (e) setError(e.message);
        else setBusinesses((data as BusinessRow[]) || []);
        setLoading(false);
    }, []);

    useEffect(() => { if (authReady) fetchData(); }, [authReady, fetchData]);

    const rpc = async (fn: string, args: object, successMsg?: string) => {
        setActionLoading(fn);
        const { error: e } = await supabase.rpc(fn, args);
        setActionLoading(null);
        if (e) { alert(e.message); return; }
        if (successMsg) alert(successMsg);
        fetchData();
    };

    const confirmThen = (msg: string, onConfirm: () => void) =>
        setModal({ type: 'confirm', msg, onConfirm });

    const handleLogout = () => {
        clearSuperAdminSession();
        navigate('/superadmin/login', { replace: true });
    };

    if (!authReady) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(var(--space-bg))' }}>
            <Loader2 size={28} className="animate-spin text-space-primary" />
        </div>
    );

    // ── Metrics ────────────────────────────────────────────────────────────────
    const total    = businesses.length;
    const active   = businesses.filter(b => b.sub_status === 'active').length;
    const trialing = businesses.filter(b => b.sub_status === 'trialing' && (b.days_remaining ?? 0) >= 0).length;
    const expired  = businesses.filter(b => b.sub_status !== 'active' && (b.days_remaining ?? 1) < 0).length;

    const METRICS = [
        { label: 'Total negocios',  value: total,    icon: Building2,    color: 'text-space-primary', bg: 'bg-space-primary/10' },
        { label: 'Activos (pagan)', value: active,   icon: CheckCircle2, color: 'text-green-400',     bg: 'bg-green-400/10' },
        { label: 'En trial',        value: trialing, icon: TrendingUp,   color: 'text-blue-400',      bg: 'bg-blue-400/10' },
        { label: 'Expirados',       value: expired,  icon: AlertTriangle,color: 'text-orange-400',    bg: 'bg-orange-400/10' },
    ];

    return (
        <div className="min-h-screen p-8 font-sans" style={{ background: 'rgb(var(--space-bg))', color: 'rgb(var(--space-text))' }}>

            {/* Modals */}
            {modal?.type === 'confirm' && (
                <ConfirmModal msg={modal.msg} onConfirm={() => { modal.onConfirm(); setModal(null); }} onCancel={() => setModal(null)} />
            )}
            {modal?.type === 'extend' && (
                <ExtendModal biz={modal.biz} onClose={() => setModal(null)} onSuccess={fetchData} />
            )}
            {modal?.type === 'detail' && (
                <DetailModal biz={modal.biz} onClose={() => setModal(null)} />
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-space-primary mb-1">Superadmin</div>
                    <h1 className="text-2xl font-black tracking-tight">Panel de Control</h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchData} disabled={loading}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-space-border text-space-muted hover:text-space-text text-xs font-bold uppercase tracking-widest transition disabled:opacity-40">
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
                    </button>
                    <button onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-space-border text-red-400 hover:bg-red-400/10 text-xs font-bold uppercase tracking-widest transition">
                        <LogOut size={13} /> Salir
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                {METRICS.map(m => (
                    <div key={m.label} className="rounded-2xl p-5 flex items-center gap-4"
                        style={{ background: 'rgb(var(--space-card))', border: '1px solid rgb(var(--space-border))' }}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${m.bg}`}>
                            <m.icon size={18} className={m.color} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-space-text leading-none">{m.value}</p>
                            <p className="text-[11px] text-space-muted mt-0.5">{m.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden"
                style={{ background: 'rgb(var(--space-card))', border: '1px solid rgb(var(--space-border))' }}>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={24} className="animate-spin text-space-primary" />
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center py-20 text-red-400 gap-2">
                        <AlertTriangle size={18} /> {error}
                    </div>
                ) : businesses.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-space-muted gap-2">
                        <Building2 size={18} /> Sin negocios registrados
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-space-border">
                                {['Negocio', 'Owner', 'Plan', 'Status', 'Días', 'Acciones'].map(h => (
                                    <th key={h} className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-space-muted">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {businesses.map((b, i) => {
                                const { label, color } = statusBadge(b);
                                const isLast = i === businesses.length - 1;
                                const isLoading = (fn: string) => actionLoading === `${fn}_${b.business_id}`;
                                return (
                                    <tr key={b.business_id}
                                        className={`transition hover:bg-space-border/20 ${!isLast ? 'border-b border-space-border/50' : ''}`}>

                                        {/* Name → opens detail */}
                                        <td className="px-4 py-3">
                                            <button onClick={() => setModal({ type: 'detail', biz: b })}
                                                className="flex items-center gap-1.5 font-bold text-space-text hover:text-space-primary transition group">
                                                {b.business_name}
                                                <ChevronRight size={12} className="opacity-0 group-hover:opacity-60 transition" />
                                            </button>
                                        </td>

                                        <td className="px-4 py-3 text-space-muted text-xs">{b.owner_email || '—'}</td>

                                        <td className="px-4 py-3 text-space-muted text-xs">{PLAN_LABEL[b.tier_id] || b.tier_id}</td>

                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${color}`}>
                                                {label}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3">
                                            {b.days_remaining !== null ? (
                                                <span className={`font-black text-sm ${b.days_remaining < 0 ? 'text-orange-400' : b.days_remaining <= 3 ? 'text-yellow-400' : 'text-space-muted'}`}>
                                                    {b.days_remaining < 0 ? `${b.days_remaining}d` : `+${b.days_remaining}d`}
                                                </span>
                                            ) : '—'}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {/* Extend trial */}
                                                <ActionBtn icon={CalendarPlus} label="Extender"
                                                    color="text-space-primary hover:bg-space-primary/10"
                                                    onClick={() => setModal({ type: 'extend', biz: b })} />

                                                {/* Suspend / Unsuspend — only if we know is_active state from detail */}
                                                <ActionBtn icon={Ban} label="Revocar trial"
                                                    color="text-yellow-400 hover:bg-yellow-400/10"
                                                    loading={isLoading('revoke')}
                                                    onClick={() => confirmThen(
                                                        `¿Revocar el trial de "${b.business_name}"? El dashboard quedará bloqueado de inmediato.`,
                                                        () => rpc('revoke_business_trial_admin', { p_id: b.business_id })
                                                    )} />

                                                <ActionBtn icon={Ban} label="Suspender"
                                                    color="text-orange-400 hover:bg-orange-400/10"
                                                    loading={isLoading('suspend')}
                                                    onClick={() => confirmThen(
                                                        `¿Suspender "${b.business_name}"? La página pública quedará inaccesible.`,
                                                        () => rpc('suspend_business_admin', { p_id: b.business_id })
                                                    )} />

                                                <ActionBtn icon={CheckCircle2} label="Activar"
                                                    color="text-green-400 hover:bg-green-400/10"
                                                    onClick={() => rpc('unsuspend_business_admin', { p_id: b.business_id })} />

                                                <ActionBtn icon={Trash2} label="Eliminar"
                                                    color="text-red-400 hover:bg-red-400/10"
                                                    loading={isLoading('delete')}
                                                    onClick={() => confirmThen(
                                                        `⚠️ ELIMINAR "${b.business_name}" permanentemente. Esto borra TODOS sus datos: citas, clientes, barberos, servicios. Esta acción NO se puede deshacer.`,
                                                        () => rpc('delete_business_admin', { p_id: b.business_id }, `"${b.business_name}" eliminado.`)
                                                    )} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <p className="mt-6 text-center text-[10px] text-space-muted/30 uppercase tracking-widest">
                Spacey Reserve · Superadmin · {ADMIN_EMAIL}
            </p>
        </div>
    );
}

// ── Small action button ────────────────────────────────────────────────────────
function ActionBtn({ icon: Icon, label, color, onClick, loading = false }: {
    icon: React.ElementType; label: string; color: string; onClick: () => void; loading?: boolean;
}) {
    return (
        <button onClick={onClick} disabled={loading}
            title={label}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition disabled:opacity-40 ${color}`}>
            {loading
                ? <Loader2 size={11} className="animate-spin" />
                : <Icon size={11} />
            }
            {label}
        </button>
    );
}
