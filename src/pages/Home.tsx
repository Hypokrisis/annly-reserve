import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MapPin, Star, Scissors, Calendar, Clock, Heart, XCircle, LogOut,
  LayoutDashboard, ArrowRight, Info, Instagram, Globe, X, Search,
  Moon, Sun, Bell, Users, BarChart3, Zap, Shield, RefreshCw,
  CheckCircle2, MessageCircle, Bot, ChevronDown,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import * as appointmentsService from '@/services/appointments.service';
import { formatRelativeTime } from '@/utils/formatters';
import { Appointment } from '@/types';

interface BusinessResult {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  business_type?: string;
  is_verified?: boolean;
  avg_rating?: number;
  total_reviews?: number;
  created_at?: string;
  banner_url?: string;
  logo_url?: string;
  latitude?: number;
  longitude?: number;
  instagram_url?: string;
  website_url?: string;
  services?: { name: string }[];
}

const BUSINESS_TYPES = [
  { id: '', label: 'Todos', emoji: '✨' },
  { id: 'barberia', label: 'Barberías', emoji: '💈' },
  { id: 'salon', label: 'Salones', emoji: '✂️' },
  { id: 'nails', label: 'Nail Salons', emoji: '💅' },
  { id: 'barba', label: 'Barba', emoji: '🧔' },
];

const TYPE_META: Record<string, { label: string; emoji: string }> = {
  barberia: { label: 'Barbería', emoji: '💈' },
  salon: { label: 'Salón', emoji: '✂️' },
  nails: { label: 'Nail Salon', emoji: '💅' },
  barba: { label: 'Barbería', emoji: '🧔' },
};

const PRICING = [
  {
    name: 'Básico', price: '$29', period: '/mes', icon: '🔵', recommended: false,
    features: ['Bot WhatsApp con keywords', 'Recordatorios automáticos', 'Página de reservas pública', 'Dashboard básico'],
  },
  {
    name: 'Pro', price: '$59', period: '/mes', icon: '🟣', recommended: true,
    features: ['Todo lo básico +', 'IA conversacional', 'Reportes cada 2h al barbero', 'Cola de espera inteligente', 'Horario inteligente', 'Clientes frecuentes reconocidos'],
  },
  {
    name: 'Premium', price: '$99', period: '/mes', icon: '⭐', recommended: false,
    features: ['Todo lo Pro +', 'Agente proactivo anti-churn', 'Reporte diario de ingresos', 'Multi-barbero con reportes', 'Cancelación predictiva', 'Clientes VIP automáticos'],
  },
];

const FEATURES = [
  { icon: Bot, label: 'IA que entiende español natural', desc: 'Conversaciones fluidas sin scripts rígidos' },
  { icon: Calendar, label: 'Disponibilidad en tiempo real', desc: 'Detecta y reserva slots al instante' },
  { icon: Bell, label: 'Recordatorios automáticos', desc: '24h y 1h antes de cada cita' },
  { icon: Users, label: 'Reconoce clientes frecuentes', desc: 'Saluda por nombre desde el primer mensaje' },
  { icon: BarChart3, label: 'Reportes al barbero', desc: 'WhatsApp cada 2h con resumen del día' },
  { icon: RefreshCw, label: 'Reagenda inteligente', desc: 'Sugiere horarios alternativos en cancelaciones' },
  { icon: Zap, label: 'Horario inteligente', desc: 'Propone el barbero disponible más cercano' },
  { icon: Shield, label: 'Cancelación segura', desc: 'Link con token único, sin necesidad de cuenta' },
];

const STEPS = [
  { emoji: '💬', title: 'Tu cliente escribe al WhatsApp de tu barbería', desc: 'No necesita app, no necesita cuenta. Solo WhatsApp.' },
  { emoji: '🤖', title: 'Spacey atiende, hace la cita y confirma en segundos', desc: 'IA 24/7 que nunca duerme, nunca se equivoca de horario.' },
  { emoji: '📊', title: 'Tú ves todo en el dashboard y recibes reportes', desc: 'Dashboard en tiempo real + reportes por WhatsApp cada 2 horas.' },
];

function isNew(createdAt?: string) {
  if (!createdAt) return false;
  return Date.now() - new Date(createdAt).getTime() < 30 * 24 * 60 * 60 * 1000;
}

