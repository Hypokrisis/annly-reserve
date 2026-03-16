import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { Scissors, Users, Calendar, Settings, ArrowRight, ExternalLink, Copy, Check, Clock, TrendingUp, Award, DollarSign, PieChart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { formatCurrency } from '@/utils';

export default function DashboardHome() {
    const { business, barbers, services } = useBusiness();
    const { user, role } = useAuth();
    const [copied, setCopied] = useState(false);
    const [statsData, setStatsData] = useState({
        totalRevenue: 0,
        totalCustomers: 0,
        returningRate: 0,
        topServices: [] as { name: string; count: number; revenue: number }[],
        loading: true
    });

    useEffect(() => {
        if (!business?.id) return;
        loadAnalytics();
    }, [business?.id]);

    const loadAnalytics = async () => {
        try {
            const { data: appointments, error } = await supabase
                .from('appointments')
                .select('service_id, customer_email, status, services(name, price)')
                .eq('business_id', business?.id);

            if (error) throw error;

            const confirmed = appointments.filter(a => a.status === 'confirmed');
            
            // Revenue
            const revenue = confirmed.reduce((acc, curr) => acc + ((curr.services as any)?.price || 0), 0);
            
            // Customers & Retention
            const customerCounts = appointments.reduce((acc, curr) => {
                acc[curr.customer_email] = (acc[curr.customer_email] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            
            const totalCust = Object.keys(customerCounts).length;
            const returning = Object.values(customerCounts).filter(count => count > 1).length;
            const rate = totalCust > 0 ? (returning / totalCust) * 100 : 0;

            // Top Services
            const serviceStats = confirmed.reduce((acc, curr) => {
                const sName = (curr.services as any)?.name || 'Unknown';
                if (!acc[sName]) acc[sName] = { count: 0, revenue: 0 };
                acc[sName].count += 1;
                acc[sName].revenue += (curr.services as any)?.price || 0;
                return acc;
            }, {} as Record<string, { count: number; revenue: number }>);

            const top = Object.entries(serviceStats)
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3);

            setStatsData({
                totalRevenue: revenue,
                totalCustomers: totalCust,
                returningRate: rate,
                topServices: top,
                loading: false
            });
        } catch (err) {
            console.error('Error loading analytics', err);
            setStatsData(prev => ({ ...prev, loading: false }));
        }
    };

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

                {/* ── Brutal Insights ────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                     <div className="card p-8 bg-white border-2 border-space-primary/10 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <TrendingUp size={120} className="text-space-primary" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-6">
                                <Award size={18} className="text-space-primary" />
                                <h2 className="text-xs font-black text-space-muted uppercase tracking-[0.3em]">Top Servicios</h2>
                            </div>
                            <div className="space-y-6">
                                {statsData.loading ? (
                                    <div className="animate-pulse space-y-4">
                                        {[1,2].map(i => <div key={i} className="h-12 bg-space-bg rounded-2xl w-full" />)}
                                    </div>
                                ) : statsData.topServices.length > 0 ? (
                                    statsData.topServices.map((s, i) => (
                                        <div key={s.name} className="group">
                                            <div className="flex justify-between items-end mb-2">
                                                <div>
                                                    <p className="text-[10px] font-black text-space-primary uppercase tracking-widest mb-0.5">#{i+1} Popular</p>
                                                    <h3 className="font-black text-space-text uppercase tracking-tight">{s.name}</h3>
                                                </div>
                                                <p className="text-sm font-bold text-space-text">{s.count} citas</p>
                                            </div>
                                            <div className="w-full h-2.5 bg-space-bg rounded-full overflow-hidden border border-space-border/50">
                                                <div 
                                                    className="h-full bg-space-primary shadow-[0_0_10px_rgba(74,132,99,0.3)] transition-all duration-1000"
                                                    style={{ width: `${(s.count / statsData.topServices[0].count) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-space-muted font-bold uppercase tracking-widest">Sin datos suficientes</p>
                                )}
                            </div>
                        </div>
                     </div>

                     <div className="card p-8 bg-space-text text-white border-none shadow-2xl relative overflow-hidden">
                        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-space-primary/20 rounded-full blur-3xl"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-2">
                                    <PieChart size={18} className="text-space-primary" />
                                    <h2 className="text-xs font-black text-white/50 uppercase tracking-[0.3em]">Rendimiento</h2>
                                </div>
                                <div className="px-3 py-1 bg-space-primary/20 rounded-lg border border-space-primary/30 text-space-primary text-[10px] font-black">PRO INSIGHTS</div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Ingresos Totales</p>
                                    <p className="text-3xl font-black text-white tracking-tighter italic">
                                        {statsData.loading ? '...' : formatCurrency(statsData.totalRevenue)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Clientes Únicos</p>
                                    <p className="text-3xl font-black text-white tracking-tighter italic">
                                        {statsData.loading ? '...' : statsData.totalCustomers}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/10">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Tasa de Retención</p>
                                    <p className="text-lg font-black text-space-primary italic">{statsData.returningRate.toFixed(1)}%</p>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                     <div 
                                        className="h-full bg-space-primary transition-all duration-1000"
                                        style={{ width: `${statsData.returningRate}%` }}
                                     />
                                </div>
                                <p className="text-[9px] text-white/30 font-bold mt-3 uppercase tracking-widest leading-relaxed">
                                    {statsData.returningRate > 50 ? '¡Excelente fidelización! Tus clientes vuelven.' : 'Sigue trabajando en la experiencia para que vuelvan.'}
                                </p>
                            </div>
                        </div>
                     </div>
                </div>

                {/* ── Quick Actions ────────────────────────────── */}
                <div className="mb-12">
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
