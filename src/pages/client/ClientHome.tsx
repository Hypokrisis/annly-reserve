import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomerAppointments } from '@/services/appointments.service';
import { supabase } from '@/supabaseClient';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { BusinessCard, type BusinessResult } from '@/components/directory/BusinessCard';
import { formatDate, parseDate, formatTimeDisplay } from '@/utils';
import {
    Calendar, CalendarClock, Home, LogOut,
    Scissors, Search, Store, User as UserIcon,
} from 'lucide-react';

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

    const [businesses, setBusinesses] = useState<BusinessResult[]>([]);
    const [loadingBiz, setLoadingBiz] = useState(true);
    const [search, setSearch] = useState('');
    const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);

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

    useEffect(() => { loadApts(); loadBusinesses(); }, [loadApts, loadBusinesses]);

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
                                            {bizSlug && (
                                                <Link to={`/book/${bizSlug}`}
                                                    className="flex-1 h-9 flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide rounded-xl border border-space-border/60 text-space-muted hover:border-space-primary/40 hover:text-space-primary transition-all">
                                                    <CalendarClock size={12} /> Reagendar
                                                </Link>
                                            )}
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
        </div>
    );
}
