import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    MapPin, Phone, Clock, Star, Scissors, Instagram, Globe, ArrowRight,
    CheckCircle2, ChevronLeft, Calendar, Image as ImageIcon, MessageSquare
} from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatCurrency } from '@/utils';
import type { Business, Service, Barber } from '@/types';

// Fix Leaflet default marker icons (Vite doesn't bundle them automatically)
const markerIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const TYPE_META: Record<string, { label: string; emoji: string }> = {
    barberia: { label: 'Barbería', emoji: '💈' },
    salon: { label: 'Salón', emoji: '✂️' },
    nails: { label: 'Nail Salon', emoji: '💅' },
    barba: { label: 'Barbería', emoji: '🧔' },
};

export default function BusinessProfilePage() {
    const { slug } = useParams<{ slug: string }>();
    const [business, setBusiness] = useState<Business | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [todayHours, setTodayHours] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (slug) load();
    }, [slug]);

    const load = async () => {
        setLoading(true);
        try {
            const { data: biz } = await supabase
                .from('businesses')
                .select('*')
                .eq('slug', slug)
                .eq('is_active', true)
                .maybeSingle();

            if (!biz) { setBusiness(null); return; }
            setBusiness(biz);

            const [svcRes, barbRes] = await Promise.all([
                supabase.from('services').select('*').eq('business_id', biz.id).eq('is_active', true).order('display_order'),
                supabase.from('barbers').select('*').eq('business_id', biz.id).eq('is_active', true).order('display_order'),
            ]);
            setServices(svcRes.data || []);
            const barberList = barbRes.data || [];
            setBarbers(barberList);

            // Today's hours: widest range across active barbers
            const dow = new Date().getDay();
            if (barberList.length > 0) {
                const { data: sched } = await supabase
                    .from('schedules')
                    .select('start_time, end_time')
                    .in('barber_id', barberList.map(b => b.id))
                    .eq('day_of_week', dow)
                    .eq('is_active', true);
                if (sched && sched.length > 0) {
                    const starts = sched.map(s => s.start_time).sort();
                    const ends = sched.map(s => s.end_time).sort();
                    setTodayHours(`${starts[0].slice(0, 5)} - ${ends[ends.length - 1].slice(0, 5)}`);
                }
            }
        } catch (e) {
            console.error('[BusinessProfile]', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg"><LoadingSpinner /></div>
    );

    if (!business) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-space-bg gap-4 px-4 text-center">
            <Scissors size={36} className="text-space-muted/30" />
            <p className="text-space-muted font-bold uppercase tracking-widest text-xs">Negocio no encontrado</p>
            <Link to="/" className="btn-secondary text-xs px-6 py-2.5">← Volver al inicio</Link>
        </div>
    );

    const b = business as any;
    const typeMeta = TYPE_META[b.business_type || 'barberia'] || TYPE_META.barberia;
    const gallery: string[] = Array.isArray(b.gallery) ? b.gallery : [];
    const hasCoords = typeof b.latitude === 'number' && typeof b.longitude === 'number';

    return (
        <div className="min-h-screen bg-space-bg pb-24">
            {/* Back button */}
            <Link to="/" className="fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center rounded-xl bg-space-card/90 backdrop-blur border border-space-border/40 text-space-text hover:text-space-primary transition-all shadow-sm">
                <ChevronLeft size={18} />
            </Link>

            {/* Banner */}
            <div className="relative h-56 sm:h-72 bg-space-card2 overflow-hidden">
                <img
                    src={b.banner_url || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=1200'}
                    alt={b.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-space-bg to-transparent" />
            </div>

            <div className="max-w-3xl mx-auto px-4 -mt-16 relative z-10">
                {/* Header card */}
                <div className="flex items-end gap-4 mb-6">
                    <div className="w-24 h-24 rounded-3xl bg-space-card p-1 shadow-xl border border-space-border/40 overflow-hidden flex-shrink-0">
                        <img
                            src={b.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=1a2e28&color=fff&size=200`}
                            className="w-full h-full object-cover rounded-[1.25rem]"
                            alt=""
                        />
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h1 className="text-2xl font-extrabold text-space-text tracking-tight">{b.name}</h1>
                            {b.is_verified && (
                                <span className="px-2 py-0.5 rounded-lg bg-space-primary text-space-card text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                                    <CheckCircle2 size={10} /> Verificado
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-space-muted font-bold">
                            <span>{typeMeta.emoji} {typeMeta.label}</span>
                            {(b.total_reviews || 0) > 0 && (
                                <span className="flex items-center gap-1 text-space-text">
                                    <Star size={12} className="fill-space-yellow text-space-yellow" />
                                    {(b.avg_rating || 0).toFixed(1)} <span className="text-space-muted font-medium">({b.total_reviews})</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Info row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    {(b.address || b.city) && (
                        <div className="bg-space-card border border-space-border rounded-2xl p-4 flex items-start gap-3">
                            <MapPin size={16} className="text-space-primary flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                                <p className="text-[9px] font-extrabold uppercase tracking-widest text-space-muted mb-0.5">Dirección</p>
                                <p className="text-xs font-bold text-space-text leading-snug">{[b.address, b.city, b.state].filter(Boolean).join(', ')}</p>
                            </div>
                        </div>
                    )}
                    {b.phone && (
                        <a href={`tel:${b.phone}`} className="bg-space-card border border-space-border rounded-2xl p-4 flex items-start gap-3 hover:border-space-primary/40 transition-all">
                            <Phone size={16} className="text-space-primary flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                                <p className="text-[9px] font-extrabold uppercase tracking-widest text-space-muted mb-0.5">Teléfono</p>
                                <p className="text-xs font-bold text-space-text">{b.phone}</p>
                            </div>
                        </a>
                    )}
                    <div className="bg-space-card border border-space-border rounded-2xl p-4 flex items-start gap-3">
                        <Clock size={16} className="text-space-primary flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-[9px] font-extrabold uppercase tracking-widest text-space-muted mb-0.5">Hoy ({DAYS[new Date().getDay()]})</p>
                            <p className="text-xs font-bold text-space-text">{todayHours || 'Cerrado'}</p>
                        </div>
                    </div>
                </div>

                {/* Description */}
                {b.description && (
                    <p className="text-sm text-space-muted leading-relaxed mb-6">{b.description}</p>
                )}

                {/* Social links */}
                {(b.instagram_url || b.website_url) && (
                    <div className="flex gap-2 mb-8">
                        {b.instagram_url && (
                            <a href={b.instagram_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-space-card border border-space-border text-space-text hover:text-space-primary hover:border-space-primary transition-all">
                                <Instagram size={15} /><span className="text-[10px] font-extrabold uppercase tracking-widest">Instagram</span>
                            </a>
                        )}
                        {b.website_url && (
                            <a href={b.website_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-space-card border border-space-border text-space-text hover:text-space-primary hover:border-space-primary transition-all">
                                <Globe size={15} /><span className="text-[10px] font-extrabold uppercase tracking-widest">Web</span>
                            </a>
                        )}
                    </div>
                )}

                {/* CTA — Reservar */}
                <Link to={`/book/${b.slug}`}
                    className="btn-primary w-full h-14 text-sm mb-10 shadow-xl shadow-space-primary/25">
                    Reservar cita <ArrowRight size={18} />
                </Link>

                {/* Services */}
                {services.length > 0 && (
                    <section className="mb-10">
                        <h2 className="text-sm font-extrabold uppercase tracking-wide text-space-text mb-4 flex items-center gap-2">
                            <Scissors size={15} className="text-space-primary" />Servicios
                        </h2>
                        <div className="space-y-2">
                            {services.map(s => (
                                <div key={s.id} className="bg-space-card border border-space-border rounded-2xl p-4 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-bold text-space-text text-sm truncate">{s.name}</p>
                                        <p className="text-[11px] text-space-muted">{s.duration_minutes} min</p>
                                    </div>
                                    <span className="font-extrabold text-space-primary text-sm flex-shrink-0">
                                        {s.price != null ? formatCurrency(s.price) : '—'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Team */}
                {barbers.length > 0 && (
                    <section className="mb-10">
                        <h2 className="text-sm font-extrabold uppercase tracking-wide text-space-text mb-4 flex items-center gap-2">
                            <Calendar size={15} className="text-space-primary" />Nuestro equipo
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {barbers.map(barber => (
                                <div key={barber.id} className="bg-space-card border border-space-border rounded-2xl p-4 text-center">
                                    <div className="w-16 h-16 rounded-2xl mx-auto mb-3 overflow-hidden bg-space-card2">
                                        <img
                                            src={barber.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(barber.name)}&background=1a2e28&color=fff`}
                                            className="w-full h-full object-cover"
                                            alt={barber.name}
                                        />
                                    </div>
                                    <p className="font-bold text-space-text text-sm truncate">{barber.name}</p>
                                    {barber.bio && <p className="text-[10px] text-space-muted line-clamp-1 mt-0.5">{barber.bio}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Gallery */}
                {gallery.length > 0 && (
                    <section className="mb-10">
                        <h2 className="text-sm font-extrabold uppercase tracking-wide text-space-text mb-4 flex items-center gap-2">
                            <ImageIcon size={15} className="text-space-primary" />Galería
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {gallery.map((url, i) => (
                                <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-space-border/40">
                                    <img src={url} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" alt="" loading="lazy" />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Map */}
                {hasCoords && (
                    <section className="mb-10">
                        <h2 className="text-sm font-extrabold uppercase tracking-wide text-space-text mb-4 flex items-center gap-2">
                            <MapPin size={15} className="text-space-primary" />Ubicación
                        </h2>
                        <div className="rounded-2xl overflow-hidden border border-space-border h-64">
                            <MapContainer center={[b.latitude, b.longitude]} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; OpenStreetMap'
                                />
                                <Marker position={[b.latitude, b.longitude]} icon={markerIcon}>
                                    <Popup>{b.name}</Popup>
                                </Marker>
                            </MapContainer>
                        </div>
                    </section>
                )}

                {/* Reviews (empty for now) */}
                <section className="mb-10">
                    <h2 className="text-sm font-extrabold uppercase tracking-wide text-space-text mb-4 flex items-center gap-2">
                        <MessageSquare size={15} className="text-space-primary" />Reseñas
                    </h2>
                    <div className="bg-space-card border border-space-border rounded-2xl p-10 text-center">
                        <MessageSquare size={28} className="mx-auto text-space-muted/30 mb-3" />
                        <p className="text-space-muted text-sm font-medium">Aún no hay reseñas.</p>
                        <p className="text-space-muted/60 text-xs mt-1">Sé el primero en reservar y dejar tu opinión.</p>
                    </div>
                </section>
            </div>
        </div>
    );
}
