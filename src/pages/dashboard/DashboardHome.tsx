import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { Scissors, Users, Calendar, Settings, ArrowRight, ExternalLink, Copy, Check, Clock } from 'lucide-react';
import { useState } from 'react';

export default function DashboardHome() {
    const { business, barbers, services } = useBusiness();
    const { user, role } = useAuth();
    const [copied, setCopied] = useState(false);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/book/${business?.slug}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const stats = [
        {
            label: 'Servicios Activos',
            value: services.length,
            icon: Scissors,
            iconBg: 'bg-space-primary-light',
            iconColor: 'text-space-primary',
            sub: `${services.length} configurados`,
        },
        {
            label: 'Profesionales',
            value: barbers.filter(b => b.is_active).length,
            icon: Users,
            iconBg: 'bg-emerald-100',
            iconColor: 'text-emerald-600',
            sub: `${barbers.length} en total`,
        },
        {
            label: 'Negocio',
            value: business?.name || '–',
            icon: Settings,
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
            sub: business?.address || 'Sin dirección',
            isText: true,
        },
    ];

    const quickActions = [
        { to: '/dashboard/services',     icon: Scissors, label: 'Servicios',   desc: 'Precios y duración',   color: 'group-hover:text-space-primary',   ring: 'group-hover:ring-space-primary/40' },
        { to: '/dashboard/barbers',      icon: Users,    label: 'Equipo',      desc: 'Añade barberos',        color: 'group-hover:text-emerald-600',     ring: 'group-hover:ring-emerald-400/40' },
        { to: '/dashboard/schedules',    icon: Clock,    label: 'Horarios',    desc: 'Define disponibilidad', color: 'group-hover:text-violet-600',      ring: 'group-hover:ring-violet-400/40' },
        { to: '/dashboard/appointments', icon: Calendar, label: 'Citas',       desc: 'Ver agenda del día',    color: 'group-hover:text-amber-600',       ring: 'group-hover:ring-amber-400/40' },
    ];

    return (
        <DashboardLayout>
            <div className="animate-fade-up">

                {/* ── Header ──────────────────────────────────── */}
                <div className="mb-8">
                    <h1 className="page-title">
                        Hola, <span className="text-space-primary">{user?.email?.split('@')[0]}</span> 👋
                    </h1>
                    <p className="page-subtitle flex items-center gap-2 mt-1">
                        Rol actual:
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-space-primary-light text-space-primary capitalize ml-1">
                            {role}
                        </span>
                    </p>
                </div>

                {/* ── Stats ───────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                    {stats.map((s) => {
                        const Icon = s.icon;
                        return (
                            <div key={s.label} className="card p-6 hover:shadow-card-lg transition-shadow duration-200">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-sm font-medium text-space-muted">{s.label}</p>
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.iconBg}`}>
                                        <Icon size={18} className={s.iconColor} />
                                    </div>
                                </div>
                                {s.isText ? (
                                    <p className="text-lg font-bold text-space-text truncate">{s.value}</p>
                                ) : (
                                    <p className="text-3xl font-bold text-space-text">{s.value}</p>
                                )}
                                <p className="text-xs text-space-muted mt-1 truncate">{s.sub}</p>
                            </div>
                        );
                    })}
                </div>

                {/* ── Public Link Banner ──────────────────────── */}
                <div className="rounded-2xl bg-space-primary p-6 md:p-8 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-12 -mt-12" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-8 -mb-8" />
                    <div className="relative">
                        <h2 className="text-lg font-bold text-white mb-1">Tu Página de Reservas</h2>
                        <p className="text-white/70 text-sm mb-5">Comparte este link en Instagram, WhatsApp o tu web</p>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white/90 font-mono truncate">
                                {window.location.origin}/book/{business?.slug}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopyLink}
                                    className="flex items-center gap-2 px-4 py-3 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl text-sm font-semibold transition"
                                >
                                    {copied ? <Check size={15} /> : <Copy size={15} />}
                                    {copied ? 'Copiado' : 'Copiar'}
                                </button>
                                <a
                                    href={`/book/${business?.slug}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-3 bg-white text-space-primary rounded-xl text-sm font-bold transition hover:bg-white/90"
                                >
                                    <ExternalLink size={15} />
                                    Visitar
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Quick Actions ────────────────────────────── */}
                <div>
                    <h2 className="text-base font-bold text-space-text mb-4 flex items-center gap-2">
                        <span className="w-1 h-5 bg-space-primary rounded-full inline-block" />
                        Acciones Rápidas
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {quickActions.map(({ to, icon: Icon, label, desc, color, ring }) => (
                            <Link
                                key={to} to={to}
                                className="card-hover p-5 group ring-1 ring-transparent transition-all duration-200"
                            >
                                <div className={`w-10 h-10 bg-space-bg rounded-xl flex items-center justify-center mb-4 ring-2 ring-transparent transition-all ${ring}`}>
                                    <Icon size={20} className={`text-space-muted transition-colors ${color}`} />
                                </div>
                                <h3 className="font-bold text-space-text text-sm mb-1">{label}</h3>
                                <p className="text-xs text-space-muted mb-3">{desc}</p>
                                <div className="flex items-center text-xs font-semibold text-space-primary opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                                    Gestionar <ArrowRight size={12} className="ml-1" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
