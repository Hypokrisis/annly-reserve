import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomerAppointments } from '@/services/appointments.service';
import { supabase } from '@/supabaseClient';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatDate, parseDate, formatTimeDisplay } from '@/utils';
import { Calendar, CalendarClock, LogOut, Store, ArrowRight } from 'lucide-react';

/**
 * Panel del cliente registrado (role='client').
 * Lista sus citas activas (futuras, confirmed) agrupadas por negocio.
 * Cancelar usa cancel_appointment_by_token; reagendar enlaza al booking del negocio.
 * No usa DashboardLayout: el cliente no tiene sidebar de gestión.
 */
export default function ClientHome() {
    const { user, logout } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!user?.email) { setLoading(false); return; }
        try {
            const data = await getCustomerAppointments(user.email, user.id);
            // Solo futuras: descarta las que ya pasaron (fecha+hora < ahora).
            const now = Date.now();
            const future = (data as any[]).filter((apt) => {
                const [y, m, d] = apt.appointment_date.split('-').map(Number);
                const [hh, mm] = apt.start_time.split(':').map(Number);
                return new Date(y, m - 1, d, hh, mm).getTime() >= now;
            });
            setAppointments(future);
        } catch {
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    }, [user?.email, user?.id]);

    useEffect(() => { load(); }, [load]);

    const handleCancel = async (apt: any) => {
        if (!apt.cancel_token) {
            alert('Esta cita no se puede cancelar desde aquí. Contacta a la barbería.');
            return;
        }
        if (!confirm('¿Seguro que quieres cancelar esta cita?')) return;
        setCancellingId(apt.id);
        try {
            const { data, error } = await supabase.rpc('cancel_appointment_by_token', { p_token: apt.cancel_token });
            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'token_invalid');
            setAppointments((prev) => prev.filter((a) => a.id !== apt.id));
        } catch {
            alert('No se pudo cancelar. Intenta de nuevo o contacta a la barbería.');
        } finally {
            setCancellingId(null);
        }
    };

    // Agrupa por negocio: { [businessId]: { business, items[] } }
    const groups = appointments.reduce((acc: Record<string, { business: any; items: any[] }>, apt) => {
        const biz = apt.business || {};
        const key = biz.id || 'sin-negocio';
        if (!acc[key]) acc[key] = { business: biz, items: [] };
        acc[key].items.push(apt);
        return acc;
    }, {});
    const groupList = Object.values(groups);

    return (
        <div className="min-h-screen bg-space-bg">
            {/* Header */}
            <header className="border-b border-space-border bg-space-card/50">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg" style={{ background: `linear-gradient(135deg, rgb(var(--space-primary-light)), rgb(var(--space-primary)))` }}>
                            <img src="/logo.png" alt="Spacey" className="w-full h-full object-cover object-top scale-110" />
                        </div>
                        <span className="text-lg font-extrabold tracking-tight text-space-text">Spacey</span>
                    </Link>
                    <button onClick={() => logout()} className="flex items-center gap-1.5 text-xs font-bold text-space-muted hover:text-space-text transition-colors">
                        <LogOut size={14} /> Salir
                    </button>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-extrabold text-space-text mb-1">Mis citas</h1>
                    <p className="text-sm text-space-muted">
                        Hola{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''} 👋 Aquí están tus próximas reservas.
                    </p>
                </div>

                {loading ? (
                    <div className="py-20 flex justify-center"><LoadingSpinner /></div>
                ) : groupList.length === 0 ? (
                    <div className="bg-space-card rounded-2xl p-10 text-center border border-space-border">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-space-primary/10 flex items-center justify-center mb-4">
                            <Calendar size={26} className="text-space-primary" />
                        </div>
                        <h2 className="text-lg font-extrabold text-space-text mb-2">No tienes citas activas</h2>
                        <p className="text-space-muted text-sm mb-6 max-w-xs mx-auto">
                            Cuando reserves en una barbería, tus citas aparecerán aquí.
                        </p>
                        <Link to="/" className="btn-primary text-xs px-6 py-2.5 inline-flex items-center gap-2">
                            <Store size={14} /> Explorar barberías
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {groupList.map(({ business, items }) => (
                            <div key={business.id || 'sin-negocio'}>
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <Store size={15} className="text-space-muted" />
                                    <h3 className="text-sm font-extrabold text-space-text">{business.name || 'Barbería'}</h3>
                                </div>
                                <div className="space-y-3">
                                    {items.map((apt) => {
                                        const serviceName = apt.services?.name || 'Servicio';
                                        const barberName = apt.barbers?.name;
                                        return (
                                            <div key={apt.id} className="bg-space-card rounded-2xl p-5 border border-space-border shadow-sm">
                                                <div className="space-y-2 mb-4">
                                                    <div className="text-sm text-space-text font-bold flex items-center gap-2">
                                                        <span>✂️</span>
                                                        <span>{serviceName}{barberName ? <span className="text-space-muted font-medium"> con {barberName}</span> : null}</span>
                                                    </div>
                                                    <div className="text-sm text-space-text font-bold flex items-center gap-2">
                                                        <span>📅</span>
                                                        <span>{formatDate(parseDate(apt.appointment_date))} a las {formatTimeDisplay(apt.start_time)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {business.slug && (
                                                        <Link to={`/book/${business.slug}`} className="flex-1 btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5">
                                                            <CalendarClock size={13} /> Reagendar
                                                        </Link>
                                                    )}
                                                    <button onClick={() => handleCancel(apt)} disabled={cancellingId === apt.id}
                                                        className="flex-1 btn-danger text-xs py-2.5 disabled:opacity-50">
                                                        {cancellingId === apt.id ? 'Cancelando...' : 'Cancelar'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        <div className="text-center pt-2">
                            <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-space-primary hover:opacity-80 transition-opacity">
                                Reservar en otra barbería <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
