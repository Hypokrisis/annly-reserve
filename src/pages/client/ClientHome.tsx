import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomerAppointments } from '@/services/appointments.service';
import { supabase } from '@/supabaseClient';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { BusinessCard, type BusinessResult } from '@/components/directory/BusinessCard';
import { formatTimeDisplay } from '@/utils';
import {
    Calendar, CalendarClock, Check, Home, LogOut, Phone,
    Scissors, Search, ShieldCheck, Store, User as UserIcon, X,
} from 'lucide-react';

// "Sábado 4 de julio" — usa UTC para evitar shift de timezone en fechas YYYY-MM-DD
function formatAptDate(dateStr: string): string {
    return new Intl.DateTimeFormat('es', {
        weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
    }).format(new Date(dateStr + 'T00:00:00Z'));
}

// ── Modal de reagendamiento — definido a nivel de módulo (regla: nunca dentro de render) ──

interface ReschedSlots { today: string[]; tomorrow: string[]; }

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

interface SlotButtonProps { time: string; onSelect: () => void; }
function SlotButton({ time, onSelect }: SlotButtonProps) {
    return (
        <button
            onClick={onSelect}
            className="min-w-[90px] min-h-[44px] px-3 rounded-xl border border-space-border/60 text-sm font-bold text-space-text hover:border-space-primary hover:text-space-primary hover:bg-space-primary/5 active:scale-95 transition-all">
            {formatTimeDisplay(time)}
        </button>
    );
}

