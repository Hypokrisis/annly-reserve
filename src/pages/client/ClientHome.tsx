import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomerAppointments } from '@/services/appointments.service';
import { calculateAvailability, type AvailableSlot } from '@/services/availability.service';
import { supabase } from '@/supabaseClient';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { BusinessCard, type BusinessResult } from '@/components/directory/BusinessCard';
import { formatDate, parseDate, formatTimeDisplay } from '@/utils';
import {
    Calendar, CalendarClock, Check, Home, LogOut, Phone,
    Scissors, Search, ShieldCheck, Store, User as UserIcon, X,
} from 'lucide-react';

// ── Modal de reagendamiento — definido a nivel de módulo (regla: nunca dentro de render) ──

interface ReschedSlots { today: AvailableSlot[]; tomorrow: AvailableSlot[]; }

interface RescheduleModalProps {
    apt: any;
    todayStr: string;
    tomorrowStr: string;
    slots: ReschedSlots;
    loading: boolean;
    confirming: boolean;
    done: { date: string; time: string } | null;
    bookingLink: string | undefined;
    onClose: () => void;
    onConfirm: (date: string, time: string) => void;
}

interface SlotButtonProps { date: string; time: string; confirming: boolean; onConfirm: (d: string, t: string) => void; }
function SlotButton({ date, time, confirming, onConfirm }: SlotButtonProps) {
    return (
        <button
            onClick={() => onConfirm(date, time)}
            disabled={confirming}
            className="flex-1 min-w-[100px] h-10 rounded-xl border border-space-border/60 text-sm font-bold text-space-text hover:border-space-primary hover:text-space-primary hover:bg-space-primary/5 transition-all disabled:opacity-40">
            {formatTimeDisplay(time)}
        </button>
    );
}

