import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, Home, Calendar as CalendarIcon, Clock, User as UserIcon, Scissors, Star } from 'lucide-react';
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
    const [, setLoadingProfile] = useState(false);

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
        <div className="min-h-screen flex items-center justify-center bg-space-bg">
            <LoadingSpinner />
        </div>
    );

    if (!business) return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg">
            <p className="text-space-muted font-bold uppercase tracking-widest text-xs">Negocio no encontrado</p>
        </div>
    );

    // Require login to book
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-space-bg p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-space-primary/10 via-space-purple/10 to-transparent pointer-events-none"></div>
                <div className="w-[500px] h-[500px] bg-space-primary/20 rounded-full absolute -top-40 -right-40 blur-[100px] animate-pulse-subtle"></div>

                <div className="max-w-md w-full glass-effect rounded-[2.5rem] shadow-2xl p-10 text-center border border-space-border relative z-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-space-primary to-space-purple rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-space-primary/30 animate-float">
                        <UserIcon size={40} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Accede para reservar</h2>
                    <p className="text-space-muted mb-8 font-medium">
                        Necesitas una cuenta para agendar en <span className="text-white font-bold">{business.name}</span>.
                    </p>
                    <div className="space-y-4">
                        <Button
                            onClick={() => navigate(`/login?returnTo=/book/${slug}`)}
                            className="w-full rounded-full h-14 text-sm font-bold uppercase tracking-widest shadow-xl bg-gradient-to-r from-space-primary to-space-purple border-none hover:shadow-space-primary/20 hover:scale-[1.02] transition-all"
                        >
                            Iniciar Sesión
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => navigate('/signup')}
                            className="w-full rounded-full h-14 text-sm font-bold uppercase tracking-widest bg-space-card2 text-white border-transparent hover:bg-space-card hover:border-space-primary/50"
                        >
                            Crear Cuenta Gratis
                        </Button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full text-sm text-space-muted hover:text-white font-medium mt-4 transition"
                        >
                            Volver al inicio
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (confirmed) return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg p-4 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-space-success/10 via-space-bg to-space-bg pointer-events-none"></div>
            <div className="max-w-md w-full glass-effect rounded-[2.5rem] shadow-2xl p-10 text-center border border-space-border relative z-10 animate-fade-in">
                <div className="w-24 h-24 bg-gradient-to-br from-space-success to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-500 shadow-xl shadow-space-success/20">
                    <Check size={48} className="text-white" />
                </div>
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-space-muted mb-4 tracking-tight italic">¡LISTO!</h1>
                <p className="text-space-muted mb-8 font-medium">
                    Tu cita ha sido reservada con éxito.
                </p>

                <div className="bg-space-card/80 backdrop-blur-md rounded-3xl p-6 mb-8 text-left space-y-4 border border-space-border/50">
                    <div className="flex items-center gap-4 text-sm">
                        <div className="w-8 h-8 rounded-full bg-space-bg flex items-center justify-center border border-space-border text-space-primary">
                            <Scissors size={14} />
                        </div>
                        <span className="font-bold text-white">{selectedService?.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="w-8 h-8 rounded-full bg-space-bg flex items-center justify-center border border-space-border text-space-purple">
                            <UserIcon size={14} />
                        </div>
                        <span className="font-bold text-white">{selectedSlot?.barber_name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="w-8 h-8 rounded-full bg-space-bg flex items-center justify-center border border-space-border text-space-pink">
                            <CalendarIcon size={14} />
                        </div>
                        <span className="font-bold text-white">{selectedDate && formatDate(parseDate(selectedDate))}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="w-8 h-8 rounded-full bg-space-bg flex items-center justify-center border border-space-border text-space-yellow">
                            <Clock size={14} />
                        </div>
                        <span className="font-bold text-white">{selectedSlot && formatTimeDisplay(selectedSlot.time)}</span>
                    </div>
                </div>

                <Button onClick={() => navigate('/')} className="w-full rounded-full h-14 text-sm font-black uppercase tracking-widest shadow-xl bg-space-card hover:bg-space-card2 border border-space-border hover:border-space-primary/50 text-white">
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
        <div className="min-h-screen bg-space-bg py-12 px-4 pb-32 relative overflow-x-hidden">
            {/* Background ambients */}
            <div className="fixed -top-40 -left-40 w-96 h-96 bg-space-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="fixed top-40 -right-40 w-80 h-80 bg-space-purple/5 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="max-w-2xl mx-auto relative z-10 transition-all duration-500 ease-in-out">
                {/* Header Section */}
                <header className="text-center mb-12 animate-fade-in">
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-space-muted to-white mb-4 tracking-tighter uppercase italic drop-shadow-lg">{business.name}</h1>
                    <div className="inline-flex items-center gap-2 bg-space-card/80 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-space-border/50">
                        <span className="w-2 h-2 rounded-full bg-space-success animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Reservas Online</p>
                    </div>
                </header>

                {/* Progress Steps */}
                <div className="flex justify-center mb-12 animate-fade-in delay-100">
                    <div className="flex items-center gap-2 bg-space-card/50 backdrop-blur-md p-2 rounded-full shadow-lg border border-space-border/50 max-w-full overflow-x-auto no-scrollbar scroll-smooth">
                        {steps.map((s) => (
                            <div
                                key={s.id}
                                onClick={() => s.id < step && setStep(s.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all cursor-pointer whitespace-nowrap border ${s.id === step
                                    ? 'bg-space-primary text-white shadow-lg shadow-space-primary/20 border-space-primary'
                                    : s.id < step
                                        ? 'bg-space-card text-white hover:bg-space-card2 border-space-border'
                                        : 'text-space-muted border-transparent'
                                    }`}
                            >
                                <span className="text-[10px] font-black">{`0${s.id}`}</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-effect rounded-[2.5rem] shadow-2xl p-6 md:p-10 border border-space-border/50 relative overflow-hidden min-h-[500px] flex flex-col justify-center animate-fade-in delay-200">
                    {/* Decorative blur inside card */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-space-primary/5 rounded-full blur-[60px] pointer-events-none"></div>

                    {/* Step 1: Select Service */}
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500 relative z-10 w-full">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Escoge un servicio</h2>
                                <p className="text-xs font-bold text-space-muted uppercase tracking-widest">¿Qué haremos hoy?</p>
                            </div>
                            <div className="grid gap-4">
                                {services.map((service) => (
                                    <button
                                        key={service.id}
                                        onClick={() => handleServiceSelect(service)}
                                        className="group p-5 bg-space-card/50 hover:bg-space-card border border-space-border/50 hover:border-space-primary/50 rounded-3xl transition-all duration-300 text-left flex items-center justify-between backdrop-blur-sm"
                                    >
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-space-primary transition-colors">
                                                {service.name}
                                            </h3>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-space-muted uppercase tracking-widest flex items-center gap-1 bg-space-bg px-2 py-1 rounded-lg border border-space-border">
                                                    <Clock size={10} /> {service.duration_minutes} MIN
                                                </span>
                                                <span className="text-sm font-bold text-white flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-space-success"></span>
                                                    {formatCurrency(service.price)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-12 h-12 rounded-2xl bg-space-bg flex items-center justify-center group-hover:bg-space-primary group-hover:text-white transition-all border border-space-border group-hover:border-transparent shadow-lg">
                                            <Scissors size={20} className="group-hover:scale-110 transition-transform" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Select Barber */}
                    {step === 2 && selectedService && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500 relative z-10 w-full">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Elige a tu barbero</h2>
                                <p className="text-xs font-bold text-space-muted uppercase tracking-widest">Servicio: <span className="text-white">{selectedService.name}</span></p>
                            </div>
                            <div className="grid gap-4">
                                <button
                                    onClick={() => handleBarberSelect(null)}
                                    className="p-6 bg-gradient-to-r from-space-primary to-space-purple text-white rounded-3xl shadow-lg shadow-space-primary/20 hover:scale-[1.02] transition-all text-center mb-2 active:scale-95"
                                >
                                    <div className="flex justify-center mb-2"><Star size={24} className="fill-white" /></div>
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em]">Cualquiera disponible</h3>
                                    <p className="text-[10px] text-white/70 font-bold mt-1 uppercase">Lo antes posible</p>
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
                                            className="group p-5 bg-space-card/50 hover:bg-space-card border border-space-border/50 hover:border-space-purple/50 rounded-3xl transition-all duration-300 text-left flex items-center gap-6 backdrop-blur-sm"
                                        >
                                            <div className="w-14 h-14 bg-space-bg rounded-2xl flex items-center justify-center group-hover:bg-space-purple group-hover:text-white transition-all shrink-0 border border-space-border shadow-lg">
                                                <UserIcon size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-white group-hover:text-space-purple transition-colors">
                                                    {barber.name}
                                                </h3>
                                                {barber.bio && (
                                                    <p className="text-xs text-space-muted line-clamp-1 mt-1 font-medium">{barber.bio}</p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Select Date */}
                    {step === 3 && selectedService && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500 relative z-10 w-full">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Reserva el día</h2>
                                <p className="text-xs font-bold text-space-muted uppercase tracking-widest">
                                    Con <span className="text-white">{selectedBarber?.name || 'Cualquier barbero'}</span>
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
                                        className={`px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all min-h-[60px] border ${selectedDate === quickDate.value
                                            ? 'bg-space-primary text-white shadow-lg shadow-space-primary/20 scale-105 border-space-primary'
                                            : 'bg-space-card hover:bg-space-card2 text-space-muted hover:text-white border-space-border'
                                            }`}
                                    >
                                        {quickDate.label}
                                    </button>
                                ))}
                            </div>

                            <div className="max-w-xs mx-auto text-center">
                                <label className="block text-[10px] font-black text-space-muted uppercase tracking-[0.2em] mb-4">O elige una fecha específica</label>
                                <div className="relative group">
                                    <Input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => handleDateSelect(e.target.value)}
                                        min={getMinDate()}
                                        max={getMaxDate()}
                                        className="text-center font-bold uppercase text-sm h-14 rounded-2xl bg-space-card border-space-border text-white focus:ring-space-purple focus:border-transparent transition-all hover:bg-space-card2 cursor-pointer"
                                    />
                                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-space-muted pointer-events-none group-hover:text-white transition-colors" size={18} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Select Time */}
                    {step === 4 && selectedService && selectedDate && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500 relative z-10 w-full">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Escoge la hora</h2>
                                <p className="text-xs font-bold text-space-muted uppercase tracking-widest bg-space-bg inline-block px-3 py-1 rounded-lg border border-space-border">
                                    {formatDate(parseDate(selectedDate))}
                                </p>
                            </div>

                            {loadingSlots ? (
                                <div className="py-20 flex justify-center"><LoadingSpinner /></div>
                            ) : availableSlots.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-sm font-bold text-space-muted uppercase tracking-widest mb-6 border border-space-danger/20 bg-space-danger/5 p-4 rounded-xl">No hay horarios disponibles para esta fecha</p>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setStep(3)}
                                        className="rounded-full px-8 h-12 text-[10px] font-black uppercase tracking-widest bg-space-card hover:bg-space-card2 text-white border-transparent"
                                    >
                                        Cambiar Fecha
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {availableSlots.map((slot, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSlotSelect(slot)}
                                            className={`py-4 px-2 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 ${selectedSlot?.time === slot.time
                                                ? 'border-space-primary bg-space-primary text-white shadow-lg shadow-space-primary/20 scale-105 z-10'
                                                : 'border-space-border bg-space-card/60 hover:bg-space-card hover:border-space-primary/30 text-white'
                                                }`}
                                        >
                                            <span className="font-bold text-lg leading-none">
                                                {formatTimeDisplay(slot.time)}
                                            </span>
                                            <span className={`text-[9px] font-bold uppercase tracking-widest truncate w-full text-center opacity-70`}>
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
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500 relative z-10 w-full">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Tus datos</h2>
                                <p className="text-xs font-bold text-space-muted uppercase tracking-widest">Finalizar reserva</p>
                            </div>

                            <div className="bg-space-card2 border border-space-border rounded-[2rem] p-6 mb-8 flex flex-col sm:flex-row gap-6 items-center justify-center text-center sm:text-left shadow-lg">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-space-muted uppercase tracking-widest">Servicio</p>
                                    <p className="text-sm font-bold leading-tight text-white">{selectedService?.name}</p>
                                </div>
                                <div className="hidden sm:block w-px h-8 bg-space-border"></div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-space-muted uppercase tracking-widest">Barbero</p>
                                    <p className="text-sm font-bold leading-tight text-white">{selectedSlot.barber_name}</p>
                                </div>
                                <div className="hidden sm:block w-px h-8 bg-space-border"></div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-space-muted uppercase tracking-widest">Horario</p>
                                    <p className="text-sm font-bold leading-tight text-white">{formatDate(parseDate(selectedDate))} <span className="text-space-primary">@</span> {formatTimeDisplay(selectedSlot.time)}</p>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <Input
                                    label="Nombre Completo"
                                    value={customerInfo.name}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                                    error={formErrors.name}
                                    placeholder="Ej: Juan Pérez"
                                    required
                                    className="h-14 rounded-2xl bg-space-bg border-space-border text-white focus:ring-space-purple focus:border-transparent transition-all placeholder-space-muted/30"
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
                                        className="h-14 rounded-2xl bg-space-bg border-space-border text-white focus:ring-space-purple focus:border-transparent transition-all placeholder-space-muted/30"
                                    />
                                    <Input
                                        label="Teléfono"
                                        type="tel"
                                        value={customerInfo.phone}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                        error={formErrors.phone}
                                        placeholder="(809) 555-5555"
                                        required
                                        className="h-14 rounded-2xl bg-space-bg border-space-border text-white focus:ring-space-purple focus:border-transparent transition-all placeholder-space-muted/30"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-space-muted uppercase tracking-widest mb-2 ml-1">Notas (Opcional)</label>
                                    <textarea
                                        value={customerInfo.notes}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                                        className="w-full px-4 py-4 bg-space-bg border border-space-border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-space-purple focus:border-transparent transition-all text-sm font-medium placeholder-space-muted/30"
                                        rows={3}
                                        placeholder="¿Alguna preferencia?"
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full mt-10 rounded-full h-16 text-sm font-black uppercase tracking-[0.2em] bg-gradient-to-r from-space-primary to-space-purple text-white shadow-2xl shadow-space-primary/30 hover:scale-[1.02] active:scale-95 transition-all border-none"
                            >
                                {submitting ? 'Confirmando...' : 'Confirmar Cita'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Floating Navigation for Mobile UX */}
            {step > 1 && (
                <div className="fixed bottom-8 left-0 right-0 px-6 flex justify-between items-center z-50 pointer-events-none sm:hidden animate-fade-in-up">
                    <button
                        onClick={() => setStep(prev => prev - 1)}
                        className="pointer-events-auto bg-space-card2/80 backdrop-blur-md text-white w-14 h-14 rounded-full shadow-2xl border border-space-border flex items-center justify-center hover:bg-space-card transition active:scale-90"
                        title="Atrás"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="pointer-events-auto bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 h-14 rounded-full shadow-2xl flex items-center gap-3 font-black uppercase tracking-widest text-[10px] hover:bg-white/20 transition active:scale-95"
                    >
                        <Home size={18} />
                        Principal
                    </button>
                </div>
            )}
        </div>
    );
}
