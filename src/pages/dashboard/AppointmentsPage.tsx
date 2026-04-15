import { useEffect, useState, useRef } from 'react';
import { Calendar as CalendarIcon, User, Mail, Phone, X, Check, Filter, Trash2, Clock, Bell } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { useAppointments } from '@/hooks/useAppointments';
import { TimelineCalendar } from '@/components/calendar/TimelineCalendar';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDateDisplay, formatTimeDisplay, formatRelativeTime } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { Appointment } from '@/types';

type Tab = 'today' | 'upcoming' | 'all';

export default function AppointmentsPage() {
    const { business, services, barbers } = useBusiness();
    const { role } = useAuth();
    const { canViewAllAppointments } = usePermissions();
    const { user } = useAuth();
    const toast = useToast();
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    // Barber Filter State
    const [selectedBarberId, setSelectedBarberId] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<Tab>('today');
    const [currentDate, setCurrentDate] = useState<Date>(new Date());

    // Auto-detect staff's barber profile
    const currentStaffBarber = barbers.find(b => b.user_id === user?.id);
    const isStaffBarber = !!currentStaffBarber && role === 'staff';

    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const {
        appointments,
        loading,
        fetchAppointments,
        updateAppointmentStatus,
        clearHistory,
    } = useAppointments();

    // Effect to auto-select barber for Staff
    useEffect(() => {
        if (isStaffBarber && currentStaffBarber) {
            setSelectedBarberId(currentStaffBarber.id);
        }
    }, [isStaffBarber, currentStaffBarber]);

    useEffect(() => {
        if (business) {
            loadAppointments();
        }
    }, [business, selectedBarberId, activeTab]);

    // ── Realtime subscription ──────────────────────────────
    useEffect(() => {
        if (!business?.id) return;

        channelRef.current = supabase
            .channel(`appointments:${business.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'appointments',
                    filter: `business_id=eq.${business.id}`,
                },
                (payload) => {
                    const apt = payload.new as Appointment;
                    toast.info(`📅 Nueva cita: ${apt.customer_name || 'Cliente'} ha reservado`);
                    loadAppointments();
                }
            )
            .subscribe();

        return () => {
            channelRef.current?.unsubscribe();
        };
    }, [business?.id]);

    const loadAppointments = () => {
        if (!business) return;

        const filters: any = {
            business_id: business.id,
        };

        // Apply barber filter
        if (selectedBarberId !== 'all') {
            filters.barber_id = selectedBarberId;
        }

        // Apply Tab filters
        if (activeTab === 'today') {
            // "today" is now "Agenda" which uses currentDate
            const selectedDateStr = currentDate.toISOString().split('T')[0];
            filters.date = selectedDateStr;
            // Fetch both confirmed and completed for the daily agenda
            filters.status = 'confirmed'; 
        } else if (activeTab === 'upcoming') {
            // For upcoming, we fetch all (or maybe should fetch from today onwards if backend supported it)
            // We will filter client-side for > today
            filters.status = 'confirmed';
        } else {
            // All: No date filter, no status filter (history)
        }

        fetchAppointments(filters);
    };

    const getServicesName = (serviceId: string) => {
        return services.find(s => s.id === serviceId)?.name || 'N/A';
    };

    const getBarberName = (barberId: string) => {
        return barbers.find(b => b.id === barberId)?.name || 'N/A';
    };

    const handleViewDetails = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setIsModalOpen(true);
    };

    const handleCancel = async (appointmentId: string) => {
        if (!window.confirm('¿Estás seguro de cancelar esta cita?')) return;

        const success = await updateAppointmentStatus(appointmentId, 'cancelled');
        if (success) {
            setIsModalOpen(false);
            toast.success('Cita cancelada correctamente.');
        } else {
            toast.error('No se pudo cancelar la cita. Intenta de nuevo.');
        }
    };

    const handleMarkCompleted = async (appointmentId: string) => {
        if (!window.confirm('¿Marcar cita como completada?')) return;

        const success = await updateAppointmentStatus(appointmentId, 'completed');
        if (success) {
            setIsModalOpen(false);
            toast.success('¡Cita completada!');
        } else {
            toast.error('No se pudo actualizar la cita.');
        }
    };

    const handleClearHistory = async () => {
        if (!business) return;

        const historyCount = appointments.filter(a => ['cancelled', 'completed', 'no_show'].includes(a.status)).length;

        if (historyCount === 0) {
            toast.warning('No hay citas en el historial para limpiar.');
            return;
        }

        if (!window.confirm(`Esto borrará permanentemente ${historyCount} citas del historial. ¿Continuar?`)) return;

        const deletedCount = await clearHistory(business.id);
        if (deletedCount > 0) {
            toast.success(`Se eliminaron ${deletedCount} citas del historial.`);
        } else {
            toast.error('No se pudo limpiar el historial.');
        }
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            confirmed: { bg: 'bg-space-success/10 border-space-success/20', text: 'text-space-success', label: 'Confirmada' },
            cancelled: { bg: 'bg-space-danger/10 border-space-danger/20', text: 'text-space-danger', label: 'Cancelada' },
            completed: { bg: 'bg-space-primary/10 border-space-primary/20', text: 'text-space-primary', label: 'Completada' },
            no_show: { bg: 'bg-space-muted/10 border-space-muted/20', text: 'text-space-muted', label: 'No asistió' },
        };

        const badge = badges[status as keyof typeof badges] || badges.confirmed;

        return (
            <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest border ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    // Filter and Sort Appointments for "Upcoming" & "All" Logic
    const filteredAppointments = appointments.filter(apt => {
        if (activeTab === 'today') {
            const selectedDateStr = currentDate.toISOString().split('T')[0];
            return apt.appointment_date === selectedDateStr && (apt.status === 'confirmed' || apt.status === 'completed');
        }

        if (activeTab === 'upcoming') {
            const today = new Date().toISOString().split('T')[0];
            return apt.status === 'confirmed' && apt.appointment_date > today;
        }

        if (activeTab === 'all') {
            // Historial: cancelled, completed, no_show
            return ['cancelled', 'completed', 'no_show'].includes(apt.status);
        }

        return true;
    }).sort((a, b) => {
        // Sort by Date then Time
        if (a.appointment_date !== b.appointment_date) {
            return a.appointment_date.localeCompare(b.appointment_date);
        }
        return a.start_time.localeCompare(b.start_time);
    });

    if (!canViewAllAppointments) {
        return (
            <DashboardLayout>
                <div className="text-center py-12">
                    <p className="text-space-muted">No tienes permisos para ver las citas.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto animate-fade-up">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="page-title">Citas</h1>
                        <p className="page-subtitle">Gestiona la agenda y el historial</p>
                    </div>
                    {role === 'owner' && activeTab === 'all' && (
                        <button
                            onClick={handleClearHistory}
                            className="btn-danger flex items-center gap-2"
                        >
                            <Trash2 size={14} />
                            Limpiar Historial
                        </button>
                    )}
                </div>

                {/* Filters & Tabs */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                    {/* Tabs */}
                    <div className="flex p-1 bg-white border border-space-border rounded-xl w-full lg:w-auto shadow-card">
                        {(['today', 'upcoming', 'all'] as const).map((tab) => {
                            const label = tab === 'today' ? 'Agenda Diaria' : tab === 'upcoming' ? 'Próximas' : 'Historial';
                            return (
                                <button key={tab} onClick={() => setActiveTab(tab)}
                                    className={`flex-1 lg:flex-none px-5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap
                                        ${activeTab === tab ? 'bg-space-primary text-white shadow-btn' : 'text-space-muted hover:text-space-text'}`}
                                >{label}</button>
                            );
                        })}
                    </div>

                    {/* Barber Dropdown */}
                    {!isStaffBarber && (
                        <div className="w-full lg:w-64">
                            <div className="relative">
                                <Filter size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-space-muted" />
                                <select
                                    value={selectedBarberId}
                                    onChange={(e) => setSelectedBarberId(e.target.value)}
                                    className="input-field pl-10 appearance-none cursor-pointer"
                                >
                                    <option value="all">Todos los barberos</option>
                                    {barbers.map(barber => (
                                        <option key={barber.id} value={barber.id}>{barber.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Appointments List */}
                {loading && (appointments.length === 0 || (activeTab === 'today' && !appointments.some(a => a.appointment_date === currentDate.toISOString().split('T')[0]))) ? (
                    <div className="flex justify-center py-20"><LoadingSpinner /></div>
                ) : (
                    <div className="space-y-6">
                        {activeTab === 'today' ? (
                            <div className="animate-fade-in">
                                <TimelineCalendar 
                                    appointments={filteredAppointments}
                                    selectedDate={currentDate}
                                    onDateChange={setCurrentDate}
                                    onAppointmentClick={handleViewDetails}
                                    barbers={selectedBarberId === 'all' ? barbers : barbers.filter(b => b.id === selectedBarberId)}
                                    services={services}
                                />
                            </div>
                        ) : filteredAppointments.length === 0 ? (
                            <div className="bg-white rounded-2xl p-16 text-center border-2 border-dashed border-space-border animate-fade-up">
                                <div className="w-14 h-14 bg-space-card2 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CalendarIcon size={28} className="text-space-muted" />
                                </div>
                                <h3 className="text-lg font-bold text-space-text mb-1">No hay citas</h3>
                                <p className="text-space-muted text-sm max-w-xs mx-auto">
                                    {activeTab === 'upcoming' ? 'No hay citas próximas confirmadas.' : 'No hay historial para mostrar.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 animate-fade-in">
                                {filteredAppointments.map((appointment) => (
                                    <div key={appointment.id} onClick={() => handleViewDetails(appointment)}
                                        className="card p-5 hover:shadow-card-lg transition-all cursor-pointer group hover:border-space-primary/40">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex gap-4 items-center overflow-hidden">
                                                {/* Time block */}
                                                <div className="flex flex-col items-center justify-center bg-space-card2 border border-space-border w-14 h-14 rounded-xl shrink-0">
                                                    <span className="text-[10px] font-bold uppercase text-space-muted">{formatTimeDisplay(appointment.start_time).split(' ')[1]}</span>
                                                    <span className="text-lg font-black text-space-text">{formatTimeDisplay(appointment.start_time).split(' ')[0]}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-space-text truncate group-hover:text-space-primary transition-colors">
                                                        {appointment.customer_name}
                                                    </h4>
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-space-muted mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <User size={12} className="text-space-primary" />
                                                            {getBarberName(appointment.barber_id)}
                                                        </span>
                                                        <span className="hidden sm:block">·</span>
                                                        <span>{getServicesName(appointment.service_id!)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="shrink-0 flex flex-col items-end gap-1.5">
                                                {getStatusBadge(appointment.status)}
                                                <span className="text-[10px] text-space-muted flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {formatRelativeTime(appointment.appointment_date, appointment.start_time)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Details Modal */}
                {selectedAppointment && (
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detalles de la Cita">
                        <div className="space-y-5">
                            <div className="flex justify-between items-start pb-4 border-b border-space-border">
                                <div>
                                    <h3 className="text-xl font-bold text-space-text">{selectedAppointment.customer_name}</h3>
                                    <div className="flex items-center gap-2 text-space-muted text-sm mt-1">
                                        <CalendarIcon size={13} />{formatDateDisplay(selectedAppointment.appointment_date)}
                                        <span>·</span><Clock size={13} />{formatTimeDisplay(selectedAppointment.start_time)}
                                    </div>
                                </div>
                                {getStatusBadge(selectedAppointment.status)}
                            </div>

                            <div className="bg-space-bg rounded-xl p-4 border border-space-border space-y-2">
                                <p className="text-[10px] font-bold uppercase text-space-muted tracking-widest">Contacto</p>
                                <div className="flex items-center gap-2 text-sm text-space-text">
                                    <Mail size={14} className="text-space-primary" />{selectedAppointment.customer_email}
                                </div>
                                {selectedAppointment.customer_phone && (
                                    <div className="flex items-center gap-2 text-sm text-space-text">
                                        <Phone size={14} className="text-space-primary" />{selectedAppointment.customer_phone}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-space-bg p-4 rounded-xl border border-space-border">
                                    <p className="text-[10px] font-bold uppercase text-space-muted tracking-widest mb-1">Servicio</p>
                                    <p className="font-bold text-space-text">{getServicesName(selectedAppointment.service_id!)}</p>
                                </div>
                                <div className="bg-space-bg p-4 rounded-xl border border-space-border">
                                    <p className="text-[10px] font-bold uppercase text-space-muted tracking-widest mb-1">Barbero</p>
                                    <p className="font-bold text-space-text">{getBarberName(selectedAppointment.barber_id)}</p>
                                </div>
                            </div>

                            {selectedAppointment.customer_notes && (
                                <div className="bg-space-bg p-4 rounded-xl border border-space-border">
                                    <p className="text-[10px] font-bold uppercase text-space-muted tracking-widest mb-1">Notas</p>
                                    <p className="text-space-muted text-sm italic">"{selectedAppointment.customer_notes}"</p>
                                </div>
                            )}

                            {selectedAppointment.status === 'confirmed' && (
                                <div className="space-y-3 pt-4 border-t border-space-border">
                                    <button 
                                        onClick={async () => {
                                            if (!window.confirm('¿Enviar recordatorio a este cliente?')) return;
                                            try {
                                                const { error } = await supabase.rpc('force_send_reminder', {
                                                    p_appointment_id: selectedAppointment.id
                                                });
                                                if (error) throw error;
                                                toast.success('¡Recordatorio añadido a la cola! Se enviará en unos instantes.');
                                                setIsModalOpen(false);
                                            } catch (e: any) {
                                                toast.error('Error al enviar recordatorio: ' + e.message);
                                            }
                                        }}
                                        className="w-full py-2.5 rounded-xl text-sm font-semibold bg-space-primary/10 text-space-primary hover:bg-space-primary hover:text-white border border-space-primary/20 transition flex items-center justify-center gap-2">
                                        <Bell size={15} /> Enviar Recordatorio Manual
                                    </button>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => handleMarkCompleted(selectedAppointment.id)}
                                            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-green-50 text-space-success hover:bg-space-success hover:text-white border border-green-200 transition flex items-center justify-center gap-2">
                                            <Check size={15} />Completar
                                        </button>
                                        <button onClick={() => handleCancel(selectedAppointment.id)}
                                            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-space-danger hover:bg-space-danger hover:text-white border border-red-200 transition flex items-center justify-center gap-2">
                                            <X size={15} />Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Modal>
                )}
            </div>
        </DashboardLayout>
    );
}
