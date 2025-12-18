import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, User, Mail, Phone, X, Check, Filter } from 'lucide-react';
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

    const getStatusBadge = (status: string) => {
        const badges = {
            confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmada' },
            cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelada' },
            completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completada' },
            no_show: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'No asistió' },
        };

        const badge = badges[status as keyof typeof badges] || badges.confirmed;

        return (
            <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    // Filter and Sort Appointments for "Upcoming" & "All" Logic
    const filteredAppointments = appointments.filter(apt => {
        const aptDate = new Date(`${apt.appointment_date}T${apt.start_time}`);
        const expirationTime = new Date(aptDate.getTime() + 15 * 60000);
        const now = new Date();
        const isExpired = now > expirationTime;

        if (activeTab === 'today') {
            const today = new Date().toISOString().split('T')[0];
            // Solo confirmadas de HOY que no hayan expirado (>15 min de retraso)
            return apt.status === 'confirmed' && apt.appointment_date === today && !isExpired;
        }

        if (activeTab === 'upcoming') {
            const today = new Date().toISOString().split('T')[0];
            // Solo confirmadas FUTURAS
            return apt.status === 'confirmed' && apt.appointment_date > today;
        }

        // 'Todas' actúa como historial y visión general
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
                    <p className="text-gray-600">No tienes permisos para ver las citas.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Citas</h1>
                    <p className="text-gray-500">Gestión de reservas</p>
                </div>

                {/* Filters & Tabs */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    {/* Tabs */}
                    <div className="flex p-1 bg-gray-100 rounded-lg w-full md:w-auto overflow-x-auto no-scrollbar scroll-smooth">
                        <button
                            onClick={() => setActiveTab('today')}
                            className={`flex-1 lg:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'today' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Hoy
                        </button>
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={`flex-1 lg:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'upcoming' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Próximas
                        </button>
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`flex-1 md:flex-none px-4 py-2 text-xs md:text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Historial
                        </button>
                    </div>

                    {/* Barber Dropdown */}
                    {!isStaffBarber && (
                        <div className="w-full md:w-64">
                            <div className="relative">
                                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <select
                                    value={selectedBarberId}
                                    onChange={(e) => setSelectedBarberId(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                                >
                                    <option value="all">Todos los barberos</option>
                                    {barbers.map(barber => (
                                        <option key={barber.id} value={barber.id}>
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
                    <LoadingSpinner />
                ) : filteredAppointments.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center border border-dashed border-gray-300">
                        <CalendarIcon size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No hay citas</h3>
                        <p className="text-gray-500 text-sm">
                            {activeTab === 'today' ? 'No tienes citas para hoy' :
                                activeTab === 'upcoming' ? 'No hay citas próximas' : 'No se encontraron citas'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
                        {filteredAppointments.map((appointment) => (
                            <div
                                key={appointment.id}
                                onClick={() => handleViewDetails(appointment)}
                                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex gap-3 md:gap-4 overflow-hidden">
                                        <div className="flex flex-col items-center justify-center bg-indigo-50 text-indigo-700 w-14 h-14 md:w-16 md:h-16 rounded-lg shrink-0">
                                            <span className="text-[10px] md:text-xs font-semibold uppercase">{formatTimeDisplay(appointment.start_time).split(' ')[1]}</span>
                                            <span className="text-base md:text-lg font-bold">{formatTimeDisplay(appointment.start_time).split(' ')[0]}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-gray-900 text-base md:text-lg truncate">
                                                {appointment.customer_name}
                                            </h4>
                                            <div className="flex flex-col gap-y-0.5 text-xs md:text-sm text-gray-500 mt-1">
                                                <span className="flex items-center gap-1 truncate">
                                                    <User size={12} className="shrink-0" /> {getBarberName(appointment.barber_id)}
                                                </span>
                                                <span className="flex items-center gap-1 truncate font-medium text-indigo-600">
                                                    <Check size={12} className="shrink-0" /> {getServicesName(appointment.service_id!)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                                        {getStatusBadge(appointment.status)}
                                        <p className="text-[10px] md:text-xs font-medium text-gray-400">
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
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{selectedAppointment.customer_name}</h3>
                                    <p className="text-gray-500 text-sm mt-1">
                                        {formatDateDisplay(selectedAppointment.appointment_date)} • {formatTimeDisplay(selectedAppointment.start_time)}
                                    </p>
                                </div>
                                {getStatusBadge(selectedAppointment.status)}
                            </div>

                            {/* Contact Info */}
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail size={16} className="text-gray-400" />
                                    <span className="text-gray-700">{selectedAppointment.customer_email}</span>
                                </div>
                                {selectedAppointment.customer_phone && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <Phone size={16} className="text-gray-400" />
                                        <span className="text-gray-700">{selectedAppointment.customer_phone}</span>
                                    </div>
                                )}
                            </div>

                            {/* Service Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Servicio</label>
                                    <p className="text-gray-900 font-medium">{getServicesName(selectedAppointment.service_id!)}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Barbero</label>
                                    <p className="text-gray-900 font-medium">{getBarberName(selectedAppointment.barber_id)}</p>
                                </div>
                            </div>

                            {selectedAppointment.customer_notes && (
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Notas</label>
                                    <p className="text-gray-700 bg-yellow-50 p-3 rounded-lg mt-1 text-sm">
                                        {selectedAppointment.customer_notes}
                                    </p>
                                </div>
                            )}

                            {/* Actions */}
                            {selectedAppointment.status === 'confirmed' && (
                                <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleMarkCompleted(selectedAppointment.id)}
                                        className="w-full text-green-700 hover:bg-green-50 border-green-200"
                                    >
                                        <Check size={16} className="mr-2" />
                                        Completar
                                    </Button>
                                    <Button
                                        variant="danger"
                                        onClick={() => handleCancel(selectedAppointment.id)}
                                        className="w-full"
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

