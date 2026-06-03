import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MapPin, Star, Scissors, Calendar, Clock, Heart, XCircle, LogOut,
  LayoutDashboard, ArrowRight, Info, Instagram, Globe, X, Search,
  Moon, Sun, Bell, Users, BarChart3, Zap, Shield, RefreshCw,
  CheckCircle2, MessageCircle, UserCheck, Award, Bot, ChevronDown
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
  banner_url?: string;
  logo_url?: string;
  latitude?: number;
  longitude?: number;
  instagram_url?: string;
  website_url?: string;
  gallery?: string[];
}

const CHAT_MESSAGES = [
  { from: 'user', text: 'Hola 👋' },
  { from: 'bot', text: '¡Hola! Soy el asistente de *Annlo Barber* 💈\nEscribe *"cita"* para agendar 📅' },
  { from: 'user', text: 'cita' },
  { from: 'bot', text: '¡Perfecto! 💈 ¿Cuál es tu nombre?' },
  { from: 'user', text: 'Carlos' },
  { from: 'bot', text: '¡Hola Carlos! ¿Qué servicio?\n1. Corte moderno — $25 (15 min)\n2. Corte de Barba — $24' },
  { from: 'user', text: '1' },
  { from: 'bot', text: '✅ *¡Cita confirmada, Carlos!*\n✂️ Corte moderno\n💈 Pacheco\n📅 Mañana · 10:00 AM\n¡Te esperamos! 💈' },
];
const MSG_TIMES = ['10:23', '10:23', '10:24', '10:24', '10:24', '10:24', '10:24', '10:24'];

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
  { num: '01', emoji: '💬', title: 'Tu cliente escribe al WhatsApp de tu barbería', desc: 'No necesita app, no necesita cuenta. Solo WhatsApp.' },
  { num: '02', emoji: '🤖', title: 'Spacey atiende, hace la cita y confirma en segundos', desc: 'IA 24/7 que nunca duerme, nunca se equivoca de horario.' },
  { num: '03', emoji: '📊', title: 'Tú ves todo en el dashboard y recibes reportes', desc: 'Dashboard en tiempo real + reportes por WhatsApp cada 2 horas.' },
];