function RescheduleModal({ apt, todayStr, tomorrowStr, slots, loading, confirming, done, bookingLink, onClose, onConfirm }: RescheduleModalProps) {
    const [pendingSlot, setPendingSlot] = useState<{ date: string; time: string } | null>(null);
    const serviceName = apt.services?.name || 'Servicio';
    const barberName  = apt.barbers?.name;
    const hasAnySlot  = slots.today.length > 0 || slots.tomorrow.length > 0;

    // Limpiar selección cuando la cita se confirma exitosamente
    useEffect(() => { if (done) setPendingSlot(null); }, [done]);

    const dayLabel = (dateStr: string) => {
        if (dateStr === todayStr) return 'Hoy';
        if (dateStr === tomorrowStr) return 'Mañana';
        return formatAptDate(dateStr);
    };

    return (
        // Sin backdrop-blur — causa problemas de touch en iOS Safari
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
            onClick={(e) => { if (e.target === e.currentTarget) { setPendingSlot(null); onClose(); } }}>
            <div className="bg-space-card border border-space-border w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">

                {/* Header */}
                <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-space-border/40 shrink-0">
                    <div>
                        <h3 className="font-extrabold text-base">Reagendar cita</h3>
                        <p className="text-xs text-space-muted mt-0.5 flex items-center gap-1.5">
                            <Scissors size={11} />
                            {serviceName}{barberName ? ` · ${barberName}` : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-space-muted hover:text-space-text transition-colors shrink-0">
                        <X size={16} />
                    </button>
                </div>

                {/* Cuerpo con scroll */}
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

                    {/* Cargando */}
                    {loading && (
                        <div className="py-10 flex justify-center"><LoadingSpinner /></div>
                    )}

                    {/* Éxito */}
                    {!loading && done && (
                        <div className="py-8 text-center space-y-3">
                            <div className="w-12 h-12 mx-auto rounded-full bg-space-success/10 flex items-center justify-center">
                                <Check size={22} className="text-space-success" />
                            </div>
                            <div>
                                <p className="font-extrabold">¡Cita reagendada!</p>
                                <p className="text-sm text-space-muted mt-1">
                                    {dayLabel(done.date)} · {formatTimeDisplay(done.time)}
                                </p>
                            </div>
                            <button onClick={onClose} className="btn-primary text-xs px-6 py-2.5">Listo</button>
                        </div>
                    )}

                    {/* Paso 2: confirmar horario seleccionado */}
                    {!loading && !done && pendingSlot && (
                        <div className="space-y-4">
                            <div className="bg-space-card2/50 rounded-xl p-4 text-center">
                                <p className="text-xs text-space-muted mb-1">Nuevo horario</p>
                                <p className="text-2xl font-extrabold text-space-primary">{formatTimeDisplay(pendingSlot.time)}</p>
                                <p className="text-sm text-space-muted mt-0.5">{dayLabel(pendingSlot.date)}</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPendingSlot(null)}
                                    disabled={confirming}
                                    className="flex-1 min-h-[44px] rounded-xl border border-space-border/60 text-sm font-bold text-space-muted hover:text-space-text transition-all disabled:opacity-40">
                                    Cambiar
                                </button>
                                <button
                                    onClick={() => onConfirm(pendingSlot.date, pendingSlot.time)}
                                    disabled={confirming}
                                    className="flex-1 min-h-[44px] btn-primary text-sm disabled:opacity-40">
                                    {confirming ? 'Guardando…' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Paso 1: grid de horarios */}
                    {!loading && !done && !pendingSlot && hasAnySlot && (
                        <div className="space-y-5">
                            {slots.today.length > 0 && (
                                <div>
                                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-space-muted mb-3">Hoy</p>
                                    <div className="flex flex-wrap gap-2">
                                        {slots.today.map(t => (
                                            <SlotButton key={t} time={t} onSelect={() => setPendingSlot({ date: todayStr, time: t })} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            {slots.tomorrow.length > 0 && (
                                <div>
                                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-space-muted mb-3">Mañana</p>
                                    <div className="flex flex-wrap gap-2">
                                        {slots.tomorrow.map(t => (
                                            <SlotButton key={t} time={t} onSelect={() => setPendingSlot({ date: tomorrowStr, time: t })} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sin disponibilidad */}
                    {!loading && !done && !pendingSlot && !hasAnySlot && (
                        <div className="py-6 text-center">
                            <p className="text-sm text-space-muted">No hay disponibilidad hoy ni mañana.</p>
                        </div>
                    )}
                </div>

                {/* Footer: otras fechas */}
                {!loading && !done && bookingLink && (
                    <div className="px-5 py-4 border-t border-space-border/40 shrink-0">
                        <a href={bookingLink} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 text-xs font-bold text-space-primary hover:opacity-70 transition-opacity min-h-[44px]">
                            <CalendarClock size={12} /> Ver más fechas →
                        </a>
                    </div>
                )}
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
            // Duración del servicio (viene de services(name, duration_minutes) en getCustomerAppointments)
            const dur: number = apt.services?.duration_minutes ?? 30;

            // Queries directas: schedule + get_busy_slots (sin barbers_services).
            // calculateAvailability requiere barbers_services — falla si la cita
            // fue creada por el bot (INSERT directo sin pasar por esa tabla).
            const getSlots = async (date: string): Promise<string[]> => {
                const dow = new Date(date + 'T12:00:00').getDay();
                const [{ data: sched }, { data: busy }] = await Promise.all([
                    supabase
                        .from('schedules')
                        .select('start_time, end_time')
                        .eq('barber_id', apt.barber_id)
                        .eq('day_of_week', dow)
                        .eq('is_active', true)
                        .maybeSingle(),
                    supabase.rpc('get_busy_slots', { p_barber_id: apt.barber_id, p_date: date }),
                ]);

                if (!sched) return [];
                const busyList: { start_time: string; end_time: string }[] = busy || [];

                const slots: string[] = [];
                let [sh, sm] = sched.start_time.split(':').map(Number);
                const [eh, em] = sched.end_time.split(':').map(Number);
                const endMin = eh * 60 + em;

                while (sh * 60 + sm + dur <= endMin) {
                    const slotStart = sh * 60 + sm;
                    const slotEnd   = slotStart + dur;
                    const t = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
                    const hasConflict = busyList.some(b => {
                        const [bsh, bsm] = b.start_time.slice(0, 5).split(':').map(Number);
                        const [beh, bem] = b.end_time.slice(0, 5).split(':').map(Number);
                        return slotStart < beh * 60 + bem && slotEnd > bsh * 60 + bsm;
                    });
                    if (!hasConflict) slots.push(t);
                    sm += 30;
                    if (sm >= 60) { sh++; sm -= 60; }
                }

                // Filtrar slots pasados para hoy (PR time = UTC-4)
                if (date === todayPR) {
                    const nowPR = new Date(Date.now() - 4 * 60 * 60 * 1000);
                    const nowMin = nowPR.getUTCHours() * 60 + nowPR.getUTCMinutes();
                    return slots.filter(t => {
                        const [h, m] = t.split(':').map(Number);
                        return h * 60 + m > nowMin + 15;
                    });
                }
                return slots;
            };

            const [todaySlots, tomorrowSlots] = await Promise.all([
                getSlots(todayPR),
                getSlots(tomorrowPR),
            ]);
            setReschedSlots({ today: todaySlots, tomorrow: tomorrowSlots });
        } catch {
            setReschedSlots({ today: [], tomorrow: [] });
        } finally {
            setReschedLoading(false);
        }
    }, [todayPR, tomorrowPR]);

    const handleRescheduleConfirm = useCallback(async (newDate: string, newTime: string) => {
        if (!rescheduleApt) return;
        setReschedConfirming(true);
        try {
            let result: { data: any; error: any };
            if (rescheduleApt.cancel_token) {
                // Cita con token (flujo guest) → RPC por token
                result = await supabase.rpc('reschedule_appointment_by_token', {
                    p_token:     rescheduleApt.cancel_token,
                    p_new_date:  newDate,
                    p_new_start: newTime,
                });
            } else {
                // Usuario autenticado → RPC por appointment_id + auth.uid()
                result = await supabase.rpc('reschedule_my_appointment', {
                    p_appointment_id: rescheduleApt.id,
                    p_new_date:       newDate,
                    p_new_start:      newTime,
                });
            }
            if (result.error) throw result.error;
            if (!result.data?.success) throw new Error(result.data?.error || 'reschedule_failed');
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
                                const dateStr     = formatAptDate(apt.appointment_date);
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
