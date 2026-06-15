import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2, RefreshCw, CalendarPlus, Building2, TrendingUp, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';

const SUPERADMIN_EMAIL = 'loann.santiago@gmail.com';

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

function getDisplayStatus(row: BusinessRow): { label: string; color: string } {
    if (row.sub_status === 'active') return { label: 'Activo', color: 'text-green-400 bg-green-400/10' };
    if (row.sub_status === 'past_due') return { label: 'Pago vencido', color: 'text-red-400 bg-red-400/10' };
    if (row.sub_status === 'canceled') return { label: 'Cancelado', color: 'text-gray-400 bg-gray-400/10' };
    if (row.sub_status === 'trialing') {
        if (row.days_remaining !== null && row.days_remaining < 0) {
            return { label: 'Trial expirado', color: 'text-orange-400 bg-orange-400/10' };
        }
        return { label: 'Trial activo', color: 'text-blue-400 bg-blue-400/10' };
    }
    return { label: row.sub_status, color: 'text-gray-400 bg-gray-400/10' };
}

function getPlanLabel(tierId: string): string {
    const map: Record<string, string> = { starter: 'Starter $19', essential: 'Essential $39', premium: 'Premium $79', none: '—' };
    return map[tierId] ?? tierId;
}

interface ExtendModalProps {
    business: BusinessRow;
    onClose: () => void;
    onSuccess: () => void;
}

