import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomerAppointments } from '@/services/appointments.service';
import { supabase } from '@/supabaseClient';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatTimeDisplay } from '@/utils';
import {
    Bell, Calendar, CalendarClock, Check, Heart, Home,
    Phone, Scissors, Search, ShieldCheck, Store, User as UserIcon, X,
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
            className="min-w-[90px] min-h-[44px] px-3 rounded-xl border border-[#243529] text-sm font-bold text-[#f0f4ee] hover:border-[#9bc287] hover:text-[#9bc287] hover:bg-[#9bc287]/5 active:scale-95 transition-all">
            {formatTimeDisplay(time)}
        </button>
    );
}

function RescheduleModal({ apt, todayStr, tomorrowStr, slots, loading, confirming, done, bookingLink, onClose, onConfirm }: RescheduleModalProps) {
    const [pendingSlot, setPendingSlot] = useState<{ date: string; time: string } | null>(null);
    const serviceName = apt.services?.name || 'Servicio';
    const barberName  = apt.barbers?.name;
    const hasAnySlot  = slots.today.length > 0 || slots.tomorrow.length > 0;

    useEffect(() => { if (done) setPendingSlot(null); }, [done]);

    const dayLabel = (dateStr: string) => {
        if (dateStr === todayStr) return 'Hoy';
        if (dateStr === tomorrowStr) return 'Mañana';
        return formatAptDate(dateStr);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
            onClick={(e) => { if (e.target === e.currentTarget) { setPendingSlot(null); onClose(); } }}>
            <div className="bg-[#131c17] border border-[#243529] w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">

                <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-[#243529]/60 shrink-0">
                    <div>
                        <h3 className="font-extrabold text-base text-[#f0f4ee]">Reagendar cita</h3>
                        <p className="text-xs text-[#95ab8a] mt-0.5 flex items-center gap-1.5">
                            <Scissors size={11} />
                            {serviceName}{barberName ? ` · ${barberName}` : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-[#95ab8a] hover:text-[#f0f4ee] transition-colors shrink-0">
                        <X size={16} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
                    {loading && (
                        <div className="py-10 flex justify-center"><LoadingSpinner /></div>
                    )}
                    {!loading && done && (
                        <div className="py-8 text-center space-y-3">
                            <div className="w-12 h-12 mx-auto rounded-full bg-[#22c55e]/10 flex items-center justify-center">
                                <Check size={22} className="text-[#22c55e]" />
                            </div>
                            <div>
                                <p className="font-extrabold text-[#f0f4ee]">¡Cita reagendada!</p>
                                <p className="text-sm text-[#95ab8a] mt-1">
                                    {dayLabel(done.date)} · {formatTimeDisplay(done.time)}
                                </p>
                            </div>
                            <button onClick={onClose} className="rounded-full bg-[#9bc287] px-6 py-2.5 text-xs font-extrabold text-[#22321c]">Listo</button>
                        </div>
                    )}
                    {!loading && !done && pendingSlot && (
                        <div className="space-y-4">
                            <div className="bg-[#1d2a23] rounded-xl p-4 text-center">
                                <p className="text-xs text-[#95ab8a] mb-1">Nuevo horario</p>
                                <p className="text-2xl font-extrabold text-[#9bc287]">{formatTimeDisplay(pendingSlot.time)}</p>
                                <p className="text-sm text-[#95ab8a] mt-0.5">{dayLabel(pendingSlot.date)}</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPendingSlot(null)}
                                    disabled={confirming}
                                    className="flex-1 min-h-[44px] rounded-xl border border-[#243529] text-sm font-bold text-[#95ab8a] hover:text-[#f0f4ee] transition-all disabled:opacity-40">
                                    Cambiar
                                </button>
                                <button
                                    onClick={() => onConfirm(pendingSlot.date, pendingSlot.time)}
                                    disabled={confirming}
                                    className="flex-1 min-h-[44px] rounded-full bg-[#9bc287] text-[#22321c] text-sm font-extrabold disabled:opacity-40">
                                    {confirming ? 'Guardando…' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    )}
                    {!loading && !done && !pendingSlot && hasAnySlot && (
                        <div className="space-y-5">
                            {slots.today.length > 0 && (
                                <div>
                                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#95ab8a] mb-3">Hoy</p>
                                    <div className="flex flex-wrap gap-2">
                                        {slots.today.map(t => (
                                            <SlotButton key={t} time={t} onSelect={() => setPendingSlot({ date: todayStr, time: t })} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            {slots.tomorrow.length > 0 && (
                                <div>
                                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#95ab8a] mb-3">Mañana</p>
                                    <div className="flex flex-wrap gap-2">
                                        {slots.tomorrow.map(t => (
                                            <SlotButton key={t} time={t} onSelect={() => setPendingSlot({ date: tomorrowStr, time: t })} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {!loading && !done && !pendingSlot && !hasAnySlot && (
                        <div className="py-6 text-center">
                            <p className="text-sm text-[#95ab8a]">No hay disponibilidad hoy ni mañana.</p>
                        </div>
                    )}
                </div>

                {!loading && !done && bookingLink && (
                    <div className="px-5 py-4 border-t border-[#243529]/60 shrink-0">
                        <a href={bookingLink} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#9bc287] hover:opacity-70 transition-opacity min-h-[44px]">
                            <CalendarClock size={12} /> Ver más fechas →
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

const FAVORITES_KEY = 'favoriteBusinesses';
const BIZ_CATEGORIES = ['Todos', 'Barberías', 'Salones', 'Spas', 'Nails'];

export default function ClientHome() {
    const { user, logout } = useAuth();
    const tabBarRef = useRef<HTMLDivElement>(null);

    const [appointments, setAppointments] = useState<any[]>([]);
    const [loadingApts, setLoadingApts] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    // ── Reagendamiento ──────────────────────────────────────────────────
    const [rescheduleApt,    setRescheduleApt]    = useState<any>(null);
    const [reschedSlots,     setReschedSlots]     = useState<ReschedSlots>({ today: [], tomorrow: [] });
    const [reschedLoading,   setReschedLoading]   = useState(false);
    const [reschedConfirming,setReschedConfirming]= useState(false);
    const [reschedDone,      setReschedDone]      = useState<{ date: string; time: string } | null>(null);

    const [businesses, setBusinesses]   = useState<any[]>([]);
    const [loadingBiz, setLoadingBiz]   = useState(true);
    const [search, setSearch]           = useState('');
    const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
    const [activeCategory, setActiveCategory] = useState('Todos');

    // ── Verificación de teléfono ──────────────────────────────────────
    const [phoneVerified,   setPhoneVerified]   = useState<boolean | null>(null);
    const [profilePhone,    setProfilePhone]    = useState('');
    const [showVerifBanner, setShowVerifBanner] = useState(false);
    const [verifStep,       setVerifStep]       = useState<'idle' | 'sending' | 'code' | 'done'>('idle');
    const [verifCode,       setVerifCode]       = useState('');
    const [verifError,      setVerifError]      = useState('');
    const [verifLoading,    setVerifLoading]    = useState(false);

    // ── Data loaders ──────────────────────────────────────────────────
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
            setBusinesses((data as any[]) || []);
        } catch { /* silent */ }
        finally { setLoadingBiz(false); }
    }, []);

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

    // Tab bar — sigue el viewport visual (barra de URL Chrome/Safari)
    useEffect(() => {
        const vv = window.visualViewport;
        const el = tabBarRef.current;
        if (!vv || !el) return;
        const sync = () => {
            const offset = window.innerHeight - (vv.height + vv.offsetTop);
            el.style.transform = `translateY(${-offset}px)`;
        };
        vv.addEventListener('resize', sync);
        vv.addEventListener('scroll', sync);
        window.addEventListener('scroll', sync, { passive: true });
        sync();
        return () => {
            vv.removeEventListener('resize', sync);
            vv.removeEventListener('scroll', sync);
            window.removeEventListener('scroll', sync);
        };
    }, []);

    // ── Handlers ──────────────────────────────────────────────────────
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

    // ── Reagendamiento handlers ───────────────────────────────────────
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
            const dur: number = apt.services?.duration_minutes ?? 30;

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
                result = await supabase.rpc('reschedule_appointment_by_token', {
                    p_token:     rescheduleApt.cancel_token,
                    p_new_date:  newDate,
                    p_new_start: newTime,
                });
            } else {
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

    // ── Verificación handlers ─────────────────────────────────────────
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
            await loadApts();
        } catch (err: any) {
            setVerifError(err.message || 'Código inválido o expirado.');
        } finally {
            setVerifLoading(false);
        }
    };

    // ── Derived ───────────────────────────────────────────────────────
    const q = search.toLowerCase().trim();
    const filteredBusinesses = businesses.filter((b) => {
        const matchesSearch = !q
            || b.name.toLowerCase().includes(q)
            || (b.city || '').toLowerCase().includes(q)
            || (b.services || []).some((s: any) => s.name.toLowerCase().includes(q));
        const matchesCategory = activeCategory === 'Todos'
            || (b.business_type || '').toLowerCase().includes(activeCategory.toLowerCase().slice(0, -1));
        return matchesSearch && matchesCategory;
    });

    const fullName    = user?.user_metadata?.full_name || '';
    const firstName   = fullName.split(' ')[0] || user?.email?.split('@')[0] || '';
    const avatarLetter = (fullName || user?.email || 'U')[0].toUpperCase();
    const nextApt     = appointments[0] ?? null;
    const isNewClient = !loadingApts && appointments.length === 0;

    const statusBadge = (apt: any) => {
        if (apt.status === 'confirmed') return { label: 'Confirmada', cls: 'text-[#22c55e] bg-[#22c55e]/10' };
        if (apt.source === 'bot' || apt.status === 'via_bot') return { label: 'Vía Bot', cls: 'text-[#9bc287] bg-[#9bc287]/10' };
        return { label: 'Pendiente', cls: 'text-yellow-400 bg-yellow-400/10' };
    };

    // ── Render ────────────────────────────────────────────────────────
    return (
        <div className="min-h-[100dvh] bg-[#090d0b] text-[#f0f4ee]">

            {/* ── Header sticky ── */}
            <header className="sticky top-0 z-40 h-[60px] border-b border-[#1d2a23] backdrop-blur-[20px]"
                style={{ background: 'rgba(9,13,11,0.85)' }}>
                <div className="mx-auto flex h-full max-w-5xl items-center justify-between gap-2 px-4">

                    {/* Logo */}
                    <Link to="/" className="flex shrink-0 items-center gap-2 no-underline">
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl"
                            style={{ background: 'linear-gradient(135deg, #9bc287, #3a7553)' }}>
                            <img src="/logo.png" alt="Spacey" className="h-full w-full object-cover object-top" />
                        </div>
                        <span className="hidden font-extrabold tracking-tight text-[#f0f4ee] sm:block">Spacey</span>
                    </Link>

                    {/* Tabs centro — oculto en móvil */}
                    <nav className="hidden items-center gap-1 rounded-full border border-[#1d2a23] bg-[#131c17] p-1 sm:flex">
                        {[
                            { label: 'Inicio', href: '#top' },
                            { label: 'Mis citas', href: '#mis-citas' },
                            { label: 'Explorar', href: '#explorar' },
                        ].map((tab, i) => (
                            <a key={tab.label} href={tab.href}
                                className={`rounded-full px-4 py-[7px] text-[13px] font-extrabold no-underline transition-all ${
                                    i === 0
                                        ? 'bg-[#9bc287] text-[#22321c]'
                                        : 'text-[#95ab8a] hover:bg-[#131c17] hover:text-[#f0f4ee]'
                                }`}>
                                {tab.label}
                            </a>
                        ))}
                    </nav>

                    {/* Derecha: campana + avatar */}
                    <div className="flex shrink-0 items-center gap-2">
                        <button className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[#243529] bg-[#131c17] transition hover:border-[#9bc287]">
                            <Bell size={16} className="text-[#95ab8a]" />
                            <span className="absolute right-2 top-2 h-[7px] w-[7px] rounded-full bg-[#9bc287]" />
                        </button>
                        <button
                            onClick={() => logout()}
                            className="flex items-center gap-2 rounded-full border border-[#243529] bg-[#131c17] py-1.5 pl-1.5 pr-3 transition hover:border-[#9bc287]">
                            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[12px] font-extrabold text-[#22321c]"
                                style={{ background: 'linear-gradient(135deg, #9bc287, #3a7553)' }}>
                                {avatarLetter}
                            </span>
                            <span className="hidden max-w-[80px] truncate text-[13px] font-bold text-[#95ab8a] sm:block">
                                {firstName}
                            </span>
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Verificación inline (clientes con citas y tel sin verificar) ── */}
            {phoneVerified === false && profilePhone && appointments.length > 0 && !showVerifBanner && (
                <div style={{ background: 'rgba(155,194,135,0.06)', borderBottom: '1px solid rgba(155,194,135,0.15)' }}>
                    <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                            <Phone size={15} className="shrink-0 text-[#9bc287]" />
                            <p className="truncate text-sm font-medium text-[#f0f4ee]">
                                Verifica tu número para ver tus citas de WhatsApp
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                onClick={() => { setShowVerifBanner(true); sendVerifSMS(); }}
                                className="whitespace-nowrap text-xs font-extrabold text-[#9bc287] hover:opacity-70 transition-opacity">
                                Verificar ahora →
                            </button>
                            <button onClick={() => setPhoneVerified(true)} className="p-1 text-[#95ab8a] hover:text-[#f0f4ee] transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showVerifBanner && phoneVerified === false && (
                <div className="border-b border-[#243529] bg-[#131c17]">
                    <div className="mx-auto max-w-5xl px-4 py-4">
                        {verifStep === 'sending' && (
                            <div className="flex items-center gap-2 text-sm text-[#95ab8a]">
                                <span className="h-4 w-4 rounded-full border-2 border-[#9bc287]/30 border-t-[#9bc287] animate-spin" />
                                Enviando código a {profilePhone}…
                            </div>
                        )}
                        {verifStep === 'code' && (
                            <form onSubmit={handleVerifSubmit} className="flex flex-wrap items-end gap-3">
                                <div className="min-w-[180px] flex-1">
                                    <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#95ab8a]">
                                        <ShieldCheck size={13} className="text-[#9bc287]" />
                                        Código enviado a {profilePhone}
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={4}
                                        value={verifCode}
                                        onChange={(e) => { setVerifCode(e.target.value.replace(/\D/g, '')); setVerifError(''); }}
                                        className="max-w-[140px] rounded-xl border border-[#243529] bg-[#1d2a23] px-4 py-2.5 text-center text-xl font-extrabold tracking-[0.4em] text-[#f0f4ee] placeholder-[#35503f] focus:border-[#9bc287] focus:outline-none"
                                        placeholder="····"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex items-center gap-2 pb-0.5">
                                    <button type="submit" disabled={verifLoading || verifCode.length < 4}
                                        className="h-10 rounded-full bg-[#9bc287] px-4 text-xs font-extrabold text-[#22321c] disabled:opacity-40">
                                        {verifLoading ? 'Verificando…' : 'Confirmar'}
                                    </button>
                                    <button type="button" onClick={sendVerifSMS} className="text-xs font-bold text-[#95ab8a] hover:text-[#9bc287] transition-colors">
                                        Reenviar
                                    </button>
                                    <button type="button" onClick={() => setShowVerifBanner(false)} className="p-1 text-[#95ab8a] hover:text-[#f0f4ee] transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                                {verifError && <p className="w-full text-xs font-medium text-[#ef4444]">{verifError}</p>}
                            </form>
                        )}
                    </div>
                </div>
            )}

            <main id="top" className="mx-auto max-w-5xl space-y-14 px-4 pb-[110px] pt-8 sm:pb-12">

                {/* ── Saludo + card principal ── */}
                <section>
                    <div className="mb-6">
                        <h1 className="text-[clamp(26px,4vw,34px)] font-extrabold tracking-[-0.02em]">
                            Hola, {firstName} 👋
                        </h1>
                        <p className="mt-1 text-sm text-[#95ab8a]">
                            {isNewClient
                                ? 'Bienvenido a Spacey — aquí gestionas todas tus reservas.'
                                : `Tienes ${appointments.length} cita${appointments.length !== 1 ? 's' : ''} próxima${appointments.length !== 1 ? 's' : ''}. Todo bajo control.`}
                        </p>
                    </div>

                    {loadingApts ? (
                        <div className="flex justify-center py-12"><LoadingSpinner /></div>

                    ) : !isNewClient && nextApt ? (
                        /* Card "Tu próxima cita" */
                        <div className="relative overflow-hidden rounded-[20px] p-6 sm:p-8"
                            style={{
                                background: 'linear-gradient(135deg, #16241c, #0e1611)',
                                border: '1px solid #2c4033',
                                boxShadow: '0 0 60px -12px rgba(155,194,135,0.14)',
                            }}>
                            <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-[200px] w-[200px] rounded-full"
                                style={{ background: 'radial-gradient(circle at top right, rgba(155,194,135,0.14), transparent 70%)' }} />

                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#9bc287]/25 bg-[#9bc287]/10 px-3 py-[5px] text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#9bc287]">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#9bc287]" />
                                Tu próxima cita
                            </div>

                            <div className="text-[22px] font-extrabold tracking-tight">
                                {nextApt.services?.name || 'Servicio'}
                            </div>
                            <div className="mt-1 text-sm text-[#95ab8a]">
                                {nextApt.business?.name}{nextApt.barbers?.name ? ` · ${nextApt.barbers.name}` : ''}
                            </div>

                            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#1d2a23] bg-[#0e1611] px-4 py-2.5 text-sm font-bold text-[#9bc287]">
                                📅 {formatAptDate(nextApt.appointment_date)} · {formatTimeDisplay(nextApt.start_time)}
                            </div>

                            <div className="mt-5 flex flex-wrap gap-3">
                                <button
                                    onClick={() => handleOpenReschedule(nextApt)}
                                    className="rounded-full bg-[#9bc287] px-5 py-2.5 text-sm font-extrabold text-[#22321c] transition hover:bg-[#86ad72]">
                                    Reagendar
                                </button>
                                <button
                                    onClick={() => handleCancel(nextApt)}
                                    className="rounded-full border border-[#35503f] px-5 py-2.5 text-sm font-bold text-[#f0f4ee] transition hover:border-[#9bc287] hover:text-[#9bc287]">
                                    Ver detalles
                                </button>
                            </div>
                        </div>

                    ) : isNewClient ? (
                        /* Card "Empieza en 3 pasos" */
                        <div className="rounded-[20px] border border-[#243529] bg-[#131c17] p-6 sm:p-8">
                            <div className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#95ab8a]">
                                1 de 3
                            </div>
                            <h2 className="mb-6 text-xl font-extrabold">Empieza en 3 pasos</h2>
                            <div className="grid gap-4 sm:grid-cols-3">
                                {/* Paso 1 — completado */}
                                <div className="flex flex-col gap-3 rounded-[14px] p-4"
                                    style={{ background: 'rgba(155,194,135,0.06)', border: '1px solid rgba(155,194,135,0.2)' }}>
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#9bc287] text-[#22321c]">
                                        <Check size={16} />
                                    </div>
                                    <div>
                                        <div className="font-extrabold text-[#f0f4ee]">Crea tu cuenta</div>
                                        <div className="mt-0.5 text-xs text-[#95ab8a]">Ya completado</div>
                                    </div>
                                </div>

                                {/* Paso 2 — verificar teléfono */}
                                {phoneVerified ? (
                                    <div className="flex flex-col gap-3 rounded-[14px] p-4"
                                        style={{ background: 'rgba(155,194,135,0.06)', border: '1px solid rgba(155,194,135,0.2)' }}>
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#9bc287] text-[#22321c]">
                                            <Check size={16} />
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-[#f0f4ee]">Verifica tu teléfono</div>
                                            <div className="mt-0.5 text-xs text-[#95ab8a]">Verificado</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3 rounded-[14px] p-4"
                                        style={{ border: '1px solid #9bc287', boxShadow: '0 0 20px -8px rgba(155,194,135,0.3)' }}>
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#9bc287] text-[13px] font-extrabold text-[#9bc287]">
                                            2
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-extrabold text-[#f0f4ee]">Verifica tu teléfono</div>
                                            <div className="mt-0.5 text-xs text-[#95ab8a]">Para ver tus citas de WhatsApp aquí</div>
                                        </div>
                                        {!showVerifBanner ? (
                                            <button
                                                onClick={() => { setShowVerifBanner(true); if (profilePhone) sendVerifSMS(); }}
                                                className="mt-1 text-left text-xs font-extrabold text-[#9bc287] hover:opacity-70 transition-opacity">
                                                Verificar ahora →
                                            </button>
                                        ) : verifStep === 'code' ? (
                                            <form onSubmit={handleVerifSubmit} className="flex gap-2 pt-1">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={4}
                                                    value={verifCode}
                                                    onChange={(e) => { setVerifCode(e.target.value.replace(/\D/g, '')); setVerifError(''); }}
                                                    className="w-20 rounded-xl border border-[#243529] bg-[#1d2a23] px-2 py-2 text-center text-sm font-extrabold tracking-[0.3em] text-[#f0f4ee] focus:border-[#9bc287] focus:outline-none"
                                                    placeholder="····"
                                                    autoFocus
                                                />
                                                <button type="submit" disabled={verifLoading || verifCode.length < 4}
                                                    className="flex-1 rounded-full bg-[#9bc287] text-[11px] font-extrabold text-[#22321c] disabled:opacity-40">
                                                    {verifLoading ? '…' : 'OK'}
                                                </button>
                                            </form>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-xs text-[#95ab8a]">
                                                <span className="h-3 w-3 rounded-full border-2 border-[#9bc287]/30 border-t-[#9bc287] animate-spin" />
                                                Enviando…
                                            </div>
                                        )}
                                        {verifError && <p className="text-[10px] text-[#ef4444]">{verifError}</p>}
                                    </div>
                                )}

                                {/* Paso 3 — pendiente */}
                                <div className="flex flex-col gap-3 rounded-[14px] p-4 opacity-75" style={{ border: '1px solid #243529' }}>
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#35503f] text-[13px] font-extrabold text-[#95ab8a]">
                                        3
                                    </div>
                                    <div>
                                        <div className="font-extrabold text-[#f0f4ee]">Reserva tu primera cita</div>
                                        <div className="mt-0.5 text-xs text-[#95ab8a]">Explora los negocios abajo</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Acciones rápidas */}
                    <div className="mt-4 flex flex-wrap gap-3">
                        {[
                            { icon: '🔍', label: 'Buscar negocio', href: '#explorar' },
                            { icon: '💬', label: 'Reservar por WhatsApp', href: 'https://wa.me/19392983515' },
                            { icon: '⭐', label: 'Mis favoritos', href: '#explorar' },
                        ].map((a) => (
                            <a key={a.label} href={a.href}
                                className="inline-flex items-center gap-2 rounded-full border border-[#243529] bg-[#131c17] px-4 py-2.5 text-[13px] font-bold text-[#95ab8a] no-underline transition hover:border-[#9bc287] hover:text-[#9bc287]">
                                <span>{a.icon}</span> {a.label}
                            </a>
                        ))}
                    </div>
                </section>

                {/* ── Mis citas ── */}
                <section id="mis-citas" className="scroll-mt-20">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-[21px] font-extrabold">Mis citas</h2>
                        <a href="#mis-citas" className="text-xs font-bold text-[#9bc287] no-underline hover:opacity-70 transition-opacity">
                            Ver historial →
                        </a>
                    </div>

                    {loadingApts ? (
                        <div className="flex justify-center py-12"><LoadingSpinner /></div>

                    ) : appointments.length === 0 ? (
                        <div className="flex flex-col items-center rounded-[20px] p-10 text-center"
                            style={{ border: '1px dashed #35503f', background: '#131c17' }}>
                            <div className="mb-4 flex h-[60px] w-[60px] items-center justify-center rounded-2xl"
                                style={{ background: 'rgba(155,194,135,0.1)' }}>
                                <span className="text-2xl">📅</span>
                            </div>
                            <p className="font-extrabold text-[#f0f4ee]">Aún no tienes citas</p>
                            <p className="mt-1.5 max-w-xs text-sm text-[#95ab8a]">
                                Explora los negocios y reserva tu primera cita en segundos.
                            </p>
                            <a href="#explorar"
                                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#9bc287] px-6 py-2.5 text-sm font-extrabold text-[#22321c] no-underline transition hover:bg-[#86ad72]">
                                Explorar negocios →
                            </a>
                        </div>

                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {appointments.map((apt) => {
                                const badge      = statusBadge(apt);
                                const isCancelling = cancellingId === apt.id;
                                return (
                                    <div key={apt.id}
                                        className="flex flex-col gap-4 rounded-[20px] p-5 transition hover:border-[#9bc287]/30"
                                        style={{ background: '#131c17', border: '1px solid #243529' }}>

                                        {/* Cabecera */}
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-xl"
                                                style={{ background: 'rgba(155,194,135,0.1)' }}>
                                                ✂️
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[15px] font-extrabold leading-tight">
                                                    {apt.services?.name || 'Servicio'}
                                                </div>
                                                <div className="mt-0.5 truncate text-[13px] text-[#95ab8a]">
                                                    {apt.business?.name}{apt.barbers?.name ? ` · ${apt.barbers.name}` : ''}
                                                </div>
                                            </div>
                                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${badge.cls}`}>
                                                {badge.label}
                                            </span>
                                        </div>

                                        {/* Fecha */}
                                        <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#9bc287]"
                                            style={{ background: '#0e1611', border: '1px solid #1d2a23', borderRadius: 12 }}>
                                            📅 {formatAptDate(apt.appointment_date)} · {formatTimeDisplay(apt.start_time)}
                                        </div>

                                        {/* Botones */}
                                        <div className="flex gap-2.5">
                                            <button
                                                onClick={() => handleOpenReschedule(apt)}
                                                className="h-10 flex-1 rounded-full border border-[#35503f] text-[11px] font-extrabold uppercase tracking-wide text-[#95ab8a] transition hover:border-[#9bc287] hover:text-[#9bc287]">
                                                Reagendar
                                            </button>
                                            <button
                                                onClick={() => handleCancel(apt)}
                                                disabled={isCancelling}
                                                className="h-10 flex-1 rounded-full border border-[#ef4444]/30 text-[11px] font-extrabold uppercase tracking-wide text-[#ef4444] transition hover:bg-[#ef4444] hover:text-white disabled:opacity-40">
                                                {isCancelling ? 'Cancelando…' : 'Cancelar'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* ── Explorar ── */}
                <section id="explorar" className="scroll-mt-20">
                    <div className="mb-5">
                        <h2 className="text-[21px] font-extrabold">Explorar negocios</h2>
                        <p className="mt-1 text-sm text-[#95ab8a]">Barberías, salones, spas y más cerca de ti.</p>
                    </div>

                    {/* Buscador pill */}
                    <div className="mb-5 flex items-center gap-3 rounded-full border border-[#243529] bg-[#131c17] px-4 py-2">
                        <Search size={15} className="shrink-0 text-[#95ab8a]" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre, ciudad o servicio…"
                            className="flex-1 bg-transparent text-[13px] font-semibold text-[#f0f4ee] placeholder-[#35503f] focus:outline-none"
                        />
                        {search && (
                            <button onClick={() => setSearch('')}
                                className="rounded-full bg-[#9bc287] px-3 py-1 text-[11px] font-extrabold text-[#22321c]">
                                Buscar
                            </button>
                        )}
                    </div>

                    {/* Chips de categoría */}
                    <div className="mb-6 flex flex-wrap gap-2">
                        {BIZ_CATEGORIES.map((cat) => (
                            <button key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`rounded-full border px-[18px] py-[9px] text-[13px] font-bold transition-all ${
                                    cat === activeCategory
                                        ? 'border-[#9bc287] bg-[#9bc287] text-[#22321c]'
                                        : 'border-[#243529] bg-[#131c17] text-[#95ab8a] hover:border-[#9bc287]'
                                }`}>
                                {cat}
                            </button>
                        ))}
                    </div>

                    {loadingBiz ? (
                        <div className="flex justify-center py-12"><LoadingSpinner /></div>

                    ) : filteredBusinesses.length === 0 ? (
                        <div className="rounded-[20px] p-8 text-center" style={{ background: '#131c17', border: '1px solid #243529' }}>
                            <p className="text-sm text-[#95ab8a]">
                                {q ? `No encontramos resultados para "${search}".` : 'Aún no hay negocios disponibles.'}
                            </p>
                        </div>

                    ) : (
                        /* Carrusel horizontal con snap */
                        <div className="flex gap-5 overflow-x-auto pb-4 pt-1"
                            style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
                            {filteredBusinesses.map((b) => (
                                <div key={b.id}
                                    className="flex w-[280px] shrink-0 snap-start flex-col overflow-hidden rounded-[22px] transition hover:-translate-y-0.5 hover:border-[#9bc287] max-sm:w-[78vw]"
                                    style={{ background: '#131c17', border: '1px solid #243529' }}>

                                    {/* Foto */}
                                    <div className="relative h-[140px] w-full shrink-0 overflow-hidden"
                                        style={{ background: '#1d2a23' }}>
                                        {b.banner_url
                                            ? <img src={b.banner_url} alt={b.name} className="h-full w-full object-cover" />
                                            : <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#95ab8a]">
                                                {b.name}
                                              </div>
                                        }
                                        {/* Botón favorito */}
                                        <button
                                            onClick={(e) => toggleFavorite(e, b.slug)}
                                            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition"
                                            style={{ background: 'rgba(9,13,11,0.7)' }}>
                                            <Heart
                                                size={14}
                                                className={favoriteSlugs.includes(b.slug) ? 'fill-[#9bc287] text-[#9bc287]' : 'text-[#95ab8a]'}
                                            />
                                        </button>
                                    </div>

                                    <div className="flex flex-1 flex-col gap-2 p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="m-0 text-[15px] font-extrabold tracking-tight text-[#f0f4ee]">{b.name}</h3>
                                            {b.avg_rating && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-[#1d2a23] px-2 py-1 text-[11px] font-extrabold text-[#f0f4ee]">
                                                    ★ {b.avg_rating}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs font-bold text-[#95ab8a]">📍 {b.city || 'Puerto Rico'}</div>
                                        {b.services?.length > 0 && (
                                            <div className="text-[12px] text-[#95ab8a]">
                                                {b.services.slice(0, 3).map((s: any) => s.name).join(' · ')}
                                            </div>
                                        )}
                                        <Link
                                            to={`/book/${b.slug}`}
                                            className="mt-auto block rounded-full bg-[#9bc287] py-2.5 text-center text-[13px] font-extrabold text-[#22321c] no-underline transition hover:bg-[#86ad72]">
                                            Reservar →
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

            </main>

            {/* ── Tab bar móvil ── */}
            <div
                ref={tabBarRef}
                className="fixed bottom-0 left-0 right-0 z-40 sm:hidden"
                style={{
                    background: 'rgba(19,28,23,0.92)',
                    borderTop: '1px solid #243529',
                    backdropFilter: 'blur(20px)',
                    paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
                    willChange: 'transform',
                    transition: 'transform 0.12s ease-out',
                }}>
                <div className="flex">
                    {[
                        { icon: <Home size={20} />, label: 'Inicio', href: '#top' },
                        { icon: <Calendar size={20} />, label: 'Citas', href: '#mis-citas' },
                        { icon: <Search size={20} />, label: 'Explorar', href: '#explorar' },
                        { icon: <UserIcon size={20} />, label: 'Perfil', href: '#top', onClick: () => logout() },
                    ].map((tab, i) => (
                        <a
                            key={tab.label}
                            href={tab.href}
                            onClick={tab.onClick}
                            className="flex flex-1 flex-col items-center justify-center gap-1 py-2 no-underline transition-colors"
                            style={{ minHeight: 44, color: i === 0 ? '#9bc287' : '#95ab8a' }}>
                            {tab.icon}
                            <span className="text-[10px] font-extrabold uppercase tracking-wide">{tab.label}</span>
                        </a>
                    ))}
                </div>
            </div>

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