function RescheduleModal({ apt, todayStr, tomorrowStr, slots, loading, confirming, done, bookingLink, onClose, onConfirm }: RescheduleModalProps) {
    const serviceName = apt.services?.name || 'Servicio';
    const barberName  = apt.barbers?.name;

    const dayLabel = (dateStr: string) => {
        if (dateStr === todayStr) return 'Hoy';
        if (dateStr === tomorrowStr) return 'Mañana';
        return dateStr;
    };

    const hasAnySlot = slots.today.length > 0 || slots.tomorrow.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-space-card border border-space-border rounded-2xl w-full max-w-sm shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-space-border/40">
                    <div>
                        <h3 className="font-extrabold text-base">Reagendar cita</h3>
                        <p className="text-xs text-space-muted mt-0.5">
                            {serviceName}{barberName ? ` · ${barberName}` : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-space-muted hover:text-space-text transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    {/* Estado de carga */}
                    {loading && (
                        <div className="py-8 flex justify-center"><LoadingSpinner /></div>
                    )}

                    {/* Confirmación exitosa */}
                    {!loading && done && (
                        <div className="py-6 text-center space-y-3">
                            <div className="w-12 h-12 mx-auto rounded-full bg-space-success/10 flex items-center justify-center">
                                <Check size={22} className="text-space-success" />
                            </div>
                            <div>
                                <p className="font-extrabold text-space-text">¡Cita reagendada!</p>
                                <p className="text-sm text-space-muted mt-1">
                                    {dayLabel(done.date)} · {formatTimeDisplay(done.time)}
                                </p>
                            </div>
                            <button onClick={onClose} className="btn-primary text-xs px-6 py-2">Listo</button>
                        </div>
                    )}

                    {/* Slots disponibles */}
                    {!loading && !done && hasAnySlot && (
                        <>
                            {slots.today.length > 0 && (
                                <div>
                                    <p className="text-xs font-extrabold uppercase tracking-widest text-space-muted mb-2">Hoy</p>
                                    <div className="flex flex-wrap gap-2">
                                        {slots.today.map(s => <SlotButton key={s.time} date={todayStr} time={s.time} confirming={confirming} onConfirm={onConfirm} />)}
                                    </div>
                                </div>
                            )}
                            {slots.tomorrow.length > 0 && (
                                <div>
                                    <p className="text-xs font-extrabold uppercase tracking-widest text-space-muted mb-2">Mañana</p>
                                    <div className="flex flex-wrap gap-2">
                                        {slots.tomorrow.map(s => <SlotButton key={s.time} date={tomorrowStr} time={s.time} confirming={confirming} onConfirm={onConfirm} />)}
                                    </div>
                                </div>
                            )}
                            {confirming && (
                                <div className="flex items-center gap-2 text-sm text-space-muted pt-1">
                                    <span className="w-4 h-4 rounded-full border-2 border-space-primary/30 border-t-space-primary animate-spin" />
                                    Guardando…
                                </div>
                            )}
                        </>
                    )}

                    {/* Sin disponibilidad hoy/mañana */}
                    {!loading && !done && !hasAnySlot && (
                        <div className="py-4 text-center space-y-2">
                            <p className="text-sm text-space-muted">No hay disponibilidad hoy ni mañana.</p>
                        </div>
                    )}

                    {/* Link para otras fechas */}
                    {!loading && !done && bookingLink && (
                        <div className="pt-2 border-t border-space-border/40">
                            <a href={bookingLink} target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 text-xs font-bold text-space-primary hover:opacity-70 transition-opacity">
                                <CalendarClock size={12} /> Ver más fechas →
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const FAVORITES_KEY = 'favoriteBusinesses';

/**
 * Panel del cliente registrado (role='client').
 * Sección 1 — Mis citas: cards mobile-first, cancelar + reagendar.
 * Sección 2 — Barberías: directorio con búsqueda, mismas BusinessCard del landing.
 */
export default function ClientHome() {
    const { user, logout } = useAuth();

    const [appointments, setAppointments] = useState<any[]>([]);
    const [loadingApts, setLoadingApts] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    // ── Reagendamiento ────────────────────────────────────────────────────
    const [rescheduleApt,  setRescheduleApt]  = useState<any>(null);
    const [reschedSlots,   setReschedSlots]   = useState<ReschedSlots>({ today: [], tomorrow: [] });
    const [reschedLoading, setReschedLoading] = useState(false);
    const [reschedConfirming, setReschedConfirming] = useState(false);
    const [reschedDone,    setReschedDone]    = useState<{ date: string; time: string } | null>(null);

    const [businesses, setBusinesses] = useState<BusinessResult[]>([]);
    const [loadingBiz, setLoadingBiz] = useState(true);
    const [search, setSearch] = useState('');
    const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);

    // ── Verificación de teléfono ──────────────────────────────────────
    const [phoneVerified,  setPhoneVerified]  = useState<boolean | null>(null);
    const [profilePhone,   setProfilePhone]   = useState('');
    const [showVerifBanner, setShowVerifBanner] = useState(false);
    const [verifStep,      setVerifStep]      = useState<'idle' | 'sending' | 'code' | 'done'>('idle');
    const [verifCode,      setVerifCode]      = useState('');
    const [verifError,     setVerifError]     = useState('');
    const [verifLoading,   setVerifLoading]   = useState(false);

    // ── Data loaders ────────────────────────────────────────────────────────
    const loadApts = useCallback(async () => {
        if (!user?.email) { setLoadingApts(false); return; }
        try {
            const data = await getCustomerAppointments(user.email, user.id);
            const now = Date.now();
            const future = (data as any[]).filter((apt) => {
                const [y, m, d] = apt.appointment_date.split('-').map(Number);
                const [hh, mm] = apt.start_time.split(':').map(Number);
                return new Date(y, m - 1, d, hh, mm).getTime() >= now;
            });
            setAppointments(future);
        } catch {
            setAppointments([]);
        } finally {
            setLoadingApts(false);
        }
    }, [user?.email, user?.id]);

    const loadBusinesses = useCallback(async () => {
        setLoadingBiz(true);
        try {
            const { data } = await supabase
                .from('businesses')
                .select('id, name, slug, description, address, city, state, zip_code, business_type, is_verified, avg_rating, total_reviews, created_at, banner_url, logo_url, services(name)')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(40);
            setBusinesses((data as BusinessResult[]) || []);
        } catch { /* silent */ }
        finally { setLoadingBiz(false); }
    }, []);

    // Cargar perfil para saber si el teléfono está verificado
    const loadProfile = useCallback(async () => {
        if (!user?.id) return;
        const { data } = await supabase
            .from('profiles')
            .select('phone, phone_verified')
            .eq('id', user.id)
            .maybeSingle();
        if (data) {
            setPhoneVerified(data.phone_verified ?? false);
            setProfilePhone(data.phone ?? '');
        }
    }, [user?.id]);

    useEffect(() => { loadApts(); loadBusinesses(); loadProfile(); }, [loadApts, loadBusinesses, loadProfile]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(FAVORITES_KEY);
            if (saved) setFavoriteSlugs(JSON.parse(saved));
        } catch { /* ignore */ }
    }, []);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const toggleFavorite = (e: React.MouseEvent, slug: string) => {
        e.preventDefault();
        const next = favoriteSlugs.includes(slug)
            ? favoriteSlugs.filter((s) => s !== slug)
            : [...favoriteSlugs, slug];
        setFavoriteSlugs(next);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    };

    const handleCancel = async (apt: any) => {
        if (!apt.cancel_token) {
            alert('Esta cita no se puede cancelar desde aquí. Contacta a la barbería.');
            return;
        }
        if (!confirm('¿Seguro que quieres cancelar esta cita?')) return;
        setCancellingId(apt.id);
        try {
            const { data, error } = await supabase.rpc('cancel_appointment_by_token', { p_token: apt.cancel_token });
            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'token_invalid');
            setAppointments((prev) => prev.filter((a) => a.id !== apt.id));
        } catch {
            alert('No se pudo cancelar. Intenta de nuevo o contacta a la barbería.');
        } finally {
            setCancellingId(null);
        }
    };

    // ── Reagendamiento handlers ───────────────────────────────────────────────
    const todayPR = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().split('T')[0];
    const tomorrowPR = (() => {
        const d = new Date(todayPR + 'T12:00:00');
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    })();

    const handleOpenReschedule = useCallback(async (apt: any) => {
        setRescheduleApt(apt);
        setReschedSlots({ today: [], tomorrow: [] });
        setReschedDone(null);
        setReschedLoading(true);
        try {
            const params = { businessId: apt.business_id, serviceId: apt.service_id, barberId: apt.barber_id };
            const [todaySlots, tomorrowSlots] = await Promise.all([
                calculateAvailability({ ...params, date: todayPR }),
                calculateAvailability({ ...params, date: tomorrowPR }),
            ]);
            setReschedSlots({ today: todaySlots, tomorrow: tomorrowSlots });
        } catch {
            setReschedSlots({ today: [], tomorrow: [] });
        } finally {
            setReschedLoading(false);
        }
    }, [todayPR, tomorrowPR]);

    const handleRescheduleConfirm = useCallback(async (newDate: string, newTime: string) => {
        if (!rescheduleApt?.cancel_token) return;
        setReschedConfirming(true);
        try {
            const { data, error } = await supabase.rpc('reschedule_appointment_by_token', {
                p_token:     rescheduleApt.cancel_token,
                p_new_date:  newDate,
                p_new_start: newTime,
            });
            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'reschedule_failed');
            setReschedDone({ date: newDate, time: newTime });
            await loadApts();
        } catch {
            alert('No se pudo reagendar. Intenta de nuevo o contacta a la barbería.');
        } finally {
            setReschedConfirming(false);
        }
    }, [rescheduleApt, loadApts]);

    // ── Verificación handlers ─────────────────────────────────────────────────
    const sendVerifSMS = async () => {
        setVerifStep('sending');
        setVerifError('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const resp = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-verification`,
                {
                    method:  'POST',
                    headers: {
                        'Authorization': `Bearer ${session?.access_token ?? ''}`,
                        'Content-Type':  'application/json',
                    },
                    body: JSON.stringify({ phone: profilePhone }),
                }
            );
            const json = await resp.json();
            if (!json.success) throw new Error(json.error || 'Error al enviar SMS');
            setVerifStep('code');
        } catch (err: any) {
            setVerifError(err.message || 'Error al enviar SMS');
            setVerifStep('idle');
        }
    };

    const handleVerifSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (verifCode.length !== 4) { setVerifError('El código tiene 4 dígitos.'); return; }
        setVerifLoading(true);
        setVerifError('');
        try {
            const { data, error } = await supabase.rpc('verify_phone_code', { p_code: verifCode });
            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'Código inválido');
            setPhoneVerified(true);
            setVerifStep('done');
            setShowVerifBanner(false);
            await loadApts(); // Recargar citas — ahora incluye las de WhatsApp
        } catch (err: any) {
            setVerifError(err.message || 'Código inválido o expirado.');
        } finally {
            setVerifLoading(false);
        }
    };

    // ── Derived ───────────────────────────────────────────────────────────────
    const q = search.toLowerCase().trim();
    const filteredBusinesses = businesses.filter((b) => {
        if (!q) return true;
        return b.name.toLowerCase().includes(q)
            || (b.city || '').toLowerCase().includes(q)
            || (b.services || []).some((s) => s.name.toLowerCase().includes(q));
    });

    const fullName = user?.user_metadata?.full_name || '';
    const firstName = fullName.split(' ')[0] || user?.email?.split('@')[0] || '';
    const avatarLetter = (fullName || user?.email || 'U')[0].toUpperCase();

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-space-bg text-space-text">

            {/* ── Nav fija ── */}
            <header className="sticky top-0 z-40 border-b border-space-border bg-space-card/95 backdrop-blur-xl">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-2">

                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 shrink-0">
                        <div className="w-8 h-8 rounded-xl overflow-hidden shadow-md"
                            style={{ background: 'linear-gradient(135deg, rgb(var(--space-primary-light)), rgb(var(--space-primary)))' }}>
                            <img src="/logo.png" alt="Spacey" className="w-full h-full object-cover object-top scale-110" />
                        </div>
                        <span className="font-extrabold tracking-tight hidden sm:block">Spacey</span>
                    </Link>

                    {/* Links centrales */}
                    <nav className="flex items-center gap-0.5">
                        <Link to="/"
                            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-bold text-space-muted hover:text-space-primary hover:bg-space-primary/5 transition-all">
                            <Home size={13} /><span className="hidden sm:inline">Inicio</span>
                        </Link>
                        <a href="#mis-citas"
                            className="px-2.5 py-2 rounded-xl text-[11px] font-bold text-space-muted hover:text-space-primary hover:bg-space-primary/5 transition-all">
                            Mis citas
                        </a>
                        <a href="#barberias"
                            className="px-2.5 py-2 rounded-xl text-[11px] font-bold text-space-muted hover:text-space-primary hover:bg-space-primary/5 transition-all">
                            Barberías
                        </a>
                    </nav>

                    {/* Avatar + salir */}
                    <button
                        onClick={() => logout()}
                        title="Cerrar sesión"
                        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl hover:bg-space-card2/60 group transition-all shrink-0">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-extrabold shrink-0"
                            style={{ background: 'linear-gradient(135deg, rgb(var(--space-primary-light)), rgb(var(--space-primary)))', color: 'rgb(var(--space-card))' }}>
                            {avatarLetter}
                        </div>
                        {firstName && (
                            <span className="hidden sm:block text-[11px] font-bold text-space-muted group-hover:text-space-danger transition-colors max-w-[72px] truncate">
                                {firstName}
                            </span>
                        )}
                        <LogOut size={13} className="text-space-muted group-hover:text-space-danger transition-colors" />
                    </button>
                </div>
            </header>

            {/* ── Banner de verificación de teléfono ── */}
            {phoneVerified === false && profilePhone && !showVerifBanner && (
                <div className="bg-space-primary/8 border-b border-space-primary/20">
                    <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <Phone size={15} className="text-space-primary shrink-0" />
                            <p className="text-sm font-medium text-space-text truncate">
                                Verifica tu número para ver tus citas de WhatsApp
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => { setShowVerifBanner(true); sendVerifSMS(); }}
                                className="text-xs font-extrabold text-space-primary hover:opacity-70 transition-opacity whitespace-nowrap">
                                Verificar ahora →
                            </button>
                            <button onClick={() => setPhoneVerified(true)} className="p-1 text-space-muted hover:text-space-text transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Panel inline de verificación ── */}
            {showVerifBanner && phoneVerified === false && (
                <div className="border-b border-space-border bg-space-card">
                    <div className="max-w-5xl mx-auto px-4 py-4">
                        {verifStep === 'sending' && (
                            <div className="flex items-center gap-2 text-sm text-space-muted">
                                <span className="w-4 h-4 rounded-full border-2 border-space-primary/30 border-t-space-primary animate-spin" />
                                Enviando código a {profilePhone}…
                            </div>
                        )}
                        {verifStep === 'code' && (
                            <form onSubmit={handleVerifSubmit} className="flex items-end gap-3 flex-wrap">
                                <div className="flex-1 min-w-[180px]">
                                    <label className="input-label flex items-center gap-1.5">
                                        <ShieldCheck size={13} className="text-space-primary" />
                                        Código enviado a {profilePhone}
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={4}
                                        value={verifCode}
                                        onChange={(e) => { setVerifCode(e.target.value.replace(/\D/g, '')); setVerifError(''); }}
                                        className="input-field text-center text-xl font-extrabold tracking-[0.4em] max-w-[140px]"
                                        placeholder="····"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex items-center gap-2 pb-0.5">
                                    <button type="submit" disabled={verifLoading || verifCode.length < 4} className="btn-primary text-xs px-4 h-10 disabled:opacity-40">
                                        {verifLoading ? 'Verificando…' : 'Confirmar'}
                                    </button>
                                    <button type="button" onClick={sendVerifSMS} className="text-xs font-bold text-space-muted hover:text-space-primary transition-colors">
                                        Reenviar
                                    </button>
                                    <button type="button" onClick={() => setShowVerifBanner(false)} className="p-1 text-space-muted hover:text-space-text transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                                {verifError && (
                                    <p className="w-full text-xs font-medium text-space-danger">{verifError}</p>
                                )}
                            </form>
                        )}
                    </div>
                </div>
            )}

            <main className="max-w-5xl mx-auto px-4 py-8 space-y-16">

                {/* ══ SECCIÓN 1 — Mis citas ══════════════════════════════════ */}
                <section id="mis-citas" className="scroll-mt-20">
                    <div className="mb-6">
                        <h1 className="text-2xl font-extrabold mb-1">Mis citas</h1>
                        <p className="text-sm text-space-muted">
                            {firstName ? `Hola, ${firstName} 👋` : 'Hola 👋'} Estas son tus próximas reservas.
                        </p>
                    </div>

                    {loadingApts ? (
                        <div className="py-16 flex justify-center"><LoadingSpinner /></div>

                    ) : appointments.length === 0 ? (
                        /* Estado vacío */
                        <div className="bg-space-card border border-space-border rounded-2xl p-10 text-center">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-space-primary/10 flex items-center justify-center mb-5">
                                <Calendar size={28} className="text-space-primary" />
                            </div>
                            <h2 className="text-lg font-extrabold mb-2">No tienes citas activas</h2>
                            <p className="text-sm text-space-muted mb-6 max-w-xs mx-auto leading-relaxed">
                                Explora las barberías y reserva tu próxima cita en segundos.
                            </p>
                            <Link to="/" className="btn-primary text-xs px-6 py-2.5 inline-flex items-center gap-2">
                                <Store size={14} /> Reservar ahora
                            </Link>
                        </div>

                    ) : (
                        /* Cards — una por cita */
                        <div className="grid gap-4 sm:grid-cols-2">
                            {appointments.map((apt) => {
                                const serviceName = apt.services?.name || 'Servicio';
                                const barberName  = apt.barbers?.name;
                                const bizName     = apt.business?.name;
                                const bizSlug     = apt.business?.slug;
                                const dateStr     = formatDate(parseDate(apt.appointment_date));
                                const timeStr     = formatTimeDisplay(apt.start_time);
                                const isCancelling = cancellingId === apt.id;

                                return (
                                    <div key={apt.id}
                                        className="bg-space-card border border-space-border rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:border-space-primary/25 transition-colors">

                                        {/* Datos */}
                                        <div className="space-y-2.5">
                                            {/* Servicio */}
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-lg bg-space-primary/10 flex items-center justify-center shrink-0">
                                                    <Scissors size={13} className="text-space-primary" />
                                                </div>
                                                <span className="text-sm font-extrabold">{serviceName}</span>
                                            </div>

                                            {/* Barbero */}
                                            {barberName && (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-lg bg-space-card2/50 flex items-center justify-center shrink-0">
                                                        <UserIcon size={13} className="text-space-muted" />
                                                    </div>
                                                    <span className="text-sm text-space-muted font-medium">{barberName}</span>
                                                </div>
                                            )}

                                            {/* Fecha y hora */}
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-lg bg-space-card2/50 flex items-center justify-center shrink-0">
                                                    <CalendarClock size={13} className="text-space-primary" />
                                                </div>
                                                <span className="text-sm font-bold">{dateStr} · {timeStr}</span>
                                            </div>

                                            {/* Negocio */}
                                            {bizName && (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-lg bg-space-card2/50 flex items-center justify-center shrink-0">
                                                        <Store size={13} className="text-space-muted" />
                                                    </div>
                                                    <span className="text-sm text-space-muted font-medium">{bizName}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Botones */}
                                        <div className="flex gap-2 pt-3 border-t border-space-border/40">
                                            <button
                                                onClick={() => handleOpenReschedule(apt)}
                                                className="flex-1 h-9 flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide rounded-xl border border-space-border/60 text-space-muted hover:border-space-primary/40 hover:text-space-primary transition-all">
                                                <CalendarClock size={12} /> Reagendar
                                            </button>
                                            <button
                                                onClick={() => handleCancel(apt)}
                                                disabled={isCancelling}
                                                className="flex-1 h-9 text-[11px] font-extrabold uppercase tracking-wide rounded-xl border border-space-danger/30 text-space-danger hover:bg-space-danger hover:text-white transition-all disabled:opacity-40">
                                                {isCancelling ? 'Cancelando…' : 'Cancelar'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* ══ SECCIÓN 2 — Barberías ══════════════════════════════════ */}
                <section id="barberias" className="scroll-mt-20">
                    <div className="mb-6">
                        <h2 className="text-2xl font-extrabold mb-1">Barberías</h2>
                        <p className="text-sm text-space-muted">Explora y reserva en cualquiera de estos negocios.</p>
                    </div>

                    {/* Buscador */}
                    <div className="relative mb-6 max-w-md">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-space-muted pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre, ciudad o servicio…"
                            className="input-field pl-10"
                        />
                    </div>

                    {loadingBiz ? (
                        <div className="py-16 flex justify-center"><LoadingSpinner /></div>

                    ) : filteredBusinesses.length === 0 ? (
                        <div className="bg-space-card border border-space-border rounded-2xl p-8 text-center">
                            <p className="text-space-muted text-sm">
                                {q ? `No encontramos barberías para "${search}".` : 'Aún no hay barberías disponibles.'}
                            </p>
                        </div>

                    ) : (
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredBusinesses.map((b) => (
                                <BusinessCard
                                    key={b.id}
                                    business={b}
                                    isFav={favoriteSlugs.includes(b.slug)}
                                    isLoggedIn={true}
                                    onToggleFavorite={toggleFavorite}
                                />
                            ))}
                        </div>
                    )}
                </section>

            </main>

            {/* ── Modal de reagendamiento ── */}
            {rescheduleApt && (
                <RescheduleModal
                    apt={rescheduleApt}
                    todayStr={todayPR}
                    tomorrowStr={tomorrowPR}
                    slots={reschedSlots}
                    loading={reschedLoading}
                    confirming={reschedConfirming}
                    done={reschedDone}
                    bookingLink={rescheduleApt.business?.slug
                        ? `${window.location.origin}/book/${rescheduleApt.business.slug}`
                        : undefined}
                    onClose={() => { setRescheduleApt(null); setReschedDone(null); }}
                    onConfirm={handleRescheduleConfirm}
                />
            )}
        </div>
    );
}
