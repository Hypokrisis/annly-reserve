import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, Mail, Phone, MessageSquare, Check } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAvailability } from '@/hooks/useAvailability';
import { formatCurrency, formatDate, formatTimeDisplay, isValidEmail, isValidPhone } from '@/utils';
import * as businessService from '@/services/business.service';
import * as appointmentsService from '@/services/appointments.service';
import { supabase } from '../supabaseClient';
import type { Business, Service, Barber } from '@/types';

export default function PublicBookingPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const [business, setBusiness] = useState<Business | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [loading, setLoading] = useState(true);

    // Booking flow state
    const [step, setStep] = useState(1);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState<{ time: string; barber_id: string; barber_name: string } | null>(null);
    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        email: '',
        phone: '',
        notes: '',
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    // Load availability when service, barber, and date are selected
    const { availableSlots, loading: loadingSlots } = useAvailability(
        selectedService && selectedDate
            ? {
                businessId: business?.id || '',
                serviceId: selectedService.id,
                barberId: selectedBarber?.id,
                date: selectedDate,
            }
            : null
    );

    // Load business data
    useEffect(() => {
        loadBusinessData();
    }, [slug]);

    const loadBusinessData = async () => {
        if (!slug) return;

        try {
            const businessData = await businessService.getBusinessBySlug(slug);

            if (!businessData) {
                alert('Negocio no encontrado');
                navigate('/');
                return;
            }

            setBusiness(businessData);

            // Load services
            const { data: servicesData } = await supabase
                .from('services')
                .select('*')
                .eq('business_id', businessData.id)
                .eq('is_active', true)
                .order('display_order');

            setServices(servicesData || []);

            // Load barbers
            const { data: barbersData } = await supabase
                .from('barbers')
                .select('*')
                .eq('business_id', businessData.id)
                .eq('is_active', true)
                .order('display_order');

            setBarbers(barbersData || []);
        } catch (error) {
            console.error('Error loading business:', error);
            alert('Error al cargar el negocio');
        } finally {
            setLoading(false);
        }
    };

    const handleServiceSelect = (service: Service) => {
        setSelectedService(service);
        setSelectedBarber(null);
        setSelectedDate('');
        setSelectedSlot(null);
        setStep(2);
    };

    const handleBarberSelect = (barber: Barber | null) => {
        setSelectedBarber(barber);
        setSelectedDate('');
        setSelectedSlot(null);
        setStep(3);
    };

    const handleDateSelect = (date: string) => {
        setSelectedDate(date);
        setSelectedSlot(null);
        setStep(4);
    };

    const handleSlotSelect = (slot: { time: string; barber_id: string; barber_name: string }) => {
        setSelectedSlot(slot);
        setStep(5);
    };

    const validateCustomerInfo = (): boolean => {
        const errors: Record<string, string> = {};

        if (!customerInfo.name.trim()) {
            errors.name = 'El nombre es requerido';
        }

        if (!customerInfo.email.trim()) {
            errors.email = 'El email es requerido';
        } else if (!isValidEmail(customerInfo.email)) {
            errors.email = 'Email inválido';
        }

        if (!customerInfo.phone.trim()) {
            errors.phone = 'El teléfono es requerido';
        } else if (!isValidPhone(customerInfo.phone)) {
            errors.phone = 'Teléfono inválido';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateCustomerInfo()) return;
        if (!selectedService || !selectedSlot || !selectedDate || !business) return;

        setSubmitting(true);

        try {
            await appointmentsService.createAppointment({
                business_id: business.id,
                barber_id: selectedSlot.barber_id,
                service_id: selectedService.id,
                customer_name: customerInfo.name.trim(),
                customer_email: customerInfo.email.trim(),
                customer_phone: customerInfo.phone.trim(),
                customer_notes: customerInfo.notes.trim() || undefined,
                appointment_date: selectedDate,
                start_time: selectedSlot.time,
            });

            setConfirmed(true);
        } catch (error: any) {
            console.error('Error creating appointment:', error);
            alert(error.message || 'Error al crear la cita. Por favor intenta nuevamente.');
        } finally {
            setSubmitting(false);
        }
    };

    // Get minimum date (today)
    const getMinDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    // Get maximum date (based on business settings)
    const getMaxDate = () => {
        const today = new Date();
        const maxDays = business?.max_advance_booking_days || 30;
        const maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() + maxDays);
        return maxDate.toISOString().split('T')[0];
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
                <LoadingSpinner />
            </div>
        );
    }

    if (!business) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
                <p className="text-gray-600">Negocio no encontrado</p>
            </div>
        );
    }

    if (confirmed) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check size={32} className="text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Cita Confirmada!</h1>
                    <p className="text-gray-600 mb-6">
                        Tu cita ha sido reservada exitosamente
                    </p>

                    <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                        <p className="text-sm text-gray-600 mb-2">
                            <strong>Servicio:</strong> {selectedService?.name}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                            <strong>Barbero:</strong> {selectedSlot?.barber_name}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                            <strong>Fecha:</strong> {selectedDate && formatDate(selectedDate)}
                        </p>
                        <p className="text-sm text-gray-600">
                            <strong>Hora:</strong> {selectedSlot && formatTimeDisplay(selectedSlot.time)}
                        </p>
                    </div>

                    <p className="text-sm text-gray-500 mb-6">
                        Recibirás un email de confirmación en {customerInfo.email}
                    </p>

                    <Button onClick={() => window.location.href = '/'}>
                        Volver al Inicio
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-indigo-600 mb-2">{business.name}</h1>
                    <p className="text-gray-600">Reserva tu cita en línea</p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center mb-8">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <div key={s} className="flex items-center">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${s <= step
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-200 text-gray-500'
                                    }`}
                            >
                                {s}
                            </div>
                            {s < 5 && (
                                <div
                                    className={`w-12 h-1 ${s < step ? 'bg-indigo-600' : 'bg-gray-200'
                                        }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Step 1: Select Service */}
                    {step === 1 && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                Selecciona un Servicio
                            </h2>
                            <div className="grid gap-4">
                                {services.map((service) => (
                                    <button
                                        key={service.id}
                                        onClick={() => handleServiceSelect(service)}
                                        className="p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
                                    >
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {service.name}
                                        </h3>
                                        {service.description && (
                                            <p className="text-gray-600 text-sm mb-3">{service.description}</p>
                                        )}
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm text-gray-500">
                                                ⏱️ {service.duration_minutes} min
                                            </span>
                                            <span className="text-lg font-semibold text-indigo-600">
                                                {formatCurrency(service.price)}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Select Barber */}
                    {step === 2 && selectedService && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Selecciona un Barbero
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Servicio: <strong>{selectedService.name}</strong>
                            </p>
                            <div className="grid gap-4">
                                <button
                                    onClick={() => handleBarberSelect(null)}
                                    className="p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
                                >
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Cualquier Barbero Disponible
                                    </h3>
                                    <p className="text-gray-600 text-sm mt-1">
                                        Te asignaremos el primer barbero disponible
                                    </p>
                                </button>
                                {barbers.map((barber) => (
                                    <button
                                        key={barber.id}
                                        onClick={() => handleBarberSelect(barber)}
                                        className="p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
                                    >
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {barber.name}
                                        </h3>
                                        {barber.bio && (
                                            <p className="text-gray-600 text-sm mt-1">{barber.bio}</p>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <Button
                                variant="secondary"
                                onClick={() => setStep(1)}
                                className="mt-6"
                            >
                                Volver
                            </Button>
                        </div>
                    )}

                    {/* Step 3: Select Date */}
                    {step === 3 && selectedService && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Selecciona una Fecha
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Barbero: <strong>{selectedBarber?.name || 'Cualquiera'}</strong>
                            </p>
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => handleDateSelect(e.target.value)}
                                min={getMinDate()}
                                max={getMaxDate()}
                                className="text-lg"
                            />
                            <Button
                                variant="secondary"
                                onClick={() => setStep(2)}
                                className="mt-6"
                            >
                                Volver
                            </Button>
                        </div>
                    )}

                    {/* Step 4: Select Time */}
                    {step === 4 && selectedService && selectedDate && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Selecciona una Hora
                            </h2>
                            <p className="text-gray-600 mb-6">
                                {formatDate(selectedDate)}
                            </p>

                            {loadingSlots ? (
                                <LoadingSpinner />
                            ) : availableSlots.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-600">
                                        No hay horarios disponibles para esta fecha
                                    </p>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setStep(3)}
                                        className="mt-6"
                                    >
                                        Seleccionar Otra Fecha
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        {availableSlots.map((slot, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleSlotSelect(slot)}
                                                className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
                                            >
                                                <p className="font-semibold text-gray-900">
                                                    {formatTimeDisplay(slot.time)}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {slot.barber_name}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setStep(3)}
                                    >
                                        Volver
                                    </Button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Step 5: Customer Info */}
                    {step === 5 && selectedSlot && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                Tus Datos
                            </h2>

                            <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                                <p className="text-sm text-gray-700">
                                    <strong>Resumen:</strong> {selectedService?.name} con {selectedSlot.barber_name}
                                    <br />
                                    {formatDate(selectedDate)} a las {formatTimeDisplay(selectedSlot.time)}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    label="Nombre Completo"
                                    value={customerInfo.name}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                                    error={formErrors.name}
                                    placeholder="Juan Pérez"
                                    required
                                />

                                <Input
                                    label="Email"
                                    type="email"
                                    value={customerInfo.email}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                                    error={formErrors.email}
                                    placeholder="juan@ejemplo.com"
                                    required
                                />

                                <Input
                                    label="Teléfono"
                                    type="tel"
                                    value={customerInfo.phone}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                    error={formErrors.phone}
                                    placeholder="(809) 555-5555"
                                    required
                                />

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Notas (Opcional)
                                    </label>
                                    <textarea
                                        value={customerInfo.notes}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        rows={3}
                                        placeholder="Alguna preferencia o comentario..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <Button
                                    variant="secondary"
                                    onClick={() => setStep(4)}
                                >
                                    Volver
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex-1"
                                >
                                    {submitting ? 'Confirmando...' : 'Confirmar Cita'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
