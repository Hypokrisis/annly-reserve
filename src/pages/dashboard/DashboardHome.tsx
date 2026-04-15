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
            <div className="animate-fade-up">

                {/* ── Header ──────────────────────────────────── */}
                <div className="mb-8">
                    <h1 className="page-title text-3xl">
                        Hola, <span className="text-space-primary">{business?.name || user?.email?.split('@')[0]}</span> 👋
                    </h1>
                    <p className="page-subtitle flex items-center gap-2 mt-1">
                        Rol actual:
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-space-primary-light text-space-primary capitalize ml-1">
                            {role}
                        </span>
                    </p>
                </div>

                {/* ── TODAY'S APPOINTMENTS WIDGET ──────────────────────── */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-space-text flex items-center gap-2">
                            <span className="w-1 h-5 bg-space-primary rounded-full inline-block" />
                            Citas de Hoy
                            {todayApts.length > 0 && (
                                <span className="ml-1 w-5 h-5 bg-space-primary text-white rounded-full text-[10px] font-black flex items-center justify-center">
                                    {todayApts.length}
                                </span>
                            )}
                        </h2>
                        <Link to="/dashboard/appointments" className="text-xs font-semibold text-space-primary flex items-center gap-1 hover:underline">
                            Ver todas <ExternalLink size={12} />
                        </Link>
                    </div>

                    {todayApts.length === 0 ? (
                        <div className="card p-6 text-center border-2 border-dashed border-space-border">
                            <Calendar size={32} className="text-space-muted mx-auto mb-2 opacity-40" />
                            <p className="text-sm text-space-muted font-semibold">No hay citas confirmadas para hoy</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {todayApts.map((apt) => (
                                <Link key={apt.id} to="/dashboard/appointments"
                                    className="card p-4 hover:shadow-card-lg hover:border-space-primary/30 transition-all group">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-space-primary/10 rounded-xl flex flex-col items-center justify-center">
                                            <span className="text-[9px] font-bold text-space-primary">{formatTimeDisplay(apt.start_time).split(' ')[1]}</span>
                                            <span className="text-sm font-black text-space-primary leading-none">{formatTimeDisplay(apt.start_time).split(':')[0]}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-space-text text-sm truncate group-hover:text-space-primary transition-colors">{apt.customer_name}</p>
                                            <p className="text-[10px] text-space-muted truncate">{(apt.services as any)?.name || 'Servicio'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-space-muted font-semibold">
                                        <Bell size={10} className="text-space-primary" />
                                        {(apt.barbers as any)?.name || 'Sin asignar'}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
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

                {/* ── Public Link Banner & Marketing Kit ──────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                    <div className="xl:col-span-2 rounded-[2.5rem] bg-space-text p-8 sm:p-10 relative overflow-hidden shadow-2xl border border-white/5 group">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-space-primary/10 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-space-primary/20 transition-all duration-700" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-space-purple/10 rounded-full blur-[100px] -ml-32 -mb-32" />
                        
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg border border-white/10 mb-6 font-black text-[10px] text-white uppercase tracking-widest">
                                <Sparkles size={12} className="text-space-primary" />
                                Marketing Kit
                            </div>
                            <h2 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase italic">Tu Link de Reservas</h2>
                            <p className="text-white/60 text-sm mb-8 max-w-xl leading-relaxed font-medium">Comparte tu link profesional y empieza a recibir citas 24/7 sin mover un dedo.</p>

                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white/90 font-mono truncate shadow-inner">
                                        {window.location.origin}/book/{business?.slug}
                                    </div>
                                    <button
                                        onClick={handleCopyLink}
                                        className="h-14 px-8 bg-white text-space-text rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-white/5 flex items-center justify-center gap-2 shrink-0"
                                    >
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                        {copied ? 'Copiado' : 'Copiar Link'}
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <button 
                                        onClick={() => {
                                            const text = `¡Hola! Ya puedes reservar con nosotros online aquí: ${window.location.origin}/book/${business?.slug}`;
                                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                        }}
                                        className="px-6 py-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                    >
                                        <MessageSquare size={14} /> Compartir por WhatsApp
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card p-8 bg-white border-2 border-space-border/50 flex flex-col justify-between">
                         <div>
                            <div className="flex items-center gap-2 mb-6">
                                <MapPin size={18} className="text-space-primary" />
                                <h2 className="text-[10px] font-black text-space-muted uppercase tracking-[0.3em]">Visibilidad en Mapa</h2>
                            </div>
                            <h3 className="text-lg font-black text-space-text uppercase tracking-tight mb-4">Estado de Filtros</h3>
                            <div className="space-y-3">
                                {[
                                    { id: 'saving', label: 'Modo Ahorro', active: services.some(s => s.price >= 10 && s.price <= 15), icon: '🪫', color: 'text-amber-500' },
                                    { id: 'premium', label: 'Modo Premium', active: services.some(s => s.price >= 40), icon: '⚡', color: 'text-blue-500' },
                                    { id: 'flash', label: 'Modo Flash', active: services.length > 0, icon: '🚀', color: 'text-space-primary' }
                                ].map((mode) => (
                                    <div key={mode.id} className={`flex items-center justify-between p-3 rounded-2xl border ${mode.active ? 'bg-neutral-50 border-neutral-200' : 'bg-white border-neutral-100 opacity-40'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">{mode.icon}</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${mode.active ? 'text-space-text' : 'text-neutral-400'}`}>{mode.label}</span>
                                        </div>
                                        {mode.active ? (
                                            <span className="text-[9px] font-black text-space-success uppercase tracking-widest bg-space-success/10 px-2 py-0.5 rounded-md">Activo</span>
                                        ) : (
                                            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Inactivo</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                         </div>
                         <p className="text-[9px] text-space-muted font-bold mt-6 leading-relaxed">
                            * Los modos se activan automáticamente según tus precios y disponibilidad actual.
                         </p>
                    </div>
                </div>

                {/* ── Brutal Insights ────────────────────────────── */}
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
                                                    style={{ width: `${(s.count / (statsData.topServices[0]?.count || 1)) * 100}%` }}
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

                    <div className="card p-8 bg-white border-2 border-indigo-500/10 overflow-hidden relative">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-6">
                                <Users size={18} className="text-indigo-600" />
                                <h2 className="text-xs font-black text-space-muted uppercase tracking-[0.3em]">Top Equipo</h2>
                            </div>
                            <div className="space-y-4">
                                {statsData.loading ? (
                                    <div className="animate-pulse space-y-4">
                                        {[1,2].map(i => <div key={i} className="h-12 bg-space-bg rounded-2xl w-full" />)}
                                    </div>
                                ) : statsData.topBarbers.length > 0 ? (
                                    statsData.topBarbers.map((b, i) => (
                                        <div key={b.name} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-sm">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-space-text uppercase tracking-tight">{b.name}</h3>
                                                    <p className="text-[10px] text-space-muted font-bold uppercase tracking-widest">{b.count} servicios</p>
                                                </div>
                                            </div>
                                            <p className="text-sm font-black text-indigo-600 italic">{formatCurrency(b.revenue)}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-space-muted font-bold uppercase tracking-widest">Sin datos</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                     <div className="lg:col-span-2 card p-8 bg-white border-2 border-space-border/50">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={18} className="text-space-primary" />
                                <h2 className="text-xs font-black text-space-muted uppercase tracking-[0.3em]">Ingresos Semanales</h2>
                            </div>
                            <div className="text-[10px] font-black text-space-primary uppercase tracking-widest bg-space-primary/10 px-3 py-1 rounded-lg">Últimos 7 días</div>
                        </div>

                        <div className="flex items-end justify-between h-48 gap-2 px-2">
                            {statsData.loading ? (
                                <div className="w-full h-full flex items-center justify-center text-space-muted animate-pulse font-black text-[10px] uppercase tracking-widest">Cargando gráfica...</div>
                            ) : statsData.weeklyRevenue.map((d, i) => {
                                const maxAmount = Math.max(...statsData.weeklyRevenue.map(w => w.amount), 1);
                                const height = (d.amount / maxAmount) * 100;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                                        <div className="relative w-full flex flex-col items-center">
                                            {/* Tooltip on hover */}
                                            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-space-text text-white text-[10px] font-black px-2 py-1 rounded-md mb-2 pointer-events-none z-20">
                                                {formatCurrency(d.amount)}
                                            </div>
                                            <div 
                                                className="w-full max-w-[40px] bg-space-primary/20 group-hover:bg-space-primary rounded-t-lg transition-all duration-500 overflow-hidden relative"
                                                style={{ height: `${height}%`, minHeight: '4px' }}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black text-space-muted uppercase tracking-tighter">{d.day}</span>
                                    </div>
                                );
                            })}
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