function Home() {
  const navigate = useNavigate();
  const { user, logout, currentBusiness } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [allBusinesses, setAllBusinesses] = useState<BusinessResult[]>([]);
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [customerAppointments, setCustomerAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingApts, setLoadingApts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [lastAppointment, setLastAppointment] = useState<Appointment | null>(null);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);
  const [selectedBusinessDetails, setSelectedBusinessDetails] = useState<BusinessResult | null>(null);
  const [chatVisible, setChatVisible] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  // Redirect business users to dashboard
  useEffect(() => {
    if (user && currentBusiness) navigate('/dashboard');
  }, [user, currentBusiness]);

  // Chat animation
  useEffect(() => {
    if (user) return;
    if (chatVisible >= CHAT_MESSAGES.length) {
      const t = setTimeout(() => setChatVisible(0), 2500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setChatVisible(v => v + 1), chatVisible === 0 ? 800 : 1350);
    return () => clearTimeout(t);
  }, [chatVisible, user]);

  // Scroll detection
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (user) { loadData(); loadFavorites(); }
  }, [user]);

  useEffect(() => {
    if (user) loadCustomerAppointments();
  }, [user, location.pathname]);

  useEffect(() => {
    if (!user) return;
    window.addEventListener('focus', loadCustomerAppointments);
    return () => window.removeEventListener('focus', loadCustomerAppointments);
  }, [user]);

  const loadCustomerAppointments = useCallback(async () => {
    let emailToFetch = user?.email;
    if (!emailToFetch) {
      try {
        const savedInfo = localStorage.getItem('annly_customer_data');
        if (savedInfo) emailToFetch = JSON.parse(savedInfo).email;
      } catch { /* ignore */ }
    }
    if (!emailToFetch) { setCustomerAppointments([]); return; }
    const normalizedEmail = emailToFetch.toLowerCase().trim();
    const clientId = user?.id;
    setLoadingApts(true);
    try {
      const data = await appointmentsService.getCustomerAppointments(normalizedEmail, clientId);
      const now = new Date();
      const enriched = data.map(apt => {
        const [year, month, day] = apt.appointment_date.split('-').map(Number);
        const [hours, minutes] = apt.start_time.split(':').map(Number);
        const aptDate = new Date(year, month - 1, day, hours, minutes);
        const diffMs = now.getTime() - aptDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        let statusBadge = 'upcoming';
        if (diffMins > 120) statusBadge = 'expired';
        else if (diffMins > 15) statusBadge = 'late';
        else if (apt.appointment_date === now.toISOString().split('T')[0]) statusBadge = 'today';
        return { ...apt, statusBadge };
      }).filter(apt => apt.status === 'confirmed');
      setCustomerAppointments(enriched);
      if (enriched.length > 0) setLastAppointment(enriched[0]);
    } catch (err) {
      console.error('Error loading customer appointments', err);
    } finally {
      setLoadingApts(false);
    }
  }, [user]);

  const handleCancelApt = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas cancelar esta cita?')) return;
    try {
      await appointmentsService.updateAppointmentStatus(id, 'cancelled');
      await loadCustomerAppointments();
    } catch { alert('No se pudo cancelar la cita. Intenta de nuevo.'); }
  };

  const loadFavorites = () => {
    try {
      const saved = localStorage.getItem('favoriteBusinesses');
      if (saved) setFavoriteSlugs(JSON.parse(saved));
    } catch { /* ignore */ }
  };

  const toggleFavorite = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    const newFavorites = favoriteSlugs.includes(slug)
      ? favoriteSlugs.filter(s => s !== slug)
      : [...favoriteSlugs, slug];
    setFavoriteSlugs(newFavorites);
    localStorage.setItem('favoriteBusinesses', JSON.stringify(newFavorites));
  };

  const loadData = async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: bError } = await supabase
        .from('businesses')
        .select('id, name, slug, description, address, city, banner_url, logo_url, latitude, longitude, services(price, is_active)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);
      if (bError) throw bError;
      setAllBusinesses((data || []).map(b => ({
        ...b,
        hasAhorro: b.services?.some((s: any) => s.is_active && s.price >= 10 && s.price <= 15),
        hasPremium: b.services?.some((s: any) => s.is_active && s.price >= 40),
        isFlash: b.services?.some((s: any) => s.is_active && s.price > 0),
      })) as any);
    } catch {
      setError('No pudimos cargar las barberías.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => { await logout(); setIsAccountMenuOpen(false); };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleGeoLocation = () => {
    if (!navigator.geolocation) { alert('Tu navegador no soporta geolocalización'); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setSortByDistance(true); setIsLocating(false); },
      () => { alert('No pudimos obtener tu ubicación'); setIsLocating(false); }
    );
  };

  const energyFilters = [
    { id: 'saving', label: 'Modo Ahorro', emoji: '🪫', color: 'bg-space-card', text: 'text-space-text', border: 'border-space-border', description: 'Rápido + Barato' },
    { id: 'premium', label: 'Modo Premium', emoji: '⚡', color: 'bg-space-text', text: 'text-space-card', border: 'border-space-text', description: 'Calidad + Top' },
    { id: 'flash', label: 'Modo Flash', emoji: '🚀', color: 'bg-space-primary', text: 'text-space-card', border: 'border-space-primary', description: 'Disponible YA' },
  ];

  const filteredBusinesses = activeMood
    ? allBusinesses.filter(b => {
        if (activeMood === 'saving') return (b as any).hasAhorro;
        if (activeMood === 'premium') return (b as any).hasPremium;
        return (b as any).isFlash;
      })
    : allBusinesses;

  const sortedBusinesses = [...filteredBusinesses].sort((a, b) => {
    if (sortByDistance && userLocation && a.latitude && b.latitude) {
      return calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude!) -
        calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude!);
    }
    return 0;
  });

  const favoriteBusinesses = allBusinesses.filter(b => favoriteSlugs.includes(b.slug));

  const BusinessCard = ({ business, isFavorite }: { business: BusinessResult; isFavorite: boolean }) => (
    <div className="group bg-space-card border-2 border-space-border/60 hover:border-space-primary/30 rounded-[2.5rem] overflow-hidden hover:shadow-[0_20px_50px_-12px_rgba(123,160,108,0.25)] hover:-translate-y-2 transition-all duration-500 flex flex-col h-full relative">
      <button onClick={(e) => toggleFavorite(e, business.slug)} className="absolute top-5 right-5 z-20 w-10 h-10 flex items-center justify-center bg-space-card/90 backdrop-blur-xl rounded-2xl border border-space-border/40 hover:border-space-primary/30 hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95">
        <Heart size={18} className={`transition-all duration-300 ${isFavorite ? 'fill-space-danger text-space-danger' : 'text-space-muted hover:text-space-danger'}`} />
      </button>
      <Link to={`/book/${business.slug}`} className="block h-48 bg-space-bg relative overflow-hidden group/banner p-3 pb-0">
        <div className="w-full h-full rounded-t-[2rem] overflow-hidden relative">
          <img src={business.banner_url || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800'} alt={business.name} className="w-full h-full object-cover group-hover/banner:scale-110 transition duration-700 ease-out" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </div>
      </Link>
      <div className="absolute top-[10.5rem] left-5 z-10">
        <div className="w-16 h-16 rounded-2xl bg-space-card p-1 shadow-2xl border-2 border-space-border/30 overflow-hidden transform group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-500">
          <img src={business.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(business.name)}&background=1a2e28&color=fff`} className="w-full h-full object-cover rounded-xl" alt="Logo" />
        </div>
      </div>
      <div className="p-5 pt-12 flex-1 flex flex-col">
        <Link to={`/book/${business.slug}`} className="block group/title">
          <h3 className="text-lg font-extrabold leading-tight mb-1 text-space-text tracking-tight group-hover/title:text-space-primary transition-colors">{business.name}</h3>
          <div className="flex items-center text-[10px] text-space-muted font-bold uppercase tracking-[0.12em] mt-1 bg-space-card2/50 px-2.5 py-1 rounded-full inline-flex w-fit">
            <MapPin size={9} className="mr-1 text-space-primary" />{business.city || 'Ubicación no especificada'}
          </div>
        </Link>
        <p className="text-space-muted/80 text-sm my-4 line-clamp-2 flex-1 font-medium leading-relaxed">{business.description || 'Reserva tu cita con los mejores profesionales en Spacey.'}</p>
        <div className="mt-auto pt-4 border-t border-space-border/60 grid grid-cols-2 gap-2">
          <button onClick={() => setSelectedBusinessDetails(business)} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-space-border/60 text-[10px] font-extrabold uppercase tracking-wider text-space-muted hover:bg-space-bg hover:text-space-text hover:border-space-primary/30 transition-all active:scale-95 min-h-[40px]">
            <Info size={13} />Detalles
          </button>
          <Link to={`/book/${business.slug}`} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-br from-space-primary-light to-space-primary text-space-card text-[10px] font-extrabold uppercase tracking-wider shadow-lg shadow-space-primary/20 hover:shadow-xl hover:shadow-space-primary/30 hover:scale-105 active:scale-95 transition-all min-h-[40px]">
            <Scissors size={13} />Reservar
          </Link>
        </div>
      </div>
    </div>
  );

  // ─── SHARED NAV ──────────────────────────────────────────────────────────────
  const NavBar = () => (
    <nav className="fixed w-full z-50 top-3 sm:top-5 px-3 sm:px-4">
      <div className="max-w-5xl mx-auto">
        <div className={`flex justify-between items-center px-4 sm:px-5 h-14 sm:h-[3.75rem] rounded-full transition-all duration-500 ${isScrolled ? 'backdrop-blur-2xl bg-space-card/95 border border-space-border/50 shadow-xl' : 'backdrop-blur-xl bg-space-card/75 border border-space-border/25 shadow-lg'}`}>
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-space-primary-light to-space-primary rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-all overflow-hidden">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top scale-110" />
            </div>
            <span className="text-lg sm:text-xl font-extrabold tracking-tight text-space-text">Spacey</span>
          </div>

          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {!user ? (
              <>
                <a href="#features" className="text-[10px] font-extrabold uppercase tracking-widest text-space-muted hover:text-space-primary transition-all">Funciones</a>
                <a href="#pricing" className="text-[10px] font-extrabold uppercase tracking-widest text-space-muted hover:text-space-primary transition-all">Precios</a>
                <a href="#how-it-works" className="text-[10px] font-extrabold uppercase tracking-widest text-space-muted hover:text-space-primary transition-all">Cómo Funciona</a>
              </>
            ) : (
              <>
                <a href="#directory" className="text-[10px] font-extrabold uppercase tracking-widest text-space-muted hover:text-space-primary transition-all">Barberías</a>
                <Link to="/dashboard" className="text-[10px] font-extrabold uppercase tracking-widest text-space-muted hover:text-space-primary transition-all">Dashboard</Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-xl text-space-muted hover:text-space-primary hover:bg-space-card2/80 transition-all" aria-label="Toggle Theme">
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {user ? (
              <div className="relative">
                <button onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)} className="flex items-center gap-1.5 p-1 rounded-full hover:bg-space-bg transition border-2 border-transparent hover:border-space-border">
                  <div className="w-8 h-8 bg-gradient-to-br from-space-primary-light to-space-primary text-space-card rounded-xl flex items-center justify-center font-extrabold text-xs">
                    {user.email?.[0].toUpperCase()}
                  </div>
                </button>
                {isAccountMenuOpen && (
                  <div className="absolute right-0 mt-2.5 w-64 bg-space-card rounded-[2rem] shadow-2xl border border-space-border/30 overflow-hidden py-1 z-50 animate-scale-in">
                    <div className="px-5 py-5 border-b border-space-border/30 bg-space-bg flex justify-between items-center">
                      <div>
                        <p className="text-[9px] text-space-muted font-extrabold uppercase tracking-widest">Cuenta</p>
                        <p className="text-xs font-bold text-space-text truncate mt-0.5 max-w-[140px]">{user.email}</p>
                      </div>
                      <button onClick={() => setIsAccountMenuOpen(false)} className="p-1.5 text-space-muted hover:text-space-text transition-colors"><XCircle size={16} /></button>
                    </div>
                    <div className="p-2 space-y-1">
                      <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-space-text hover:text-space-primary hover:bg-space-primary/5 rounded-xl transition-all" onClick={() => setIsAccountMenuOpen(false)}>
                        <LayoutDashboard size={18} className="text-space-primary" />Dashboard
                      </Link>
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-space-danger hover:bg-space-danger/5 rounded-xl transition-all">
                        <LogOut size={18} />Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link to="/login" className="text-[10px] font-extrabold text-space-text hover:text-space-primary transition-all px-4 py-2 rounded-full border border-space-border hover:border-space-primary uppercase tracking-widest">
                  Entrar
                </Link>
                <Link to="/signup" className="hidden sm:inline-flex btn-primary py-2 px-5 text-[10px] uppercase tracking-widest shadow-lg shadow-space-primary/20">
                  Empezar
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-space-bg text-space-text overflow-x-hidden">

      {/* bg ambient orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -right-[5%] w-[55vw] h-[55vw] rounded-full bg-space-primary-light/8 blur-[120px] animate-pulse-subtle" />
        <div className="absolute top-[50%] -left-[5%] w-[45vw] h-[45vw] rounded-full bg-space-card2/30 blur-[130px]" />
        <div className="absolute -bottom-[15%] right-[15%] w-[55vw] h-[55vw] rounded-full bg-space-primary/5 blur-[110px]" />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(#22321c 1.2px, transparent 1.2px)', backgroundSize: '28px 28px' }} />
      </div>

      <NavBar />

      {/* ══════════════════════════════════════════════════════════
          LANDING — solo para usuarios no logueados
          ══════════════════════════════════════════════════════════ */}
      {!user ? (
        <>
          {/* ── HERO ──────────────────────────────────────────────── */}
          <section className="relative flex flex-col items-center justify-center min-h-screen pt-24 pb-16 px-4 text-center overflow-hidden">
            <div className="relative z-10 w-full max-w-3xl mx-auto">

              {/* Logo icon */}
              <div className="w-14 h-14 rounded-2xl mx-auto mb-6 overflow-hidden shadow-xl shadow-space-primary/25 ring-2 ring-space-primary/20 animate-fade-in"
                style={{ background: 'linear-gradient(135deg, rgb(var(--space-primary-light)), rgb(var(--space-primary)))' }}>
                <img src="/logo.png" alt="" className="w-full h-full object-cover object-top scale-110" />
              </div>

              {/* Active badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-space-primary/25 bg-space-primary/8 mb-7 animate-fade-in">
                <span className="w-1.5 h-1.5 rounded-full bg-space-success shadow-[0_0_6px_rgba(var(--space-success),0.8)] animate-pulse" />
                <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-space-primary">Bot activo 24/7 · WhatsApp</span>
              </div>

              {/* Headline */}
              <h1 className="text-[clamp(2.6rem,9vw,5.5rem)] font-extrabold leading-[0.93] tracking-tight text-space-text mb-5 animate-fade-up">
                El bot que llena<br />
                tu barbería<br />
                <span className="bg-gradient-to-r from-space-primary-light via-space-primary to-space-primary-dark bg-clip-text text-transparent">
                  mientras duermes.
                </span>
              </h1>

              {/* Subtext */}
              <p className="text-base sm:text-lg text-space-muted font-semibold max-w-md mx-auto mb-10 leading-relaxed animate-fade-up" style={{ animationDelay: '100ms' }}>
                Tu barbería atendiendo clientes por WhatsApp las 24 horas, agendando citas sola — mientras tú te enfocas en tu arte.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-12 animate-fade-up" style={{ animationDelay: '180ms' }}>
                <Link to="/signup" className="btn-primary text-sm px-10 py-4 shadow-2xl shadow-space-primary/30">
                  Prueba Gratis 30 días <ArrowRight size={16} />
                </Link>
                <a href="#demo" className="btn-secondary text-sm px-10 py-4">
                  Ver cómo funciona
                </a>
              </div>

              {/* Social proof */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: '250ms' }}>
                <div className="flex -space-x-2.5 flex-shrink-0">
                  {['A','C','M','R','J'].map((l, i) => (
                    <div key={i}
                      className="w-9 h-9 rounded-xl border-2 border-space-bg flex items-center justify-center text-[11px] font-extrabold shadow-sm"
                      style={{ background: 'linear-gradient(135deg, rgb(var(--space-primary-light)), rgb(var(--space-primary)))', color: 'rgb(var(--space-card))', zIndex: 5 - i }}>
                      {l}
                    </div>
                  ))}
                </div>
                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-0.5 mb-0.5">
                    {[0,1,2,3,4].map(i => <Star key={i} size={12} className="text-space-yellow fill-space-yellow" />)}
                    <span className="ml-1 text-[11px] font-extrabold text-space-primary">4.9</span>
                  </div>
                  <p className="text-sm font-extrabold text-space-text">+120 barberías activas</p>
                  <p className="text-[10px] text-space-muted uppercase tracking-widest font-bold">Puerto Rico & República Dominicana</p>
                </div>
              </div>
            </div>

            {/* Scroll indicator */}
            <a href="#demo" className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-space-muted/40 hover:text-space-primary transition-colors animate-bounce">
              <ChevronDown size={20} />
            </a>
          </section>

          {/* ── DEMO: COPY + PHONE ────────────────────────────────── */}
          <section id="demo" className="relative py-20 px-4">
            <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

              {/* Left: copy */}
              <div className="order-2 lg:order-1">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.35em] text-space-primary mb-3">En acción</p>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-space-text tracking-tight leading-tight mb-5">
                  Tu asistente<br />nunca descansa.<br /><span className="text-space-primary">Nunca.</span>
                </h2>
                <p className="text-space-muted font-semibold leading-relaxed mb-8">
                  Mientras tú trabajas, el bot atiende, agenda y confirma. Cero intervención humana para reservas de rutina.
                </p>
                <div className="space-y-3.5">
                  {[
                    'Responde en menos de 3 segundos',
                    'Envía recordatorios 24h y 1h antes',
                    'Gestiona cancelaciones y reagendados',
                    'Reportes al barbero cada 2 horas',
                  ].map((t, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-space-primary flex-shrink-0" />
                      <span className="text-sm font-bold text-space-text">{t}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-10">
                  <Link to="/signup" className="btn-primary text-sm px-8 py-3.5 shadow-xl shadow-space-primary/25">
                    Empezar gratis <ArrowRight size={15} />
                  </Link>
                </div>
              </div>

              {/* Right: Phone mockup */}
              <div className="order-1 lg:order-2 relative flex justify-center">
                {/* Floating confirmation badge */}
                <div className="absolute -top-4 -left-2 sm:-left-10 z-20 hidden sm:flex items-center gap-3 bg-space-card border-2 border-space-border/40 rounded-2xl px-4 py-3 shadow-2xl animate-float">
                  <div className="w-8 h-8 bg-space-success/15 rounded-xl flex items-center justify-center">
                    <CheckCircle2 size={16} className="text-space-success" />
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-space-muted">Confirmada</p>
                    <p className="text-xs font-extrabold text-space-text">10:00 AM · Carlos</p>
                  </div>
                </div>
                {/* Revenue badge */}
                <div className="absolute -bottom-4 -right-2 sm:-right-10 z-20 hidden sm:flex items-center gap-3 bg-space-card border-2 border-space-border/40 rounded-2xl px-4 py-3 shadow-2xl animate-float-slow">
                  <div className="w-8 h-8 bg-space-primary/15 rounded-xl flex items-center justify-center">
                    <BarChart3 size={16} className="text-space-primary" />
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-space-muted">Hoy</p>
                    <p className="text-xs font-extrabold text-space-text">12 citas · $360</p>
                  </div>
                </div>
                {/* Phone */}
                <div className="relative w-[270px] sm:w-[300px]">
                  <div className="rounded-[2.5rem] p-3 shadow-[0_40px_80px_-20px_rgba(34,50,28,0.45)] ring-4"
                    style={{ background: `rgb(var(--space-text))`, ringColor: `rgba(var(--space-text), 0.08)` }}>
                    <div className="flex justify-center mb-2">
                      <div className="w-20 h-5 rounded-full flex items-center justify-center gap-1.5"
                        style={{ background: `rgba(var(--space-card), 0.1)` }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: `rgba(var(--space-card), 0.2)` }} />
                        <div className="w-6 h-1 rounded-full" style={{ background: `rgba(var(--space-card), 0.2)` }} />
                      </div>
                    </div>
                    <div className="rounded-[2rem] overflow-hidden bg-[#ECE5DD]">
                      <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-space-primary-light flex items-center justify-center text-space-text text-xs font-extrabold">A</div>
                        <div className="flex-1">
                          <p className="font-extrabold text-sm leading-none" style={{ color: '#fff' }}>Annlo Barber</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>en línea</p>
                        </div>
                        <MessageCircle size={16} style={{ color: 'rgba(255,255,255,0.6)' }} />
                      </div>
                      <div className="p-3 min-h-[280px] flex flex-col gap-2 overflow-hidden">
                        {CHAT_MESSAGES.map((msg, i) => (
                          <div key={i}
                            className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'} transition-all duration-500 ${i < chatVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[11px] font-medium leading-snug whitespace-pre-line shadow-sm ${msg.from === 'user' ? 'bg-[#DCF8C6] text-gray-800 rounded-br-sm' : 'bg-[#fff] text-gray-800 rounded-bl-sm'}`}>
                              {msg.text}
                              <span className={`block text-right text-[9px] mt-1 ${msg.from === 'user' ? 'text-green-600' : 'text-gray-400'}`}>
                                {MSG_TIMES[i]}{msg.from === 'user' && ' ✓✓'}
                              </span>
                            </div>
                          </div>
                        ))}
                        {chatVisible < CHAT_MESSAGES.length && chatVisible > 0 && CHAT_MESSAGES[chatVisible]?.from === 'bot' && (
                          <div className="flex justify-start animate-fade-in">
                            <div className="bg-[#fff] rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
                              <div className="flex gap-1 items-center h-4">
                                {[0, 150, 300].map(d => (
                                  <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="bg-[#F0F0F0] px-3 py-2 flex items-center gap-2">
                        <div className="flex-1 bg-[#fff] rounded-full px-3 py-1.5 text-[10px] text-gray-400">Mensaje</div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#25D366' }}>
                          <MessageCircle size={14} style={{ color: '#fff' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── PARA CLIENTES ─────────────────────────────────────── */}
          <section className="relative py-24 px-4 overflow-hidden" style={{ background: `rgb(var(--space-text))` }}>
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(rgb(var(--space-primary-light)) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            <div className="absolute top-0 right-0 w-[40vw] h-[40vw] max-w-[400px] rounded-full blur-[120px]" style={{ background: `rgba(var(--space-primary), 0.08)` }} />
            <div className="max-w-5xl mx-auto relative z-10">
              <div className="text-center mb-12">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.4em] text-space-primary-light mb-3">Para clientes</p>
                <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight" style={{ color: `rgb(var(--space-card))` }}>
                  Reserva como quieras.<br />
                  <span className="text-space-primary-light">Sin fricciones.</span>
                </h2>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                {/* Invitado */}
                <div className="rounded-[2rem] p-7 border border-space-card/10 hover:border-space-primary-light/30 transition-all duration-500 group" style={{ background: `rgba(var(--space-card), 0.05)` }}>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border border-space-card/10" style={{ background: `rgba(var(--space-card), 0.08)` }}>👤</div>
                    <div>
                      <p className="text-[9px] font-extrabold uppercase tracking-widest mb-0.5" style={{ color: `rgba(var(--space-card), 0.3)` }}>Sin cuenta</p>
                      <h3 className="text-lg font-extrabold" style={{ color: `rgb(var(--space-card))` }}>Reserva en 2 minutos</h3>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {['Haz tu cita por WhatsApp', 'Confirmación instantánea', 'Cancela con un link', 'Sin contraseñas'].map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm font-medium" style={{ color: `rgba(var(--space-card), 0.6)` }}>
                        <CheckCircle2 size={14} className="text-space-primary-light flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <a href="https://spaceyreserve.netlify.app/book/annlobarberia" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all duration-300"
                    style={{ border: `1px solid rgba(var(--space-card), 0.2)`, color: `rgba(var(--space-card), 0.7)` }}>
                    Reservar ahora <ArrowRight size={13} />
                  </a>
                </div>
                {/* Registrado */}
                <div className="rounded-[2rem] p-7 border border-space-primary-light/20 relative overflow-hidden group transition-all duration-500 hover:border-space-primary-light/40"
                  style={{ background: `linear-gradient(135deg, rgba(var(--space-primary), 0.15), rgba(var(--space-primary-dark), 0.1))` }}>
                  <div className="absolute top-5 right-5 px-2.5 py-1 rounded-full text-[8px] font-extrabold uppercase tracking-widest" style={{ background: `rgba(var(--space-primary), 0.9)`, color: `rgb(var(--space-card))` }}>
                    ⭐ Recomendado
                  </div>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl border border-space-primary-light/20 flex items-center justify-center text-2xl" style={{ background: `rgba(var(--space-primary), 0.2)` }}>⭐</div>
                    <div>
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-space-primary-light mb-0.5">Con cuenta</p>
                      <h3 className="text-lg font-extrabold" style={{ color: `rgb(var(--space-card))` }}>Crea tu perfil gratis</h3>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {['Todo lo del invitado +', 'Historial de visitas', 'Cancela desde la web', 'Ofertas exclusivas', 'Acumula visitas y sé VIP'].map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm font-medium" style={{ color: `rgba(var(--space-card), 0.75)` }}>
                        <CheckCircle2 size={14} className="text-space-primary-light flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/signup" className="inline-flex items-center gap-2 btn-primary shadow-xl shadow-space-primary/30">
                    Crear cuenta gratis <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ── CÓMO FUNCIONA ────────────────────────────────────── */}
          <section id="how-it-works" className="relative py-24 px-4 bg-space-bg">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-14">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.35em] text-space-primary mb-3">El proceso</p>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-space-text tracking-tight">Así de simple.</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-8 relative">
                <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px" style={{ background: `linear-gradient(to right, rgb(var(--space-primary-light)), rgb(var(--space-primary)), rgb(var(--space-primary-light)))` }} />
                {STEPS.map((step, i) => (
                  <div key={i} className="flex flex-col items-center text-center group">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 bg-space-card border-2 border-space-border rounded-[1.75rem] flex items-center justify-center text-4xl shadow-xl group-hover:border-space-primary/40 group-hover:-translate-y-2 transition-all duration-500 relative z-10">
                        {step.emoji}
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-space-card text-[10px] font-extrabold border-2 border-space-bg shadow-md z-20" style={{ background: `rgb(var(--space-primary))` }}>
                        {i + 1}
                      </div>
                    </div>
                    <h3 className="text-sm font-extrabold text-space-text mb-2.5 leading-tight">{step.title}</h3>
                    <p className="text-sm text-space-muted font-medium leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── FEATURES ─────────────────────────────────────────── */}
          <section id="features" className="relative py-24 px-4 bg-space-card">
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
                    <div className="w-11 h-11 rounded-xl mb-5 flex items-center justify-center group-hover:scale-110 transition-all duration-500" style={{ background: `rgba(var(--space-primary), 0.1)` }}>
                      <feat.icon size={20} className="text-space-primary group-hover:text-space-primary transition-colors duration-500" />
                    </div>
                    <h4 className="text-sm font-extrabold text-space-text mb-2 leading-snug">{feat.label}</h4>
                    <p className="text-[11px] text-space-muted font-medium leading-relaxed">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── PRICING ──────────────────────────────────────────── */}
          <section id="pricing" className="relative py-24 px-4 bg-space-bg">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.35em] text-space-primary mb-3">Precios</p>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-space-text tracking-tight">Sin sorpresas.<br />Sin contratos.</h2>
                <p className="text-space-muted font-semibold mt-4 text-sm">Cancela cuando quieras. 30 días gratis para empezar.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-5 items-start">
                {PRICING.map((tier) => (
                  <div key={tier.name}
                    className={`relative rounded-[2rem] p-7 transition-all duration-500 ${tier.recommended
                      ? 'shadow-2xl -translate-y-3 border-2 border-space-text'
                      : 'bg-space-card border border-space-border/60 hover:-translate-y-1 hover:shadow-lg'
                    }`}
                    style={tier.recommended ? { background: `rgb(var(--space-text))` } : {}}>
                    {tier.recommended && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest whitespace-nowrap shadow-lg"
                        style={{ background: `linear-gradient(to right, rgb(var(--space-primary-light)), rgb(var(--space-primary)))`, color: `rgb(var(--space-card))` }}>
                        ⭐ Más popular
                      </div>
                    )}
                    <div className="text-3xl mb-4">{tier.icon}</div>
                    <h3 className={`text-xl font-extrabold mb-1 ${tier.recommended ? '' : 'text-space-text'}`}
                      style={tier.recommended ? { color: `rgb(var(--space-card))` } : {}}>{tier.name}</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className={`text-5xl font-extrabold tracking-tight ${tier.recommended ? '' : 'text-space-text'}`}
                        style={tier.recommended ? { color: `rgb(var(--space-card))` } : {}}>{tier.price}</span>
                      <span className={`text-sm font-bold ${tier.recommended ? '' : 'text-space-muted'}`}
                        style={tier.recommended ? { color: `rgba(var(--space-card), 0.5)` } : {}}>{tier.period}</span>
                    </div>
                    <ul className="space-y-2.5 mb-7">
                      {tier.features.map((f, i) => (
                        <li key={i} className={`flex items-start gap-2 text-sm font-medium ${tier.recommended ? '' : 'text-space-muted'}`}
                          style={tier.recommended ? { color: `rgba(var(--space-card), 0.75)` } : {}}>
                          <CheckCircle2 size={15} className={`mt-0.5 shrink-0 ${tier.recommended ? 'text-space-primary-light' : 'text-space-primary'}`} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link to="/signup"
                      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all duration-300 ${tier.recommended ? '' : 'border border-space-border text-space-text hover:border-space-primary hover:bg-space-bg'}`}
                      style={tier.recommended ? { background: `linear-gradient(to right, rgb(var(--space-primary-light)), rgb(var(--space-primary)))`, color: `rgb(var(--space-card))` } : {}}>
                      Empezar <ArrowRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── CTA FINAL ────────────────────────────────────────── */}
          <section className="relative py-28 px-4 overflow-hidden" style={{ background: `rgb(var(--space-text))` }}>
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(rgb(var(--space-primary-light)) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[600px] rounded-full blur-[130px]" style={{ background: `rgba(var(--space-primary), 0.1)` }} />
            <div className="max-w-2xl mx-auto text-center relative z-10">
              <div className="text-5xl mb-6">💈</div>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5 leading-tight" style={{ color: `rgb(var(--space-card))` }}>
                Tu barbería, trabajando<br />mientras tú descansas.
              </h2>
              <p className="font-semibold mb-10 text-base" style={{ color: `rgba(var(--space-card), 0.5)` }}>30 días gratis · Sin tarjeta · Sin compromisos</p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
                <Link to="/signup" className="btn-primary text-sm px-10 py-4 shadow-2xl shadow-space-primary/30">
                  Empezar Gratis <ArrowRight size={16} />
                </Link>
                <a href="#pricing" className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-sm font-extrabold uppercase tracking-widest transition-all"
                  style={{ border: `1px solid rgba(var(--space-card), 0.2)`, color: `rgba(var(--space-card), 0.65)` }}>
                  Ver precios
                </a>
              </div>
            </div>
          </section>

          {/* ── FOOTER ───────────────────────────────────────────── */}
          <footer className="border-t pt-14 pb-10 px-4" style={{ background: `rgb(var(--space-text))`, borderColor: `rgba(var(--space-card), 0.06)` }}>
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 pb-10 border-b" style={{ borderColor: `rgba(var(--space-card), 0.08)` }}>
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgb(var(--space-primary-light)), rgb(var(--space-primary)))' }}>
                      <img src="/logo.png" alt="Spacey" className="w-full h-full object-cover object-top scale-110" />
                    </div>
                    <span className="text-xl font-extrabold tracking-tight" style={{ color: `rgb(var(--space-card))` }}>Spacey</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed max-w-[240px]" style={{ color: `rgba(var(--space-card), 0.4)` }}>
                    El asistente inteligente de WhatsApp para barberías modernas.
                  </p>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest mt-4" style={{ color: `rgba(var(--space-primary-light), 0.5)` }}>
                    Hecho con ❤️ en Puerto Rico
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest mb-4" style={{ color: `rgba(var(--space-card), 0.25)` }}>Producto</p>
                  <ul className="space-y-2.5">
                    {[['Funciones', '#features'], ['Precios', '#pricing'], ['Cómo Funciona', '#how-it-works']].map(([l, h]) => (
                      <li key={l}><a href={h} className="text-sm transition-colors hover:text-space-primary-light" style={{ color: `rgba(var(--space-card), 0.5)` }}>{l}</a></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest mb-4" style={{ color: `rgba(var(--space-card), 0.25)` }}>Cuenta</p>
                  <ul className="space-y-2.5">
                    {[['Iniciar Sesión', '/login'], ['Crear Cuenta', '/signup'], ['Dashboard', '/dashboard']].map(([l, h]) => (
                      <li key={l}><Link to={h} className="text-sm transition-colors hover:text-space-primary-light" style={{ color: `rgba(var(--space-card), 0.5)` }}>{l}</Link></li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-xs" style={{ color: `rgba(var(--space-card), 0.25)` }}>© {new Date().getFullYear()} Spacey Platform · Todos los derechos reservados</p>
                <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: `rgba(var(--space-primary-light), 0.35)` }}>Spacey Reserve · Puerto Rico</p>
              </div>
            </div>
          </footer>
        </>
      ) : (
        /* ══════════════════════════════════════════════════════════
           APP HOME — para clientes registrados sin negocio
           ══════════════════════════════════════════════════════════ */
        <>
          <div className="relative min-h-[50vh] flex flex-col items-center justify-start overflow-hidden pt-32 pb-10">
            <div className="relative z-10 w-full max-w-7xl px-4">
              <div className="animate-slide-in flex flex-col items-start text-left mb-14">
                <button
                  onClick={handleGeoLocation}
                  className={`inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl text-[10px] font-extrabold uppercase tracking-widest mb-8 transition-all duration-500 ${sortByDistance ? 'bg-gradient-to-r from-space-primary to-space-primary-dark text-space-card shadow-xl shadow-space-primary/30' : 'bg-space-primary/8 text-space-primary hover:bg-space-primary/15'}`}
                >
                  <MapPin size={13} className={isLocating ? 'animate-bounce' : ''} />
                  {isLocating ? 'Ubicando...' : sortByDistance ? 'Cerca de ti: ACTIVADO' : '¿Usar mi ubicación?'}
                </button>
                <h1 className="hero-title text-6xl sm:text-7xl md:text-8xl lg:text-9xl mb-8 tracking-tight leading-[0.9]">
                  RESERVA TU <br />
                  <span className="bg-gradient-to-r from-space-primary-light to-space-primary bg-clip-text text-transparent">PRÓXIMO NIVEL</span>
                </h1>
                <p className="text-sm sm:text-lg text-space-muted font-bold uppercase tracking-[0.2em] max-w-2xl bg-space-card2/30 px-6 py-3 rounded-full">
                  Sin fricción. Sin esperas. Solo estilo.
                </p>
              </div>

              {/* One-Tap Rebooking */}
              {lastAppointment && (
                <div className="mb-14 animate-fade-in">
                  <div className="flex items-center gap-4 mb-5">
                    <h2 className="text-xs font-extrabold text-space-muted uppercase tracking-[0.4em]">¿Lo de siempre?</h2>
                    <span className="h-px flex-1 bg-space-border/40" />
                  </div>
                  <button
                    onClick={() => navigate(`/book/${(lastAppointment as any).business?.slug}`)}
                    className="w-full bg-space-card border-2 border-space-primary/20 p-6 rounded-[2.5rem] flex items-center justify-between hover:border-space-primary hover:shadow-2xl hover:shadow-space-primary/15 transition-all duration-500 group"
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-14 h-14 bg-gradient-to-br from-space-primary-light to-space-primary rounded-2xl flex items-center justify-center text-space-card font-extrabold text-2xl shadow-xl group-hover:scale-110 transition-all">
                        {(lastAppointment as any).business?.name?.[0].toUpperCase() || 'B'}
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-space-primary uppercase tracking-widest mb-1">Repetir última reserva</p>
                        <h3 className="text-xl font-extrabold text-space-text">{(lastAppointment as any).business?.name}</h3>
                        <p className="text-sm text-space-muted font-bold uppercase tracking-wider">{(lastAppointment as any).service_name}</p>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-space-primary font-extrabold text-sm uppercase tracking-widest">
                      Reservar ahora <ArrowRight size={18} />
                    </div>
                  </button>
                </div>
              )}

              {/* Gamification */}
              {showStats && !lastAppointment && (
                <div className="mb-14 animate-fade-in relative">
                  <div className="rounded-[2.5rem] p-8 sm:p-10 shadow-2xl overflow-hidden relative group" style={{ background: `rgb(var(--space-text))` }}>
                    <div className="absolute top-0 right-0 w-80 h-80 bg-space-primary/15 rounded-full blur-3xl -mr-40 -mt-40" />
                    <button onClick={() => setShowStats(false)} className="absolute top-5 right-5 hover:opacity-70 transition-opacity" style={{ color: `rgba(var(--space-card), 0.3)` }}><XCircle size={22} /></button>
                    <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
                      <div className="flex flex-col items-center sm:items-start">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] mb-3" style={{ color: `rgba(var(--space-card), 0.4)` }}>Tu Estado Actual</p>
                        <div className="flex items-center gap-3">
                          <div className="text-3xl font-extrabold italic tracking-tight" style={{ color: `rgb(var(--space-card))` }}>ESTILO AL 85%</div>
                          <div className="px-3 py-1 bg-gradient-to-r from-space-primary to-space-primary-light rounded-xl text-[9px] font-extrabold animate-pulse shadow-lg" style={{ color: `rgb(var(--space-card))` }}>LEVEL UP</div>
                        </div>
                      </div>
                      <div className="flex-1 w-full">
                        <div className="flex justify-between text-[10px] font-extrabold uppercase tracking-widest mb-2" style={{ color: `rgba(var(--space-card), 0.5)` }}>
                          <span>Frescura</span><span>Próxima cita: pronto</span>
                        </div>
                        <div className="w-full h-3 bg-space-card/8 rounded-full overflow-hidden">
                          <div className="w-[85%] h-full bg-gradient-to-r from-space-primary-light to-space-primary rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Energy Filters */}
              <div className="w-full relative mb-12">
                <h2 className="text-xs font-extrabold text-space-muted uppercase tracking-[0.4em] mb-6">¿En qué modo estás hoy?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {energyFilters.map((mood) => (
                    <button key={mood.id}
                      onClick={() => { setActiveMood(activeMood === mood.id ? null : mood.id); if (activeMood !== mood.id) document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' }); }}
                      className={`relative w-full rounded-[2.5rem] overflow-hidden p-6 flex flex-col items-start justify-between transition-all duration-500 hover:scale-[1.02] border-2 ${activeMood === mood.id ? 'border-space-primary shadow-2xl shadow-space-primary/15 bg-gradient-to-br from-space-card2 to-space-card ring-4 ring-space-primary/10' : 'border-space-border/60 bg-space-card shadow-sm hover:shadow-xl hover:border-space-primary/20'}`}
                    >
                      <div className="flex items-center justify-between w-full mb-4">
                        <span className="text-3xl">{mood.emoji}</span>
                        <div className={`w-9 h-9 rounded-xl ${mood.color} ${mood.border} border-2 flex items-center justify-center transition-all ${activeMood === mood.id ? 'scale-110 shadow-lg' : ''}`}>
                          <ArrowRight size={15} className={mood.text} />
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-space-muted mb-1">{mood.description}</p>
                        <h3 className="text-space-text text-lg font-extrabold tracking-tight">{mood.label}</h3>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Directory */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 relative z-20" id="directory">
            {customerAppointments.length > 0 && (
              <div className="mb-20 animate-fade-in">
                <div className="flex items-center gap-4 mb-7">
                  <div className="bg-gradient-to-br from-space-primary-light to-space-primary p-3 rounded-2xl shadow-xl shadow-space-primary/25"><Calendar size={20} className="text-space-card" /></div>
                  <h2 className="text-2xl font-extrabold text-space-text tracking-tight">Mis Próximas Citas</h2>
                </div>
                <div className="bg-space-card border-2 border-space-border/40 rounded-[2.5rem] shadow-2xl p-6 md:p-8">
                  {loadingApts ? <div className="py-10 flex justify-center"><LoadingSpinner /></div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {customerAppointments.map((apt: any) => (
                        <div key={apt.id} className="bg-space-bg rounded-[2rem] p-6 border-2 border-space-border/30 shadow-sm flex flex-col justify-between hover:border-space-primary/30 hover:shadow-xl transition-all duration-500">
                          <div className="mb-5">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <span className="text-[10px] font-extrabold text-space-text uppercase tracking-widest px-3 py-1 bg-space-card rounded-xl border border-space-border/40 shadow-sm truncate max-w-[140px]">{apt.business?.name}</span>
                              {apt.statusBadge === 'today' && <span className="badge-red">Hoy</span>}
                            </div>
                            <h4 className="font-extrabold text-base mb-4 text-space-text">{apt.service_name}</h4>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 text-sm text-space-muted font-bold"><Calendar size={14} className="text-space-primary" />{formatRelativeTime(apt.appointment_date, apt.start_time)}</div>
                              <div className="flex items-center gap-2 text-sm text-space-muted font-bold"><Clock size={14} className="text-space-primary" />{apt.start_time.slice(0, 5)}</div>
                            </div>
                          </div>
                          <button onClick={() => handleCancelApt(apt.id)} className="w-full mt-2 min-h-[44px] border-2 border-space-border/50 hover:border-space-danger hover:bg-space-danger text-space-danger rounded-2xl flex items-center justify-center font-extrabold text-xs uppercase tracking-widest transition-all duration-300 hover:text-space-card active:scale-95">
                            Cancelar Cita
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && <div className="bg-space-danger/5 border-2 border-space-danger/20 text-space-danger px-6 py-4 rounded-[2rem] mb-12 text-center font-bold text-sm">⚠️ {error}</div>}

            {loading ? (
              <div className="bg-space-card rounded-[3rem] p-16 shadow-2xl border-2 border-space-border/30 flex flex-col items-center justify-center min-h-[300px]">
                <LoadingSpinner />
                <p className="text-space-primary mt-6 uppercase tracking-widest text-xs font-extrabold animate-pulse">Cargando profesionales...</p>
              </div>
            ) : (
              <div className="space-y-16">
                {favoriteBusinesses.length > 0 && (
                  <section className="animate-fade-in">
                    <div className="flex items-center gap-4 mb-8 border-b-2 border-space-border/30 pb-4">
                      <span className="bg-gradient-to-br from-amber-400 to-amber-500 p-2.5 rounded-2xl shadow-xl"><Star size={20} className="text-space-card fill-space-card" /></span>
                      <h2 className="text-2xl font-extrabold text-space-text tracking-tight">Tus Favoritas</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {favoriteBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={true} />)}
                    </div>
                  </section>
                )}
                <section className="animate-fade-in">
                  <div className="flex items-center justify-between mb-8 border-b-2 border-space-border/30 pb-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-extrabold text-space-text tracking-tight">
                        {activeMood ? `${energyFilters.find(m => m.id === activeMood)?.label}` : 'Recomendadas'}
                      </h2>
                      <span className="bg-space-bg text-space-primary px-3 py-1 rounded-xl text-xs font-extrabold shadow-sm border border-space-border/40">{sortedBusinesses.length}</span>
                    </div>
                    {activeMood && <button onClick={() => setActiveMood(null)} className="text-[10px] font-extrabold uppercase tracking-widest text-space-danger hover:underline">Ver Todo</button>}
                  </div>
                  {sortedBusinesses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {sortedBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={favoriteSlugs.includes(b.slug)} />)}
                    </div>
                  ) : (
                    <div className="bg-space-card rounded-[3rem] p-16 text-center border-2 border-space-border/30 shadow-2xl">
                      <div className="w-20 h-20 bg-space-bg rounded-full flex items-center justify-center mx-auto mb-6"><Scissors size={32} className="text-space-muted/40" /></div>
                      <h3 className="text-xl font-extrabold text-space-text mb-2">Aún no hay barberías</h3>
                      <p className="text-space-muted font-semibold max-w-md mx-auto text-sm">Vuelve más tarde, estamos conectando a los mejores profesionales.</p>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>

          {/* App footer */}
          <footer className="mt-32 border-t-2 border-space-border/30 pt-12 pb-8 bg-space-card relative z-10 w-full">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-space-text to-space-primary-dark rounded-2xl flex items-center justify-center shadow-xl overflow-hidden">
                    <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top scale-110" />
                  </div>
                  <span className="text-3xl font-extrabold tracking-tight text-space-text">Spacey</span>
                </div>
                <div className="bg-space-bg p-5 rounded-[2rem] border-2 border-space-border/30 text-center">
                  <p className="text-space-text font-bold text-sm">© {new Date().getFullYear()} Spacey Platform</p>
                  <p className="text-space-primary text-[10px] mt-1 uppercase tracking-widest font-extrabold">Hecho con ❤️ en Puerto Rico</p>
                </div>
              </div>
            </div>
          </footer>
        </>
      )}

      {/* Business Details Modal */}
      {selectedBusinessDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setSelectedBusinessDetails(null)} />
          <div className="relative w-full max-w-3xl bg-space-card rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-space-border/20 animate-scale-in max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedBusinessDetails(null)} className="absolute top-4 right-4 z-50 w-11 h-11 bg-space-card/90 backdrop-blur-xl rounded-2xl border border-space-border/40 flex items-center justify-center text-space-text hover:shadow-xl transition-all min-w-[44px] min-h-[44px]">
              <X size={20} />
            </button>
            <div className="h-48 sm:h-60 bg-space-bg relative">
              <img src={selectedBusinessDetails.banner_url || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover" alt="Banner" />
              <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
              <div className="absolute bottom-6 left-8 flex items-end gap-5">
                <div className="w-20 h-20 rounded-[1.5rem] bg-space-card p-1 shadow-2xl border-2 border-space-card/30 overflow-hidden">
                  <img src={selectedBusinessDetails.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedBusinessDetails.name)}&background=1a2e28&color=fff`} className="w-full h-full object-cover rounded-xl" alt="Logo" />
                </div>
                <div className="mb-2">
                  <h2 className="text-3xl font-extrabold tracking-tight leading-none" style={{ color: '#fff' }}>{selectedBusinessDetails.name}</h2>
                  <div className="flex items-center text-[10px] font-extrabold uppercase tracking-widest mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    <MapPin size={11} className="mr-1.5 text-space-primary-light" />{selectedBusinessDetails.city || 'Ubicación no especificada'}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-7 sm:p-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                  <h4 className="text-[10px] font-extrabold text-space-muted uppercase tracking-[0.25em] mb-3">Sobre nosotros</h4>
                  <p className="text-sm text-space-text font-medium leading-relaxed">{selectedBusinessDetails.description || 'Esta barbería aún no ha añadido una descripción.'}</p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    {selectedBusinessDetails.instagram_url && (
                      <a href={selectedBusinessDetails.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-space-bg text-space-text hover:bg-space-primary/5 hover:text-space-primary transition-all border border-space-border/30 min-h-[44px]">
                        <Instagram size={16} /><span className="text-[10px] font-extrabold uppercase tracking-widest">Instagram</span>
                      </a>
                    )}
                    {selectedBusinessDetails.website_url && (
                      <a href={selectedBusinessDetails.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-space-bg text-space-text hover:bg-space-primary/5 hover:text-space-primary transition-all border border-space-border/30 min-h-[44px]">
                        <Globe size={16} /><span className="text-[10px] font-extrabold uppercase tracking-widest">Sitio Web</span>
                      </a>
                    )}
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="p-5 rounded-[2rem] bg-space-bg border-2 border-space-border/30">
                    <h4 className="text-[10px] font-extrabold text-space-muted uppercase tracking-[0.25em] mb-2">Ubicación</h4>
                    <p className="text-xs font-bold text-space-text mb-3 leading-snug">{selectedBusinessDetails.address || 'Consulta nuestra dirección al reservar.'}</p>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${selectedBusinessDetails.latitude},${selectedBusinessDetails.longitude}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-extrabold text-space-primary uppercase tracking-widest hover:underline flex items-center gap-1.5">
                      <Search size={12} />Ver en Google Maps
                    </a>
                  </div>
                  <Link to={`/book/${selectedBusinessDetails.slug}`} className="w-full flex btn-primary h-14 items-center justify-center gap-2.5 shadow-2xl active:scale-95 font-extrabold uppercase tracking-[0.15em] text-[10px]">
                    <Scissors size={18} />Reservar Ahora
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
