import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAvailability } from '@/hooks/useAvailability';
import { formatCurrency, formatDate, parseDate, formatTimeDisplay, isValidEmail, isValidPhone } from '@/utils';
import * as appointmentsService from '@/services/appointments.service';
import { supabase } from '@/supabaseClient';
import type { Business, Service, Barber } from '@/types';

export default function PublicBookingPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    useEffect(() => {
        console.log('[BookingPage] Montando componente. slug =', slug);
    }, [slug]);

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

        console.log('[BookingPage] Buscando negocio por slug:', slug);
        setLoading(true);

        try {
            // Robust fetch using maybeSingle to avoid exceptions on 0 rows
            const { data: businessData, error: businessError } = await supabase
                .from('businesses')
                .select('*')
                .eq('slug', slug)
                .eq('is_active', true)
                .maybeSingle();

            if (businessError) {
                console.error('[BookingPage] Error fetching business:', businessError);
                throw businessError;
            }

            if (!businessData) {
                console.log('[BookingPage] Negocio no encontrado (0 rows)');
                // Stay on page but show "Not Found" UI instead of infinite redirect loop
                setBusiness(null);
                setLoading(false);
                return;
            }

            console.log('[BookingPage] Negocio encontrado:', businessData);
            setBusiness(businessData);

            // Parallel fetch for services and barbers
            // Note: RLS policies must allow public read for these
            const [servicesResult, barbersResult, bsResult] = await Promise.all([
                supabase
                    .from('services')
                    .select('*')
                    .eq('business_id', businessData.id)
                    .eq('is_active', true)
                    .order('display_order'),
                supabase
                    .from('barbers')
                    .select('*')
                    .eq('business_id', businessData.id)
                    .eq('is_active', true)
                    .order('display_order'),
                supabase
                    .from('barbers_services')
                    .select('barber_id, service_id')
            ]);

            if (servicesResult.error) console.error('Error services:', servicesResult.error);
            if (barbersResult.error) console.error('Error barbers:', barbersResult.error);

            setServices(servicesResult.data || []);

            const barbersList = barbersResult.data || [];
            const bsList = bsResult.data || [];

            // Merge services into barbers
            const barbersWithServices = barbersList.map(barber => ({
                ...barber,
                barbers_services: bsList.filter(bs => bs.barber_id === barber.id)
            }));

            setBarbers(barbersWithServices);

        } catch (error: any) {
            console.error('[BookingPage] Fatal error:', error);
            alert('Error al cargar la información. Intente recargar.');
        } finally {
            // ALWAYS finish loading
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

    // Load customer info from localStorage on mount
    useEffect(() => {
        const savedInfo = localStorage.getItem('customerInfo');
        if (savedInfo) {
            try {
                const parsed = JSON.parse(savedInfo);
                setCustomerInfo(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error('Error parsing saved customer info', e);
            }
        }
    }, []);

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
            // Check for existing active appointment in this business
            const { data: existingActive } = await supabase
                .from('appointments')
                .select('id')
                .eq('business_id', business.id)
                .eq('customer_email', customerInfo.email.toLowerCase().trim())
                .in('status', ['confirmed', 'pending'])
                .order('created_at', { ascending: false })
                .limit(1);

            if (existingActive && existingActive.length > 0) {
                alert('Ya tienes una cita activa en esta barbería. Cancélala para crear una nueva.');
                setSubmitting(false);
                return;
            }

            await appointmentsService.createAppointment({
                business_id: business.id,
                barber_id: selectedSlot.barber_id,
                service_id: selectedService.id,
                customer_name: customerInfo.name.trim(),
                customer_email: customerInfo.email.toLowerCase().trim(),
                customer_phone: customerInfo.phone.trim(),
                customer_notes: customerInfo.notes.trim() || undefined,
                appointment_date: selectedDate,
                start_time: selectedSlot.time,
            });

            // SAVE TO LOCAL STORAGE
            localStorage.setItem('customerInfo', JSON.stringify({
                name: customerInfo.name,
                email: customerInfo.email,
                phone: customerInfo.phone
            }));

            // Save to Recent Businesses
            const recent = JSON.parse(localStorage.getItem('recentBusinesses') || '[]');
            if (business.slug && !recent.includes(business.slug)) {
                const updatedRecents = [business.slug, ...recent].slice(0, 10); // Keep last 10
                localStorage.setItem('recentBusinesses', JSON.stringify(updatedRecents));
            }

            setConfirmed(true);
        } catch (error: any) {
            console.error('Error creating appointment:', error);

            // Check for unique constraint violation (Double Booking)
            if (error.code === '23505') {
                alert('Ese horario ya fue reservado. Por favor elige otro.');
            } else {
                alert(error.message || 'Error al crear la cita. Por favor intenta nuevamente.');
            }
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
                            <strong>Fecha:</strong> {selectedDate && formatDate(parseDate(selectedDate))}
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
                    <h1 className="text-3xl md:text-4xl font-bold text-indigo-600 mb-2">{business.name}</h1>
                    <p className="text-gray-600">Reserva tu cita en línea</p>
                </div>

                {/* Progress Steps - Scrollable on mobile */}
                <div className="flex items-center justify-center mb-8 overflow-x-auto pb-4 px-2 no-scrollbar">
                    <div className="flex items-center min-w-max">
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
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8">
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
                                {barbers
                                    .filter(barber => {
                                        // Filter barbers who offer the selected service
                                        // We cast to any because barbers_services is joined dynamically
                                        const barberServices = (barber as any).barbers_services;
                                        if (!barberServices) return true; // Fallback if join failed
                                        return barberServices.some((bs: any) => bs.service_id === selectedService.id);
                                    })
                                    .map((barber) => (
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
                            <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
                                {[
                                    { label: 'Hoy', value: new Date().toISOString().split('T')[0] },
                                    { label: 'Mañana', value: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
                                    {
                                        label: 'En 7 días',
                                        value: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
                                    }
                                ].map((quickDate) => (
                                    <button
                                        key={quickDate.value}
                                        onClick={() => handleDateSelect(quickDate.value)}
                                        className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${selectedDate === quickDate.value
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {quickDate.label}
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Otra fecha</label>
                                <Input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => handleDateSelect(e.target.value)}
                                    min={getMinDate()}
                                    max={getMaxDate()}
                                    className="text-lg h-[44px]"
                                />
                            </div>
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
                                {formatDate(parseDate(selectedDate))}
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
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                                        {availableSlots.map((slot, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleSlotSelect(slot)}
                                                className={`min-h-[60px] p-3 md:p-4 border-2 rounded-2xl transition-all flex flex-col items-center justify-center ${selectedSlot?.time === slot.time
                                                    ? 'border-indigo-600 bg-indigo-50 shadow-md'
                                                    : 'border-gray-100 bg-gray-50 hover:border-indigo-200'
                                                    }`}
                                            >
                                                <p className="font-bold text-gray-900 text-sm md:text-base">
                                                    {formatTimeDisplay(slot.time)}
                                                </p>
                                                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 truncate w-full text-center">
                                                    {slot.barber_name}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setStep(3)}
                                        className="hidden md:block"
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
                                    {formatDate(parseDate(selectedDate))} a las {formatTimeDisplay(selectedSlot.time)}
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

            {/* Fixed Navigation for Mobile UX */}
            {step > 1 && (
                <div className="fixed bottom-6 left-0 right-0 px-6 flex justify-between items-center z-50 pointer-events-none md:hidden">
                    <button
                        onClick={() => setStep(prev => prev - 1)}
                        className="pointer-events-auto bg-white/90 backdrop-blur-md text-gray-700 w-12 h-12 rounded-full shadow-2xl border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition"
                        title="Atrás"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="pointer-events-auto bg-black text-white px-8 h-12 rounded-full shadow-2xl flex items-center gap-2 font-bold hover:bg-gray-900 transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                        Inicio
                    </button>
                </div>
            )}
        </div>
    );
}
