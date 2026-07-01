import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomerAppointments } from '@/services/appointments.service';
import { supabase } from '@/supabaseClient';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { BusinessCard, type BusinessResult } from '@/components/directory/BusinessCard';
import { formatDate, parseDate, formatTimeDisplay } from '@/utils';
import { Calendar, CalendarClock, LogOut, Store, Search, Scissors } from 'lucide-react';

const FAVORITES_KEY = 'favoriteBusinesses';

/**
 * Dashboard del cliente registrado (role='client'). Dos secciones:
 *   1. Mis citas activas (futuras, confirmed) — cancelar por token + reagendar.
 *   2. Explorar barberías — mismas tarjetas del directorio público, con filtro.
 * Nav simple con anclas a cada sección. No usa DashboardLayout (sin sidebar de gestión).
 */
export default function ClientHome() {
    const { user, logout } = useAuth();

    // ── Sección 1: citas ──
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loadingApts, setLoadingApts] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    // ── Sección 2: directorio ──
    const [businesses, setBusinesses] = useState<BusinessResult[]>([]);
    const [loadingBiz, setLoadingBiz] = useState(true);
    const [search, setSearch] = useState('');
    const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);

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

    // Agrupa citas por negocio
    const groups = appointments.reduce((acc: Record<string, { business: any; items: any[] }>, apt) => {
        const biz = apt.business || {};
        const key = biz.id || 'sin-negocio';
        if (!acc[key]) acc[key] = { business: biz, items: [] };
        acc[key].items.push(apt);
        return acc;
    }, {});
    const groupList = Object.values(groups);

    // Filtro del directorio: nombre, ciudad o servicio
    const q = search.toLowerCase().trim();
    const filteredBusinesses = businesses.filter((b) => {
        if (!q) return true;
        return b.name.toLowerCase().includes(q)
            || (b.city || '').toLowerCase().includes(q)
            || (b.services || []).some((s) => s.name.toLowerCase().includes(q));
    });

    return (
        <div className="min-h-screen bg-space-bg">
            {/* ── Nav ── */}
            <header className="sticky top-0 z-40 border-b border-space-border bg-space-card/90 backdrop-blur">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg" style={{ background: `linear-gradient(135deg, rgb(var(--space-primary-light)), rgb(var(--space-primary)))` }}>
                            <img src="/logo.png" alt="Spacey" className="w-full h-full object-cover object-top scale-110" />
                        </div>
                        <span className="text-lg font-extrabold tracking-tight text-space-text hidden sm:block">Spacey</span>
                    </Link>
                    <nav className="flex items-center gap-1 sm:gap-3">
                        <a href="#mis-citas" className="px-3 py-2 text-xs font-bold text-space-muted hover:text-space-primary transition-colors">Mis citas</a>
                        <a href="#barberias" className="px-3 py-2 text-xs font-bold text-space-muted hover:text-space-primary transition-colors">Barberías</a>
                        <button onClick={() => logout()} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-space-danger hover:opacity-80 transition-opacity">
                            <LogOut size={14} /> <span className="hidden sm:inline">Salir</span>
                        </button>
                    </nav>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-8 space-y-14">
                {/* ── Sección 1: Mis citas ── */}
                <section id="mis-citas" className="scroll-mt-20">
                    <div className="mb-5">
                        <h1 className="text-2xl font-extrabold text-space-text mb-1">Mis citas</h1>
                        <p className="text-sm text-space-muted">
                            Hola{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''} 👋 Estas son tus próximas reservas.
                        </p>
                    </div>

                    {loadingApts ? (
                        <div className="py-16 flex justify-center"><LoadingSpinner /></div>
                    ) : groupList.length === 0 ? (
                        <div className="bg-space-card rounded-2xl p-8 text-center border border-space-border">
                            <div className="w-14 h-14 mx-auto rounded-2xl bg-space-primary/10 flex items-center justify-center mb-4">
                                <Calendar size={26} className="text-space-primary" />
                            </div>
                            <h2 className="text-lg font-extrabold text-space-text mb-2">No tienes citas activas</h2>
                            <p className="text-space-muted text-sm mb-6 max-w-xs mx-auto">
                                Reserva en cualquiera de las barberías de abajo y tus citas aparecerán aquí.
                            </p>
                            <a href="#barberias" className="btn-primary text-xs px-6 py-2.5 inline-flex items-center gap-2">
                                <Store size={14} /> Explorar barberías
                            </a>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {groupList.map(({ business, items }) => (
                                <div key={business.id || 'sin-negocio'}>
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <Store size={15} className="text-space-muted" />
                                        <h3 className="text-sm font-extrabold text-space-text">{business.name || 'Barbería'}</h3>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {items.map((apt) => {
                                            const serviceName = apt.services?.name || 'Servicio';
                                            const barberName = apt.barbers?.name;
                                            return (
                                                <div key={apt.id} className="bg-space-card rounded-2xl p-5 border border-space-border shadow-sm">
                                                    <div className="space-y-2 mb-4">
                                                        <div className="text-sm text-space-text font-bold flex items-center gap-2">
                                                            <Scissors size={14} className="text-space-primary shrink-0" />
                                                            <span>{serviceName}{barberName ? <span className="text-space-muted font-medium"> con {barberName}</span> : null}</span>
                                                        </div>
                                                        <div className="text-sm text-space-text font-bold flex items-center gap-2">
                                                            <CalendarClock size={14} className="text-space-primary shrink-0" />
                                                            <span>{formatDate(parseDate(apt.appointment_date))} a las {formatTimeDisplay(apt.start_time)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {business.slug && (
                                                            <Link to={`/book/${business.slug}`} className="flex-1 btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5">
                                                                <CalendarClock size={13} /> Reagendar
                                                            </Link>
                                                        )}
                                                        <button onClick={() => handleCancel(apt)} disabled={cancellingId === apt.id}
                                                            className="flex-1 btn-danger text-xs py-2.5 disabled:opacity-50">
                                                            {cancellingId === apt.id ? 'Cancelando...' : 'Cancelar'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* ── Sección 2: Explorar barberías ── */}
                <section id="barberias" className="scroll-mt-20">
                    <div className="mb-5">
                        <h2 className="text-2xl font-extrabold text-space-text mb-1">Barberías</h2>
                        <p className="text-sm text-space-muted">Explora y reserva en cualquiera de estos negocios.</p>
                    </div>

                    {/* Filtro */}
                    <div className="relative mb-6 max-w-md">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-space-muted pointer-events-none" />
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
                        <div className="bg-space-card rounded-2xl p-8 text-center border border-space-border">
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