// ─── BUSINESS CARD (module-level: stable identity → React no lo remonta en cada render de Home) ──
const BusinessCard = React.memo(({ business, isFav, isLoggedIn, onToggleFavorite }: {
  business: BusinessResult;
  isFav: boolean;
  isLoggedIn: boolean;
  onToggleFavorite: (e: React.MouseEvent, slug: string) => void;
}) => {
    const typeMeta = TYPE_META[business.business_type || 'barberia'] || TYPE_META.barberia;
    const rating = business.avg_rating || 0;
    const reviews = business.total_reviews || 0;
    const serviceNames = (business.services || []).map(s => s.name).slice(0, 3).join(' · ');
    const isNewBiz = isNew(business.created_at);

    return (
      <div className="group bg-space-card border border-space-border/60 hover:border-space-primary/40 rounded-[2rem] overflow-hidden hover:shadow-xl hover:shadow-space-primary/10 hover:-translate-y-1.5 transition-all duration-400 flex flex-col">
        {/* Banner */}
        <div className="relative">
          <Link to={`/business/${business.slug}`} className="block h-36 overflow-hidden bg-space-card2">
            <img
              src={business.banner_url || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=600'}
              alt={business.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </Link>

          {/* Top-left badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
            {business.is_verified && (
              <span className="px-2 py-1 rounded-lg bg-space-primary text-space-card text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <CheckCircle2 size={9} /> Verificado
              </span>
            )}
            {isNewBiz && (
              <span className="px-2 py-1 rounded-lg bg-space-yellow text-space-text text-[8px] font-extrabold uppercase tracking-wider shadow-sm">
                ✨ Nuevo
              </span>
            )}
          </div>

          {isLoggedIn && (
            <button onClick={(e) => onToggleFavorite(e, business.slug)}
              className="absolute top-3 right-3 w-8 h-8 bg-space-card/90 backdrop-blur rounded-xl flex items-center justify-center border border-space-border/40 hover:scale-110 transition-all">
              <Heart size={14} className={isFav ? 'fill-space-danger text-space-danger' : 'text-space-muted'} />
            </button>
          )}

          {/* Logo */}
          <div className="absolute -bottom-6 left-4 w-12 h-12 rounded-xl bg-space-card p-0.5 shadow-lg border border-space-border/30 overflow-hidden">
            <img
              src={business.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(business.name)}&background=1a2e28&color=fff`}
              className="w-full h-full object-cover rounded-lg"
              alt=""
            />
          </div>
        </div>

        <div className="p-4 pt-8 flex flex-col flex-1">
          {/* Name + rating */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <Link to={`/business/${business.slug}`} className="min-w-0">
              <h3 className="font-extrabold text-space-text text-sm leading-tight hover:text-space-primary transition-colors truncate">{business.name}</h3>
            </Link>
            {reviews > 0 ? (
              <div className="flex items-center gap-1 flex-shrink-0 text-[11px] font-bold text-space-text">
                <Star size={11} className="fill-space-yellow text-space-yellow" />
                {rating.toFixed(1)}
                <span className="text-space-muted font-medium">({reviews})</span>
              </div>
            ) : (
              <span className="flex-shrink-0 text-[9px] font-bold text-space-muted/50 uppercase tracking-wider">Sin reseñas</span>
            )}
          </div>

          {/* Type + city */}
          <div className="flex items-center gap-1 text-[10px] text-space-muted font-bold tracking-wide mb-2">
            <span>{typeMeta.emoji}</span>
            <span className="text-space-primary">{typeMeta.label}</span>
            {business.city && <><span className="text-space-muted/40">·</span><span>{business.city}, {business.state || 'PR'}</span></>}
          </div>

          {/* Services */}
          {serviceNames ? (
            <p className="text-[11px] text-space-muted/80 line-clamp-1 mb-3 flex-1">
              <span className="font-bold text-space-text/70">Servicios:</span> {serviceNames}
            </p>
          ) : (
            <p className="text-[11px] text-space-muted/60 line-clamp-2 mb-3 flex-1">{business.description || 'Reserva tu cita con los mejores profesionales.'}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-auto">
            <Link to={`/business/${business.slug}`}
              className="flex-1 h-9 flex items-center justify-center text-[10px] font-extrabold uppercase tracking-wider rounded-xl border border-space-border/60 text-space-muted hover:border-space-primary/30 hover:text-space-text transition-all">
              Ver detalles
            </Link>
            <Link to={`/book/${business.slug}`}
              className="flex-1 h-9 flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-wider rounded-xl bg-space-primary text-space-card hover:bg-space-primary-dark transition-all shadow-sm">
              Reservar <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>
    );
});

// ─── NAV (module-level) ──
const NavBar = ({ isScrolled, user, theme, toggleTheme, isAccountMenuOpen, setIsAccountMenuOpen, role, barberProfile, currentBusiness, onLogout }: {
  isScrolled: boolean;
  user: any;
  theme: string;
  toggleTheme: () => void;
  isAccountMenuOpen: boolean;
  setIsAccountMenuOpen: (v: boolean) => void;
  role: any;
  barberProfile: any;
  currentBusiness: any;
  onLogout: () => void;
}) => (
    <nav className="fixed w-full z-50 top-3 sm:top-5 px-3 sm:px-4">
      <div className="max-w-5xl mx-auto">
        <div className={`flex justify-between items-center px-4 sm:px-5 h-14 rounded-full transition-all duration-500 ${isScrolled ? 'backdrop-blur-2xl bg-space-card/95 border border-space-border/50 shadow-xl' : 'backdrop-blur-xl bg-space-card/75 border border-space-border/25 shadow-lg'}`}>
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 bg-gradient-to-br from-space-primary-light to-space-primary rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-all overflow-hidden flex-shrink-0">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top scale-110" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-space-text">Spacey</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <a href="#explore" className="text-[10px] font-extrabold uppercase tracking-widest text-space-muted hover:text-space-primary transition-all">Explorar</a>
            {!user && (
              <>
                <a href="#features" className="text-[10px] font-extrabold uppercase tracking-widest text-space-muted hover:text-space-primary transition-all">Funciones</a>
                <a href="#pricing" className="text-[10px] font-extrabold uppercase tracking-widest text-space-muted hover:text-space-primary transition-all">Precios</a>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-xl text-space-muted hover:text-space-primary hover:bg-space-card2/80 transition-all flex-shrink-0">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {user ? (
              <div className="relative">
                <button onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  className="flex items-center gap-1.5 p-1 rounded-full hover:bg-space-bg transition border-2 border-transparent hover:border-space-border">
                  <div className="w-8 h-8 bg-gradient-to-br from-space-primary-light to-space-primary rounded-xl flex items-center justify-center font-extrabold text-xs flex-shrink-0"
                    style={{ color: 'rgb(var(--space-card))' }}>
                    {user.email?.[0].toUpperCase()}
                  </div>
                </button>
                {isAccountMenuOpen && (
                  <div className="absolute right-0 mt-2.5 w-64 bg-space-card rounded-[2rem] shadow-2xl border border-space-border/30 overflow-hidden py-1 z-50 animate-scale-in">
                    {/* Header with role badge */}
                    <div className="px-5 py-4 border-b border-space-border/30 bg-space-bg flex justify-between items-center">
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-widest mb-1 ${
                          role === 'owner' || role === 'admin' ? 'bg-space-primary/15 text-space-primary' :
                          role === 'barber' ? 'bg-space-yellow/15 text-space-yellow' :
                          'bg-space-card2 text-space-muted'
                        }`}>
                          {role === 'owner' || role === 'admin' ? 'Owner' :
                           role === 'barber' ? `Staff · ${barberProfile?.businessName || currentBusiness?.name || ''}` :
                           'Cliente'}
                        </span>
                        <p className="text-xs font-bold text-space-text truncate max-w-[155px]">
                          {role === 'owner' || role === 'admin' ? currentBusiness?.name :
                           role === 'barber' ? (barberProfile?.name || user.email) :
                           user.email}
                        </p>
                      </div>
                      <button onClick={() => setIsAccountMenuOpen(false)} className="p-1 text-space-muted hover:text-space-text">
                        <XCircle size={15} />
                      </button>
                    </div>
                    <div className="p-2 space-y-0.5">
                      {/* OWNER menu */}
                      {(role === 'owner' || role === 'admin') && <>
                        <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-space-text hover:text-space-primary hover:bg-space-primary/5 rounded-xl transition-all" onClick={() => setIsAccountMenuOpen(false)}>
                          <LayoutDashboard size={15} className="text-space-primary" />Dashboard
                        </Link>
                        {currentBusiness && <Link to={`/book/${currentBusiness.slug}`} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-space-text hover:text-space-primary hover:bg-space-primary/5 rounded-xl transition-all" onClick={() => setIsAccountMenuOpen(false)}>
                          <Scissors size={15} className="text-space-muted" />Ver mi página pública
                        </Link>}
                        <Link to="/dashboard/settings" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-space-text hover:text-space-primary hover:bg-space-primary/5 rounded-xl transition-all" onClick={() => setIsAccountMenuOpen(false)}>
                          <Info size={15} className="text-space-muted" />Configuración
                        </Link>
                      </>}
                      {/* STAFF menu */}
                      {role === 'barber' && <>
                        <Link to="/staff" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-space-text hover:text-space-primary hover:bg-space-primary/5 rounded-xl transition-all" onClick={() => setIsAccountMenuOpen(false)}>
                          <Calendar size={15} className="text-space-primary" />Mis citas de hoy
                        </Link>
                        <Link to="/staff" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-space-text hover:text-space-primary hover:bg-space-primary/5 rounded-xl transition-all" onClick={() => setIsAccountMenuOpen(false)}>
                          <Clock size={15} className="text-space-muted" />Mi horario
                        </Link>
                      </>}
                      {/* CLIENT menu */}
                      {!currentBusiness && role !== 'barber' && <>
                        <a href="#mis-citas" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-space-text hover:text-space-primary hover:bg-space-primary/5 rounded-xl transition-all" onClick={() => setIsAccountMenuOpen(false)}>
                          <Calendar size={15} className="text-space-primary" />Mis citas
                        </a>
                        <a href="#explore" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-space-text hover:text-space-primary hover:bg-space-primary/5 rounded-xl transition-all" onClick={() => setIsAccountMenuOpen(false)}>
                          <Heart size={15} className="text-space-muted" />Mis favoritos
                        </a>
                        <Link to="/create-business" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-space-primary hover:bg-space-primary/5 rounded-xl transition-all border border-space-primary/20 mx-1 my-1" onClick={() => setIsAccountMenuOpen(false)}>
                          <LayoutDashboard size={15} />Crear mi negocio →
                        </Link>
                      </>}
                      <div className="border-t border-space-border/30 mt-1 pt-1">
                        <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-space-danger hover:bg-space-danger/5 rounded-xl transition-all">
                          <LogOut size={15} />Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link to="/login" className="text-[10px] font-extrabold text-space-text hover:text-space-primary px-3.5 py-2 rounded-full border border-space-border hover:border-space-primary uppercase tracking-widest transition-all">
                  Entrar
                </Link>
                <Link to="/register" className="hidden sm:inline-flex btn-primary py-2 px-4 text-[10px] uppercase tracking-widest shadow-lg shadow-space-primary/20">
                  Registrar barbería
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
);

function Home() {
  const navigate = useNavigate();
  const { user, logout, currentBusiness, role, barberProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Directory state
  const [allBusinesses, setAllBusinesses] = useState<BusinessResult[]>([]);
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');           // "¿Qué buscas?" — nombre o servicio
  const [locationQuery, setLocationQuery] = useState('');       // Ciudad o ZIP
  const [selectedType, setSelectedType] = useState('');         // business_type filter
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Debounced values (300ms)
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedLocation, setDebouncedLocation] = useState('');

  // Customer state
  const [customerAppointments, setCustomerAppointments] = useState<Appointment[]>([]);
  const [loadingApts, setLoadingApts] = useState(false);

  // Nav state
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const location = useLocation();

  // Always load public businesses (for directory)
  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    if (user) { loadFavorites(); loadCustomerAppointments(); }
  }, [user]);

  useEffect(() => {
    if (user) loadCustomerAppointments();
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    window.addEventListener('focus', loadCustomerAppointments);
    return () => window.removeEventListener('focus', loadCustomerAppointments);
  }, [user]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Debounce search (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLocation(locationQuery), 300);
    return () => clearTimeout(t);
  }, [locationQuery]);

  // Detect user location → reverse geocode to city (Nominatim, free)
  const detectMyLocation = () => {
    if (!navigator.geolocation) return;
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12`,
            { headers: { 'Accept-Language': 'es' } }
          );
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || '';
          if (city) setLocationQuery(city);
        } catch { /* silent */ }
        finally { setDetectingLocation(false); }
      },
      () => setDetectingLocation(false),
      { timeout: 8000 }
    );
  };

  const loadBusinesses = async () => {
    setLoadingBiz(true);
    try {
      const { data } = await supabase
        .from('businesses')
        .select('id, name, slug, description, address, city, state, zip_code, business_type, is_verified, avg_rating, total_reviews, created_at, banner_url, logo_url, latitude, longitude, services(name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(40);
      setAllBusinesses(data || []);
    } catch { /* silent */ }
    finally { setLoadingBiz(false); }
  };

  const loadFavorites = () => {
    try {
      const saved = localStorage.getItem('favoriteBusinesses');
      if (saved) setFavoriteSlugs(JSON.parse(saved));
    } catch { /* ignore */ }
  };

  const loadCustomerAppointments = useCallback(async () => {
    if (!user) return;
    let emailToFetch = user.email;
    if (!emailToFetch) {
      try {
        const saved = localStorage.getItem('annly_customer_data');
        if (saved) emailToFetch = JSON.parse(saved).email;
      } catch { /* ignore */ }
    }
    if (!emailToFetch) { setCustomerAppointments([]); return; }
    setLoadingApts(true);
    try {
      const data = await appointmentsService.getCustomerAppointments(emailToFetch.toLowerCase().trim(), user.id);
      const now = new Date();
      const enriched = data.map(apt => {
        const [year, month, day] = apt.appointment_date.split('-').map(Number);
        const [hours, minutes] = apt.start_time.split(':').map(Number);
        const aptDate = new Date(year, month - 1, day, hours, minutes);
        const diffMins = Math.floor((now.getTime() - aptDate.getTime()) / 60000);
        let statusBadge = 'upcoming';
        if (diffMins > 120) statusBadge = 'expired';
        else if (diffMins > 15) statusBadge = 'late';
        else if (apt.appointment_date === now.toISOString().split('T')[0]) statusBadge = 'today';
        return { ...apt, statusBadge };
      }).filter(apt => apt.status === 'confirmed');
      setCustomerAppointments(enriched);
    } catch { /* ignore */ }
    finally { setLoadingApts(false); }
  }, [user]);

  const toggleFavorite = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    const next = favoriteSlugs.includes(slug)
      ? favoriteSlugs.filter(s => s !== slug)
      : [...favoriteSlugs, slug];
    setFavoriteSlugs(next);
    localStorage.setItem('favoriteBusinesses', JSON.stringify(next));
  };

  const handleCancelApt = async (id: string) => {
    if (!confirm('¿Cancelar esta cita?')) return;
    try {
      await appointmentsService.updateAppointmentStatus(id, 'cancelled');
      await loadCustomerAppointments();
    } catch { alert('No se pudo cancelar. Intenta de nuevo.'); }
  };

  const handleLogout = async () => { await logout(); setIsAccountMenuOpen(false); };

  // Filtered businesses: name/service search + city/zip location + type
  const filteredBusinesses = allBusinesses.filter(b => {
    const q = debouncedSearch.toLowerCase().trim();
    const matchSearch = !q
      || b.name.toLowerCase().includes(q)
      || (b.description || '').toLowerCase().includes(q)
      || (b.services || []).some(s => s.name.toLowerCase().includes(q));

    const loc = debouncedLocation.toLowerCase().trim();
    const matchLocation = !loc
      || (b.city || '').toLowerCase().includes(loc)
      || (b.zip_code || '').toLowerCase().includes(loc);

    const matchType = !selectedType || (b.business_type || 'barberia') === selectedType;

    return matchSearch && matchLocation && matchType;
  });

  const hasActiveFilters = searchQuery || locationQuery || selectedType;
  return (
    <div className="min-h-screen bg-space-bg text-space-text overflow-x-hidden">

      {/* Ambient bg */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -right-[5%] w-[50vw] h-[50vw] rounded-full bg-space-primary-light/6 blur-[120px] animate-pulse-subtle" />
        <div className="absolute top-[60%] -left-[5%] w-[40vw] h-[40vw] rounded-full bg-space-card2/20 blur-[130px]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#22321c 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      <NavBar
        isScrolled={isScrolled}
        user={user}
        theme={theme}
        toggleTheme={toggleTheme}
        isAccountMenuOpen={isAccountMenuOpen}
        setIsAccountMenuOpen={setIsAccountMenuOpen}
        role={role}
        barberProfile={barberProfile}
        currentBusiness={currentBusiness}
        onLogout={handleLogout}
      />

      {/* ── HERO — siempre el mismo para todos ───────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center overflow-hidden px-4 pt-28 pb-16 min-h-screen">
        <div className="relative z-10 w-full max-w-3xl mx-auto">

          <div className="w-14 h-14 rounded-2xl mx-auto mb-5 overflow-hidden shadow-xl shadow-space-primary/25 ring-2 ring-space-primary/20 animate-fade-in"
            style={{ background: 'linear-gradient(135deg, rgb(var(--space-primary-light)), rgb(var(--space-primary)))' }}>
            <img src="/logo.png" alt="" className="w-full h-full object-cover object-top scale-110" />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-space-primary/25 bg-space-primary/8 mb-6 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-space-success animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-space-primary">Bot activo 24/7 · WhatsApp</span>
          </div>

          <h1 className="text-[clamp(2.4rem,8vw,5.5rem)] font-extrabold leading-[0.93] tracking-tight text-space-text mb-5 animate-fade-up">
            El bot que llena<br />tu barbería<br />
            <span className="bg-gradient-to-r from-space-primary-light to-space-primary bg-clip-text text-transparent">mientras duermes.</span>
          </h1>

          <p className="text-base sm:text-lg text-space-muted font-semibold max-w-md mx-auto mb-9 leading-relaxed animate-fade-up" style={{ animationDelay: '100ms' }}>
            Tu barbería atendiendo clientes por WhatsApp las 24 horas, haciendo citas sola — tú enfocado en tu arte.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-8 animate-fade-up" style={{ animationDelay: '180ms' }}>
            {/* CTA principal: para negocios si no hay sesión, explorar si hay sesión de cliente */}
            {!user || !currentBusiness ? (
              <Link to="/register" className="btn-primary text-sm px-8 py-4 shadow-2xl shadow-space-primary/30">
                Registra tu barbería <ArrowRight size={16} />
              </Link>
            ) : null}
            <a href="#explore" className="btn-secondary text-sm px-8 py-4">
              Explorar barberías ↓
            </a>
          </div>

          <p className="text-[11px] text-space-muted/60 font-semibold animate-fade-up" style={{ animationDelay: '250ms' }}>
            ¿Ya tienes cuenta?{' '}
            <a href="#explore" className="text-space-primary font-bold hover:underline">
              Explora las barberías →
            </a>
          </p>
        </div>

        <a href="#explore" className="absolute bottom-6 left-1/2 -translate-x-1/2 text-space-muted/40 hover:text-space-primary transition-colors animate-bounce">
          <ChevronDown size={22} />
        </a>
      </section>

      {/* ── MIS CITAS (solo clientes logueados) ─────────────── */}
      {user && !currentBusiness && customerAppointments.length > 0 && (
        <section id="mis-citas" className="px-4 pb-14 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl bg-space-primary/15 flex items-center justify-center">
              <Calendar size={15} className="text-space-primary" />
            </div>
            <h2 className="text-lg font-extrabold text-space-text">Mis Próximas Citas</h2>
          </div>
          {loadingApts ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customerAppointments.map((apt: any) => (
                <div key={apt.id} className="bg-space-card rounded-2xl p-5 border border-space-border/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="text-[10px] font-extrabold text-space-text px-3 py-1 bg-space-bg rounded-lg border border-space-border/40 truncate max-w-[160px]">{apt.business?.name}</span>
                      {apt.statusBadge === 'today' && <span className="badge-red text-[9px]">Hoy</span>}
                    </div>
                    <h4 className="font-extrabold text-sm text-space-text mb-3">{apt.service_name}</h4>
                    <div className="space-y-1.5 text-sm text-space-muted font-bold">
                      <div className="flex items-center gap-2"><Calendar size={13} className="text-space-primary" />{formatRelativeTime(apt.appointment_date, apt.start_time)}</div>
                      <div className="flex items-center gap-2"><Clock size={13} className="text-space-primary" />{apt.start_time.slice(0, 5)}</div>
                    </div>
                  </div>
                  <button onClick={() => handleCancelApt(apt.id)}
                    className="mt-4 w-full min-h-[40px] border border-space-border/50 hover:border-space-danger hover:bg-space-danger text-space-danger hover:text-space-card rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all">
                    Cancelar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── EXPLORE / DIRECTORIO BOOKSY ──────────────────────── */}
      <section id="explore" className="px-4 py-16 relative z-10">
        <div className="max-w-7xl mx-auto">

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-space-primary mb-1">Directorio</p>
              <h2 className="text-3xl font-extrabold text-space-text tracking-tight">Explorar Negocios</h2>
              {!loadingBiz && (
                <p className="text-sm text-space-muted mt-1">{filteredBusinesses.length} negocio{filteredBusinesses.length !== 1 ? 's' : ''} activo{filteredBusinesses.length !== 1 ? 's' : ''} en Spacey</p>
              )}
            </div>
          </div>

          {/* Two-field search bar */}
          <div className="bg-space-card border border-space-border rounded-[1.75rem] p-2 mb-4 shadow-sm">
            <div className="flex flex-col md:flex-row gap-2">
              {/* ¿Qué buscas? */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-space-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="¿Qué buscas? Corte, barba, nombre..."
                  className="w-full pl-11 pr-4 h-12 bg-transparent text-sm font-medium text-space-text placeholder:text-space-muted/50 outline-none"
                />
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px bg-space-border my-2" />

              {/* Ciudad o ZIP */}
              <div className="relative flex-1">
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-space-muted" />
                <input
                  type="text"
                  value={locationQuery}
                  onChange={e => setLocationQuery(e.target.value)}
                  placeholder="Ciudad o ZIP"
                  className="w-full pl-11 pr-24 h-12 bg-transparent text-sm font-medium text-space-text placeholder:text-space-muted/50 outline-none"
                />
                <button
                  onClick={detectMyLocation}
                  disabled={detectingLocation}
                  title="Detectar mi ubicación"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 h-9 rounded-xl bg-space-primary text-space-card text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 hover:bg-space-primary-dark transition-all disabled:opacity-50"
                >
                  {detectingLocation
                    ? <span className="w-3 h-3 rounded-full border-2 border-space-card/30 border-t-space-card animate-spin" />
                    : <MapPin size={12} />}
                  GPS
                </button>
              </div>
            </div>
          </div>

          {/* Quick type filters */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            {BUSINESS_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`px-4 h-9 rounded-full text-xs font-extrabold tracking-wide transition-all flex items-center gap-1.5 border ${
                  selectedType === t.id
                    ? 'bg-space-primary text-space-card border-space-primary shadow-sm'
                    : 'bg-space-card text-space-muted border-space-border hover:border-space-primary/40 hover:text-space-text'
                }`}
              >
                <span>{t.emoji}</span>{t.label}
              </button>
            ))}
            {hasActiveFilters && (
              <button
                onClick={() => { setSearchQuery(''); setLocationQuery(''); setSelectedType(''); }}
                className="px-4 h-9 rounded-full text-xs font-bold text-space-muted hover:text-space-danger transition-all flex items-center gap-1.5 ml-1">
                <X size={13} /> Limpiar
              </button>
            )}
          </div>

          {/* Business Grid */}
          {loadingBiz ? (
            <div className="flex flex-col items-center py-20">
              <LoadingSpinner />
              <p className="text-space-primary mt-4 text-xs font-extrabold uppercase tracking-widest animate-pulse">Cargando...</p>
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="bg-space-card border border-space-border/40 rounded-3xl p-16 text-center">
              <Scissors size={36} className="mx-auto text-space-muted/30 mb-4" />
              <h3 className="text-lg font-extrabold text-space-text mb-2">
                {hasActiveFilters ? 'Sin resultados' : 'Aún no hay negocios'}
              </h3>
              <p className="text-space-muted text-sm">
                {hasActiveFilters ? 'Prueba con otro filtro.' : 'Vuelve más tarde, estamos sumando profesionales.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredBusinesses.map(b => (
                <BusinessCard
                  key={b.id}
                  business={b}
                  isFav={favoriteSlugs.includes(b.slug)}
                  isLoggedIn={!!user}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── UPGRADE CTA para clientes logueados sin negocio ───── */}
      {user && !currentBusiness && (
        <section className="relative px-4 py-20 overflow-hidden" style={{ background: 'rgb(var(--space-text))' }}>
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(rgb(var(--space-primary-light)) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="absolute top-0 right-0 w-[40vw] h-[40vw] max-w-[400px] rounded-full blur-[120px]" style={{ background: 'rgba(var(--space-primary), 0.08)' }} />
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="text-center mb-10">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.4em] text-space-primary-light mb-3">Para negocios</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'rgb(var(--space-card))' }}>
                ¿Tienes una barbería?<br /><span className="text-space-primary-light">Únela a Spacey gratis.</span>
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {/* Card izquierda: estado actual como cliente */}
              <div className="rounded-[2rem] p-7 border border-space-card/10"
                style={{ background: 'rgba(var(--space-card), 0.05)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl border border-space-card/10" style={{ background: 'rgba(var(--space-card), 0.08)' }}>👤</div>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(var(--space-card), 0.35)' }}>Tu estado actual</p>
                    <h3 className="text-base font-extrabold" style={{ color: 'rgb(var(--space-card))' }}>Cliente activo</h3>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {[
                    'Reservar en cualquier barbería',
                    'Ver tus próximas citas',
                    'Historial de visitas',
                    'Favoritos guardados',
                  ].map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm font-medium" style={{ color: 'rgba(var(--space-card), 0.6)' }}>
                      <CheckCircle2 size={13} className="text-space-primary-light flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Card derecha: upgrade a dueño */}
              <div className="rounded-[2rem] p-7 border border-space-primary-light/25 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(var(--space-primary), 0.18), rgba(var(--space-primary-dark), 0.12))' }}>
                <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[8px] font-extrabold uppercase tracking-widest" style={{ background: 'rgba(var(--space-primary), 0.85)', color: 'rgb(var(--space-card))' }}>
                  🚀 Nivel Pro
                </div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-xl border border-space-primary-light/20 flex items-center justify-center text-xl" style={{ background: 'rgba(var(--space-primary), 0.2)' }}>🏢</div>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-space-primary-light mb-0.5">Siguiente nivel</p>
                    <h3 className="text-base font-extrabold" style={{ color: 'rgb(var(--space-card))' }}>Dueño de barbería</h3>
                  </div>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {[
                    'Bot WhatsApp que hace citas 24/7',
                    'Dashboard con KPIs en tiempo real',
                    'Reservas automáticas sin intervención',
                    'Reportes al barbero cada 2 horas',
                    'Gestión de equipo y horarios',
                  ].map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm font-medium" style={{ color: 'rgba(var(--space-card), 0.8)' }}>
                      <CheckCircle2 size={13} className="text-space-primary-light flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="inline-flex items-center gap-2 btn-primary shadow-xl shadow-space-primary/30">
                  Registrar mi barbería gratis <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── MARKETING SECTIONS (solo para no logueados) ───────── */}
      {!user && (
        <>
          {/* Para Clientes */}
          <section className="relative py-24 px-4 overflow-hidden" style={{ background: `rgb(var(--space-text))` }}>
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(rgb(var(--space-primary-light)) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            <div className="max-w-5xl mx-auto relative z-10">
              <div className="text-center mb-10">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.4em] text-space-primary-light mb-3">Para clientes</p>
                <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight" style={{ color: 'rgb(var(--space-card))' }}>
                  Reserva como quieras.<br /><span className="text-space-primary-light">Sin fricciones.</span>
                </h2>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="rounded-[2rem] p-7 border border-space-card/10 hover:border-space-primary-light/30 transition-all duration-500"
                  style={{ background: 'rgba(var(--space-card), 0.05)' }}>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl border border-space-card/10" style={{ background: 'rgba(var(--space-card), 0.08)' }}>👤</div>
                    <div>
                      <p className="text-[9px] font-extrabold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(var(--space-card), 0.3)' }}>Sin cuenta</p>
                      <h3 className="text-base font-extrabold" style={{ color: 'rgb(var(--space-card))' }}>Reserva en 2 minutos por WhatsApp</h3>
                    </div>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {['Cita por WhatsApp', 'Confirmación instantánea', 'Cancela con un link', 'Sin contraseñas'].map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm font-medium" style={{ color: 'rgba(var(--space-card), 0.6)' }}>
                        <CheckCircle2 size={14} className="text-space-primary-light flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <a href="#explore" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all"
                    style={{ border: '1px solid rgba(var(--space-card), 0.2)', color: 'rgba(var(--space-card), 0.7)' }}>
                    Explorar barberías <ArrowRight size={13} />
                  </a>
                </div>
                <div className="rounded-[2rem] p-7 border border-space-primary-light/20 relative overflow-hidden transition-all duration-500 hover:border-space-primary-light/40"
                  style={{ background: 'linear-gradient(135deg, rgba(var(--space-primary), 0.15), rgba(var(--space-primary-dark), 0.1))' }}>
                  <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[8px] font-extrabold uppercase tracking-widest" style={{ background: 'rgba(var(--space-primary), 0.9)', color: 'rgb(var(--space-card))' }}>⭐ Recomendado</div>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-11 h-11 rounded-xl border border-space-primary-light/20 flex items-center justify-center text-xl" style={{ background: 'rgba(var(--space-primary), 0.2)' }}>⭐</div>
                    <div>
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-space-primary-light mb-0.5">Con cuenta</p>
                      <h3 className="text-base font-extrabold" style={{ color: 'rgb(var(--space-card))' }}>Crea tu perfil gratis</h3>
                    </div>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {['Todo lo del invitado +', 'Historial de visitas', 'Cancela desde la web', 'Ofertas exclusivas'].map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm font-medium" style={{ color: 'rgba(var(--space-card), 0.75)' }}>
                        <CheckCircle2 size={14} className="text-space-primary-light flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register" className="inline-flex items-center gap-2 btn-primary shadow-xl shadow-space-primary/30">
                    Crear cuenta gratis <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Cómo funciona */}
          <section id="how-it-works" className="py-24 px-4 bg-space-bg">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.35em] text-space-primary mb-3">Para barberías</p>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-space-text tracking-tight">Así de simple.</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-8 relative">
                <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px" style={{ background: 'linear-gradient(to right, rgb(var(--space-primary-light)), rgb(var(--space-primary)), rgb(var(--space-primary-light)))' }} />
                {STEPS.map((step, i) => (
                  <div key={i} className="flex flex-col items-center text-center group">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 bg-space-card border-2 border-space-border rounded-[1.75rem] flex items-center justify-center text-4xl shadow-xl group-hover:border-space-primary/40 group-hover:-translate-y-2 transition-all duration-500 z-10 relative">
                        {step.emoji}
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold border-2 border-space-bg shadow-md z-20"
                        style={{ background: 'rgb(var(--space-primary))', color: 'rgb(var(--space-card))' }}>
                        {i + 1}
                      </div>
                    </div>
                    <h3 className="text-sm font-extrabold text-space-text mb-2 leading-tight">{step.title}</h3>
                    <p className="text-sm text-space-muted leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Features */}
          <section id="features" className="py-24 px-4 bg-space-card">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.35em] text-space-primary mb-3">Funcionalidades</p>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-space-text tracking-tight">
                  Todo incluido.<br />
                  <span className="bg-gradient-to-r from-space-primary-light to-space-primary bg-clip-text text-transparent">Desde el día uno.</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {FEATURES.map((feat, i) => (
                  <div key={i} className="bg-space-bg border border-space-border/60 rounded-[1.75rem] p-6 hover:border-space-primary/30 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-space-primary/8 transition-all duration-500 group">
                    <div className="w-11 h-11 rounded-xl mb-5 flex items-center justify-center group-hover:scale-110 transition-all duration-500" style={{ background: 'rgba(var(--space-primary), 0.1)' }}>
                      <feat.icon size={20} className="text-space-primary" />
                    </div>
                    <h4 className="text-sm font-extrabold text-space-text mb-2 leading-snug">{feat.label}</h4>
                    <p className="text-[11px] text-space-muted font-medium leading-relaxed">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section id="pricing" className="py-24 px-4 bg-space-bg">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.35em] text-space-primary mb-3">Para barberías</p>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-space-text tracking-tight">Sin sorpresas.<br />Sin contratos.</h2>
                <p className="text-space-muted font-semibold mt-3 text-sm">Cancela cuando quieras. 30 días gratis para empezar.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-5 items-start">
                {PRICING.map((tier) => (
                  <div key={tier.name}
                    className={`relative rounded-[2rem] p-7 transition-all duration-500 ${tier.recommended
                      ? '-translate-y-3 shadow-2xl'
                      : 'bg-space-card border border-space-border/60 hover:-translate-y-1 hover:shadow-lg'
                    }`}
                    style={tier.recommended ? { background: '#1a2e28', border: '2px solid #2a4030' } : {}}>
                    {tier.recommended && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest whitespace-nowrap shadow-lg"
                        style={{ background: 'linear-gradient(to right, rgb(var(--space-primary-light)), rgb(var(--space-primary)))', color: '#e8f4e0' }}>
                        ⭐ Más popular
                      </div>
                    )}
                    <div className="text-3xl mb-4">{tier.icon}</div>
                    <h3 className="text-xl font-extrabold mb-1" style={tier.recommended ? { color: '#e8f4e0' } : {}}>{tier.name}</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-5xl font-extrabold tracking-tight" style={tier.recommended ? { color: '#e8f4e0' } : {}}>{tier.price}</span>
                      <span className="text-sm font-bold" style={tier.recommended ? { color: 'rgba(232,244,224,0.5)' } : { color: 'rgb(var(--space-muted))' }}>{tier.period}</span>
                    </div>
                    <ul className="space-y-2.5 mb-7">
                      {tier.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm font-medium"
                          style={tier.recommended ? { color: 'rgba(232,244,224,0.75)' } : { color: 'rgb(var(--space-muted))' }}>
                          <CheckCircle2 size={15} className={`mt-0.5 shrink-0 ${tier.recommended ? 'text-space-primary-light' : 'text-space-primary'}`} />{f}
                        </li>
                      ))}
                    </ul>
                    <Link to="/register"
                      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all ${tier.recommended ? '' : 'border border-space-border text-space-text hover:border-space-primary hover:bg-space-bg'}`}
                      style={tier.recommended ? { background: 'linear-gradient(to right, rgb(var(--space-primary-light)), rgb(var(--space-primary)))', color: '#1a2e28' } : {}}>
                      Empezar <ArrowRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Final */}
          <section className="relative py-28 px-4 overflow-hidden" style={{ background: 'rgb(var(--space-text))' }}>
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(rgb(var(--space-primary-light)) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[500px] rounded-full blur-[130px]" style={{ background: 'rgba(var(--space-primary), 0.1)' }} />
            <div className="max-w-2xl mx-auto text-center relative z-10">
              <div className="text-5xl mb-6">💈</div>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5 leading-tight" style={{ color: 'rgb(var(--space-card))' }}>
                Tu barbería, trabajando<br />mientras tú descansas.
              </h2>
              <p className="font-semibold mb-10 text-base" style={{ color: 'rgba(var(--space-card), 0.5)' }}>30 días gratis · Sin tarjeta · Sin compromisos</p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
                <Link to="/register" className="btn-primary text-sm px-10 py-4 shadow-2xl shadow-space-primary/30">
                  Registra tu barbería <ArrowRight size={16} />
                </Link>
                <a href="#explore" className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-sm font-extrabold uppercase tracking-widest transition-all"
                  style={{ border: '1px solid rgba(var(--space-card), 0.2)', color: 'rgba(var(--space-card), 0.65)' }}>
                  Explorar barberías
                </a>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t pt-12 pb-8 px-4" style={{ background: 'rgb(var(--space-text))', borderColor: 'rgba(var(--space-card), 0.06)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pb-8 border-b" style={{ borderColor: 'rgba(var(--space-card), 0.08)' }}>
            <div className="col-span-2 sm:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgb(var(--space-primary-light)), rgb(var(--space-primary)))' }}>
                  <img src="/logo.png" alt="Spacey" className="w-full h-full object-cover object-top scale-110" />
                </div>
                <span className="text-lg font-extrabold tracking-tight" style={{ color: 'rgb(var(--space-card))' }}>Spacey</span>
              </div>
              <p className="text-sm font-medium leading-relaxed max-w-[220px]" style={{ color: 'rgba(var(--space-card), 0.4)' }}>
                El asistente inteligente de WhatsApp para barberías modernas.
              </p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest mb-3" style={{ color: 'rgba(var(--space-card), 0.25)' }}>Producto</p>
              <ul className="space-y-2">
                {[['Funciones', '#features'], ['Precios', '#pricing'], ['Explorar', '#explore']].map(([l, h]) => (
                  <li key={l}><a href={h} className="text-sm hover:text-space-primary-light transition-colors" style={{ color: 'rgba(var(--space-card), 0.5)' }}>{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest mb-3" style={{ color: 'rgba(var(--space-card), 0.25)' }}>Cuenta</p>
              <ul className="space-y-2">
                {[['Entrar', '/login'], ['Registrarse', '/register'], ['Dashboard', '/dashboard']].map(([l, h]) => (
                  <li key={l}><Link to={h} className="text-sm hover:text-space-primary-light transition-colors" style={{ color: 'rgba(var(--space-card), 0.5)' }}>{l}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs" style={{ color: 'rgba(var(--space-card), 0.25)' }}>© {new Date().getFullYear()} Spacey Platform · Todos los derechos reservados</p>
            <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'rgba(var(--space-primary-light), 0.35)' }}>Spacey Reserve · Puerto Rico</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default Home;
