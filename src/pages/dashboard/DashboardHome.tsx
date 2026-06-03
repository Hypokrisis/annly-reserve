import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import {
    Scissors, Users, Calendar, Clock, TrendingUp, Award,
    Copy, Check, ArrowRight, Sparkles, BarChart3
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { formatCurrency, formatTimeDisplay } from '@/utils';

export default function DashboardHome() {
    const { business, services, barbers, subscription, monthlyAppointmentsCount } = useBusiness();
    const { role } = useAuth();
    const [copied, setCopied] = useState(false);
    const [todayApts, setTodayApts] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalRevenue: 0, totalCustomers: 0, returningRate: 0,
        revenueTrend: 0, appointmentsTrend: 0, totalAppointments: 0,
        topServices: [] as { name: string; count: number; revenue: number }[],
        topBarbers:  [] as { name: string; count: number; revenue: number }[],
        weeklyRevenue: [] as { day: string; amount: number }[],
        loading: true,
    });

    useEffect(() => {
        if (!business?.id) return;
        loadAnalytics();
        loadToday();
    }, [business?.id]);

    const loadAnalytics = async () => {
        try {
            const { data: apts } = await supabase
                .from('appointments')
                .select('service_id, barber_id, customer_email, status, appointment_date, services(name, price), barbers(name)')
                .eq('business_id', business?.id);

            const confirmed = (apts || []).filter(a => a.status === 'confirmed' || a.status === 'completed');

            const now = new Date();
            const currWeekStart = new Date(new Date().setDate(now.getDate() - now.getDay()));
            const lastWeekStart = new Date(new Date().setDate(currWeekStart.getDate() - 7));
            const cwStr = currWeekStart.toISOString().split('T')[0];
            const lwStr = lastWeekStart.toISOString().split('T')[0];

            const thisW = confirmed.filter(a => a.appointment_date >= cwStr);
            const lastW = confirmed.filter(a => a.appointment_date >= lwStr && a.appointment_date < cwStr);
            const thisWRev = thisW.reduce((s, a) => s + ((a.services as any)?.price || 0), 0);
            const lastWRev = lastW.reduce((s, a) => s + ((a.services as any)?.price || 0), 0);

            const revenue = confirmed.reduce((s, a) => s + ((a.services as any)?.price || 0), 0);
            const custCounts = (apts || []).reduce((acc, a) => { acc[a.customer_email] = (acc[a.customer_email] || 0) + 1; return acc; }, {} as Record<string, number>);
            const totalCust = Object.keys(custCounts).length;
            const returning = Object.values(custCounts).filter(n => n > 1).length;

            const svcMap = confirmed.reduce((acc, a) => {
                const n = (a.services as any)?.name || 'Otro';
                if (!acc[n]) acc[n] = { count: 0, revenue: 0 };
                acc[n].count++; acc[n].revenue += (a.services as any)?.price || 0;
                return acc;
            }, {} as Record<string, { count: number; revenue: number }>);

            const barberMap = confirmed.reduce((acc, a) => {
                const n = (a.barbers as any)?.name || 'N/A';
                if (!acc[n]) acc[n] = { count: 0, revenue: 0 };
                acc[n].count++; acc[n].revenue += (a.services as any)?.price || 0;
                return acc;
            }, {} as Record<string, { count: number; revenue: number }>);

            const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
            const weekly = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (6 - i));
                const ds = d.toISOString().split('T')[0];
                return { day: days[d.getDay()], amount: confirmed.filter(a => a.appointment_date === ds).reduce((s, a) => s + ((a.services as any)?.price || 0), 0) };
            });

            setStats({
                totalRevenue: revenue, totalCustomers: totalCust,
                returningRate: totalCust > 0 ? (returning / totalCust) * 100 : 0,
                revenueTrend: lastWRev > 0 ? ((thisWRev - lastWRev) / lastWRev) * 100 : 0,
                appointmentsTrend: lastW.length > 0 ? ((thisW.length - lastW.length) / lastW.length) * 100 : 0,
                totalAppointments: confirmed.length,
                topServices: Object.entries(svcMap).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.count - a.count).slice(0, 3),
                topBarbers: Object.entries(barberMap).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.revenue - a.revenue).slice(0, 3),
                weeklyRevenue: weekly, loading: false,
            });
        } catch { setStats(p => ({ ...p, loading: false })); }
    };

    const loadToday = async () => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
            .from('appointments')
            .select('id, customer_name, start_time, services(name), barbers(name)')
            .eq('business_id', business?.id)
            .eq('appointment_date', today)
            .eq('status', 'confirmed')
            .order('start_time')
            .limit(5);
        setTodayApts(data || []);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(`${window.location.origin}/book/${business?.slug}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const Trend = ({ value }: { value: number }) => {
        if (!value) return null;
        const up = value > 0;
        return (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: up ? `rgba(var(--space-success), 0.12)` : `rgba(var(--space-danger), 0.12)`, color: up ? `rgb(var(--space-success))` : `rgb(var(--space-danger))` }}>
                {up ? '+' : ''}{value.toFixed(0)}%
            </span>
        );
    };

    const KPI_ITEMS = [
        { label: 'Ingresos totales',   value: formatCurrency(stats.totalRevenue), trend: stats.revenueTrend, icon: BarChart3 },
        { label: 'Total de citas',     value: stats.totalAppointments, trend: stats.appointmentsTrend, icon: Calendar },
        { label: 'Clientes únicos',    value: stats.totalCustomers, icon: Users },
        { label: 'Tasa de retención',  value: `${stats.returningRate.toFixed(1)}%`, icon: TrendingUp },
    ];

    const maxWeekly = Math.max(...stats.weeklyRevenue.map(w => w.amount), 1);

    return (
        <DashboardLayout>
            <div className="animate-fade-up pb-12 space-y-8">

                {/* ── Page header ──────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight" style={{ color: `rgb(var(--space-text))` }}>
                            {business?.name || 'Mi Barbería'}
                        </h1>
                        <p className="text-xs font-medium mt-0.5 flex items-center gap-1.5" style={{ color: `rgb(var(--space-muted))` }}>
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: `rgb(var(--space-success))` }} />
                            Sistema activo · {role === 'owner' ? 'Panel de Control' : 'Vista Staff'}
                        </p>
                    </div>
                    <Link to="/dashboard/appointments" className="btn-secondary text-xs px-4 py-2.5">
                        Ver agenda <ArrowRight size={13} />
                    </Link>
                </div>

                {/* ── KPI Cards ────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {KPI_ITEMS.map(({ label, value, trend, icon: Icon }) => (
                        <div key={label} className="dash-card flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `rgb(var(--space-muted))` }}>{label}</p>
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `rgba(var(--space-primary), 0.1)` }}>
                                    <Icon size={14} style={{ color: `rgb(var(--space-primary))` }} />
                                </div>
                            </div>
                            <div className="flex items-end justify-between gap-2">
                                <p className="text-2xl font-extrabold tracking-tight" style={{ color: `rgb(var(--space-text))` }}>{value}</p>
                                {trend !== undefined && <Trend value={trend} />}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Main grid ────────────────────────────── */}
                <div className="grid xl:grid-cols-3 gap-6">

                    {/* Left: Today + Weekly bar */}
                    <div className="xl:col-span-2 space-y-6">

                        {/* Today's appointments */}
                        <div className="dash-card">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <Clock size={14} style={{ color: `rgb(var(--space-primary))` }} />
                                    <h2 className="text-sm font-bold" style={{ color: `rgb(var(--space-text))` }}>Citas de hoy</h2>
                                    {todayApts.length > 0 && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: `rgba(var(--space-primary), 0.1)`, color: `rgb(var(--space-primary))` }}>
                                            {todayApts.length}
                                        </span>
                                    )}
                                </div>
                                <Link to="/dashboard/appointments" className="text-[10px] font-bold uppercase tracking-wider transition-opacity hover:opacity-70" style={{ color: `rgb(var(--space-primary))` }}>
                                    Ver todas →
                                </Link>
                            </div>

                            {todayApts.length === 0 ? (
                                <div className="py-10 text-center rounded-xl" style={{ background: `rgba(var(--space-border), 0.3)`, border: `1.5px dashed rgb(var(--space-border))` }}>
                                    <Calendar size={24} className="mx-auto mb-2 opacity-30" style={{ color: `rgb(var(--space-muted))` }} />
                                    <p className="text-xs font-semibold" style={{ color: `rgb(var(--space-muted))` }}>Sin citas confirmadas para hoy</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {todayApts.map(apt => (
                                        <div key={apt.id} className="flex items-center gap-4 px-3 py-3 rounded-xl transition-all hover:opacity-90" style={{ background: `rgba(var(--space-primary), 0.04)`, border: `1px solid rgba(var(--space-primary), 0.1)` }}>
                                            <div className="w-12 text-center flex-shrink-0">
                                                <p className="text-[9px] font-bold uppercase" style={{ color: `rgb(var(--space-muted))` }}>{formatTimeDisplay(apt.start_time).split(' ')[1]}</p>
                                                <p className="text-base font-extrabold" style={{ color: `rgb(var(--space-text))` }}>{formatTimeDisplay(apt.start_time).split(':')[0]}</p>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold truncate" style={{ color: `rgb(var(--space-text))` }}>{apt.customer_name}</p>
                                                <p className="text-[10px] font-medium" style={{ color: `rgb(var(--space-muted))` }}>{(apt.services as any)?.name}</p>
                                            </div>
                                            <div className="text-[10px] font-semibold flex-shrink-0" style={{ color: `rgb(var(--space-muted))` }}>
                                                {(apt.barbers as any)?.name}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Weekly bar chart */}
                        <div className="dash-card">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-sm font-bold" style={{ color: `rgb(var(--space-text))` }}>Ingresos últimos 7 días</h2>
                                <Trend value={stats.revenueTrend} />
                            </div>
                            <div className="flex items-end justify-between gap-2" style={{ height: '80px' }}>
                                {stats.weeklyRevenue.map((d, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                                        <div
                                            className="w-full rounded-t-md transition-all duration-500"
                                            style={{ height: `${Math.max(4, (d.amount / maxWeekly) * 70)}px`, background: d.amount > 0 ? `rgb(var(--space-primary))` : `rgba(var(--space-border), 0.5)`, opacity: d.amount > 0 ? 1 : 0.4 }}
                                            title={formatCurrency(d.amount)}
                                        />
                                        <span className="text-[9px] font-bold" style={{ color: `rgb(var(--space-muted))` }}>{d.day}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Booking link */}
                        <div
                            className="dash-card relative overflow-hidden"
                            style={{ background: `rgb(var(--space-text))` }}
                        >
                            <div className="absolute inset-0 dot-pattern opacity-[0.03] pointer-events-none" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sparkles size={14} style={{ color: `rgb(var(--space-primary-light))` }} />
                                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `rgba(var(--space-primary-light), 0.7)` }}>Tu link de reservas</p>
                                </div>
                                <p className="text-lg font-extrabold tracking-tight mb-4" style={{ color: 'white' }}>Comparte y recibe citas 24/7</p>
                                <div className="flex gap-2">
                                    <div className="flex-1 px-4 py-2.5 rounded-xl text-xs font-mono truncate" style={{ background: `rgba(255,255,255,0.08)`, color: `rgba(255,255,255,0.6)`, border: `1px solid rgba(255,255,255,0.1)` }}>
                                        {window.location.origin}/book/{business?.slug}
                                    </div>
                                    <button
                                        onClick={handleCopy}
                                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                                        style={{ background: copied ? `rgba(var(--space-success), 0.2)` : `rgba(255,255,255,0.12)`, color: copied ? `rgb(var(--space-success))` : 'white', border: `1px solid rgba(255,255,255,0.12)` }}
                                    >
                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                        {copied ? 'Copiado' : 'Copiar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Top services, barbers, plan */}
                    <div className="space-y-6">

                        {/* Top services */}
                        <div className="dash-card">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-sm font-bold" style={{ color: `rgb(var(--space-text))` }}>Servicios top</h2>
                                <TrendingUp size={14} style={{ color: `rgb(var(--space-primary))` }} />
                            </div>
                            {stats.topServices.length === 0 ? (
                                <p className="text-xs" style={{ color: `rgb(var(--space-muted))` }}>Sin datos aún</p>
                            ) : (
                                <div className="space-y-4">
                                    {stats.topServices.map((s, idx) => (
                                        <div key={s.name}>
                                            <div className="flex justify-between text-xs font-semibold mb-1.5" style={{ color: `rgb(var(--space-text))` }}>
                                                <span className="truncate max-w-[70%]">{idx + 1}. {s.name}</span>
                                                <span style={{ color: `rgb(var(--space-muted))` }}>{s.count} citas</span>
                                            </div>
                                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `rgba(var(--space-border), 0.5)` }}>
                                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(s.count / (stats.topServices[0]?.count || 1)) * 100}%`, background: `rgb(var(--space-primary))` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Top barbers */}
                        <div className="dash-card">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-sm font-bold" style={{ color: `rgb(var(--space-text))` }}>Equipo top</h2>
                                <Award size={14} style={{ color: `rgb(var(--space-primary))` }} />
                            </div>
                            {stats.topBarbers.length === 0 ? (
                                <p className="text-xs" style={{ color: `rgb(var(--space-muted))` }}>Sin datos aún</p>
                            ) : (
                                <div className="space-y-2">
                                    {stats.topBarbers.map((b, idx) => (
                                        <div key={b.name} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: `rgba(var(--space-card2), 0.6)` }}>
                                            <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-extrabold flex-shrink-0" style={{ background: `rgba(var(--space-primary), 0.15)`, color: `rgb(var(--space-primary))` }}>
                                                {idx + 1}
                                            </div>
                                            <span className="flex-1 text-xs font-semibold truncate" style={{ color: `rgb(var(--space-text))` }}>{b.name}</span>
                                            <span className="text-xs font-bold" style={{ color: `rgb(var(--space-primary))` }}>{formatCurrency(b.revenue)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Plan usage */}
                        {role === 'owner' && (
                            <div className="dash-card">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-sm font-bold" style={{ color: `rgb(var(--space-text))` }}>Uso del plan</h2>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: `rgba(var(--space-primary), 0.1)`, color: `rgb(var(--space-primary))` }}>
                                        {subscription?.subscription_tiers?.name || 'Starter'}
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    {/* Barbers */}
                                    <div>
                                        <div className="flex justify-between text-[10px] font-semibold mb-1.5" style={{ color: `rgb(var(--space-text))` }}>
                                            <span>Barberos activos</span>
                                            <span style={{ color: `rgb(var(--space-muted))` }}>{barbers.filter(b => b.is_active).length} / {subscription?.subscription_tiers?.max_barbers || 3}</span>
                                        </div>
                                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `rgba(var(--space-border), 0.5)` }}>
                                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (barbers.filter(b => b.is_active).length / (subscription?.subscription_tiers?.max_barbers || 3)) * 100)}%`, background: `rgb(var(--space-primary))` }} />
                                        </div>
                                    </div>
                                    {/* Appointments */}
                                    <div>
                                        <div className="flex justify-between text-[10px] font-semibold mb-1.5" style={{ color: `rgb(var(--space-text))` }}>
                                            <span>Citas este mes</span>
                                            <span style={{ color: `rgb(var(--space-muted))` }}>{monthlyAppointmentsCount} / {subscription?.subscription_tiers?.max_monthly_appointments === 999999 ? '∞' : (subscription?.subscription_tiers?.max_monthly_appointments || 150)}</span>
                                        </div>
                                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `rgba(var(--space-border), 0.5)` }}>
                                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${subscription?.subscription_tiers?.max_monthly_appointments === 999999 ? 20 : Math.min(100, (monthlyAppointmentsCount / (subscription?.subscription_tiers?.max_monthly_appointments || 150)) * 100)}%`, background: `rgb(var(--space-primary))` }} />
                                        </div>
                                    </div>
                                </div>
                                {subscription?.tier_id !== 'premium' && (
                                    <Link to="/dashboard/billing" className="mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-opacity hover:opacity-70" style={{ color: `rgb(var(--space-primary))` }}>
                                        <Sparkles size={11} /> Subir de plan →
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Quick actions ─────────────────────────── */}
                <div>
                    <h2 className="text-sm font-bold mb-4" style={{ color: `rgb(var(--space-text))` }}>Accesos rápidos</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { to: '/dashboard/services',     icon: Scissors, label: 'Servicios',   desc: 'Precios y duración' },
                            { to: '/dashboard/barbers',      icon: Users,    label: 'Equipo',      desc: 'Gestionar barberos' },
                            { to: '/dashboard/schedules',    icon: Clock,    label: 'Horarios',    desc: 'Disponibilidad' },
                            { to: '/dashboard/appointments', icon: Calendar, label: 'Citas',       desc: 'Agenda del día' },
                        ].map(({ to, icon: Icon, label, desc }) => (
                            <Link key={to} to={to} className="dash-card flex flex-col gap-3 group hover:opacity-90 transition-opacity">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ background: `rgba(var(--space-primary), 0.1)` }}>
                                    <Icon size={16} style={{ color: `rgb(var(--space-primary))` }} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold" style={{ color: `rgb(var(--space-text))` }}>{label}</p>
                                    <p className="text-[10px] font-medium" style={{ color: `rgb(var(--space-muted))` }}>{desc}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
