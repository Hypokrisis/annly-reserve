import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, User, Mail, Phone, X, Check, Filter, Trash2, Clock, MapPin } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { useAppointments } from '@/hooks/useAppointments';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDateDisplay, formatTimeDisplay, formatRelativeTime } from '@/utils';
import type { Appointment } from '@/types';

type Tab = 'today' | 'upcoming' | 'all';

export default function AppointmentsPage() {
    const { business, services, barbers } = useBusiness();
    const { role } = useAuth();
    const { canViewAllAppointments } = usePermissions();
    const { user } = useAuth();

    // Barber Filter State
    const [selectedBarberId, setSelectedBarberId] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<Tab>('today');

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
        const today = new Date().toISOString().split('T')[0];

        if (activeTab === 'today') {
            filters.date = today;
            // "Pendientes" logic for Today implies we mostly care about active ones, 
            // but usually a daily view shows everything for that day. 
            // However, prompt says "En Pendientes solo mostrar status = confirmed".
            // Since "Hoy" and "Próximas" are basically "Pending", we filter.
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
        if (!confirm('¿Estás seguro de cancelar esta cita?')) return;

        const success = await updateAppointmentStatus(appointmentId, 'cancelled');
        if (success) {
            setIsModalOpen(false);
            // No alert needed if UI updates automatically, brings better UX
        }
    };

    const handleMarkCompleted = async (appointmentId: string) => {
        if (!confirm('¿Marcar cita como completada?')) return;

        const success = await updateAppointmentStatus(appointmentId, 'completed');
        if (success) {
            setIsModalOpen(false);
        }
    };

    const handleClearHistory = async () => {
        if (!business) return;

        // Count cancelled/completed/no_show appointments
        const historyCount = appointments.filter(a => ['cancelled', 'completed', 'no_show'].includes(a.status)).length;

        if (historyCount === 0) {
            alert('No hay citas en el historial para limpiar.');
            return;
        }

        if (!confirm(`Esto borrará permanentemente ${historyCount} citas del historial (canceladas y completadas). Esta acción no se puede deshacer. ¿Continuar?`)) return;

        const deletedCount = await clearHistory(business.id);
        if (deletedCount > 0) {
            alert(`Se han eliminado ${deletedCount} citas del historial.`);
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
            const today = new Date().toISOString().split('T')[0];
            return apt.appointment_date === today && apt.status === 'confirmed';
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
            <div className="max-w-5xl mx-auto animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Citas</h1>
                        <p className="text-space-muted text-sm mt-1">Gestiona la agenda y el historial</p>
                    </div>
                    {role === 'owner' && activeTab === 'all' && (
                        <Button
                            variant="danger"
                            onClick={handleClearHistory}
                            className="rounded-xl px-4 py-2 text-xs uppercase tracking-widest font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 bg-space-danger/10 text-space-danger border border-space-danger/20 hover:bg-space-danger hover:text-white"
                        >
                            <Trash2 size={14} />
                            Limpiar Historial
                        </Button>
                    )}
                </div>

                {/* Filters & Tabs */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                    {/* Tabs */}
                    <div className="flex p-1 bg-space-card rounded-xl border border-space-border w-full lg:w-auto">
                        <button
                            onClick={() => setActiveTab('today')}
                            className={`flex-1 lg:flex-none px-6 py-2.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wide whitespace-nowrap ${activeTab === 'today' ? 'bg-space-primary text-white shadow-lg shadow-space-primary/20' : 'text-space-muted hover:text-white hover:bg-space-card2'
                                }`}
                        >
                            Hoy
                        </button>
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={`flex-1 lg:flex-none px-6 py-2.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wide whitespace-nowrap ${activeTab === 'upcoming' ? 'bg-space-purple text-white shadow-lg shadow-space-purple/20' : 'text-space-muted hover:text-white hover:bg-space-card2'
                                }`}
                        >
                            Próximas
                        </button>
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`flex-1 lg:flex-none px-6 py-2.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wide whitespace-nowrap ${activeTab === 'all' ? 'bg-space-card2 text-white border border-space-border' : 'text-space-muted hover:text-white hover:bg-space-card2'
                                }`}
                        >
                            Historial
                        </button>
                    </div>

                    {/* Barber Dropdown */}
                    {!isStaffBarber && (
                        <div className="w-full lg:w-72">
                            <div className="relative group">
                                <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-space-muted group-hover:text-space-primary transition-colors" />
                                <select
                                    value={selectedBarberId}
                                    onChange={(e) => setSelectedBarberId(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-space-card border border-space-border rounded-xl text-sm font-medium text-white focus:ring-2 focus:ring-space-primary focus:border-transparent outline-none appearance-none transition-all shadow-sm cursor-pointer hover:bg-space-card2"
                                >
                                    <option value="all" className="bg-space-card">Todos los barberos</option>
                                    {barbers.map(barber => (
                                        <option key={barber.id} value={barber.id} className="bg-space-card">
                                            {barber.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Appointments List */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <LoadingSpinner />
                    </div>
                ) : filteredAppointments.length === 0 ? (
                    <div className="bg-space-card/50 rounded-2xl p-16 text-center border-2 border-dashed border-space-border">
                        <div className="w-16 h-16 bg-space-card2 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CalendarIcon size={32} className="text-space-muted" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No hay citas</h3>
                        <p className="text-space-muted text-sm max-w-xs mx-auto">
                            {activeTab === 'today' ? 'No tienes citas programadas para el día de hoy.' :
                                activeTab === 'upcoming' ? 'No hay citas próximas en el calendario.' : 'No se encontraron citas en el historial.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredAppointments.map((appointment) => (
                            <div
                                key={appointment.id}
                                onClick={() => handleViewDetails(appointment)}
                                className="bg-space-card p-5 rounded-2xl shadow-lg border border-space-border hover:border-space-primary/50 hover:shadow-space-primary/5 transition-all cursor-pointer group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-space-primary/5 to-transparent rounded-bl-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="flex items-start justify-between gap-4 relative z-10">
                                    <div className="flex gap-4 md:gap-6 overflow-hidden items-center">
                                        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-space-card2 to-space-bg border border-space-border w-16 h-16 md:w-20 md:h-20 rounded-xl shrink-0 shadow-inner">
                                            <span className="text-[10px] md:text-xs font-bold uppercase text-space-muted tracking-wide">{formatTimeDisplay(appointment.start_time).split(' ')[1]}</span>
                                            <span className="text-xl md:text-2xl font-black text-white">{formatTimeDisplay(appointment.start_time).split(' ')[0]}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-white text-lg md:text-xl truncate mb-1.5 group-hover:text-space-primary transition-colors">
                                                {appointment.customer_name}
                                            </h4>
                                            <div className="flex flex-col gap-1.5 text-xs md:text-sm text-space-muted">
                                                <span className="flex items-center gap-2 truncate">
                                                    <User size={14} className="shrink-0 text-space-primary" />
                                                    {getBarberName(appointment.barber_id)}
                                                </span>
                                                <span className="flex items-center gap-2 truncate font-medium text-white/80">
                                                    <Check size={14} className="shrink-0 text-space-success" />
                                                    {getServicesName(appointment.service_id!)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                                        {getStatusBadge(appointment.status)}
                                        <p className="text-[10px] md:text-xs font-bold text-space-muted bg-space-card2 px-2 py-1 rounded-lg border border-space-border flex items-center gap-1">
                                            <Clock size={10} />
                                            {formatRelativeTime(appointment.appointment_date, appointment.start_time)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Details Modal */}
                {selectedAppointment && (
                    <Modal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        title="Detalles de la Cita"
                    >
                        <div className="space-y-6">
                            {/* Header Info */}
                            <div className="flex justify-between items-start pb-4 border-b border-space-border">
                                <div>
                                    <h3 className="text-2xl font-bold text-white tracking-tight">{selectedAppointment.customer_name}</h3>
                                    <div className="flex items-center gap-2 text-space-muted text-sm mt-1 font-medium">
                                        <CalendarIcon size={14} />
                                        {formatDateDisplay(selectedAppointment.appointment_date)}
                                        <span>•</span>
                                        <Clock size={14} />
                                        {formatTimeDisplay(selectedAppointment.start_time)}
                                    </div>
                                </div>
                                <div className="mt-1">
                                    {getStatusBadge(selectedAppointment.status)}
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="bg-space-bg rounded-xl p-5 border border-space-border space-y-3">
                                <h4 className="text-xs font-bold uppercase text-space-muted tracking-widest mb-1">Contacto</h4>
                                <div className="flex items-center gap-3 text-sm text-space-text">
                                    <Mail size={16} className="text-space-primary" />
                                    <span>{selectedAppointment.customer_email}</span>
                                </div>
                                {selectedAppointment.customer_phone && (
                                    <div className="flex items-center gap-3 text-sm text-space-text">
                                        <Phone size={16} className="text-space-primary" />
                                        <span>{selectedAppointment.customer_phone}</span>
                                    </div>
                                )}
                            </div>

                            {/* Service Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-space-bg p-4 rounded-xl border border-space-border">
                                    <label className="text-xs font-bold text-space-muted uppercase tracking-widest block mb-2">Servicio</label>
                                    <p className="text-white font-bold text-lg">{getServicesName(selectedAppointment.service_id!)}</p>
                                </div>
                                <div className="bg-space-bg p-4 rounded-xl border border-space-border">
                                    <label className="text-xs font-bold text-space-muted uppercase tracking-widest block mb-2">Barbero</label>
                                    <p className="text-white font-bold text-lg">{getBarberName(selectedAppointment.barber_id)}</p>
                                </div>
                            </div>

                            {selectedAppointment.customer_notes && (
                                <div>
                                    <label className="text-xs font-bold text-space-muted uppercase tracking-widest block mb-2">Notas del Cliente</label>
                                    <p className="text-space-text bg-space-card2 p-4 rounded-xl border border-space-border text-sm italic">
                                        "{selectedAppointment.customer_notes}"
                                    </p>
                                </div>
                            )}

                            {/* Actions */}
                            {selectedAppointment.status === 'confirmed' && (
                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-space-border">
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleMarkCompleted(selectedAppointment.id)}
                                        className="w-full bg-space-success/10 text-space-success hover:bg-space-success hover:text-white border-transparent shadow-none"
                                    >
                                        <Check size={16} className="mr-2" />
                                        Completar
                                    </Button>
                                    <Button
                                        variant="danger"
                                        onClick={() => handleCancel(selectedAppointment.id)}
                                        className="w-full bg-space-danger/10 text-space-danger hover:bg-space-danger hover:text-white border-transparent shadow-none"
                                    >
                                        <X size={16} className="mr-2" />
                                        Cancelar
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Modal>
                )}
            </div>
        </DashboardLayout>
    );
}
