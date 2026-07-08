import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import {
    Scissors, Users, Calendar, Clock, TrendingUp, Award,
    Copy, Check, ArrowRight, Sparkles, BarChart3, CheckCircle2, XCircle, Rocket
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { formatCurrency, formatTimeDisplay } from '@/utils';

export default function DashboardHome() {
    const { business, services, barbers, subscription, monthlyAppointmentsCount } = useBusiness();
    const { role } = useAuth();
    const [copied, setCopied] = useState(false);
    const [todayApts, setTodayApts] = useState<any[]>([]);
    const [scheduleCount, setScheduleCount] = useState(0);
    const [publishing, setPublishing] = useState(false);
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
        if (!business.is_active) {
            supabase
                .from('schedules')
                .select('id', { count: 'exact', head: true })
                .eq('business_id', business.id)
                .then(({ count }) => setScheduleCount(count || 0));
        }
    }, [business?.id, business?.is_active]);

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

    const onboardingSteps = [
        { label: 'Info básica', desc: 'Dirección y teléfono', done: !!(business?.address && business?.phone), href: '/dashboard/settings' },
        { label: 'Servicios', desc: 'Al menos 1 servicio', done: services.length > 0, href: '/dashboard/services' },
        { label: 'Equipo y horarios', desc: 'Barbero con horario activo', done: barbers.filter(b => b.is_active).length > 0 && scheduleCount > 0, href: '/dashboard/schedules' },
        { label: 'WhatsApp', desc: 'Número del bot (opcional)', done: !!business?.whatsapp_booking_link, href: '/dashboard/settings', optional: true },
    ];
    const canPublish = onboardingSteps.filter(s => !s.optional).every(s => s.done);

    const handlePublish = async () => {
        if (!business?.id || !canPublish) return;
        setPublishing(true);
        try {
            await supabase.from('businesses').update({ is_active: true }).eq('id', business.id);
            window.location.reload();
        } catch (e) {
            console.error(e);
            setPublishing(false);
        }
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
            <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 ${up ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'bg-[#ef4444]/10 text-[#ef4444]'}`}>
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
            <div className="space-y-8 pb-12">

                {/* ── Onboarding banner ── */}
                {business && !business.is_active && (
                    <div className="rounded-2xl border border-dashed border-[#9bc287]/30 p-5" style={{ background: 'rgba(155,194,135,0.05)' }}>
                        <div className="mb-4 flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(155,194,135,0.15)' }}>
                                <Rocket size={16} className="text-[#9bc287]" />
                            </div>
                            <div>
                                <p className="text-sm font-extrabold text-[#f0f4ee]">Tu negocio no está visible al público todavía.</p>
                                <p className="mt-0.5 text-[11px] text-[#95ab8a]">Completa estos pasos para publicarlo y empezar a recibir reservas.</p>
                            </div>
                        </div>
                        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {onboardingSteps.map(step => (
                                <Link key={step.label} to={step.href}
                                    className="flex items-center gap-2 rounded-xl border border-[#243529] bg-[#131c17] px-3 py-2.5 no-underline transition hover:border-[#9bc287]/40">
                                    {step.done
                                        ? <CheckCircle2 size={15} className="shrink-0 text-[#22c55e]" />
                                        : <XCircle size={15} className={`shrink-0 ${step.optional ? 'text-[#95ab8a]' : 'text-[#ef4444]'}`} />}
                                    <div className="min-w-0">
                                        <p className="truncate text-[11px] font-bold text-[#f0f4ee]">{step.label}</p>
                                        <p className="truncate text-[9px] text-[#95ab8a]">{step.desc}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        <button
                            onClick={handlePublish}
                            disabled={!canPublish || publishing}
                            className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition-all ${
                                canPublish
                                    ? 'bg-[#9bc287] text-[#22321c] hover:bg-[#86ad72]'
                                    : 'cursor-not-allowed border border-[#243529] bg-[#131c17] text-[#95ab8a]'
                            }`}>
                            <Rocket size={15} />
                            {publishing ? 'Publicando...' : canPublish ? 'Publicar mi negocio →' : 'Completa los pasos para publicar'}
                        </button>
                    </div>
                )}

                {/* ── Page header ── */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="flex items-center gap-1.5 text-xs font-medium text-[#95ab8a]">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#22c55e]" />
                            Sistema activo · {role === 'owner' ? 'Panel de Control' : 'Vista Staff'}
                        </p>
                    </div>
                    <Link to="/dashboard/appointments"
                        className="hidden items-center gap-1.5 rounded-full border border-[#243529] px-4 py-2 text-xs font-bold text-[#95ab8a] no-underline transition hover:border-[#9bc287] hover:text-[#9bc287] sm:flex">
                        Ver agenda <ArrowRight size={13} />
                    </Link>
                </div>

                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {KPI_ITEMS.map(({ label, value, trend, icon: Icon }) => (
                        <div key={label} className="flex flex-col gap-3 rounded-[20px] border border-[#243529] bg-[#131c17] p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#95ab8a]">{label}</p>
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'rgba(155,194,135,0.1)' }}>
                                    <Icon size={15} className="text-[#9bc287]" />
                                </div>
                            </div>
                            <div className="flex items-end justify-between gap-2">
                                <p className="text-2xl font-extrabold tracking-tight text-[#f0f4ee]">{value}</p>
                                {trend !== undefined && <Trend value={trend} />}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Main grid ── */}
                <div className="grid gap-6 xl:grid-cols-3">

                    {/* Left: today + weekly */}
                    <div className="space-y-6 xl:col-span-2">

                        {/* Today's appointments */}
                        <div className="rounded-[20px] border border-[#243529] bg-[#131c17] p-6">
                            <div className="mb-5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-[#9bc287]" />
                                    <h2 className="text-[15px] font-extrabold text-[#f0f4ee]">Citas de hoy</h2>
                                    {todayApts.length > 0 && (
                                        <span className="rounded-full bg-[#9bc287]/10 px-2 py-0.5 text-[10px] font-extrabold text-[#9bc287]">
                                            {todayApts.length}
                                        </span>
                                    )}
                                </div>
                                <Link to="/dashboard/appointments"
                                    className="text-[11px] font-bold text-[#9bc287] no-underline transition hover:opacity-70">
                                    Ver todas →
                                </Link>
                            </div>

                            {todayApts.length === 0 ? (
                                <div className="flex flex-col items-center rounded-xl py-10 text-center"
                                    style={{ background: 'rgba(36,53,41,0.3)', border: '1.5px dashed #243529' }}>
                                    <Calendar size={24} className="mb-2 text-[#95ab8a] opacity-40" />
                                    <p className="text-xs font-semibold text-[#95ab8a]">Sin citas confirmadas para hoy</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {todayApts.map(apt => {
                                        const t = formatTimeDisplay(apt.start_time);
                                        const parts = t.split(' ');
                                        return (
                                            <div key={apt.id}
                                                className="flex items-center gap-3 rounded-xl border border-[#243529]/60 px-4 py-3 transition hover:border-[#9bc287]/30"
                                                style={{ background: 'rgba(155,194,135,0.04)' }}>
                                                <div className="w-[52px] shrink-0 text-center">
                                                    <p className="text-[15px] font-extrabold text-[#9bc287]">{parts[0]}</p>
                                                    <p className="text-[9px] font-bold uppercase text-[#95ab8a]">{parts[1]}</p>
                                                </div>
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
                                                    style={{ background: 'linear-gradient(135deg, #9bc287, #3a7553)' }}>
                                                    {(apt.customer_name || '?')[0].toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-bold text-[#f0f4ee]">{apt.customer_name}</p>
                                                    <p className="text-[10px] text-[#95ab8a]">
                                                        {(apt.services as any)?.name}{(apt.barbers as any)?.name ? ` · ${(apt.barbers as any).name}` : ''}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 rounded-full bg-[#22c55e]/10 px-2.5 py-1 text-[10px] font-extrabold text-[#22c55e]">
                                                    Confirmada
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Weekly bar chart */}
                        <div className="rounded-[20px] border border-[#243529] bg-[#131c17] p-6">
                            <div className="mb-5 flex items-center justify-between">
                                <h2 className="text-[15px] font-extrabold text-[#f0f4ee]">Ingresos últimos 7 días</h2>
                                <Trend value={stats.revenueTrend} />
                            </div>
                            <div className="flex items-end justify-between gap-2" style={{ height: '80px' }}>
                                {stats.weeklyRevenue.map((d, i) => (
                                    <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                                        <div
                                            className="w-full rounded-t-[6px] transition-all duration-500"
                                            style={{
                                                height: `${Math.max(4, (d.amount / maxWeekly) * 70)}px`,
                                                background: d.amount > 0 ? 'linear-gradient(to top, #3a7553, #9bc287)' : '#243529',
                                                opacity: d.amount > 0 ? 1 : 0.4,
                                            }}
                                            title={formatCurrency(d.amount)}
                                        />
                                        <span className="text-[9px] font-bold text-[#95ab8a]">{d.day}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: top services + barbers + plan */}
                    <div className="space-y-6">

                        {/* Top services */}
                        <div className="rounded-[20px] border border-[#243529] bg-[#131c17] p-6">
                            <div className="mb-5 flex items-center justify-between">
                                <h2 className="text-[15px] font-extrabold text-[#f0f4ee]">Servicios top</h2>
                                <TrendingUp size={14} className="text-[#9bc287]" />
                            </div>
                            {stats.topServices.length === 0 ? (
                                <p className="text-xs text-[#95ab8a]">Sin datos aún</p>
                            ) : (
                                <div className="space-y-4">
                                    {stats.topServices.map((s, idx) => (
                                        <div key={s.name}>
                                            <div className="mb-1.5 flex justify-between text-xs font-semibold">
                                                <span className="max-w-[70%] truncate text-[#f0f4ee]">{idx + 1}. {s.name}</span>
                                                <span className="text-[#95ab8a]">{s.count} citas</span>
                                            </div>
                                            <div className="h-1.5 overflow-hidden rounded-full bg-[#243529]/50">
                                                <div className="h-full rounded-full bg-[#9bc287] transition-all duration-700"
                                                    style={{ width: `${(s.count / (stats.topServices[0]?.count || 1)) * 100}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Top barbers */}
                        <div className="rounded-[20px] border border-[#243529] bg-[#131c17] p-6">
                            <div className="mb-5 flex items-center justify-between">
                                <h2 className="text-[15px] font-extrabold text-[#f0f4ee]">Equipo top</h2>
                                <Award size={14} className="text-[#9bc287]" />
                            </div>
                            {stats.topBarbers.length === 0 ? (
                                <p className="text-xs text-[#95ab8a]">Sin datos aún</p>
                            ) : (
                                <div className="space-y-2">
                                    {stats.topBarbers.map((b, idx) => (
                                        <div key={b.name} className="flex items-center gap-3 rounded-xl bg-[#1d2a23] px-3 py-2.5">
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold text-[#9bc287]"
                                                style={{ background: 'rgba(155,194,135,0.1)' }}>
                                                {idx + 1}
                                            </div>
                                            <span className="flex-1 truncate text-xs font-semibold text-[#f0f4ee]">{b.name}</span>
                                            <span className="text-xs font-bold text-[#9bc287]">{formatCurrency(b.revenue)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Plan usage */}
                        {role === 'owner' && (
                            <div className="rounded-[20px] border border-[#243529] bg-[#131c17] p-6">
                                <div className="mb-5 flex items-center justify-between">
                                    <h2 className="text-[15px] font-extrabold text-[#f0f4ee]">Uso del plan</h2>
                                    <span className="rounded-full bg-[#9bc287]/10 px-2.5 py-1 text-[10px] font-extrabold text-[#9bc287]">
                                        {subscription?.subscription_tiers?.name || 'Starter'}
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <div className="mb-1.5 flex justify-between text-[10px] font-semibold">
                                            <span className="text-[#f0f4ee]">Barberos activos</span>
                                            <span className="text-[#95ab8a]">{barbers.filter(b => b.is_active).length} / {subscription?.subscription_tiers?.max_barbers || 3}</span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-[#243529]/50">
                                            <div className="h-full rounded-full bg-[#9bc287] transition-all duration-700"
                                                style={{ width: `${Math.min(100, (barbers.filter(b => b.is_active).length / (subscription?.subscription_tiers?.max_barbers || 3)) * 100)}%` }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="mb-1.5 flex justify-between text-[10px] font-semibold">
                                            <span className="text-[#f0f4ee]">Citas este mes</span>
                                            <span className="text-[#95ab8a]">{monthlyAppointmentsCount} / {subscription?.subscription_tiers?.max_monthly_appointments === 999999 ? '∞' : (subscription?.subscription_tiers?.max_monthly_appointments || 150)}</span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-[#243529]/50">
                                            <div className="h-full rounded-full bg-[#9bc287] transition-all duration-700"
                                                style={{ width: `${subscription?.subscription_tiers?.max_monthly_appointments === 999999 ? 20 : Math.min(100, (monthlyAppointmentsCount / (subscription?.subscription_tiers?.max_monthly_appointments || 150)) * 100)}%` }} />
                                        </div>
                                    </div>
                                </div>
                                {subscription?.tier_id !== 'premium' && (
                                    <Link to="/dashboard/billing"
                                        className="mt-5 flex items-center gap-2 text-[10px] font-bold text-[#9bc287] no-underline transition hover:opacity-70">
                                        <Sparkles size={11} /> Subir de plan →
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Accesos rápidos ── */}
                <div>
                    <h2 className="mb-4 text-[15px] font-extrabold text-[#f0f4ee]">Accesos rápidos</h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                            { to: '/dashboard/services',     icon: Scissors, label: 'Servicios', desc: 'Precios y duración' },
                            { to: '/dashboard/barbers',      icon: Users,    label: 'Equipo',    desc: 'Gestionar barberos' },
                            { to: '/dashboard/schedules',    icon: Clock,    label: 'Horarios',  desc: 'Disponibilidad' },
                            { to: '/dashboard/appointments', icon: Calendar, label: 'Citas',     desc: 'Agenda del día' },
                        ].map(({ to, icon: Icon, label, desc }) => (
                            <Link key={to} to={to}
                                className="flex flex-col gap-3 rounded-[20px] border border-[#243529] bg-[#131c17] p-5 no-underline transition hover:border-[#9bc287]/40">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(155,194,135,0.1)' }}>
                                    <Icon size={17} className="text-[#9bc287]" />
                                </div>
                                <div>
                                    <p className="text-sm font-extrabold text-[#f0f4ee]">{label}</p>
                                    <p className="text-[10px] text-[#95ab8a]">{desc}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
