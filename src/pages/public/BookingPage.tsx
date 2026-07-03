import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Check, ChevronLeft, Home, Calendar as CalendarIcon, Clock, User as UserIcon, Scissors, Star, Instagram, Globe, Building2, X, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { MonthGridCalendar } from '@/components/calendar/MonthGridCalendar';
import { useAvailability } from '@/hooks/useAvailability';
import { formatCurrency, formatDate, parseDate, formatTimeDisplay, isValidEmail, isValidPhone, normalizePhoneE164 } from '@/utils';
import { isSlotAvailable } from '@/services/availability.service';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import type { Business, Service, Barber } from '@/types';

export default function PublicBookingPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { user, login } = useAuth();

    const [business, setBusiness] = useState<Business | null>(null);
    const [businessInactive, setBusinessInactive] = useState(false);
    const [services, setServices] = useState<Service[]>([]);
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [loading, setLoading] = useState(true);
    const [queueStats, setQueueStats] = useState({ count: 0, waitMins: 0 });

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
    const [confirmedAptId, setConfirmedAptId] = useState<string | null>(null);
    const [, setLoadingProfile] = useState(false);

    // Guest save modal state
    const [showGuestModal, setShowGuestModal] = useState(false);
    // El email/teléfono de esta reserva ya está vinculado a una cuenta → sugerir login
    const [existingAccount, setExistingAccount] = useState(false);
    const [cancelLink, setCancelLink] = useState('');
    const [guestSaving, setGuestSaving] = useState(false);

    // Panel login modal state
    const [showPanelModal, setShowPanelModal] = useState(false);
    const [panelLoginAs, setPanelLoginAs] = useState<'owner' | 'staff'>('owner');
    const [panelEmail, setPanelEmail] = useState('');
    const [panelPassword, setPanelPassword] = useState('');
    const [panelShowPwd, setPanelShowPwd] = useState(false);
    const [panelError, setPanelError] = useState('');
    const [panelLoading, setPanelLoading] = useState(false);

    // Load availability when service, barber, and date are selected
    const { availableSlots, loading: loadingSlots, error: availabilityError } = useAvailability(
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
                .maybeSingle();

            if (businessError) throw businessError;

            if (!businessData) {
                setBusiness(null);
                setLoading(false);
                return;
            }

            if (!businessData.is_active) {
                setBusinessInactive(true);
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

            // Load Queue Stats for today
            const today = new Date().toISOString().split('T')[0];
            const { data: qData } = await supabase
                .from('appointments')
                .select('services(duration_minutes)')
                .eq('business_id', businessData.id)
                .eq('appointment_date', today)
                .eq('status', 'confirmed');
            
            if (qData) {
                const totalMins = qData.reduce((acc, curr) => acc + ((curr.services as any)?.duration_minutes || 30), 0);
                setQueueStats({ count: qData.length, waitMins: totalMins });
            }

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
        const msPerDay = 1000 * 60 * 60 * 24;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selected = new Date(date + 'T12:00:00');
        const daysAhead = Math.round((selected.getTime() - today.getTime()) / msPerDay);

        // Block past dates
        if (daysAhead < 0) {
            alert('No puedes reservar en fechas pasadas.');
            return;
        }

        // Block beyond max advance window
        if (business?.max_days_advance && daysAhead > business.max_days_advance) {
            alert(`Solo puedes reservar hasta ${business.max_days_advance} días en adelanto.`);
            return;
        }
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
            // Re-validate the slot hasn't been taken since step 4
            const stillAvailable = await isSlotAvailable(
                selectedSlot.barber_id,
                selectedService.id,
                selectedDate,
                selectedSlot.time
            );
            if (!stillAvailable) {
                alert('Este horario acaba de ser reservado. Por favor escoge otro.');
                setSelectedSlot(null);
                setStep(4);
                setSubmitting(false);
                return;
            }

            // Identidad universal del cliente: email + teléfono normalizado (E.164).
            const emailNorm = customerInfo.email.toLowerCase().trim();
            const phoneE164 = normalizePhoneE164(customerInfo.phone.trim());

            // Dedup: ¿ya hay cita FUTURA activa en ESTE negocio con este email O teléfono?
            // Usa RPC SECURITY DEFINER — query directa a appointments retorna [] silencioso (RLS).
            const todayPR = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().split('T')[0];
            if (emailNorm || phoneE164) {
                const { data: hasActive } = await supabase.rpc('has_active_appointment', {
                    p_business_id: business.id,
                    p_phone:       phoneE164 || '',
                    p_email:       emailNorm || '',
                    p_date:        todayPR,
                });
                if (hasActive) {
                    alert('Ya tienes una cita activa en esta barbería.');
                    setSubmitting(false);
                    return;
                }
            }

            // Get current session if available (for logged-in users)
            const { data: sessionData } = await supabase.auth.getSession();
            const session = sessionData?.session;

            // Calculate end_time from service duration
            const [startH, startM] = selectedSlot.time.split(':').map(Number);
            const endTotalMin = startH * 60 + startM + selectedService.duration_minutes;
            const end_time = `${String(Math.floor(endTotalMin / 60)).padStart(2, '0')}:${String(endTotalMin % 60).padStart(2, '0')}`;

            // Build appointment payload — works for both guests and logged-in users
            const appointmentPayload: Record<string, any> = {
                business_id: business.id,
                barber_id: selectedSlot.barber_id,
                service_id: selectedService.id,
                appointment_date: selectedDate,
                start_time: selectedSlot.time,
                end_time,
                customer_name: customerInfo.name.trim(),
                customer_email: emailNorm,
                customer_phone: phoneE164,
                customer_notes: customerInfo.notes.trim() || null,
                status: 'confirmed',
            };

            // Only attach user IDs if authenticated
            if (session?.user?.id) {
                appointmentPayload.customer_user_id = session.user.id;
                appointmentPayload.client_id = session.user.id;
            }

            const { data: aptData, error } = await supabase
                .from('appointments')
                .insert([appointmentPayload])
                .select('id')
                .single();

            if (error) throw error;

            localStorage.setItem('annly_customer_data', JSON.stringify({
                name: customerInfo.name,
                email: customerInfo.email,
                phone: customerInfo.phone
            }));

            setConfirmedAptId(aptData?.id || null);
            setConfirmed(true);

            // Show guest save modal only for unauthenticated users
            if (!user) {
                setShowGuestModal(true);
                // ¿Este email/teléfono ya está vinculado a una cuenta? Solo para SUGERIR
                // login (no bloquea la reserva). NO vinculamos por teléfono no verificado:
                // eso permitiría reclamar citas ajenas escribiendo un número.
                const acctOr: string[] = [];
                if (emailNorm) acctOr.push(`customer_email.eq.${emailNorm}`);
                if (phoneE164) acctOr.push(`customer_phone.eq.${phoneE164}`);
                if (acctOr.length > 0) {
                    const { data: linked } = await supabase
                        .from('appointments')
                        .select('id')
                        .not('client_id', 'is', null)
                        .or(acctOr.join(','))
                        .limit(1);
                    if (linked && linked.length > 0) setExistingAccount(true);
                }
            }
        } catch (error: any) {
            console.error('Error creating appointment:', error);
            alert(error.message || 'Error al crear la cita.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg">
            <LoadingSpinner />
        </div>
    );

    if (businessInactive) return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg px-4">
            <div className="text-center space-y-4 max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-space-primary/10 flex items-center justify-center mx-auto">
                    <Clock size={28} className="text-space-primary" />
                </div>
                <h1 className="text-xl font-extrabold text-space-text">Próximamente disponible</h1>
                <p className="text-space-muted text-sm">Este negocio aún no está disponible para reservas en línea. Vuelve pronto.</p>
                <Link to="/" className="inline-block btn-secondary text-sm px-6 py-2.5">← Explorar negocios</Link>
            </div>
        </div>
    );

    if (!business) return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg">
            <p className="text-space-muted font-bold uppercase tracking-widest text-xs">Negocio no encontrado</p>
        </div>
    );

    const handleGuestSaveLink = async () => {
        if (!confirmedAptId) return;
        setGuestSaving(true);
        try {
            const token = crypto.randomUUID();
            const { error } = await supabase
                .from('appointments')
                .update({ is_guest: true, cancel_token: token })
                .eq('id', confirmedAptId);
            if (error) throw error;
            const link = `${window.location.origin}/cancel/${token}`;
            setCancelLink(link);
        } catch {
            alert('Error generando el link. Intenta de nuevo.');
        } finally {
            setGuestSaving(false);
        }
    };

    const handleGuestCreateAccount = () => {
        navigate('/register-client', { state: { prefill: { name: customerInfo.name, email: customerInfo.email, phone: customerInfo.phone } } });
    };

    const handlePanelLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setPanelError('');
        if (!panelEmail || !panelPassword) { setPanelError('Completa todos los campos.'); return; }
        setPanelLoading(true);
        try {
            await login(panelEmail, panelPassword);
            // After login, check if user belongs to this business
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No se pudo obtener la sesión.');

            const { data: membership } = await supabase
                .from('users_businesses')
                .select('role')
                .eq('user_id', session.user.id)
                .eq('business_id', business?.id)
                .maybeSingle();

            if (!membership) {
                await supabase.auth.signOut();
                setPanelError('No tienes acceso a este negocio. Verifica tu cuenta.');
                return;
            }

            // Redirect based on role
            if (membership.role === 'owner' || membership.role === 'admin') {
                navigate('/dashboard');
            } else if (membership.role === 'barber') {
                navigate('/staff');
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            setPanelError(err.message || 'Credenciales incorrectas.');
        } finally {
            setPanelLoading(false);
        }
    };

    // Soft login suggestion — no longer a hard block
    const showLoginBanner = !user;

    if (confirmed) return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg p-4 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-space-success/10 via-space-bg to-space-bg pointer-events-none"></div>
            <div className="max-w-md w-full glass-effect rounded-[2.5rem] shadow-2xl p-8 text-center border border-space-border relative z-10 animate-fade-in">
                <div className="w-20 h-20 bg-gradient-to-br from-space-success to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-space-success/20">
                    <Check size={40} className="text-white" />
                </div>
                <h1 className="text-3xl font-black text-space-text mb-2 tracking-tight">¡Cita confirmada!</h1>
                <p className="text-space-muted mb-6 font-medium text-sm">
                    {selectedService?.name} · {selectedSlot && formatTimeDisplay(selectedSlot.time)} · {selectedDate && formatDate(parseDate(selectedDate))}
                </p>

                {/* Guest save modal — only for unauthenticated users */}
                {showGuestModal && !cancelLink && (
                    <div className="bg-space-bg rounded-2xl p-6 mb-6 border border-space-border text-left">
                        {existingAccount ? (
                            <>
                                <h3 className="font-extrabold text-space-text text-sm mb-1">Ya tienes una cuenta</h3>
                                <p className="text-space-muted text-xs mb-4">Detectamos una cuenta con ese email o teléfono. Inicia sesión para ver y gestionar todas tus citas.</p>
                                <div className="flex flex-col gap-2">
                                    <Link to="/login" className="btn-primary text-xs py-3 w-full text-center">
                                        Iniciar sesión
                                    </Link>
                                    <button onClick={handleGuestSaveLink} disabled={guestSaving}
                                        className="btn-secondary text-xs py-3 w-full disabled:opacity-50">
                                        {guestSaving ? 'Generando...' : 'No gracias, solo dame el link'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="font-extrabold text-space-text text-sm mb-1">¿Quieres guardar tu cita?</h3>
                                <p className="text-space-muted text-xs mb-4">Crea una cuenta gratis para ver tu historial y cancelar desde la web.</p>
                                <div className="flex flex-col gap-2">
                                    <button onClick={handleGuestCreateAccount} className="btn-primary text-xs py-3 w-full">
                                        Crear cuenta gratis
                                    </button>
                                    <button onClick={handleGuestSaveLink} disabled={guestSaving}
                                        className="btn-secondary text-xs py-3 w-full disabled:opacity-50">
                                        {guestSaving ? 'Generando...' : 'No gracias, solo dame el link'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Cancel link for guests who chose "no gracias" */}
                {cancelLink && (
                    <div className="bg-space-bg rounded-2xl p-5 mb-6 border border-space-border text-left">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-space-muted mb-2">Guarda este link para cancelar:</p>
                        <div className="flex items-center gap-2 bg-space-card2/50 rounded-xl p-3 border border-space-border/40">
                            <span className="text-xs font-mono text-space-text break-all flex-1">{cancelLink}</span>
                            <button onClick={() => navigator.clipboard.writeText(cancelLink)}
                                className="text-space-primary hover:opacity-70 flex-shrink-0 text-[10px] font-bold uppercase tracking-wider">
                                Copiar
                            </button>
                        </div>
                    </div>
                )}

                <Link to="/" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-space-card border border-space-border text-space-text font-black rounded-2xl hover:border-space-primary hover:text-space-primary transition-all text-sm w-full">
                    Volver al Inicio
                </Link>
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
                    <h1 className="text-4xl md:text-5xl font-black text-space-text mb-4 tracking-tighter uppercase">{business.name}</h1>
                    <div className="flex flex-wrap justify-center gap-3 mb-6">
                        <div className="inline-flex items-center gap-2 bg-space-card px-4 py-2 rounded-full shadow-sm border border-space-border relative">
                            <span className="w-2 h-2 rounded-full bg-space-success animate-pulse shadow-[0_0_10px_rgba(61,153,112,0.5)]"></span>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-space-muted">Reservas Online</p>
                        </div>
                        <div className="inline-flex items-center gap-2 bg-space-primary/10 px-4 py-2 rounded-full shadow-sm border border-space-primary/20">
                            <Star size={12} className="text-space-primary fill-space-primary" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-space-primary">Smart Queue: {queueStats.count} CITAS HOY</p>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4">
                        {business.instagram_url && (
                            <a href={business.instagram_url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-space-card border border-space-border flex items-center justify-center text-space-text hover:text-space-primary hover:border-space-primary transition-all shadow-sm">
                                <Instagram size={20} />
                            </a>
                        )}
                        {business.website_url && (
                            <a href={business.website_url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-space-card border border-space-border flex items-center justify-center text-space-text hover:text-space-primary hover:border-space-primary transition-all shadow-sm">
                                <Globe size={20} />
                            </a>
                        )}
                        {/* Panel access for owners/staff */}
                        {!user && (
                            <button
                                onClick={() => setShowPanelModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-space-card border border-space-border text-space-muted hover:text-space-primary hover:border-space-primary transition-all shadow-sm text-[10px] font-extrabold uppercase tracking-wider"
                            >
                                <Building2 size={14} />
                                Entrar al panel
                            </button>
                        )}
                    </div>
                </header>

                {/* Panel login modal */}
                {showPanelModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowPanelModal(false); setPanelError(''); }} />
                        <div className="relative w-full max-w-sm bg-space-card rounded-[2rem] shadow-2xl border border-space-border overflow-hidden animate-scale-in">
                            {/* Modal header */}
                            <div className="px-6 py-5 border-b border-space-border flex items-center justify-between bg-space-bg">
                                <div>
                                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-space-muted mb-0.5">Panel de</p>
                                    <h3 className="text-base font-extrabold text-space-text">{business?.name}</h3>
                                </div>
                                <button onClick={() => { setShowPanelModal(false); setPanelError(''); }} className="w-9 h-9 flex items-center justify-center rounded-xl text-space-muted hover:text-space-danger transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-6">
                                {/* Role selector */}
                                <div className="flex gap-1.5 p-1 bg-space-card2/60 rounded-xl mb-5">
                                    <button type="button" onClick={() => setPanelLoginAs('owner')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all ${panelLoginAs === 'owner' ? 'bg-space-card text-space-text shadow-sm' : 'text-space-muted hover:text-space-text'}`}>
                                        <Building2 size={11} className={panelLoginAs === 'owner' ? 'text-space-primary' : ''} />
                                        Dueño / Admin
                                    </button>
                                    <button type="button" onClick={() => setPanelLoginAs('staff')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all ${panelLoginAs === 'staff' ? 'bg-space-card text-space-text shadow-sm' : 'text-space-muted hover:text-space-text'}`}>
                                        <Scissors size={11} className={panelLoginAs === 'staff' ? 'text-space-primary' : ''} />
                                        Staff / Barbero
                                    </button>
                                </div>

                                <form onSubmit={handlePanelLogin} className="space-y-3.5">
                                    <div>
                                        <label className="input-label">Email</label>
                                        <input type="email" value={panelEmail} onChange={e => { setPanelEmail(e.target.value); setPanelError(''); }}
                                            className="input-field" placeholder="tu@email.com" autoComplete="email" autoFocus />
                                    </div>
                                    <div>
                                        <label className="input-label">Contraseña</label>
                                        <div className="relative">
                                            <input type={panelShowPwd ? 'text' : 'password'} value={panelPassword}
                                                onChange={e => { setPanelPassword(e.target.value); setPanelError(''); }}
                                                className="input-field pr-11" placeholder="••••••••" autoComplete="current-password" />
                                            <button type="button" onClick={() => setPanelShowPwd(!panelShowPwd)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-space-muted hover:opacity-70">
                                                {panelShowPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                    </div>

                                    {panelError && (
                                        <div className="px-4 py-3 rounded-xl text-xs font-semibold" style={{ background: `rgba(var(--space-danger), 0.1)`, color: `rgb(var(--space-danger))`, border: `1px solid rgba(var(--space-danger), 0.2)` }}>
                                            {panelError}
                                        </div>
                                    )}

                                    <button type="submit" disabled={panelLoading} className="btn-primary w-full h-11 mt-1">
                                        {panelLoading ? (
                                            <span className="flex items-center gap-2">
                                                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                                Verificando...
                                            </span>
                                        ) : 'Acceder al panel'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* BRUTAL FEATURE: Guest Login Banner (soft suggestion, no hard block) */}
                {showLoginBanner && (
                    <div className="mb-8 animate-fade-in">
                        <div className="bg-space-primary/5 border border-space-primary/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <UserIcon size={16} className="text-space-primary flex-shrink-0" />
                                <p className="text-[11px] font-bold text-space-text">
                                    ¿Tienes cuenta? <span className="text-space-muted font-normal">Inicia sesión para autocompletar tus datos.</span>
                                </p>
                            </div>
                            <button
                                onClick={() => navigate(`/login?returnTo=/book/${slug}`)}
                                className="flex-shrink-0 px-4 py-2 bg-space-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-space-primary-dark transition-all"
                            >
                                Entrar
                            </button>
                        </div>
                    </div>
                )}

                {/* BRUTAL FEATURE: Smart Queue Indicator */}
                <div className="mb-12 animate-fade-in delay-75">
                    <div className="bg-white border-2 border-space-primary/20 rounded-[2.5rem] p-6 flex items-center justify-between shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-space-primary rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <Clock size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-space-primary uppercase tracking-[0.3em] mb-1">Estado de la fila</p>
                                <h3 className="text-xl font-black text-space-text uppercase tracking-tight">Espera estimada: {queueStats.waitMins} min</h3>
                            </div>
                        </div>
                        <div className="hidden sm:block text-right">
                           <p className="text-[10px] font-black text-space-muted uppercase tracking-widest">Capacidad actual</p>
                           <p className="text-sm font-bold text-space-text">{queueStats.count < 10 ? 'Alta Disponibilidad' : 'Fila Moderada'}</p>
                        </div>
                    </div>
                </div>

                {/* BRUTAL FEATURE: Gallery (Visual Proof) */}
                {business.gallery && business.gallery.length > 0 && (
                    <div className="mb-12 animate-fade-in delay-150 overflow-hidden">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h2 className="text-xs font-black text-space-muted uppercase tracking-[0.4em]">Trabajos Reales</h2>
                            <p className="text-[10px] font-black text-space-primary uppercase tracking-widest">{business.gallery.length} fotos</p>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                            {business.gallery.map((url, idx) => (
                                <div key={idx} className="flex-shrink-0 w-48 h-64 bg-space-bg rounded-[2rem] overflow-hidden border border-space-border hover:border-space-primary/40 transition-all hover:scale-[1.02]">
                                    <img 
                                        src={url} 
                                        alt={`Trabajo ${idx + 1}`} 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Progress Steps */}
                <div className="flex justify-center mb-12 animate-fade-in delay-100">
                    <div className="flex items-center gap-2 bg-space-card p-2 rounded-full shadow-card border border-space-border max-w-full overflow-x-auto no-scrollbar scroll-smooth">
                        {steps.map((s) => (
                            <div
                                key={s.id}
                                onClick={() => s.id < step && setStep(s.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all cursor-pointer whitespace-nowrap border ${s.id === step
                                    ? 'bg-space-primary text-white shadow-btn border-space-primary'
                                    : s.id < step
                                        ? 'bg-space-bg text-space-text hover:bg-space-border border-space-border'
                                        : 'text-space-muted border-transparent hover:bg-space-bg'
                                    }`}
                            >
                                <span className="text-[10px] font-black">{`0${s.id}`}</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card md:p-10 p-6 relative overflow-visible min-h-[500px] flex flex-col justify-center animate-fade-in delay-200">

                    {/* Step 1: Select Service */}
                    {step === 1 && (
                        <div className="animate-fade-in w-full">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-bold text-space-text tracking-tight mb-2">Escoge un servicio</h2>
                                <p className="text-xs font-bold text-space-muted uppercase tracking-widest">¿Qué haremos hoy?</p>
                            </div>
                            <div className="grid gap-4">
                                {(services as Service[]).map((service) => (
                                    <button
                                        key={service.id}
                                        onClick={() => handleServiceSelect(service)}
                                        className="group p-5 bg-white hover:bg-space-bg border border-space-border hover:border-space-primary rounded-3xl transition-all duration-300 text-left flex items-center justify-between"
                                    >
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-space-text mb-1 group-hover:text-space-primary transition-colors">
                                                {service.name}
                                            </h3>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-space-muted uppercase tracking-widest flex items-center gap-1 bg-space-bg px-2 py-1 rounded-lg border border-space-border">
                                                    <Clock size={10} /> {service.duration_minutes} MIN
                                                </span>
                                                <span className="text-sm font-bold text-space-text flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-space-success"></span>
                                                    {formatCurrency(service.price)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-12 h-12 rounded-2xl bg-space-bg text-space-primary flex items-center justify-center group-hover:bg-space-primary group-hover:text-white transition-all border border-space-border group-hover:border-transparent shadow-sm">
                                            <Scissors size={20} className="group-hover:scale-110 transition-transform" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Select Barber */}
                    {step === 2 && selectedService && (
                        <div className="animate-fade-in w-full">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-bold text-space-text tracking-tight mb-2">Elige a tu barbero</h2>
                                <p className="text-xs font-bold text-space-muted uppercase tracking-widest">Servicio: <span className="text-space-text">{selectedService.name}</span></p>
                            </div>
                            <div className="grid gap-4">
                                <button
                                    onClick={() => handleBarberSelect(null)}
                                    className="p-6 bg-space-primary text-white rounded-3xl shadow-btn hover:-translate-y-1 transition-all text-center mb-2 active:scale-95"
                                >
                                    <div className="flex justify-center mb-2"><Star size={24} className="fill-white" /></div>
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em]">Cualquiera disponible</h3>
                                    <p className="text-[10px] text-white/90 font-bold mt-1 uppercase">Lo antes posible</p>
                                </button>

                                {barbers
                                    .filter((barber: Barber) => {
                                        const barberServices = (barber as any).barbers_services;
                                        if (!barberServices) return true;
                                        return barberServices.some((bs: any) => bs.service_id === selectedService.id);
                                    })
                                    .map((barber: Barber) => (
                                        <button
                                            key={barber.id}
                                            onClick={() => handleBarberSelect(barber)}
                                            className="group p-5 bg-white hover:bg-space-bg border border-space-border rounded-3xl transition-all duration-300 text-left flex items-center gap-6"
                                        >
                                            <div className="w-14 h-14 bg-space-primary-light text-space-primary rounded-2xl flex items-center justify-center group-hover:bg-space-primary group-hover:text-white transition-all shrink-0">
                                                <UserIcon size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-space-text group-hover:text-space-primary transition-colors">
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
                        <div className="animate-fade-in w-full">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-bold text-space-text tracking-tight mb-2">Reserva el día</h2>
                                <p className="text-xs font-bold text-space-muted uppercase tracking-widest">
                                    Con <span className="text-space-text">{selectedBarber?.name || 'Cualquier barbero'}</span>
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
                                            ? 'bg-space-primary text-white shadow-btn scale-105 border-space-primary'
                                            : 'bg-white hover:bg-space-bg text-space-muted hover:text-space-primary border-space-border'
                                            }`}
                                    >
                                        {quickDate.label}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-8 w-full flex justify-center">
                                <MonthGridCalendar 
                                    selectedDate={selectedDate} 
                                    onDateSelect={handleDateSelect}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 4: Select Time */}
                    {step === 4 && selectedService && selectedDate && (
                        <div className="animate-fade-in w-full">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-bold text-space-text tracking-tight mb-2">Escoge la hora</h2>
                                <p className="text-xs font-bold text-space-primary uppercase tracking-widest bg-space-primary-light/50 inline-block px-3 py-1 rounded-lg">
                                    {formatDate(parseDate(selectedDate))}
                                </p>
                            </div>

                            {loadingSlots ? (
                                <div className="py-20 flex justify-center"><LoadingSpinner /></div>
                            ) : availabilityError ? (
                                <div className="text-center py-12">
                                    <p className="text-sm font-bold text-space-danger uppercase tracking-widest mb-6 border border-space-danger/20 bg-space-danger/5 p-4 rounded-xl">Error cargando horarios. Intenta de nuevo.</p>
                                    <button
                                        onClick={() => setStep(3)}
                                        className="btn-secondary rounded-full px-8 uppercase tracking-widest shadow-none"
                                    >
                                        Cambiar Fecha
                                    </button>
                                </div>
                            ) : availableSlots.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-sm font-bold text-space-danger uppercase tracking-widest mb-6 border border-space-danger/20 bg-space-danger/5 p-4 rounded-xl">No hay horarios disponibles para esta fecha</p>
                                    <button
                                        onClick={() => setStep(3)}
                                        className="btn-secondary rounded-full px-8 uppercase tracking-widest shadow-none"
                                    >
                                        Cambiar Fecha
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {availableSlots.map((slot, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSlotSelect(slot)}
                                            className={`py-4 px-2 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 ${selectedSlot?.time === slot.time
                                                ? 'border-space-primary bg-space-primary text-white shadow-btn scale-105 z-10'
                                                : 'border-space-border bg-white hover:bg-space-bg hover:border-space-primary text-space-text'
                                                }`}
                                        >
                                            <span className="font-bold text-lg leading-none">
                                                {formatTimeDisplay(slot.time)}
                                            </span>
                                            <span className={`text-[9px] font-bold uppercase tracking-widest truncate w-full text-center ${selectedSlot?.time === slot.time ? 'text-white' : 'text-space-muted'}`}>
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
                        <div className="animate-fade-in w-full">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-space-text tracking-tight mb-2">Tus datos</h2>
                                <p className="text-xs font-bold text-space-muted uppercase tracking-widest">Finalizar reserva</p>
                            </div>

                            <div className="bg-space-bg rounded-[2rem] p-6 mb-8 flex flex-col sm:flex-row gap-6 items-center justify-center text-center sm:text-left border border-space-border">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-space-muted uppercase tracking-widest">Servicio</p>
                                    <p className="text-sm font-bold leading-tight text-space-text">{selectedService?.name}</p>
                                </div>
                                <div className="hidden sm:block w-px h-8 bg-space-border"></div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-space-muted uppercase tracking-widest">Barbero</p>
                                    <p className="text-sm font-bold leading-tight text-space-text">{selectedSlot.barber_name}</p>
                                </div>
                                <div className="hidden sm:block w-px h-8 bg-space-border"></div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-space-muted uppercase tracking-widest">Horario</p>
                                    <p className="text-sm font-bold leading-tight text-space-text">{formatDate(parseDate(selectedDate))} <span className="text-space-primary">@</span> {formatTimeDisplay(selectedSlot.time)}</p>
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
                                    className="h-14 rounded-2xl bg-space-bg border-space-border text-space-text focus:ring-space-primary focus:border-transparent transition-all placeholder-space-muted/50"
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
                                        className="h-14 rounded-2xl bg-space-bg border-space-border text-space-text focus:ring-space-primary focus:border-transparent transition-all placeholder-space-muted/50"
                                    />
                                    <Input
                                        label="Teléfono"
                                        type="tel"
                                        value={customerInfo.phone}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                        error={formErrors.phone}
                                        placeholder="(809) 555-5555"
                                        required
                                        className="h-14 rounded-2xl bg-space-bg border-space-border text-space-text focus:ring-space-primary focus:border-transparent transition-all placeholder-space-muted/50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-space-muted uppercase tracking-widest mb-2 ml-1">Notas (Opcional)</label>
                                    <textarea
                                        value={customerInfo.notes}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                                        className="w-full px-4 py-4 bg-space-bg border border-space-border rounded-xl text-space-text focus:outline-none focus:ring-2 focus:ring-space-primary focus:border-transparent transition-all text-sm font-medium placeholder-space-muted/50"
                                        rows={3}
                                        placeholder="¿Alguna preferencia?"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="btn-primary w-full h-14 uppercase tracking-widest text-sm font-black mt-8"
                            >
                                {submitting ? 'Confirmando...' : 'Confirmar Reserva'}
                            </button>
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