function ExtendModal({ business, onClose, onSuccess }: ExtendModalProps) {
    const [days, setDays] = useState(14);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleExtend = async () => {
        setLoading(true);
        setError('');
        try {
            const { error: rpcError } = await supabase.rpc('extend_business_trial', {
                p_business_id: business.business_id,
                p_days: days,
            });
            if (rpcError) throw rpcError;
            onSuccess();
            onClose();
        } catch (e: any) {
            setError(e.message || 'Error al extender el trial');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="w-full max-w-sm rounded-2xl p-7 shadow-2xl" style={{ background: 'rgb(var(--space-card))', border: '1px solid rgb(var(--space-border))' }}>
                <h3 className="font-black text-lg text-space-text mb-1">Extender Trial</h3>
                <p className="text-space-muted text-sm mb-6">
                    <strong className="text-space-text">{business.business_name}</strong>
                    {' '}· {business.owner_email}
                </p>

                <label className="block text-xs font-bold uppercase tracking-widest text-space-muted mb-2">
                    Días a agregar
                </label>
                <div className="flex gap-2 mb-2">
                    {[7, 14, 30].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${days === d ? 'bg-space-primary text-white' : 'bg-space-bg text-space-muted hover:text-space-text'}`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
                <input
                    type="number"
                    min={1}
                    max={365}
                    value={days}
                    onChange={e => setDays(Math.max(1, Math.min(365, Number(e.target.value))))}
                    className="input-field mb-5"
                />

                {business.current_period_end && (
                    <p className="text-xs text-space-muted mb-5">
                        Nueva expiración estimada: <strong className="text-space-text">
                            {new Date(Math.max(Date.now(), new Date(business.current_period_end).getTime()) + days * 86400000).toLocaleDateString('es-PR', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </strong>
                    </p>
                )}

                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-space-border text-space-muted hover:text-space-text text-sm font-bold transition">
                        Cancelar
                    </button>
                    <button
                        onClick={handleExtend}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl bg-space-primary text-white text-sm font-black flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <CalendarPlus size={14} />}
                        Extender
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function SuperAdminPage() {
    const { user, loading: authLoading } = useAuth();
    const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [extendTarget, setExtendTarget] = useState<BusinessRow | null>(null);

    const isSuperAdmin = user?.email === SUPERADMIN_EMAIL;

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const { data, error: rpcError } = await supabase.rpc('get_all_businesses_admin');
            if (rpcError) throw rpcError;
            setBusinesses((data as BusinessRow[]) || []);
        } catch (e: any) {
            setError(e.message || 'Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isSuperAdmin) fetchData();
    }, [isSuperAdmin]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(var(--space-bg))' }}>
                <Loader2 size={28} className="animate-spin text-space-primary" />
            </div>
        );
    }

    if (!isSuperAdmin) return <Navigate to="/" replace />;

    // ── Metrics ────────────────────────────────────────────────────────────────
    const total = businesses.length;
    const active = businesses.filter(b => b.sub_status === 'active').length;
    const trialing = businesses.filter(b => b.sub_status === 'trialing' && (b.days_remaining ?? 0) >= 0).length;
    const expired = businesses.filter(b => b.sub_status !== 'active' && b.days_remaining !== null && b.days_remaining < 0).length;

    const METRICS = [
        { label: 'Total negocios', value: total, icon: Building2, color: 'text-space-primary', bg: 'bg-space-primary/10' },
        { label: 'Activos (pagando)', value: active, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
        { label: 'En trial', value: trialing, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { label: 'Expirados', value: expired, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    ];

    return (
        <div className="min-h-screen p-8 font-sans" style={{ background: 'rgb(var(--space-bg))', color: 'rgb(var(--space-text))' }}>
            {extendTarget && (
                <ExtendModal
                    business={extendTarget}
                    onClose={() => setExtendTarget(null)}
                    onSuccess={fetchData}
                />
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-space-primary mb-1">Superadmin</div>
                    <h1 className="text-2xl font-black tracking-tight">Panel de Control</h1>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-space-border text-space-muted hover:text-space-text text-xs font-bold uppercase tracking-widest transition disabled:opacity-40"
                >
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    Actualizar
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                {METRICS.map(m => (
                    <div key={m.label} className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'rgb(var(--space-card))', border: '1px solid rgb(var(--space-border))' }}>
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
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--space-card))', border: '1px solid rgb(var(--space-border))' }}>
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={24} className="animate-spin text-space-primary" />
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center py-20 text-red-400 gap-2">
                        <AlertTriangle size={18} /> {error}
                    </div>
                ) : businesses.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-space-muted">
                        <Users size={18} className="mr-2" /> Sin negocios registrados
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-space-border">
                                {['Negocio', 'Owner', 'Plan', 'Status', 'Expiración', 'Días', ''].map(h => (
                                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-space-muted">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {businesses.map((b, i) => {
                                const { label, color } = getDisplayStatus(b);
                                const isLastRow = i === businesses.length - 1;
                                return (
                                    <tr
                                        key={b.business_id}
                                        className={`transition hover:bg-space-border/20 ${!isLastRow ? 'border-b border-space-border/50' : ''}`}
                                    >
                                        <td className="px-5 py-4 font-bold text-space-text">{b.business_name}</td>
                                        <td className="px-5 py-4 text-space-muted text-xs">{b.owner_email || '—'}</td>
                                        <td className="px-5 py-4 text-space-muted text-xs">{getPlanLabel(b.tier_id)}</td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${color}`}>
                                                {label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-space-muted text-xs">
                                            {b.current_period_end
                                                ? new Date(b.current_period_end).toLocaleDateString('es-PR', { year: 'numeric', month: 'short', day: 'numeric' })
                                                : '—'
                                            }
                                        </td>
                                        <td className="px-5 py-4">
                                            {b.days_remaining !== null ? (
                                                <span className={`font-black text-sm ${b.days_remaining < 0 ? 'text-orange-400' : b.days_remaining <= 3 ? 'text-yellow-400' : 'text-space-muted'}`}>
                                                    {b.days_remaining < 0 ? `${b.days_remaining}d` : `+${b.days_remaining}d`}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-5 py-4">
                                            <button
                                                onClick={() => setExtendTarget(b)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-space-primary hover:bg-space-primary/10 transition"
                                            >
                                                <CalendarPlus size={12} /> Extender
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <p className="mt-6 text-center text-[10px] text-space-muted/30 uppercase tracking-widest">
                Spacey Reserve · Superadmin · {user?.email}
            </p>
        </div>
    );
}
