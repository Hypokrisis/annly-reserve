import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { Scissors, Users, Calendar, Settings, ArrowRight, Copy, Check, Clock, TrendingUp, Award, PieChart, Sparkles, MessageSquare, MapPin, Bell, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { formatCurrency, formatTimeDisplay } from '@/utils';

export default function DashboardHome() {
    const { business, barbers, services } = useBusiness();
    const { user, role } = useAuth();
    const [copied, setCopied] = useState(false);
    const [todayApts, setTodayApts] = useState<any[]>([]);
    const [statsData, setStatsData] = useState({
        totalRevenue: 0,
        totalCustomers: 0,
        returningRate: 0,
        revenueTrend: 0, // % vs last week
        appointmentsTrend: 0, // % vs last week
        totalAppointments: 0,
        topServices: [] as { name: string; count: number; revenue: number }[],
        topBarbers: [] as { name: string; count: number; revenue: number }[],
        weeklyRevenue: [] as { day: string; amount: number }[],
        loading: true
    });

    useEffect(() => {
        if (!business?.id) return;
        loadAnalytics();
        loadTodayAppointments();
    }, [business?.id]);

    const loadAnalytics = async () => {
        try {
            const { data: appointments, error } = await supabase
                .from('appointments')
                .select('service_id, barber_id, customer_email, status, appointment_date, services(name, price), barbers(name)')
                .eq('business_id', business?.id);

            if (error) throw error;

            const confirmed = appointments.filter(a => a.status === 'confirmed' || a.status === 'completed');
            
            // ── TREND CALCULATIONS (This Week vs Last Week) ──
            const now = new Date();
            const currWeekStart = new Date(new Date().setDate(now.getDate() - now.getDay()));
            const lastWeekStart = new Date(new Date().setDate(currWeekStart.getDate() - 7));
            const currWeekStr = currWeekStart.toISOString().split('T')[0];
            const lastWeekStr = lastWeekStart.toISOString().split('T')[0];

            const thisWeekApts = confirmed.filter(a => a.appointment_date >= currWeekStr);
            const lastWeekApts = confirmed.filter(a => a.appointment_date >= lastWeekStr && a.appointment_date < currWeekStr);

            const thisWeekRev = thisWeekApts.reduce((acc, curr) => acc + ((curr.services as any)?.price || 0), 0);
            const lastWeekRev = lastWeekApts.reduce((acc, curr) => acc + ((curr.services as any)?.price || 0), 0);

            const revTrend = lastWeekRev > 0 ? ((thisWeekRev - lastWeekRev) / lastWeekRev) * 100 : 0;
            const aptTrend = lastWeekApts.length > 0 ? ((thisWeekApts.length - lastWeekApts.length) / lastWeekApts.length) * 100 : 0;

            // ── GENERAL STATS ──
            const revenue = confirmed.reduce((acc, curr) => acc + ((curr.services as any)?.price || 0), 0);
            
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

            // Top Barbers
            const barberStats = confirmed.reduce((acc, curr) => {
                const bName = (curr.barbers as any)?.name || 'Sin Nombre';
                if (!acc[bName]) acc[bName] = { count: 0, revenue: 0 };
                acc[bName].count += 1;
                acc[bName].revenue += (curr.services as any)?.price || 0;
                return acc;
            }, {} as Record<string, { count: number; revenue: number }>);

            const topB = Object.entries(barberStats)
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 3);

            // Weekly Revenue (Last 7 days)
            const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return {
                    dateStr: d.toISOString().split('T')[0],
                    label: days[d.getDay()]
                };
            });

            const weekly = last7Days.map(day => {
                const dayRevenue = confirmed
                    .filter(a => a.appointment_date === day.dateStr)
                    .reduce((acc, curr) => acc + ((curr.services as any)?.price || 0), 0);
                return { day: day.label, amount: dayRevenue };
            });

            setStatsData({
                totalRevenue: revenue,
                totalCustomers: totalCust,
                returningRate: rate,
                revenueTrend: revTrend,
                appointmentsTrend: aptTrend,
                totalAppointments: confirmed.length,
                topServices: top,
                topBarbers: topB,
                weeklyRevenue: weekly,
                loading: false
            });
        } catch (err) {
            console.error('Error loading analytics', err);
            setStatsData(prev => ({ ...prev, loading: false }));
        }
    };

    const loadTodayAppointments = async () => {
        if (!business?.id) return;
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
            .from('appointments')
            .select('id, customer_name, start_time, services(name), barbers(name)')
            .eq('business_id', business.id)
            .eq('appointment_date', today)
            .eq('status', 'confirmed')
            .order('start_time', { ascending: true })
            .limit(4);
        setTodayApts(data || []);
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
            <div className="animate-fade-up pb-10">

                {/* ── 5-SECOND PULSE HEADER ──────────────────────────── */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-space-text border-2 border-space-border/20 overflow-hidden shadow-lg flex items-center justify-center shrink-0">
                            {business?.logo_url ? (
                                <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
                            ) : (
                                <Scissors size={28} className="text-space-primary" />
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-space-text tracking-tighter uppercase italic leading-none mb-1">
                                {business?.name || 'Mi Barbería'}
                            </h1>
                            <p className="text-[10px] font-black text-space-muted uppercase tracking-[0.3em] flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-space-success animate-pulse" />
                                Sistema en línea • {role === 'owner' ? 'Panel de Control' : 'Vista de Staff'}
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats Banner */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="px-5 py-3 bg-white rounded-2xl border border-space-border/40 shadow-sm flex items-center gap-4">
                            <div>
                                <p className="text-[9px] font-black text-space-muted uppercase tracking-widest mb-0.5">Ingresos Totales</p>
                                <p className="text-lg font-black text-space-text">{formatCurrency(statsData.totalRevenue)}</p>
                            </div>
                            {statsData.revenueTrend !== 0 && (
                                <div className={`flex items-center gap-0.5 text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${statsData.revenueTrend > 0 ? 'bg-space-success/10 text-space-success' : 'bg-space-danger/10 text-space-danger'}`}>
                                    {statsData.revenueTrend > 0 ? '+' : ''}{statsData.revenueTrend.toFixed(0)}%
                                </div>
                            )}
                        </div>
                        <div className="px-5 py-3 bg-white rounded-2xl border border-space-border/40 shadow-sm flex items-center gap-4">
                            <div>
                                <p className="text-[9px] font-black text-space-muted uppercase tracking-widest mb-0.5">Total Citas</p>
                                <p className="text-lg font-black text-space-text">{statsData.totalAppointments}</p>
                            </div>
                            {statsData.appointmentsTrend !== 0 && (
                                <div className={`flex items-center gap-0.5 text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${statsData.appointmentsTrend > 0 ? 'bg-space-success/10 text-space-success' : 'bg-space-danger/10 text-space-danger'}`}>
                                    {statsData.appointmentsTrend > 0 ? '+' : ''}{statsData.appointmentsTrend.toFixed(0)}%
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── MAIN GRID ───────────────────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    
                    {/* Left Column: Activity & Link (8 cols) */}
                    <div className="xl:col-span-8 space-y-8">
                        
                        {/* ── Today's Pulse ── */}
                        <section>
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-sm font-black text-space-text uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Clock size={16} className="text-space-primary" />
                                    Citas de Hoy
                                </h2>
                                <Link to="/dashboard/appointments" className="text-[9px] font-black text-space-primary uppercase tracking-widest bg-space-primary/10 px-3 py-1.5 rounded-xl hover:bg-space-primary hover:text-white transition-all">
                                    Ver Agenda Completa
                                </Link>
                            </div>

                            {todayApts.length === 0 ? (
                                <div className="card p-10 text-center border-2 border-dashed border-space-border/60 bg-neutral-50/50">
                                    <Calendar size={32} className="text-space-muted mx-auto mb-3 opacity-20" />
                                    <p className="text-[11px] font-black text-space-muted uppercase tracking-widest">Sin citas confirmadas para hoy</p>
                                    <p className="text-[9px] text-space-muted/60 mt-2 font-bold uppercase">Tus clientes verán los huecos libres en tu página</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {todayApts.map((apt) => (
                                        <div key={apt.id} className="card p-5 group hover:border-space-primary/40 hover:shadow-card-lg transition-all flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-space-card2 rounded-2xl flex flex-col items-center justify-center border border-space-border/20 group-hover:bg-space-primary group-hover:border-space-primary transition-all duration-300">
                                                    <span className="text-[8px] font-black text-space-muted group-hover:text-white/60 tracking-widest mb-0.5">{formatTimeDisplay(apt.start_time).split(' ')[1]}</span>
                                                    <span className="text-base font-black text-space-text group-hover:text-white leading-none">{formatTimeDisplay(apt.start_time).split(':')[0]}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-black text-space-text uppercase tracking-tight group-hover:text-space-primary transition-colors truncate">{apt.customer_name}</h3>
                                                    <p className="text-[9px] text-space-muted font-bold uppercase tracking-widest">{(apt.services as any)?.name || 'Servicio'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1">
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-100 rounded-lg text-[8px] font-black uppercase text-space-muted tracking-widest">
                                                    <Users size={10} className="text-space-primary" />
                                                    {(apt.barbers as any)?.name || 'Auto'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* ── Link & Growth ── */}
                        <section className="bg-space-text rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden shadow-2xl border border-white/5 group">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-space-primary/10 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-space-primary/20 transition-all duration-700" />
                            <div className="relative z-10">
                                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl border border-white/10 mb-6 font-black text-[9px] text-white uppercase tracking-widest">
                                    <Sparkles size={12} className="text-space-primary" />
                                    Marketing Kit
                                </span>
                                <h2 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase italic">Tu Link de Reservas</h2>
                                <p className="text-white/60 text-[11px] mb-8 max-w-xl leading-relaxed font-bold uppercase tracking-widest">Comparte tu link profesional y recibe citas 24/7 sin mover un dedo.</p>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white/90 font-mono truncate shadow-inner">
                                        {window.location.origin}/book/{business?.slug}
                                    </div>
                                    <button
                                        onClick={handleCopyLink}
                                        className="h-14 px-8 bg-white text-space-text rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-white/5 flex items-center justify-center gap-2 shrink-0 hover:bg-space-primary hover:text-white"
                                    >
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                        {copied ? 'Copiado' : 'Copiar Link'}
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* ── Top Performance ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Top Services */}
                            <div className="card p-6 bg-white">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-[10px] font-black text-space-muted uppercase tracking-[0.2em]">Servicios Top</h3>
                                    <TrendingUp size={14} className="text-space-primary" />
                                </div>
                                <div className="space-y-4">
                                    {statsData.topServices.map((s, idx) => (
                                        <div key={s.name}>
                                            <div className="flex justify-between text-[11px] font-black uppercase mb-1.5">
                                                <span className="text-space-text">{idx + 1}. {s.name}</span>
                                                <span className="text-space-muted">{s.count}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-space-primary" style={{ width: `${(s.count / (statsData.topServices[0]?.count || 1)) * 100}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Top Team */}
                            <div className="card p-6 bg-white">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-[10px] font-black text-space-muted uppercase tracking-[0.2em]">Líderes de Equipo</h3>
                                    <Award size={14} className="text-indigo-600" />
                                </div>
                                <div className="space-y-3">
                                    {statsData.topBarbers.map((b, idx) => (
                                        <div key={b.name} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-[10px]">{idx + 1}</div>
                                                <span className="text-[11px] font-black text-space-text uppercase tracking-tight truncate max-w-[80px]">{b.name}</span>
                                            </div>
                                            <span className="text-[11px] font-black text-indigo-600 italic">{formatCurrency(b.revenue)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Pulse & Insights (4 cols) */}
                    <div className="xl:col-span-4 space-y-8">
                        
                        {/* ── Retention Pulse ── */}
                        <section className="card p-8 bg-space-text text-white border-none shadow-xl relative overflow-hidden min-h-[300px] flex flex-col justify-between">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-space-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
                            <div>
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] flex items-center gap-2">
                                        <PieChart size={14} className="text-space-primary" />
                                        Rendimiento
                                    </h2>
                                    <span className="px-2 py-0.5 bg-white/10 rounded-md text-[8px] font-black text-white/40">ANÁLISIS PRO</span>
                                </div>
                                
                                <div className="mb-6">
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">Tasa de Retención</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-5xl font-black text-white tracking-tighter italic">{statsData.returningRate.toFixed(1)}%</p>
                                        <TrendingUp size={20} className="text-space-primary" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-space-primary shadow-[0_0_15px_rgba(74,132,99,0.5)]" style={{ width: `${statsData.returningRate}%` }} />
                                </div>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-relaxed">
                                    {statsData.returningRate > 50 ? '🎉 Fidelización brutal. Sigue así.' : '⚠️ Enfócate en la experiencia para subir la retención.'}
                                </p>
                            </div>
                        </section>

                        {/* ── Visibility Status ── */}
                        <section className="card p-6 bg-white border border-space-border/20">
                            <h3 className="text-[10px] font-black text-space-muted uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                <MapPin size={14} className="text-space-primary" />
                                Presencia en Mapa
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { label: 'Ahorro', active: services.some(s => s.price >= 10 && s.price <= 15), icon: '🪫' },
                                    { label: 'Premium', active: services.some(s => s.price >= 40), icon: '⚡' },
                                    { label: 'Popular', active: services.length > 5, icon: '🔥' }
                                ].map((mode) => (
                                    <div key={mode.label} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${mode.active ? 'bg-neutral-50 border-neutral-200 opacity-100' : 'bg-white border-transparent opacity-30 shadow-none'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">{mode.icon}</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-space-text">{mode.label}</span>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${mode.active ? 'bg-space-success' : 'bg-neutral-300'}`} />
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* ── Revenue Chart Small ── */}
                        <section className="card p-6 bg-white border border-space-border/20">
                            <h3 className="text-[10px] font-black text-space-muted uppercase tracking-[0.3em] mb-6 flex items-center justify-between">
                                Tendencia 7 Días
                                <span className="text-space-primary font-black">+{statsData.revenueTrend.toFixed(0)}%</span>
                            </h3>
                            <div className="flex items-end justify-between h-24 gap-1.5 px-1">
                                {statsData.weeklyRevenue.map((d, i) => {
                                    const maxAmount = Math.max(...statsData.weeklyRevenue.map(w => w.amount), 1);
                                    const height = (d.amount / maxAmount) * 100;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                            <div 
                                                className="w-full bg-space-primary/10 group-hover:bg-space-primary rounded-t-md transition-all duration-300"
                                                style={{ height: `${height}%`, minHeight: '4px' }}
                                            />
                                            <span className="text-[8px] font-black text-space-muted/60 uppercase">{d.day[0]}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </div>

                {/* ── QUICK ACTIONS (BOTTOM) ────────────────────────────── */}
                <div className="mt-12">
                     <h2 className="text-sm font-black text-space-text uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <ArrowRight size={16} className="text-space-primary" />
                        Accesos Directos
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {quickActions.map(({ to, icon: Icon, label, desc, color, ring }) => (
                            <Link key={to} to={to} className="card p-6 group transition-all duration-300 hover:shadow-card-lg hover:-translate-y-1">
                                <div className={`w-12 h-12 bg-space-card2 rounded-2xl flex items-center justify-center mb-4 transition-all group-hover:bg-space-primary group-hover:text-white`}>
                                    <Icon size={24} className="transition-transform group-hover:scale-110" />
                                </div>
                                <h3 className="text-sm font-black text-space-text uppercase tracking-tight mb-1">{label}</h3>
                                <p className="text-[10px] text-space-muted font-bold uppercase tracking-widest">{desc}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
