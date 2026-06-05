import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Scissors, Calendar, User, Phone, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TodayAppointment {
    id: string;
    customer_name: string;
    customer_phone: string;
    start_time: string;
    end_time: string;
    status: string;
    services: { name: string; price: number } | null;
}

const STATUS_STYLES: Record<string, string> = {
    confirmed: 'text-green-400 bg-green-400/10',
    completed: 'text-space-muted bg-space-card2',
    cancelled: 'text-red-400 bg-red-400/10',
    no_show: 'text-yellow-400 bg-yellow-400/10',
};

const STATUS_LABELS: Record<string, string> = {
    confirmed: 'Confirmada',
    completed: 'Completada',
    cancelled: 'Cancelada',
    no_show: 'No asistió',
};

export default function StaffHome() {
    const { user, barberProfile, currentBusiness, logout } = useAuth();
    const [appointments, setAppointments] = useState<TodayAppointment[]>([]);
    const [loading, setLoading] = useState(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const nowTime = format(new Date(), 'HH:mm');

    useEffect(() => {
        if (barberProfile?.id) {
            loadAppointments();
        } else {
            setLoading(false);
        }
    }, [barberProfile?.id]);

    const loadAppointments = async () => {
        try {
            const { data } = await supabase
                .from('appointments')
                .select('id, customer_name, customer_phone, start_time, end_time, status, services(name, price)')
                .eq('barber_id', barberProfile!.id)
                .eq('appointment_date', today)
                .order('start_time', { ascending: true });
            setAppointments(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const confirmed = appointments.filter(a => a.status === 'confirmed');
    const nextAppt = confirmed.find(a => a.start_time >= nowTime);
    const displayName = barberProfile?.name || user?.email?.split('@')[0] || 'Staff';

    return (
        <div className="min-h-screen bg-space-bg text-space-text">
            {/* Top bar */}
            <header className="sticky top-0 z-10 bg-space-card/90 backdrop-blur border-b border-space-border px-4 h-14 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-space-primary/10 flex items-center justify-center">
                        <Scissors size={14} className="text-space-primary" />
                    </div>
                    <span className="font-bold text-sm">{currentBusiness?.name || 'Spacey'}</span>
                </div>
                <button
                    onClick={logout}
                    title="Cerrar sesión"
                    className="p-2 text-space-muted hover:text-red-400 transition rounded-lg"
                >
                    <LogOut size={17} />
                </button>
            </header>

            <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
                {/* Greeting */}
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-space-muted mb-0.5">
                        {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
                    </p>
                    <h1 className="text-2xl font-black text-space-text">
                        Hola, {displayName}
                    </h1>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-space-card border border-space-border rounded-2xl p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-space-muted mb-1">Hoy</p>
                        <p className="text-3xl font-black text-space-text">{appointments.length}</p>
                        <p className="text-[11px] text-space-muted">{appointments.length === 1 ? 'cita' : 'citas'}</p>
                    </div>
                    <div className="bg-space-card border border-space-border rounded-2xl p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-space-muted mb-1">Próxima</p>
                        {nextAppt ? (
                            <>
                                <p className="text-3xl font-black text-space-primary">{nextAppt.start_time}</p>
                                <p className="text-[11px] text-space-muted truncate">{nextAppt.customer_name}</p>
                            </>
                        ) : (
                            <>
                                <p className="text-3xl font-black text-space-text">—</p>
                                <p className="text-[11px] text-space-muted">sin pendientes</p>
                            </>
                        )}
                    </div>
                </div>

                {/* Appointments */}
                <div>
                    <h2 className="text-sm font-black text-space-text uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Calendar size={14} /> Citas de hoy
                    </h2>
                    {loading ? (
                        <div className="flex justify-center py-10"><LoadingSpinner /></div>
                    ) : !barberProfile ? (
                        <div className="bg-space-card border border-space-border rounded-2xl p-8 text-center">
                            <p className="text-space-muted text-sm">
                                Tu perfil de barbero no está configurado aún. Contacta al administrador.
                            </p>
                        </div>
                    ) : appointments.length === 0 ? (
                        <div className="bg-space-card border border-space-border rounded-2xl p-8 text-center">
                            <p className="text-space-muted text-sm">No hay citas para hoy. ¡Disfruta el día!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {appointments.map(apt => {
                                const style = STATUS_STYLES[apt.status] || STATUS_STYLES.confirmed;
                                const isPast = apt.end_time < nowTime;
                                return (
                                    <div
                                        key={apt.id}
                                        className={`bg-space-card border border-space-border rounded-2xl p-4 flex items-center gap-3 transition-opacity ${isPast ? 'opacity-50' : ''}`}
                                    >
                                        {/* Time column */}
                                        <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-12 text-center">
                                            <p className="text-sm font-extrabold text-space-text leading-tight">{apt.start_time}</p>
                                            <p className="text-[9px] text-space-muted">{apt.end_time}</p>
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <User size={11} className="text-space-muted flex-shrink-0" />
                                                <p className="font-bold text-space-text text-sm truncate">{apt.customer_name}</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {apt.services && (
                                                    <p className="text-[11px] text-space-muted">{apt.services.name}</p>
                                                )}
                                                {apt.customer_phone && (
                                                    <a
                                                        href={`tel:${apt.customer_phone}`}
                                                        className="flex items-center gap-0.5 text-[11px] text-space-primary"
                                                    >
                                                        <Phone size={10} /> {apt.customer_phone}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        {/* Status badge */}
                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wide flex-shrink-0 ${style}`}>
                                            {STATUS_LABELS[apt.status] || apt.status}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
