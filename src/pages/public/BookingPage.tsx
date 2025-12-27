import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, Home, Calendar as CalendarIcon, Clock, User as UserIcon, Scissors } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAvailability } from '@/hooks/useAvailability';
import { formatCurrency, formatDate, parseDate, formatTimeDisplay, isValidEmail, isValidPhone } from '@/utils';
import * as appointmentsService from '@/services/appointments.service';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import type { Business, Service, Barber } from '@/types';

export default function PublicBookingPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

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
    const [userProfile, setUserProfile] = useState<{ full_name?: string; phone?: string } | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

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
        setLoading(true);

        try {
            const { data: businessData, error: businessError } = await supabase
                .from('businesses')
                .select('*')
                .eq('slug', slug)
                .eq('is_active', true)
                .maybeSingle();

            if (businessError) throw businessError;

            if (!businessData) {
                setBusiness(null);
                setLoading(false);
                return;
            }

            setBusiness(businessData);

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

            setServices(servicesResult.data || []);
            const barbersList = barbersResult.data || [];
            const bsList = bsResult.data || [];

            const barbersWithServices = barbersList.map(barber => ({
                ...barber,
                barbers_services: bsList.filter(bs => bs.barber_id === barber.id)
            }));

            setBarbers(barbersWithServices);

        } catch (error: any) {
            console.error('[BookingPage] Fatal error:', error);
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

    useEffect(() => {
        const savedInfo = localStorage.getItem('annly_customer_data');
        if (savedInfo) {
            try {
                const parsed = JSON.parse(savedInfo);
                setCustomerInfo(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error('Error parsing saved customer info', e);
            }
        }
    }, []);

    // Load user profile if logged in
    useEffect(() => {
        const loadUserProfile = async () => {
            if (!user) return;

            setLoadingProfile(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('full_name, phone')
                    .eq('id', user.id)
                    .maybeSingle();

                if (!error && data) {
                    setUserProfile(data);
                    // Autocomplete customer info from profile
                    setCustomerInfo(prev => ({
                        ...prev,
                        name: data.full_name || prev.name,
                        email: user.email || prev.email,
                        phone: data.phone || prev.phone,
                    }));
                }
            } catch (e) {
                console.error('Error loading profile:', e);
            } finally {
                setLoadingProfile(false);
            }
        };

        loadUserProfile();
    }, [user]);

    const validateCustomerInfo = (): boolean => {
        const errors: Record<string, string> = {};
        if (!customerInfo.name.trim()) errors.name = 'El nombre es requerido';
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
            const { data: existingActive } = await supabase
                .from('appointments')
                .select('id')
                .eq('business_id', business.id)
                .eq('customer_email', customerInfo.email.toLowerCase().trim())
                .in('status', ['confirmed', 'pending'])
                .order('created_at', { ascending: false })
                .limit(1);

            if (existingActive && existingActive.length > 0) {
                alert('Ya tienes una cita activa en esta barbería.');
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
                customer_user_id: user?.id, // Link to authenticated user
            });

            localStorage.setItem('annly_customer_data', JSON.stringify({
                name: customerInfo.name,
                email: customerInfo.email,
                phone: customerInfo.phone
            }));

            setConfirmed(true);
        } catch (error: any) {
            console.error('Error creating appointment:', error);
            alert(error.message || 'Error al crear la cita.');
        } finally {
            setSubmitting(false);
        }
    };

    const getMinDate = () => new Date().toISOString().split('T')[0];
    const getMaxDate = () => {
        const today = new Date();
        const maxDays = business?.max_advance_booking_days || 30;
        const maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() + maxDays);
        return maxDate.toISOString().split('T')[0];
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <LoadingSpinner />
        </div>
    );

    if (!business) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Negocio no encontrado</p>
        </div>
    );

    // Require login to book
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border border-gray-100">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <UserIcon size={40} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Inicia sesión para reservar</h2>
                    <p className="text-gray-600 mb-8 font-medium">
                        Necesitas una cuenta para hacer una reserva. Es rápido y gratis.
                    </p>
                    <div className="space-y-3">
                        <Button
                            onClick={() => navigate(`/login?returnTo=/book/${slug}`)}
                            className="w-full rounded-full h-14 text-sm font-black uppercase tracking-widest shadow-xl"
                        >
                            Iniciar Sesión
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => navigate('/signup')}
                            className="w-full rounded-full h-14 text-sm font-black uppercase tracking-widest"
                        >
                            Crear Cuenta Gratis
                        </Button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full text-sm text-gray-500 hover:text-gray-700 font-medium mt-4 transition"
                        >
                            Volver al inicio
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (confirmed) return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center">
                <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-500">
                    <Check size={40} className="text-white" />
                </div>
                <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight italic">¡LISTO!</h1>
                <p className="text-gray-500 mb-8 font-medium">
                    Tu cita ha sido reservada con éxito.
                </p>

                <div className="bg-gray-50 rounded-3xl p-6 mb-8 text-left space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                        <Scissors size={16} className="text-gray-400" />
                        <span className="font-bold text-gray-900">{selectedService?.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <UserIcon size={16} className="text-gray-400" />
                        <span className="font-bold text-gray-900">{selectedSlot?.barber_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <CalendarIcon size={16} className="text-gray-400" />
                        <span className="font-bold text-gray-900">{selectedDate && formatDate(parseDate(selectedDate))}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <Clock size={16} className="text-gray-400" />
                        <span className="font-bold text-gray-900">{selectedSlot && formatTimeDisplay(selectedSlot.time)}</span>
                    </div>
                </div>

                <Button onClick={() => navigate('/')} className="w-full rounded-full h-14 text-sm font-black uppercase tracking-widest shadow-xl shadow-black/10">
                    Volver al Inicio
                </Button>
            </div>
        </div>
    );

    const steps = [
        { id: 1, label: 'Servicio' },
        { id: 2, label: 'Barbero' },
        { id: 3, label: 'Fecha' },
        { id: 4, label: 'Hora' },
        { id: 5, label: 'Datos' }
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 pb-32">
            <div className="max-w-2xl mx-auto">
                {/* Header Section */}
                <header className="text-center mb-12">
                    <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter uppercase italic">{business.name}</h1>
                    <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
                        <span className="w-2 h-2 rounded-full bg-black animate-pulse"></span>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Reservas Online</p>
                    </div>
                </header>

                {/* New Progress Steps */}
                <div className="flex justify-center mb-12">
                    <div className="flex items-center gap-3 bg-white p-2 rounded-full shadow-sm border border-gray-100 max-w-full overflow-x-auto no-scrollbar">
                        {steps.map((s) => (
                            <div
                                key={s.id}
                                onClick={() => s.id < step && setStep(s.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all cursor-pointer whitespace-nowrap ${s.id === step
                                    ? 'bg-black text-white shadow-lg shadow-black/20'
                                    : s.id < step
                                        ? 'text-gray-900 hover:bg-gray-100'
                                        : 'text-gray-300'
                                    }`}
                            >
                                <span className={`text-[10px] font-black ${s.id === step ? 'text-white' : 'text-inherit'}`}>0{s.id}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-black/5 p-8 border border-gray-100">
                    {/* Step 1: Select Service */}
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-10">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight italic uppercase mb-2">Escoge un servicio</h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">¿Qué haremos hoy?</p>
                            </div>
                            <div className="grid gap-4">
                                {services.map((service) => (
                                    <button
                                        key={service.id}
                                        onClick={() => handleServiceSelect(service)}
                                        className="group p-6 bg-white border border-gray-100 rounded-3xl hover:border-black hover:shadow-2xl hover:shadow-black/5 transition-all duration-300 text-left flex items-center justify-between"
                                    >
                                        <div className="flex-1">
                                            <h3 className="text-lg font-black text-gray-900 mb-1 group-hover:italic transition-all">
                                                {service.name}
                                            </h3>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                    <Clock size={10} /> {service.duration_minutes} MIN
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-gray-200"></span>
                                                <span className="text-sm font-black text-black">
                                                    {formatCurrency(service.price)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                                            <Check size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Select Barber */}
                    {step === 2 && selectedService && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-10">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight italic uppercase mb-2">Elige a tu barbero</h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Servicio: {selectedService.name}</p>
                            </div>
                            <div className="grid gap-4">
                                <button
                                    onClick={() => handleBarberSelect(null)}
                                    className="p-6 bg-black text-white rounded-3xl shadow-xl shadow-black/20 hover:scale-[1.02] transition-all text-center mb-2"
                                >
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em]">Cualquiera disponible</h3>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">Ahorra tiempo y hazlo rápido</p>
                                </button>

                                {barbers
                                    .filter(barber => {
                                        const barberServices = (barber as any).barbers_services;
                                        if (!barberServices) return true;
                                        return barberServices.some((bs: any) => bs.service_id === selectedService.id);
                                    })
                                    .map((barber) => (
                                        <button
                                            key={barber.id}
                                            onClick={() => handleBarberSelect(barber)}
                                            className="group p-6 bg-white border border-gray-100 rounded-3xl hover:border-black hover:shadow-2xl hover:shadow-black/5 transition-all duration-300 text-left flex items-center gap-6"
                                        >
                                            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all shrink-0">
                                                <UserIcon size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-black text-gray-900 group-hover:italic transition-all">
                                                    {barber.name}
                                                </h3>
                                                {barber.bio && (
                                                    <p className="text-xs text-gray-500 line-clamp-1 mt-1 font-medium">{barber.bio}</p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Select Date */}
                    {step === 3 && selectedService && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-10">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight italic uppercase mb-2">Reserva el día</h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Con {selectedBarber?.name || 'Cualquier barbero'}
                                </p>
                            </div>

                            <div className="flex justify-center gap-3 mb-10 pb-2">
                                {[
                                    { label: 'Hoy', value: new Date().toISOString().split('T')[0] },
                                    { label: 'Mañana', value: new Date(Date.now() + 86400000).toISOString().split('T')[0] }
                                ].map((quickDate) => (
                                    <button
                                        key={quickDate.value}
                                        onClick={() => handleDateSelect(quickDate.value)}
                                        className={`px-8 py-4 rounded-full text-xs font-black uppercase tracking-widest transition-all min-h-[56px] ${selectedDate === quickDate.value
                                            ? 'bg-black text-white shadow-xl shadow-black/20 scale-105'
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        {quickDate.label}
                                    </button>
                                ))}
                            </div>

                            <div className="max-w-xs mx-auto text-center">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">O elige una fecha específica</label>
                                <div className="relative">
                                    <Input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => handleDateSelect(e.target.value)}
                                        min={getMinDate()}
                                        max={getMaxDate()}
                                        className="text-center font-black uppercase text-sm h-14 rounded-full bg-gray-50 border-transparent focus:bg-white focus:border-black transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Select Time */}
                    {step === 4 && selectedService && selectedDate && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-10">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight italic uppercase mb-2">Escoge la hora</h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    {formatDate(parseDate(selectedDate))}
                                </p>
                            </div>

                            {loadingSlots ? (
                                <div className="py-20 flex justify-center"><LoadingSpinner /></div>
                            ) : availableSlots.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">No hay horarios disponibles</p>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setStep(3)}
                                        className="rounded-full px-8 h-12 text-[10px] font-black uppercase tracking-widest"
                                    >
                                        Cambiar Fecha
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-2">
                                    {availableSlots.map((slot, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSlotSelect(slot)}
                                            className={`min-h-[72px] p-4 rounded-3xl border-2 transition-all flex flex-col items-center justify-center ${selectedSlot?.time === slot.time
                                                ? 'border-black bg-black text-white shadow-xl shadow-black/20'
                                                : 'border-transparent bg-gray-50 hover:bg-gray-100 hover:border-gray-200'
                                                }`}
                                        >
                                            <span className="font-black text-lg italic tracking-tight leading-none mb-1">
                                                {formatTimeDisplay(slot.time)}
                                            </span>
                                            <span className={`text-[9px] font-bold uppercase tracking-widest truncate w-full text-center ${selectedSlot?.time === slot.time ? 'text-gray-400' : 'text-gray-400'}`}>
                                                {slot.barber_name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 5: Customer Info */}
                    {step === 5 && selectedSlot && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight italic uppercase mb-2">Tus datos</h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Finalizar reserva</p>
                            </div>

                            <div className="bg-black text-white rounded-[2rem] p-6 mb-8 flex flex-wrap gap-6 items-center justify-center text-center sm:text-left">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Servicio & Barbero</p>
                                    <p className="text-sm font-bold leading-tight">{selectedService?.name} con {selectedSlot.barber_name}</p>
                                </div>
                                <div className="w-px h-8 bg-gray-800 hidden sm:block"></div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cita</p>
                                    <p className="text-sm font-bold leading-tight">{formatDate(parseDate(selectedDate))} @ {formatTimeDisplay(selectedSlot.time)}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <Input
                                    label="Nombre Completo"
                                    value={customerInfo.name}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                                    error={formErrors.name}
                                    placeholder="Ej: Juan Pérez"
                                    required
                                    className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-black transition-all"
                                />

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <Input
                                        label="Email"
                                        type="email"
                                        value={customerInfo.email}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                                        error={formErrors.email}
                                        placeholder="juan@ejemplo.com"
                                        required
                                        className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-black transition-all"
                                    />
                                    <Input
                                        label="Teléfono"
                                        type="tel"
                                        value={customerInfo.phone}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                        error={formErrors.phone}
                                        placeholder="(809) 555-5555"
                                        required
                                        className="h-14 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-black transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Notas (Opcional)</label>
                                    <textarea
                                        value={customerInfo.notes}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                                        className="w-full px-4 py-4 bg-gray-50 border-transparent rounded-2xl focus:ring-2 focus:ring-black focus:bg-white focus:border-transparent transition-all text-sm font-medium"
                                        rows={3}
                                        placeholder="¿Alguna preferencia?"
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full mt-10 rounded-full h-16 text-sm font-black uppercase tracking-[0.2em] bg-black text-white shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                {submitting ? 'Confirmando...' : 'Confirmar Cita'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Floating Navigation for Mobile UX */}
            {step > 1 && (
                <div className="fixed bottom-8 left-0 right-0 px-6 flex justify-between items-center z-50 pointer-events-none sm:hidden">
                    <button
                        onClick={() => setStep(prev => prev - 1)}
                        className="pointer-events-auto bg-white/90 backdrop-blur-md text-black w-14 h-14 rounded-full shadow-2xl border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition active:scale-90"
                        title="Atrás"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="pointer-events-auto bg-black text-white px-8 h-14 rounded-full shadow-2xl flex items-center gap-3 font-black uppercase tracking-widest text-[10px] hover:bg-gray-900 transition active:scale-95"
                    >
                        <Home size={18} />
                        Principal
                    </button>
                </div>
            )}
        </div>
    );
}
