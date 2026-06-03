import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MapPin, Star, Scissors, Calendar, Clock, Heart, XCircle, LogOut,
  LayoutDashboard, ArrowRight, Info, Instagram, Globe, X, Search,
  Moon, Sun, Bell, Users, BarChart3, Zap, Shield, RefreshCw,
  CheckCircle2, MessageCircle, UserCheck, Award, Bot
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
    name: 'Básico',
    price: '$29',
    period: '/mes',
    icon: '🔵',
    accent: 'space-primary',
    features: [
      'Bot WhatsApp con keywords',
      'Recordatorios automáticos',
      'Página de reservas pública',
      'Dashboard básico',
    ],
  },
  {
    name: 'Pro',
    price: '$59',
    period: '/mes',
    icon: '🟣',
    accent: 'space-text',
    recommended: true,
    features: [
      'Todo lo básico +',
      'IA conversacional',
      'Reportes cada 2h al barbero',
      'Cola de espera inteligente',
      'Horario inteligente',
      'Clientes frecuentes reconocidos',
    ],
  },
  {
    name: 'Premium',
    price: '$99',
    period: '/mes',
    icon: '⭐',
    accent: 'space-yellow',
    features: [
      'Todo lo Pro +',
      'Agente proactivo anti-churn',
      'Reporte diario de ingresos',
      'Multi-barbero con reportes',
      'Cancelación predictiva',
      'Clientes VIP automáticos',
    ],
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

  // Scroll detection for nav
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (user && currentBusiness) {
      navigate('/dashboard');
    }
  }, [user, currentBusiness]);

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
    setLoading(true);
    setError(null);
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
    } catch (err: any) {
      setError('No pudimos cargar las barberías. Intenta recargar la página.');
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
      <button onClick={(e) => toggleFavorite(e, business.slug)} className="absolute top-5 right-5 z-20 w-10 h-10 flex items-center justify-center bg-white/90 backdrop-blur-xl rounded-2xl border border-space-border/40 hover:border-space-primary/30 hover:bg-white hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95">
        <Heart size={18} className={`transition-all duration-300 ${isFavorite ? 'fill-space-danger text-space-danger' : 'text-space-muted hover:text-space-danger'}`} />
      </button>
      <Link to={`/book/${business.slug}`} className="block h-52 bg-space-bg relative overflow-hidden group/banner p-3 pb-0">
        <div className="w-full h-full rounded-t-[2rem] overflow-hidden relative">
          <img src={business.banner_url || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800'} alt={business.name} className="w-full h-full object-cover group-hover/banner:scale-110 transition duration-700 ease-out" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent group-hover/banner:from-black/20 transition-all duration-500" />
        </div>
      </Link>
      <div className="absolute top-[11.5rem] left-6 z-10">
        <div className="w-[4.5rem] h-[4.5rem] rounded-[1.5rem] bg-white p-1.5 shadow-2xl border-2 border-space-border/30 overflow-hidden transform group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-500">
          <img src={business.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(business.name)}&background=1a2e28&color=fff`} className="w-full h-full object-cover rounded-xl" alt="Logo" />
        </div>
      </div>
      <div className="p-6 pt-14 flex-1 flex flex-col">
        <Link to={`/book/${business.slug}`} className="block group/title">
          <h3 className="text-xl font-extrabold leading-tight mb-1.5 text-space-text tracking-tight group-hover/title:text-space-primary transition-colors duration-300">{business.name}</h3>
          <div className="flex items-center text-[10px] text-space-muted font-bold uppercase tracking-[0.15em] mt-1 bg-space-card2/50 px-3 py-1 rounded-full inline-flex w-fit">
            <MapPin size={10} className="mr-1.5 text-space-primary" />{business.city || 'Ubicación no especificada'}
          </div>
        </Link>
        <p className="text-space-muted/80 text-sm my-5 line-clamp-2 flex-1 font-medium leading-relaxed">{business.description || 'Reserva tu cita con los mejores profesionales en Spacey.'}</p>
        <div className="mt-auto pt-5 border-t border-space-border/60 grid grid-cols-2 gap-3">
          <button onClick={() => setSelectedBusinessDetails(business)} className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-2 border-space-border/60 text-[10px] font-extrabold uppercase tracking-wider text-space-muted hover:bg-space-bg hover:text-space-text hover:border-space-primary/30 transition-all duration-300 active:scale-95">
            <Info size={15} />Detalles
          </button>
          <Link to={`/book/${business.slug}`} className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-br from-space-primary-light to-space-primary text-white text-[10px] font-extrabold uppercase tracking-wider shadow-lg shadow-space-primary/20 hover:shadow-xl hover:shadow-space-primary/30 hover:scale-105 active:scale-95 transition-all duration-300">
            <Scissors size={15} />Reservar
          </Link>
        </div>
      </div>
    </div>
  );

  const MoodCard = ({ mood }: { mood: typeof energyFilters[0] }) => (
    <button
      onClick={() => { setActiveMood(activeMood === mood.id ? null : mood.id); if (activeMood !== mood.id) document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' }); }}
      className={`relative flex-shrink-0 w-full sm:w-auto flex-1 min-w-[200px] rounded-[2.5rem] overflow-hidden p-7 flex flex-col items-start justify-between transition-all duration-500 hover:scale-[1.03] border-2 ${activeMood === mood.id ? 'border-space-primary shadow-2xl shadow-space-primary/15 bg-gradient-to-br from-space-card2 to-space-card ring-4 ring-space-primary/10' : 'border-space-border/60 bg-space-card shadow-sm hover:shadow-xl hover:border-space-primary/20'}`}
    >
      <div className="flex items-center justify-between w-full mb-5">
        <span className="text-4xl">{mood.emoji}</span>
        <div className={`w-10 h-10 rounded-2xl ${mood.color} ${mood.border} border-2 flex items-center justify-center transition-all duration-300 ${activeMood === mood.id ? 'scale-110 shadow-lg' : ''}`}>
          <ArrowRight size={16} className={mood.text} />
        </div>
      </div>
      <div className="text-left">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-space-muted mb-2">{mood.description}</p>
        <h3 className="text-space-text text-xl font-extrabold tracking-tight leading-tight">{mood.label}</h3>
      </div>
    </button>
  );

  // ─────────────────────────────────────────────────────────────────
  // SHARED NAV COMPONENT
  // ─────────────────────────────────────────────────────────────────
  const NavBar = () => (
    <nav className="fixed w-full z-50 top-4 px-4 sm:top-6">
      <div className="max-w-7xl mx-auto flex justify-center">
        <div className={`flex justify-between items-center w-full max-w-[95%] sm:max-w-none px-5 sm:px-6 h-16 sm:h-[4.5rem] rounded-full transition-all duration-500 ${isScrolled ? 'backdrop-blur-2xl bg-space-card/90 border-2 border-space-border/40 shadow-2xl' : 'backdrop-blur-xl bg-space-card/70 border-2 border-space-border/20 shadow-card'}`}>
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-space-primary-light to-space-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-space-primary/20 group-hover:scale-110 transition-all duration-500 overflow-hidden">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top scale-110" />
            </div>
            <span className="text-2xl sm:text-[1.6rem] font-extrabold tracking-tight text-space-text">Spacey</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 lg:gap-10">
            {!user ? (
              <>
                <a href="#features" className="text-[11px] font-extrabold uppercase tracking-widest text-space-muted hover:text-space-primary transition-all duration-300">Características</a>
                <a href="#pricing" className="text-[11px] font-extrabold uppercase tracking-widest text-space-muted hover:text-space-primary transition-all duration-300">Precios</a>
                <a href="#for-businesses" className="text-[11px] font-extrabold uppercase tracking-widest text-space-muted hover:text-space-primary transition-all duration-300">Para Negocios</a>
              </>
            ) : (
              <>
                <a href="#directory" className="text-[11px] font-extrabold uppercase tracking-widest text-space-muted hover:text-space-primary transition-all duration-300">Barberías</a>
                <Link to="/dashboard" className="text-[11px] font-extrabold uppercase tracking-widest text-space-muted hover:text-space-primary transition-all duration-300">Dashboard</Link>
              </>
            )}
          </div>

          {/* Auth + Theme */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={toggleTheme} className="p-2.5 rounded-2xl text-space-muted hover:text-space-primary hover:bg-space-card2/80 transition-all duration-300 hover:scale-110" aria-label="Toggle Theme">
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            {user ? (
              <div className="relative">
                <button onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)} className="flex items-center gap-2 p-1 rounded-full hover:bg-space-bg transition border-2 border-transparent hover:border-space-border">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-space-primary-light to-space-primary text-white rounded-2xl flex items-center justify-center font-extrabold text-sm border-2 border-space-primary/20 shadow-lg">
                    {user.email?.[0].toUpperCase()}
                  </div>
                </button>
                {isAccountMenuOpen && (
                  <div className="absolute right-0 mt-3 w-72 bg-white rounded-[2.5rem] shadow-2xl border-2 border-space-border/30 overflow-hidden py-1 z-50 animate-scale-in">
                    <div className="px-6 py-6 border-b-2 border-space-border/30 bg-space-bg flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-space-muted font-extrabold uppercase tracking-widest">Cuenta</p>
                        <p className="text-xs font-bold text-space-text truncate mt-1 max-w-[160px]">{user.email}</p>
                      </div>
                      <button onClick={() => setIsAccountMenuOpen(false)} className="p-2 text-space-muted hover:text-space-text transition-colors"><XCircle size={18} /></button>
                    </div>
                    <div className="p-3 space-y-1.5">
                      <Link to="/dashboard" className="flex items-center gap-3.5 px-5 py-4 text-sm font-bold text-space-text hover:text-space-primary hover:bg-space-primary/5 rounded-2xl transition-all duration-300" onClick={() => setIsAccountMenuOpen(false)}>
                        <LayoutDashboard size={22} className="text-space-primary" /><span>Ir al Dashboard</span>
                      </Link>
                      <button onClick={handleLogout} className="w-full flex items-center gap-3.5 px-5 py-4 text-sm font-bold text-space-danger hover:bg-space-danger/5 rounded-2xl transition-all duration-300">
                        <LogOut size={22} /><span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link to="/login" className="text-[10px] sm:text-[11px] font-extrabold text-space-text hover:text-space-primary transition-all duration-300 px-5 py-2.5 rounded-full border-2 border-space-border hover:border-space-primary uppercase tracking-widest">
                  Iniciar Sesión
                </Link>
                <Link to="/signup" className="hidden sm:inline-flex btn-primary py-2.5 px-6 text-[10px] uppercase tracking-widest shadow-xl shadow-space-primary/25">
                  Empezar Gratis
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

      {/* ── Background Orbs ─────────────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -right-[5%] w-[55vw] h-[55vw] rounded-full bg-space-primary-light/8 blur-[120px] animate-pulse-subtle" />
        <div className="absolute top-[50%] -left-[5%] w-[45vw] h-[45vw] rounded-full bg-space-card2/30 blur-[130px]" />
        <div className="absolute -bottom-[15%] right-[15%] w-[55vw] h-[55vw] rounded-full bg-space-primary/5 blur-[110px]" />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(#22321c 1.2px, transparent 1.2px)', backgroundSize: '28px 28px' }} />
      </div>

      <NavBar />

      {/* ═══════════════════════════════════════════════════════════
          MARKETING LANDING PAGE — solo para usuarios no logueados
          ═══════════════════════════════════════════════════════════ */}
      {!user ? (
        <>
          {/* ── HERO ─────────────────────────────────────────────── */}
          <section className="relative min-h-screen flex items-center pt-28 pb-20 px-4">
            <div className="max-w-7xl mx-auto w-full">
              <div className="grid lg:grid-cols-2 gap-16 items-center">

                {/* Left: Copy */}
                <div className="animate-fade-in">
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-space-primary/10 border border-space-primary/20 mb-8">
                    <span className="w-2 h-2 rounded-full bg-space-success animate-pulse shadow-[0_0_8px_rgba(61,153,112,0.6)]" />
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-space-primary">Bot activo 24/7 · WhatsApp</span>
                  </div>

                  <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[0.93] text-space-text mb-8">
                    El asistente<br />
                    inteligente que<br />
                    <span className="bg-gradient-to-r from-space-primary-light to-space-primary bg-clip-text text-transparent">nunca duerme 💈</span>
                  </h1>

                  <p className="text-base sm:text-lg text-space-muted font-semibold leading-relaxed max-w-lg mb-10">
                    Tu barbería atendiendo clientes por WhatsApp 24/7, haciendo citas sola mientras tú trabajas.
                  </p>

                  <div className="flex flex-wrap gap-4">
                    <Link to="/signup" className="btn-primary text-sm px-8 py-4 shadow-2xl shadow-space-primary/30">
                      Prueba Gratis 30 días
                      <ArrowRight size={16} />
                    </Link>
                    <a href="#how-it-works" className="btn-secondary text-sm px-8 py-4">
                      Ver Demo
                    </a>
                  </div>

                  {/* Trust signals */}
                  <div className="mt-12 flex items-center gap-6">
                    <div className="flex -space-x-3">
                      {['A','C','M','R'].map((l, i) => (
                        <div key={i} className="w-10 h-10 rounded-2xl bg-gradient-to-br from-space-primary-light to-space-primary border-2 border-white flex items-center justify-center text-white font-extrabold text-xs shadow-md">{l}</div>
                      ))}
                    </div>
                    <div>
                      <p className="text-space-text font-extrabold text-sm">+120 barberías activas</p>
                      <p className="text-space-muted text-xs font-bold uppercase tracking-wider">en Puerto Rico y Rep. Dom.</p>
                    </div>
                  </div>
                </div>

                {/* Right: WhatsApp mockup */}
                <div className="flex justify-center lg:justify-end animate-fade-in relative">
                  {/* Floating badges */}
                  <div className="absolute -top-4 -left-4 sm:-left-8 bg-white border-2 border-space-border/40 rounded-2xl px-4 py-3 shadow-2xl animate-float z-10 hidden sm:flex items-center gap-3">
                    <div className="w-8 h-8 bg-space-success/15 rounded-xl flex items-center justify-center">
                      <CheckCircle2 size={16} className="text-space-success" />
                    </div>
                    <div>
                      <p className="text-[9px] text-space-muted font-bold uppercase tracking-wider">Confirmada</p>
                      <p className="text-xs font-extrabold text-space-text">Cita · 10:00 AM</p>
                    </div>
                  </div>

                  <div className="absolute -bottom-4 -right-4 sm:-right-8 bg-white border-2 border-space-border/40 rounded-2xl px-4 py-3 shadow-2xl animate-float-slow z-10 hidden sm:flex items-center gap-3">
                    <div className="w-8 h-8 bg-space-primary/15 rounded-xl flex items-center justify-center">
                      <BarChart3 size={16} className="text-space-primary" />
                    </div>
                    <div>
                      <p className="text-[9px] text-space-muted font-bold uppercase tracking-wider">Hoy</p>
                      <p className="text-xs font-extrabold text-space-text">12 citas · $360</p>
                    </div>
                  </div>

                  {/* Phone frame */}
                  <div className="relative w-[300px] sm:w-[320px]">
                    <div className="bg-space-text rounded-[3rem] p-3 shadow-[0_40px_80px_-20px_rgba(34,50,28,0.5)] ring-4 ring-space-text/10">
                      {/* Notch */}
                      <div className="flex justify-center mb-2">
                        <div className="w-24 h-6 bg-space-text rounded-full flex items-center justify-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-space-card/20" />
                          <div className="w-8 h-1.5 rounded-full bg-space-card/20" />
                        </div>
                      </div>
                      {/* Screen */}
                      <div className="rounded-[2rem] overflow-hidden bg-[#ECE5DD]">
                        {/* WA Header */}
                        <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-space-primary-light flex items-center justify-center text-white font-extrabold text-sm shadow-inner">A</div>
                          <div className="flex-1">
                            <p className="text-white font-extrabold text-sm leading-none">Annlo Barber</p>
                            <p className="text-white/60 text-[10px] font-medium mt-0.5">en línea</p>
                          </div>
                          <MessageCircle size={18} className="text-white/60" />
                        </div>

                        {/* Chat area */}
                        <div className="p-3 min-h-[340px] flex flex-col gap-2.5 overflow-hidden">
                          {CHAT_MESSAGES.map((msg, i) => (
                            <div
                              key={i}
                              className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'} transition-all duration-500 ${i < chatVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}
                            >
                              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[11px] font-medium leading-snug whitespace-pre-line shadow-sm ${msg.from === 'user' ? 'bg-[#DCF8C6] text-gray-800 rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm'}`}>
                                {msg.text}
                                <span className={`block text-right text-[9px] mt-1 ${msg.from === 'user' ? 'text-green-600' : 'text-gray-400'}`}>
                                  {MSG_TIMES[i]} {msg.from === 'user' && '✓✓'}
                                </span>
                              </div>
                            </div>
                          ))}
                          {/* Typing indicator */}
                          {chatVisible < CHAT_MESSAGES.length && chatVisible > 0 && CHAT_MESSAGES[chatVisible]?.from === 'bot' && (
                            <div className="flex justify-start animate-fade-in">
                              <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
                                <div className="flex gap-1 items-center h-4">
                                  {[0, 150, 300].map(d => (
                                    <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Input bar */}
                        <div className="bg-[#F0F0F0] px-3 py-2.5 flex items-center gap-2">
                          <div className="flex-1 bg-white rounded-full px-4 py-2 text-gray-400 text-[11px] font-medium">Mensaje</div>
                          <div className="w-9 h-9 bg-[#25D366] rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                            <MessageCircle size={16} className="text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── PARA CLIENTES ──────────────────────────────────────── */}
          <section className="relative py-28 px-4 bg-space-text overflow-hidden">
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(#a5cc90 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-space-primary/10 rounded-full blur-[100px]" />

            <div className="max-w-6xl mx-auto relative z-10">
              <div className="text-center mb-16">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.35em] text-space-primary-light mb-4">Para clientes</p>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                  Reserva como prefieras.<br />
                  <span className="text-space-primary-light">Sin fricciones.</span>
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Card Invitado */}
                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/8 hover:border-space-primary-light/30 transition-all duration-500 group">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-2xl border border-white/10">👤</div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/40 mb-0.5">Opción 1</p>
                      <h3 className="text-xl font-extrabold text-white">Reserva sin crear cuenta</h3>
                    </div>
                  </div>
                  <ul className="space-y-3.5 mb-8">
                    {[
                      'Haz tu cita por WhatsApp en 2 minutos',
                      'Recibe confirmación instantánea',
                      'Cancela o reagenda con un link',
                      'No necesitas recordar contraseñas',
                    ].map((f, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-white/70 font-medium">
                        <CheckCircle2 size={16} className="text-space-primary-light mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a href="https://spaceyreserve.netlify.app/book/annlobarberia" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl border-2 border-white/20 text-white text-xs font-extrabold uppercase tracking-widest hover:border-space-primary-light hover:bg-space-primary-light/10 transition-all duration-300 group-hover:gap-3">
                    Reservar ahora <ArrowRight size={14} />
                  </a>
                </div>

                {/* Card Registrado */}
                <div className="bg-gradient-to-br from-space-primary/20 to-space-primary-dark/20 border border-space-primary-light/30 rounded-[2.5rem] p-8 hover:from-space-primary/25 hover:to-space-primary-dark/25 transition-all duration-500 group relative overflow-hidden">
                  <div className="absolute top-5 right-5 px-3 py-1.5 bg-space-primary rounded-full text-[9px] font-extrabold uppercase tracking-widest text-white">Recomendado ⭐</div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-space-primary/30 flex items-center justify-center text-2xl border border-space-primary-light/30">⭐</div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-space-primary-light mb-0.5">Opción 2</p>
                      <h3 className="text-xl font-extrabold text-white">Crea tu cuenta gratis</h3>
                    </div>
                  </div>
                  <ul className="space-y-3.5 mb-8">
                    {[
                      'Todo lo del invitado +',
                      'Historial completo de tus visitas',
                      'Cancela/reagenda desde la web',
                      'Ofertas exclusivas para ti',
                      'Acumula visitas y sé VIP',
                      'Tu barbero favorito guardado',
                    ].map((f, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-white font-medium">
                        <CheckCircle2 size={16} className="text-space-primary-light mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/signup" className="inline-flex items-center gap-2 btn-primary shadow-2xl shadow-space-primary/40 group-hover:gap-3">
                    Crear cuenta gratis <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ── PARA NEGOCIOS / PRICING ────────────────────────────── */}
          <section id="pricing" className="relative py-28 px-4 bg-space-bg">
            <div className="max-w-6xl mx-auto" id="for-businesses">
              <div className="text-center mb-16">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.35em] text-space-primary mb-4">Para negocios</p>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-space-text tracking-tight mb-5">
                  El plan perfecto para<br />tu barbería
                </h2>
                <p className="text-space-muted font-semibold max-w-md mx-auto">Sin contratos. Sin sorpresas. Cancela cuando quieras.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 items-start">
                {PRICING.map((tier) => (
                  <div
                    key={tier.name}
                    className={`relative rounded-[2.5rem] p-8 transition-all duration-500 ${tier.recommended
                      ? 'bg-space-text text-white shadow-[0_30px_60px_-15px_rgba(34,50,28,0.5)] -translate-y-4 border-2 border-space-text'
                      : 'bg-white border-2 border-space-border/60 hover:border-space-primary/30 hover:-translate-y-2 hover:shadow-xl'
                    }`}
                  >
                    {tier.recommended && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-2 bg-gradient-to-r from-space-primary-light to-space-primary rounded-full text-[10px] font-extrabold uppercase tracking-widest text-white shadow-lg shadow-space-primary/30 whitespace-nowrap">
                        ⭐ Recomendado
                      </div>
                    )}

                    <div className="text-3xl mb-4">{tier.icon}</div>
                    <h3 className={`text-xl font-extrabold mb-1 ${tier.recommended ? 'text-white' : 'text-space-text'}`}>{tier.name}</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className={`text-5xl font-extrabold tracking-tight ${tier.recommended ? 'text-white' : 'text-space-text'}`}>{tier.price}</span>
                      <span className={`text-sm font-bold ${tier.recommended ? 'text-white/50' : 'text-space-muted'}`}>{tier.period}</span>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {tier.features.map((f, i) => (
                        <li key={i} className={`flex items-start gap-2.5 text-sm font-medium ${tier.recommended ? 'text-white/80' : 'text-space-muted'}`}>
                          <CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${tier.recommended ? 'text-space-primary-light' : 'text-space-primary'}`} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Link
                      to="/signup"
                      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-extrabold uppercase tracking-widest transition-all duration-300 ${tier.recommended
                        ? 'bg-gradient-to-r from-space-primary-light to-space-primary text-white shadow-lg shadow-space-primary/30 hover:shadow-xl hover:shadow-space-primary/40 hover:-translate-y-0.5'
                        : 'border-2 border-space-border text-space-text hover:border-space-primary hover:bg-space-bg hover:text-space-primary'
                      }`}
                    >
                      Empezar <ArrowRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── CÓMO FUNCIONA ─────────────────────────────────────── */}
          <section id="how-it-works" className="relative py-28 px-4 bg-white overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-space-bg/40 to-transparent pointer-events-none" />
            <div className="max-w-5xl mx-auto relative z-10">
              <div className="text-center mb-20">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.35em] text-space-primary mb-4">El proceso</p>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-space-text tracking-tight">
                  Funciona así de simple
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-8 relative">
                {/* Connector line */}
                <div className="hidden md:block absolute top-[2.5rem] left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-0.5 bg-gradient-to-r from-space-primary-light via-space-primary to-space-primary-light" />

                {STEPS.map((step, i) => (
                  <div key={i} className="flex flex-col items-center text-center group">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 bg-white border-2 border-space-border rounded-[1.75rem] flex items-center justify-center text-4xl shadow-xl group-hover:shadow-2xl group-hover:border-space-primary/30 group-hover:-translate-y-2 transition-all duration-500 relative z-10">
                        {step.emoji}
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 bg-space-primary rounded-full flex items-center justify-center text-white text-[10px] font-extrabold border-2 border-white shadow-md z-20">
                        {i + 1}
                      </div>
                    </div>
                    <h3 className="text-base font-extrabold text-space-text mb-3 leading-tight">{step.title}</h3>
                    <p className="text-sm text-space-muted font-medium leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── FEATURES ──────────────────────────────────────────── */}
          <section id="features" className="relative py-28 px-4 bg-space-bg">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.35em] text-space-primary mb-4">Funcionalidades</p>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-space-text tracking-tight">
                  Todo lo que necesitas.<br />
                  <span className="bg-gradient-to-r from-space-primary-light to-space-primary bg-clip-text text-transparent">Ya incluido.</span>
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {FEATURES.map((feat, i) => (
                  <div
                    key={i}
                    className="bg-white border-2 border-space-border/60 rounded-[2rem] p-6 hover:border-space-primary/30 hover:-translate-y-2 hover:shadow-xl hover:shadow-space-primary/10 transition-all duration-500 group"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="w-12 h-12 bg-space-primary/10 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-space-primary group-hover:scale-110 transition-all duration-500">
                      <feat.icon size={22} className="text-space-primary group-hover:text-white transition-colors duration-500" />
                    </div>
                    <h4 className="text-sm font-extrabold text-space-text mb-2 leading-snug">{feat.label}</h4>
                    <p className="text-[11px] text-space-muted font-medium leading-relaxed">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── CTA FINAL ─────────────────────────────────────────── */}
          <section className="relative py-28 px-4 bg-space-text overflow-hidden">
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(#a5cc90 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-space-primary/10 rounded-full blur-[120px]" />
            <div className="max-w-3xl mx-auto text-center relative z-10">
              <div className="text-6xl mb-8">💈</div>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-6 leading-tight">
                Tu barbería, trabajando<br />mientras tú descansas
              </h2>
              <p className="text-white/60 font-semibold mb-10 text-lg">30 días gratis. Sin tarjeta de crédito. Sin compromisos.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/signup" className="btn-primary text-sm px-10 py-4 shadow-2xl shadow-space-primary/40">
                  Empezar Gratis Ahora <ArrowRight size={16} />
                </Link>
                <a href="#pricing" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-white/20 text-white text-sm font-extrabold uppercase tracking-widest hover:border-space-primary-light hover:bg-space-primary-light/10 transition-all duration-300">
                  Ver precios
                </a>
              </div>
            </div>
          </section>

          {/* ── FOOTER ────────────────────────────────────────────── */}
          <footer className="bg-space-text border-t border-white/5 pt-16 pb-10 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
                {/* Brand */}
                <div className="md:col-span-2">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 bg-gradient-to-br from-space-primary-light to-space-primary rounded-2xl flex items-center justify-center overflow-hidden">
                      <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top scale-110" />
                    </div>
                    <span className="text-2xl font-extrabold text-white tracking-tight">Spacey</span>
                  </div>
                  <p className="text-white/50 font-medium text-sm leading-relaxed max-w-xs">El asistente inteligente de WhatsApp para barberías modernas.</p>
                  <p className="text-space-primary-light/70 text-[11px] font-bold uppercase tracking-widest mt-5">Hecho con ❤️ en Puerto Rico</p>
                </div>

                {/* Links */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/30 mb-4">Producto</p>
                  <ul className="space-y-3">
                    {[['Características', '#features'], ['Precios', '#pricing'], ['Para Negocios', '#for-businesses'], ['Cómo Funciona', '#how-it-works']].map(([label, href]) => (
                      <li key={label}><a href={href} className="text-white/60 text-sm font-medium hover:text-space-primary-light transition-colors duration-300">{label}</a></li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/30 mb-4">Cuenta</p>
                  <ul className="space-y-3">
                    {[['Iniciar Sesión', '/login'], ['Crear Cuenta', '/signup'], ['Dashboard', '/dashboard']].map(([label, href]) => (
                      <li key={label}><Link to={href} className="text-white/60 text-sm font-medium hover:text-space-primary-light transition-colors duration-300">{label}</Link></li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-white/30 text-xs font-medium">© {new Date().getFullYear()} Spacey Platform · Todos los derechos reservados</p>
                <p className="text-space-primary-light/50 text-[10px] font-extrabold uppercase tracking-widest">Spacey Reserve · Puerto Rico</p>
              </div>
            </div>
          </footer>
        </>
      ) : (
        /* ═══════════════════════════════════════════════════════════
           APP HOME — para usuarios logueados (funcionalidad existente)
           ═══════════════════════════════════════════════════════════ */
        <>
          <div className="relative min-h-[90vh] flex flex-col items-center justify-start overflow-hidden pt-40 pb-16">
            <div className="relative z-10 w-full max-w-7xl px-4">
              <div className="animate-slide-in flex flex-col items-start text-left mb-16">
                <button
                  onClick={handleGeoLocation}
                  className={`inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl text-[10px] font-extrabold uppercase tracking-widest mb-8 transition-all duration-500 ${sortByDistance ? 'bg-gradient-to-r from-space-primary to-space-primary-dark text-white shadow-xl shadow-space-primary/30' : 'bg-space-primary/8 text-space-primary hover:bg-space-primary/15 hover:shadow-lg'}`}
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
                <div className="mb-16 animate-fade-in">
                  <div className="flex items-center gap-4 mb-5">
                    <h2 className="text-xs font-extrabold text-space-muted uppercase tracking-[0.4em]">¿Lo de siempre?</h2>
                    <span className="h-px flex-1 bg-space-border/40" />
                  </div>
                  <button
                    onClick={() => navigate(`/book/${(lastAppointment as any).business?.slug}`)}
                    className="w-full bg-white border-2 border-space-primary/20 p-7 rounded-[2.5rem] flex items-center justify-between hover:border-space-primary hover:shadow-2xl hover:shadow-space-primary/15 transition-all duration-500 group"
                  >
                    <div className="flex items-center gap-5 text-left">
                      <div className="w-[4.5rem] h-[4.5rem] bg-gradient-to-br from-space-primary-light to-space-primary rounded-2xl flex items-center justify-center text-white font-extrabold text-3xl shadow-2xl group-hover:scale-110 transition-all duration-500">
                        {(lastAppointment as any).business?.name?.[0].toUpperCase() || 'B'}
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-space-primary uppercase tracking-widest mb-1.5">Repetir última reserva</p>
                        <h3 className="text-2xl font-extrabold text-space-text leading-tight">{(lastAppointment as any).business?.name}</h3>
                        <p className="text-sm text-space-muted font-bold uppercase tracking-wider">{(lastAppointment as any).service_name}</p>
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-2">
                      <div className="flex items-center gap-3 text-space-primary font-extrabold text-sm uppercase tracking-widest">
                        Reservar ahora <ArrowRight size={20} />
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Gamification */}
              {showStats && !lastAppointment && (
                <div className="mb-16 animate-fade-in relative">
                  <div className="bg-space-text text-white rounded-[2.5rem] p-8 sm:p-10 shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-space-primary/15 rounded-full blur-3xl -mr-40 -mt-40" />
                    <button onClick={() => setShowStats(false)} className="absolute top-5 right-5 text-white/30 hover:text-white transition-colors"><XCircle size={22} /></button>
                    <div className="flex flex-col sm:flex-row items-center gap-10 relative z-10">
                      <div className="flex flex-col items-center sm:items-start">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-white/40 mb-3">Tu Estado Actual</p>
                        <div className="flex items-center gap-4">
                          <div className="text-4xl font-extrabold italic tracking-tight">ESTILO AL 85%</div>
                          <div className="px-4 py-1.5 bg-gradient-to-r from-space-primary to-space-primary-light rounded-xl text-[10px] font-extrabold animate-pulse shadow-lg">LEVEL UP</div>
                        </div>
                      </div>
                      <div className="h-px sm:h-14 w-full sm:w-px bg-white/8" />
                      <div className="flex-1 w-full">
                        <div className="flex justify-between text-[10px] font-extrabold uppercase tracking-widest mb-3">
                          <span>Progreso de Frescura</span>
                          <span>Próxima cita: pronto</span>
                        </div>
                        <div className="w-full h-3.5 bg-white/8 rounded-full overflow-hidden">
                          <div className="w-[85%] h-full bg-gradient-to-r from-space-primary-light to-space-primary shadow-[0_0_20px_rgba(123,160,108,0.5)] rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Energy Filters */}
              <div className="w-full relative mb-14">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xs font-extrabold text-space-muted uppercase tracking-[0.4em]">¿En qué modo estás hoy?</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {energyFilters.map((mood) => <MoodCard key={mood.id} mood={mood} />)}
                </div>
              </div>
            </div>
          </div>

          {/* Directory */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-20" id="directory">
            {customerAppointments.length > 0 && (
              <div className="mb-24 animate-fade-in">
                <div className="flex items-center gap-4 mb-8 px-2">
                  <div className="bg-gradient-to-br from-space-primary-light to-space-primary p-3 rounded-2xl shadow-xl shadow-space-primary/25"><Calendar size={22} className="text-white" /></div>
                  <h2 className="text-3xl font-extrabold text-space-text tracking-tight">Mis Próximas Citas</h2>
                </div>
                <div className="bg-white border-2 border-space-border/40 rounded-[2.5rem] shadow-2xl p-8 md:p-10">
                  {loadingApts ? <div className="py-12 flex justify-center"><LoadingSpinner /></div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                      {customerAppointments.map((apt: any) => (
                        <div key={apt.id} className="bg-space-bg rounded-[2rem] p-7 border-2 border-space-border/30 shadow-sm flex flex-col justify-between hover:border-space-primary/30 hover:shadow-xl transition-all duration-500">
                          <div className="mb-5">
                            <div className="flex items-center gap-2.5 mb-4">
                              <span className="text-[10px] font-extrabold text-space-text uppercase tracking-widest px-4 py-1.5 bg-white rounded-xl border-2 border-space-border/40 shadow-sm truncate max-w-[150px]">{apt.business?.name}</span>
                              {apt.statusBadge === 'today' && <span className="text-[10px] font-extrabold text-white uppercase tracking-widest px-4 py-1.5 bg-space-danger rounded-xl shadow-lg">Hoy</span>}
                            </div>
                            <h4 className="font-extrabold text-lg mb-5 text-space-text leading-tight">{apt.service_name}</h4>
                            <div className="flex flex-col gap-2.5">
                              <div className="flex items-center gap-2.5 text-sm text-space-muted font-bold"><Calendar size={15} className="text-space-primary" />{formatRelativeTime(apt.appointment_date, apt.start_time)}</div>
                              <div className="flex items-center gap-2.5 text-sm text-space-muted font-bold"><Clock size={15} className="text-space-primary" />{apt.start_time.slice(0, 5)}</div>
                            </div>
                          </div>
                          <button onClick={() => handleCancelApt(apt.id)} className="w-full mt-3 h-11 border-2 border-space-border/50 hover:border-space-danger hover:bg-space-danger text-space-danger rounded-2xl flex items-center justify-center font-extrabold text-xs uppercase tracking-widest transition-all duration-300 hover:text-white active:scale-95">
                            Cancelar Cita
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && <div className="bg-space-danger/5 border-2 border-space-danger/20 text-space-danger px-8 py-5 rounded-[2rem] mb-14 text-center font-bold text-sm">⚠️ {error}</div>}

            {loading ? (
              <div className="bg-white rounded-[3rem] p-20 shadow-2xl border-2 border-space-border/30 flex flex-col items-center justify-center min-h-[400px]">
                <LoadingSpinner />
                <p className="text-space-primary mt-8 uppercase tracking-widest text-xs font-extrabold animate-pulse">Cargando profesionales...</p>
              </div>
            ) : (
              <div className="space-y-20">
                {favoriteBusinesses.length > 0 && (
                  <section className="animate-fade-in">
                    <div className="flex items-center justify-between mb-10 px-2 border-b-2 border-space-border/30 pb-5">
                      <div className="flex items-center gap-4">
                        <span className="bg-gradient-to-br from-amber-400 to-amber-500 p-3 rounded-2xl shadow-xl"><Star size={22} className="text-white fill-white" /></span>
                        <h2 className="text-3xl font-extrabold text-space-text tracking-tight">Tus Favoritas</h2>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
                      {favoriteBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={true} />)}
                    </div>
                  </section>
                )}
                <section className="animate-fade-in delay-100">
                  <div className="flex items-center justify-between mb-10 px-2 border-b-2 border-space-border/30 pb-5">
                    <div className="flex items-center gap-4">
                      <h2 className="text-3xl font-extrabold text-space-text tracking-tight">
                        {activeMood ? `Resultados: ${energyFilters.find(m => m.id === activeMood)?.label}` : 'Recomendadas'}
                      </h2>
                      <span className="bg-space-bg text-space-primary px-4 py-1.5 rounded-2xl text-xs font-extrabold uppercase shadow-sm border-2 border-space-border/40">{sortedBusinesses.length}</span>
                    </div>
                    {activeMood && <button onClick={() => setActiveMood(null)} className="text-[10px] font-extrabold uppercase tracking-widest text-space-danger hover:underline">Ver Todo</button>}
                  </div>
                  {sortedBusinesses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
                      {sortedBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={favoriteSlugs.includes(b.slug)} />)}
                    </div>
                  ) : (
                    <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-space-border/30 shadow-2xl">
                      <div className="w-24 h-24 bg-space-bg rounded-full flex items-center justify-center mx-auto mb-8"><Scissors size={36} className="text-space-muted/40" /></div>
                      <h3 className="text-2xl font-extrabold text-space-text mb-3">Aún no hay barberías</h3>
                      <p className="text-space-muted font-semibold max-w-md mx-auto">Vuelve más tarde, estamos conectando a los mejores profesionales.</p>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>

          {/* Footer app */}
          <footer className="mt-40 border-t-2 border-space-border/30 pt-16 pb-10 bg-white relative z-10 w-full">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-space-text to-space-primary-dark rounded-2xl flex items-center justify-center text-white shadow-2xl overflow-hidden">
                    <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top scale-110" />
                  </div>
                  <span className="text-4xl font-extrabold tracking-tight text-space-text">Spacey</span>
                </div>
                <div className="text-center md:text-right bg-space-bg p-6 rounded-[2.5rem] border-2 border-space-border/30">
                  <p className="text-space-text font-bold">© {new Date().getFullYear()} Spacey Platform</p>
                  <p className="text-space-primary text-[10px] mt-1.5 uppercase tracking-widest font-extrabold">Hecho con ❤️ en Puerto Rico</p>
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
          <div className="relative w-full max-w-3xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-space-border/20 animate-scale-in">
            <button onClick={() => setSelectedBusinessDetails(null)} className="absolute top-5 right-5 z-50 w-11 h-11 bg-white/90 backdrop-blur-xl rounded-2xl border-2 border-space-border/40 flex items-center justify-center text-space-text hover:bg-white hover:shadow-xl transition-all duration-300">
              <X size={22} />
            </button>
            <div className="h-56 sm:h-72 bg-space-bg relative">
              <img src={selectedBusinessDetails.banner_url || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover" alt="Banner" />
              <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
              <div className="absolute bottom-8 left-10 flex items-end gap-7">
                <div className="w-28 h-28 rounded-[2rem] bg-white p-1.5 shadow-2xl border-2 border-white/30 overflow-hidden">
                  <img src={selectedBusinessDetails.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedBusinessDetails.name)}&background=1a2e28&color=fff`} className="w-full h-full object-cover rounded-[1.7rem]" alt="Logo" />
                </div>
                <div className="mb-3">
                  <h2 className="text-4xl font-extrabold text-white tracking-tight leading-none">{selectedBusinessDetails.name}</h2>
                  <div className="flex items-center text-[11px] text-white/70 font-extrabold uppercase tracking-widest mt-3">
                    <MapPin size={12} className="mr-2 text-space-primary-light" />{selectedBusinessDetails.city || 'Ubicación no especificada'}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-10 pt-14">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="md:col-span-2">
                  <h4 className="text-[10px] font-extrabold text-space-muted uppercase tracking-[0.25em] mb-4">Sobre nosotros</h4>
                  <p className="text-sm text-space-text font-medium leading-relaxed">{selectedBusinessDetails.description || 'Esta barbería aún no ha añadido una descripción.'}</p>
                  <div className="mt-10 flex flex-wrap gap-4">
                    {selectedBusinessDetails.instagram_url && (
                      <a href={selectedBusinessDetails.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-space-bg text-space-text hover:bg-space-primary/5 hover:text-space-primary transition-all duration-300 border-2 border-space-border/30 group shadow-sm">
                        <Instagram size={18} className="group-hover:scale-110 transition-transform" /><span className="text-[10px] font-extrabold uppercase tracking-widest">Instagram</span>
                      </a>
                    )}
                    {selectedBusinessDetails.website_url && (
                      <a href={selectedBusinessDetails.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-space-bg text-space-text hover:bg-space-primary/5 hover:text-space-primary transition-all duration-300 border-2 border-space-border/30 group shadow-sm">
                        <Globe size={18} className="group-hover:scale-110 transition-transform" /><span className="text-[10px] font-extrabold uppercase tracking-widest">Sitio Web</span>
                      </a>
                    )}
                  </div>
                </div>
                <div className="space-y-7">
                  <div className="p-6 rounded-[2rem] bg-space-bg border-2 border-space-border/30">
                    <h4 className="text-[10px] font-extrabold text-space-muted uppercase tracking-[0.25em] mb-3">Ubicación</h4>
                    <p className="text-xs font-bold text-space-text mb-4 leading-snug">{selectedBusinessDetails.address || 'Consulta nuestra dirección al reservar.'}</p>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${selectedBusinessDetails.latitude},${selectedBusinessDetails.longitude}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-extrabold text-space-primary uppercase tracking-widest hover:underline flex items-center gap-2">
                      <Search size={13} />Ver en Google Maps
                    </a>
                  </div>
                  <Link to={`/book/${selectedBusinessDetails.slug}`} className="w-full flex btn-primary h-16 items-center justify-center gap-3 shadow-2xl active:scale-95 font-extrabold uppercase tracking-[0.2em] text-[10px]">
                    <Scissors size={20} />Reservar Ahora
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
