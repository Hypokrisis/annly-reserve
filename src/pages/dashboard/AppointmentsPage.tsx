import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, User, Mail, Phone, X, Check } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { useAppointments } from '@/hooks/useAppointments';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatTimeDisplay, formatCurrency } from '@/utils';
import type { Appointment } from '@/types';

export default function AppointmentsPage() {
    const { business, services, barbers } = useBusiness();
    const { role } = useAuth();
    const { canViewAllAppointments } = usePermissions();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const {
        appointments,
        loading,
        fetchAppointments,
        cancelAppointment,
        updateAppointmentStatus,
    } = useAppointments();

    useEffect(() => {
        if (business) {
            loadAppointments();
        }
    }, [business, selectedDate]);

    const loadAppointments = () => {
        if (!business) return;

        fetchAppointments({
            business_id: business.id,
            date: selectedDate,
        });
    };

    const getServiceName = (serviceId: string) => {
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

        const success = await cancelAppointment(appointmentId, 'Cancelada por el negocio');
        if (success) {
            setIsModalOpen(false);
            alert('Cita cancelada exitosamente');
        }
    };

    const handleMarkCompleted = async (appointmentId: string) => {
        const success = await updateAppointmentStatus(appointmentId, 'completed');
        if (success) {
            setIsModalOpen(false);
            alert('Cita marcada como completada');
        }
    };

    const handleMarkNoShow = async (appointmentId: string) => {
        if (!confirm('¿Marcar como no asistió?')) return;

        const success = await updateAppointmentStatus(appointmentId, 'no_show');
        if (success) {
            setIsModalOpen(false);
            alert('Cita marcada como no asistió');
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

    // Group appointments by time
    const groupedAppointments = appointments.reduce((acc, apt) => {
        const time = apt.start_time;
        if (!acc[time]) acc[time] = [];
        acc[time].push(apt);
        return acc;
    }, {} as Record<string, Appointment[]>);

    const sortedTimes = Object.keys(groupedAppointments).sort();

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
            <div className="max-w-6xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Citas</h1>
                        <p className="text-gray-600 mt-1">Gestiona las reservas del día</p>
                    </div>
                </div>

                {/* Date Selector */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Selecciona una fecha
                    </label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>

                {/* Appointments List */}
                {loading ? (
                    <LoadingSpinner />
                ) : appointments.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center">
                        <CalendarIcon size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No hay citas
                        </h3>
                        <p className="text-gray-600">
                            No hay citas programadas para {formatDate(selectedDate)}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedTimes.map((time) => (
                            <div key={time} className="bg-white rounded-xl shadow-sm border border-gray-200">
                                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                                    <h3 className="font-semibold text-gray-900">
                                        {formatTimeDisplay(time)}
                                    </h3>
                                </div>
                                <div className="divide-y divide-gray-200">
                                    {groupedAppointments[time].map((appointment) => (
                                        <div
                                            key={appointment.id}
                                            className="p-6 hover:bg-gray-50 transition cursor-pointer"
                                            onClick={() => handleViewDetails(appointment)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h4 className="font-semibold text-gray-900">
                                                            {appointment.customer_name}
                                                        </h4>
                                                        {getStatusBadge(appointment.status)}
                                                    </div>
                                                    <div className="space-y-1 text-sm text-gray-600">
                                                        <p>✂️ {getServiceName(appointment.service_id!)}</p>
                                                        <p>👤 {getBarberName(appointment.barber_id)}</p>
                                                        <p>📧 {appointment.customer_email}</p>
                                                        {appointment.customer_phone && (
                                                            <p>📱 {appointment.customer_phone}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Appointment Details Modal */}
                {selectedAppointment && (
                    <Modal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        title="Detalles de la Cita"
                    >
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Estado:</span>
                                {getStatusBadge(selectedAppointment.status)}
                            </div>

                            <div>
                                <span className="text-gray-600">Cliente:</span>
                                <p className="font-semibold text-gray-900">
                                    {selectedAppointment.customer_name}
                                </p>
                            </div>

                            <div>
                                <span className="text-gray-600">Email:</span>
                                <p className="font-semibold text-gray-900">
                                    {selectedAppointment.customer_email}
                                </p>
                            </div>

                            {selectedAppointment.customer_phone && (
                                <div>
                                    <span className="text-gray-600">Teléfono:</span>
                                    <p className="font-semibold text-gray-900">
                                        {selectedAppointment.customer_phone}
                                    </p>
                                </div>
                            )}

                            <div>
                                <span className="text-gray-600">Servicio:</span>
                                <p className="font-semibold text-gray-900">
                                    {getServiceName(selectedAppointment.service_id!)}
                                </p>
                            </div>

                            <div>
                                <span className="text-gray-600">Barbero:</span>
                                <p className="font-semibold text-gray-900">
                                    {getBarberName(selectedAppointment.barber_id)}
                                </p>
                            </div>

                            <div>
                                <span className="text-gray-600">Fecha y Hora:</span>
                                <p className="font-semibold text-gray-900">
                                    {formatDate(selectedAppointment.appointment_date)} a las{' '}
                                    {formatTimeDisplay(selectedAppointment.start_time)}
                                </p>
                            </div>

                            {selectedAppointment.customer_notes && (
                                <div>
                                    <span className="text-gray-600">Notas:</span>
                                    <p className="text-gray-900 mt-1">
                                        {selectedAppointment.customer_notes}
                                    </p>
                                </div>
                            )}

                            {selectedAppointment.status === 'confirmed' && (
                                <div className="flex gap-3 pt-4 border-t">
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleMarkCompleted(selectedAppointment.id)}
                                        className="flex-1"
                                    >
                                        <Check size={16} className="mr-2" />
                                        Completada
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleMarkNoShow(selectedAppointment.id)}
                                        className="flex-1"
                                    >
                                        No Asistió
                                    </Button>
                                    <Button
                                        variant="danger"
                                        onClick={() => handleCancel(selectedAppointment.id)}
                                        className="flex-1"
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
