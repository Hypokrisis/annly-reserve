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
                    <h1 className="page-title text-3xl">
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
                <div className="rounded-[2rem] bg-space-text p-6 md:p-8 mb-8 relative overflow-hidden shadow-card-lg border border-space-border/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-space-primary/20 rounded-full blur-3xl -mr-10 -mt-10" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-space-primary/20 rounded-full blur-3xl -ml-10 -mb-10" />
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Tu Página de Reservas</h2>
                        <p className="text-space-border text-sm mb-6 max-w-xl leading-relaxed">Comparte este link en Instagram, WhatsApp o tu web para que tus clientes reserven al instante.</p>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-sm text-white/90 font-mono truncate shadow-inner">
                                {window.location.origin}/book/{business?.slug}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopyLink}
                                    className="flex items-center gap-2 px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-sm font-semibold transition"
                                >
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                    {copied ? 'Copiado' : 'Copiar'}
                                </button>
                                <a
                                    href={`/book/${business?.slug}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-5 py-3.5 bg-space-primary hover:bg-space-primary-dark text-white rounded-xl text-sm font-bold shadow-btn transition"
                                >
                                    <ExternalLink size={16} />
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
                                <div className={`w-12 h-12 bg-space-card2 rounded-xl flex items-center justify-center mb-4 transition-all ${ring}`}>
                                    <Icon size={24} className={`text-space-primary transition-colors ${color}`} />
                                </div>
                                <h3 className="font-bold text-space-text text-base mb-1">{label}</h3>
                                <p className="text-xs text-space-muted mb-4">{desc}</p>
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
