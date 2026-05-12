import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPin, Star, Scissors, Calendar, Clock, Heart, XCircle, LogOut, LayoutDashboard, ArrowRight, Info, Instagram, Globe, X, Search, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
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

  useEffect(() => {
    loadData();
    loadFavorites();
  }, []);

  const location = useLocation();

  useEffect(() => {
    loadCustomerAppointments();
  }, [user, location.pathname]);

  useEffect(() => {
    window.addEventListener('focus', loadCustomerAppointments);
    return () => window.removeEventListener('focus', loadCustomerAppointments);
  }, [user]);

  const loadCustomerAppointments = useCallback(async () => {
    let emailToFetch = user?.email;
    if (!emailToFetch) {
      try {
        const savedInfo = localStorage.getItem('annly_customer_data');
        if (savedInfo) emailToFetch = JSON.parse(savedInfo).email;
      } catch (e) {
        console.error('Error reading annly_customer_data from LS', e);
      }
    }
    if (!emailToFetch) {
      setCustomerAppointments([]);
      return;
    }
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

      // Determine last appointment for rebooking
      if (enriched.length > 0) {
        setLastAppointment(enriched[0]);
      }
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
    } catch (err) {
      alert('No se pudo cancelar la cita. Intenta de nuevo.');
    }
  };

  const loadFavorites = () => {
    try {
      const saved = localStorage.getItem('favoriteBusinesses');
      if (saved) setFavoriteSlugs(JSON.parse(saved));
    } catch (e) {
      console.error('Error loading favorites', e);
    }
  };

  const toggleFavorite = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    let newFavorites = [...favoriteSlugs];
    if (newFavorites.includes(slug)) {
      newFavorites = newFavorites.filter(s => s !== slug);
    } else {
      newFavorites.push(slug);
    }
    setFavoriteSlugs(newFavorites);
    localStorage.setItem('favoriteBusinesses', JSON.stringify(newFavorites));
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: bError } = await supabase
        .from('businesses')
        .select(`
          id, name, slug, description, address, city, banner_url, logo_url, latitude, longitude,
          services(price, is_active)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);
      if (bError) throw bError;
      const businessesData = (data || []).map(b => ({
        ...b,
        hasAhorro: b.services?.some((s: any) => s.is_active && s.price >= 10 && s.price <= 15),
        hasPremium: b.services?.some((s: any) => s.is_active && s.price >= 40),
        isFlash: b.services?.some((s: any) => s.is_active && s.price > 0) // Placeholder for "Available Now" logic if needed
      }));
      setAllBusinesses(businessesData as any);
    } catch (err: any) {
      console.error('Error loading home data:', err);
      setError('No pudimos cargar las barberías. Intenta recargar la página.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsAccountMenuOpen(false);
  };

  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);

  const energyFilters = [
    { id: 'saving', label: 'Modo Ahorro', emoji: '🪫', color: 'bg-white', text: 'text-space-text', border: 'border-space-border', description: 'Rápido + Barato', filter: 'ahorro' },
    { id: 'premium', label: 'Modo Premium', emoji: '⚡', color: 'bg-space-text', text: 'text-white', border: 'border-space-text', description: 'Calidad + Top', filter: 'premium' },
    { id: 'flash', label: 'Modo Flash', emoji: '🚀', color: 'bg-space-primary', text: 'text-white', border: 'border-space-primary', description: 'Disponible YA', filter: 'flash' },
  ];

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleGeoLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortByDistance(true);
        setIsLocating(false);
      },
      (err) => {
        console.error('Geo error:', err);
        alert('No pudimos obtener tu ubicación');
        setIsLocating(false);
      }
    );
  };

  const filteredBusinesses = activeMood
    ? allBusinesses.filter(b => {
      if (activeMood === 'saving') return (b as any).hasAhorro;
      if (activeMood === 'premium') return (b as any).hasPremium;
      if (activeMood === 'flash') return (b as any).isFlash; // Simple fallback
      return true;
    })
    : allBusinesses;

  const sortedBusinesses = [...filteredBusinesses].sort((a, b) => {
    if (sortByDistance && userLocation && a.latitude && b.latitude) {
      const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude!);
      const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude!);
      return distA - distB;
    }
    return 0;
  });

  const [selectedBusinessDetails, setSelectedBusinessDetails] = useState<BusinessResult | null>(null);

  const BusinessCard = ({ business, isFavorite }: { business: BusinessResult, isFavorite: boolean }) => (
    <div className="group bg-space-card border-2 border-space-border/60 hover:border-space-primary/30 rounded-[2.5rem] overflow-hidden hover:shadow-[0_20px_50px_-12px_rgba(123,160,108,0.25)] hover:-translate-y-2 transition-all duration-500 flex flex-col h-full relative">
      <button
        onClick={(e) => toggleFavorite(e, business.slug)}
        className="absolute top-5 right-5 z-20 w-10 h-10 flex items-center justify-center bg-white/90 backdrop-blur-xl rounded-2xl border border-space-border/40 hover:border-space-primary/30 hover:bg-white hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
      >
        <Heart size={18} className={`transition-all duration-300 ${isFavorite ? 'fill-space-danger text-space-danger' : 'text-space-muted hover:text-space-danger'}`} />
      </button>

      {/* Banner / Media Section */}
      <Link to={`/book/${business.slug}`} className="block h-52 bg-space-bg relative overflow-hidden group/banner p-3 pb-0">
        <div className="w-full h-full rounded-t-[2rem] overflow-hidden relative">
          <img
            src={business.banner_url || `https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800`}
            alt={business.name}
            className="w-full h-full object-cover group-hover/banner:scale-110 transition duration-700 ease-out"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent group-hover/banner:from-black/20 transition-all duration-500"></div>
        </div>
      </Link>

      {/* Logo Bubble Overlay */}
      <div className="absolute top-[11.5rem] left-6 z-10">
        <div className="w-[4.5rem] h-[4.5rem] rounded-[1.5rem] bg-white p-1.5 shadow-2xl border-2 border-space-border/30 overflow-hidden transform group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-500">
          <img
            src={business.logo_url || business.banner_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(business.name)}&background=1a2e28&color=fff`}
            className="w-full h-full object-cover rounded-xl"
            alt="Logo"
          />
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6 pt-14 flex-1 flex flex-col">
        <Link to={`/book/${business.slug}`} className="block group/title">
          <h3 className="text-xl font-extrabold leading-tight mb-1.5 text-space-text tracking-tight group-hover/title:text-space-primary transition-colors duration-300">{business.name}</h3>
          <div className="flex items-center text-[10px] text-space-muted font-bold uppercase tracking-[0.15em] mt-1 bg-space-card2/50 px-3 py-1 rounded-full inline-flex w-fit">
            <MapPin size={10} className="mr-1.5 text-space-primary" />
            {business.city || 'Ubicación no especificada'}
          </div>
        </Link>

        <p className="text-space-muted/80 text-sm my-5 line-clamp-2 flex-1 font-medium leading-relaxed">
          {business.description || 'Reserva tu cita con los mejores profesionales en Spacey.'}
        </p>

        <div className="mt-auto pt-5 border-t border-space-border/60 grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedBusinessDetails(business)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-2 border-space-border/60 text-[10px] font-extrabold uppercase tracking-wider text-space-muted hover:bg-space-bg hover:text-space-text hover:border-space-primary/30 transition-all duration-300 active:scale-95"
          >
            <Info size={15} />
            Detalles
          </button>
          <Link
            to={`/book/${business.slug}`}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-br from-space-primary-light to-space-primary text-white text-[10px] font-extrabold uppercase tracking-wider shadow-lg shadow-space-primary/20 hover:shadow-xl hover:shadow-space-primary/30 hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <Scissors size={15} />
            Reservar
          </Link>
        </div>
      </div>
    </div>
  );

  const favoriteBusinesses = allBusinesses.filter(b => favoriteSlugs.includes(b.slug));

  const MoodCard = ({ mood }: { mood: typeof energyFilters[0] }) => (
    <button
      onClick={() => {
        setActiveMood(activeMood === mood.id ? null : mood.id);
        if (activeMood !== mood.id) {
          document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' });
        }
      }}
      className={`relative flex-shrink-0 w-full sm:w-auto flex-1 min-w-[200px] rounded-[2.5rem] overflow-hidden p-7 flex flex-col items-start justify-between transition-all duration-500 hover:scale-[1.03] border-2 ${activeMood === mood.id
          ? 'border-space-primary shadow-2xl shadow-space-primary/15 bg-gradient-to-br from-space-card2 to-white ring-4 ring-space-primary/10'
          : 'border-space-border/60 bg-white shadow-sm hover:shadow-xl hover:border-space-primary/20'
        }`}
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

  return (
    <div className="min-h-screen bg-space-bg text-space-text">

      {/* 
        ========================================
        NEW BACKGROUND (Clean Nature-Tech)
        ========================================
      */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Soft Organic Orbs */}
        <div className="absolute -top-[10%] -right-[5%] w-[55vw] h-[55vw] rounded-full bg-space-primary-light/8 blur-[120px] animate-pulse-subtle"></div>
        <div className="absolute top-[50%] -left-[5%] w-[45vw] h-[45vw] rounded-full bg-space-card2/30 blur-[130px]"></div>
        <div className="absolute -bottom-[15%] right-[15%] w-[55vw] h-[55vw] rounded-full bg-space-primary/5 blur-[110px]"></div>

        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(#22321c 1.2px, transparent 1.2px)', backgroundSize: '28px 28px' }}></div>
      </div>

      {/* Header Pill */}
      <nav className="fixed w-full z-50 top-4 px-4 sm:top-6">
        <div className="max-w-7xl mx-auto flex justify-center">
          <div className="pill-nav flex justify-between items-center w-full max-w-[95%] sm:max-w-none px-5 sm:px-6 h-16 sm:h-[4.5rem] rounded-full backdrop-blur-2xl bg-white/80 border-2 border-space-border/40 shadow-xl shadow-space-primary/5 hover:shadow-2xl hover:border-space-primary/20 transition-all duration-500">
            {/* Logo */}
            <div className="flex items-center gap-4 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-11 h-11 sm:w-[3.2rem] sm:h-[3.2rem] bg-gradient-to-br from-space-primary-light to-space-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-space-primary/20 group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-space-primary/30 transition-all duration-500 overflow-hidden relative">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top scale-110" />
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-space-text">Spacey</span>
                <div className="text-[8px] sm:text-[9px] uppercase tracking-[0.25em] text-space-muted font-extrabold -mt-1 hidden xs:block">Reserva tu Barbero</div>
              </div>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-10">
              <a href="#" className="text-xs font-extrabold uppercase tracking-widest text-space-text hover:text-space-primary transition-all duration-300 hover:scale-105">Inicio</a>
              <a href="#directory" className="text-xs font-extrabold uppercase tracking-widest text-space-muted hover:text-space-primary transition-all duration-300 hover:scale-105">Barberías</a>
              <Link to="/how-it-works" className="text-xs font-extrabold uppercase tracking-widest text-space-muted hover:text-space-primary transition-all duration-300 hover:scale-105">Cómo Funciona</Link>
              <Link to="/pricing" className="text-xs font-extrabold uppercase tracking-widest text-space-muted hover:text-space-primary transition-all duration-300 hover:scale-105">Precios</Link>
            </div>

            {/* Auth Buttons & Theme Toggle */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-2xl text-space-muted hover:text-space-primary hover:bg-space-card2/80 transition-all duration-300 hover:scale-110 hover:shadow-md mr-1"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-space-bg transition border-2 border-transparent hover:border-space-border"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-space-primary-light to-space-primary text-white rounded-2xl flex items-center justify-center font-extrabold text-sm border-2 border-space-primary/20 shadow-lg shadow-space-primary/20">
                      {user.email?.[0].toUpperCase()}
                    </div>
                  </button>
                  {isAccountMenuOpen && (
                    <div className="absolute right-0 mt-3 w-72 bg-white rounded-[2.5rem] shadow-2xl border-2 border-space-border/30 overflow-hidden py-1 z-50 animate-scale-in backdrop-blur-xl">
                      <div className="px-6 py-6 border-b-2 border-space-border/30 bg-space-bg flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-space-muted font-extrabold uppercase tracking-widest">Cuenta</p>
                          <p className="text-xs font-bold text-space-text truncate mt-1 max-w-[160px]">{user.email}</p>
                        </div>
                        <button onClick={() => setIsAccountMenuOpen(false)} className="sm:hidden p-2 text-space-muted hover:text-space-text transition-colors"><XCircle size={18} /></button>
                      </div>
                      <div className="p-3 space-y-1.5">
                        <Link to="/dashboard" className="flex items-center gap-3.5 px-5 py-4 text-sm font-bold text-space-text hover:text-space-primary hover:bg-space-primary/5 rounded-2xl transition-all duration-300" onClick={() => setIsAccountMenuOpen(false)}>
                          <LayoutDashboard size={22} className="text-space-primary" />
                          <span>Ir al Dashboard</span>
                        </Link>
                        <button onClick={handleLogout} className="w-full flex items-center gap-3.5 px-5 py-4 text-sm font-bold text-space-danger hover:bg-space-danger/5 rounded-2xl transition-all duration-300">
                          <LogOut size={22} />
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3">
                  <Link to="/login" className="text-[10px] sm:text-xs font-extrabold text-space-text hover:text-white hover:bg-space-text transition-all duration-300 px-6 py-3 rounded-full border-2 border-space-text uppercase tracking-widest hover:shadow-xl active:scale-95">
                    Acceder
                  </Link>
                  <Link to="/signup" className="btn-primary py-3 px-6 text-[10px] sm:text-xs uppercase tracking-widest shadow-xl shadow-space-primary/25 hidden xs:flex">
                    Unirse
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section (Booking App Dashboard Style) */}
      <div className="relative min-h-[90vh] flex flex-col items-center justify-start overflow-hidden pt-40 pb-16">
        <div className="relative z-10 w-full max-w-7xl px-4">

          <div className="animate-slide-in flex flex-col items-start text-left mb-16">
            <button
              onClick={handleGeoLocation}
              className={`inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl text-[10px] font-extrabold uppercase tracking-widest mb-8 transition-all duration-500 ${sortByDistance
                  ? 'bg-gradient-to-r from-space-primary to-space-primary-dark text-white shadow-xl shadow-space-primary/30'
                  : 'bg-space-primary/8 text-space-primary hover:bg-space-primary/15 hover:shadow-lg'
                }`}
            >
              <MapPin size={13} className={isLocating ? 'animate-bounce' : ''} />
              <span>{isLocating ? 'Ubicando...' : sortByDistance ? 'Cerca de ti: ACTIVADO' : '¿Usar mi ubicación?'}</span>
            </button>
            <h1 className="hero-title text-6xl sm:text-7xl md:text-8xl lg:text-9xl mb-8 tracking-tight leading-[0.9]">
              RESERVA TU <br />
              <span className="bg-gradient-to-r from-space-primary-light to-space-primary bg-clip-text text-transparent">PRÓXIMO NIVEL</span>
            </h1>
            <p className="text-sm sm:text-lg text-space-muted font-bold uppercase tracking-[0.2em] max-w-2xl bg-space-card2/30 px-6 py-3 rounded-full">
              Sin fricción. Sin esperas. Solo estilo.
            </p>
          </div>

          {/* ── Business Owner Hook Banner ────────────── */}
          {!user && (
            <div className="mb-12 animate-fade-in">
              <Link
                to="/how-it-works"
                className="group flex items-center justify-between gap-6 bg-white border-2 border-space-primary/15 hover:border-space-primary rounded-[2.5rem] p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-space-primary/10 w-full max-w-3xl"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-space-primary-light to-space-primary rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl group-hover:scale-110 group-hover:shadow-2xl transition-all duration-500">
                    <Scissors size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold text-space-primary uppercase tracking-[0.3em] mb-1">¿Tienes un negocio?</p>
                    <p className="text-base font-extrabold text-space-text leading-tight">Digitaliza tu barbería en 5 minutos</p>
                    <p className="text-[11px] text-space-muted font-semibold mt-1">Reservas online + WhatsApp automático</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="hidden sm:block text-[10px] font-extrabold text-space-primary uppercase tracking-widest">Ver cómo funciona</span>
                  <div className="w-10 h-10 bg-space-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-space-primary group-hover:text-white text-space-primary transition-all duration-500">
                    <ArrowRight size={16} />
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* BRUTAL FEATURE: One-Tap Rebooking */}
          {user && lastAppointment && (
            <div className="mb-16 animate-fade-in">
              <div className="flex items-center gap-4 mb-5">
                <h2 className="text-xs font-extrabold text-space-muted uppercase tracking-[0.4em]">¿Lo de siempre?</h2>
                <span className="h-px flex-1 bg-space-border/40"></span>
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
                    <span>Reservar ahora</span>
                    <ArrowRight size={20} />
                  </div>
                  <p className="text-[10px] text-space-muted font-bold uppercase tracking-[0.2em]">Sincronizado ✓</p>
                </div>
              </button>
            </div>
          )}

          {/* User Gamification Stats Card */}
          {user && showStats && !lastAppointment && (
            <div className="mb-16 animate-fade-in relative">
              <div className="bg-space-text text-white rounded-[2.5rem] p-8 sm:p-10 shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-space-primary/15 rounded-full blur-3xl -mr-40 -mt-40"></div>
                <button onClick={() => setShowStats(false)} className="absolute top-5 right-5 text-white/30 hover:text-white transition-colors"><XCircle size={22} /></button>

                <div className="flex flex-col sm:flex-row items-center gap-10 relative z-10">
                  <div className="flex flex-col items-center sm:items-start">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-white/40 mb-3">Tu Estado Actual</p>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-extrabold italic tracking-tight">ESTILO AL 85%</div>
                      <div className="px-4 py-1.5 bg-gradient-to-r from-space-primary to-space-primary-light rounded-xl text-[10px] font-extrabold animate-pulse shadow-lg">LEVEL UP</div>
                    </div>
                  </div>
                  <div className="h-px sm:h-14 w-full sm:w-px bg-white/8"></div>
                  <div className="flex-1 w-full">
                    <div className="flex justify-between text-[10px] font-extrabold uppercase tracking-widest mb-3">
                      <span>Progreso de Frescura</span>
                      <span>Próxima cita: pronto</span>
                    </div>
                    <div className="w-full h-3.5 bg-white/8 rounded-full overflow-hidden">
                      <div className="w-[85%] h-full bg-gradient-to-r from-space-primary-light to-space-primary shadow-[0_0_20px_rgba(123,160,108,0.5)] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Energy Filters (The Main Intent Engine) */}
          <div className="w-full relative mb-14">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <h2 className="text-xs font-extrabold text-space-muted uppercase tracking-[0.4em]">¿En qué modo estás hoy?</h2>
                <div className="h-px w-32 bg-space-border/40 hidden sm:block"></div>
              </div>
            </div>

            {/* Simple Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {energyFilters.map((mood) => (
                <MoodCard key={mood.id} mood={mood} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Directory Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-20" id="directory">

        {/* Customer Appointments */}
        {customerAppointments.length > 0 && (
          <div className="mb-24 animate-fade-in">
            <div className="flex items-center gap-4 mb-8 px-2">
              <div className="bg-gradient-to-br from-space-primary-light to-space-primary p-3 rounded-2xl shadow-xl shadow-space-primary/25"><Calendar size={22} className="text-white" /></div>
              <h2 className="text-3xl font-extrabold text-space-text tracking-tight">Mis Próximas Citas</h2>
            </div>
            <div className="bg-white border-2 border-space-border/40 rounded-[2.5rem] shadow-2xl p-8 md:p-10">
              {loadingApts ? (
                <div className="py-12 flex justify-center"><LoadingSpinner /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                  {customerAppointments.map((apt: any) => (
                    <div key={apt.id} className="bg-space-bg rounded-[2rem] p-7 border-2 border-space-border/30 shadow-sm flex flex-col justify-between hover:border-space-primary/30 hover:shadow-xl transition-all duration-500 relative overflow-hidden group">
                      <div className="absolute -right-6 -top-6 w-28 h-28 bg-space-primary/5 rounded-full blur-[25px] pointer-events-none group-hover:bg-space-primary/10 transition-colors duration-500"></div>
                      <div className="mb-5">
                        <div className="flex items-center gap-2.5 mb-4">
                          <span className="text-[10px] font-extrabold text-space-text uppercase tracking-widest px-4 py-1.5 bg-white rounded-xl border-2 border-space-border/40 shadow-sm truncate max-w-[150px]">{apt.business?.name}</span>
                          {apt.statusBadge === 'today' && <span className="text-[10px] font-extrabold text-white uppercase tracking-widest px-4 py-1.5 bg-space-danger rounded-xl shadow-lg">Hoy</span>}
                        </div>
                        <h4 className="font-extrabold text-lg mb-5 text-space-text leading-tight">{apt.service_name}</h4>
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center gap-2.5 text-sm text-space-muted font-bold"><Calendar size={15} className="text-space-primary" /><span>{formatRelativeTime(apt.appointment_date, apt.start_time)}</span></div>
                          <div className="flex items-center gap-2.5 text-sm text-space-muted font-bold"><Clock size={15} className="text-space-primary" /><span>{apt.start_time.slice(0, 5)}</span></div>
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

        {error && <div className="bg-space-danger/5 border-2 border-space-danger/20 text-space-danger px-8 py-5 rounded-[2rem] mb-14 shadow-sm text-center font-bold text-sm tracking-wide">⚠️ {error}</div>}

        {loading ? (
          <div className="bg-white rounded-[3rem] p-20 shadow-2xl border-2 border-space-border/30 flex flex-col items-center justify-center min-h-[400px]">
            <LoadingSpinner />
            <p className="text-space-primary mt-8 uppercase tracking-widest text-xs font-extrabold animate-pulse">Cargando profesionales...</p>
          </div>
        ) : (
          <div className="space-y-20">
            {/* Favorites Section */}
            {favoriteBusinesses.length > 0 && (
              <section className="animate-fade-in">
                <div className="flex items-center justify-between mb-10 px-2 border-b-2 border-space-border/30 pb-5">
                  <div className="flex items-center gap-4">
                    <span className="bg-gradient-to-br from-amber-400 to-amber-500 p-3 rounded-2xl shadow-xl shadow-amber-400/20"><Star size={22} className="text-white fill-white" /></span>
                    <h2 className="text-3xl font-extrabold text-space-text tracking-tight">Tus Favoritas</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
                  {favoriteBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={true} />)}
                </div>
              </section>
            )}

            {/* All Businesses Section */}
            <section className="animate-fade-in delay-100">
              <div className="flex items-center justify-between mb-10 px-2 border-b-2 border-space-border/30 pb-5">
                <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-extrabold text-space-text tracking-tight">
                    {activeMood ? `Resultados: ${energyFilters.find(m => m.id === activeMood)?.label}` : 'Recomendadas'}
                  </h2>
                  <span className="bg-space-bg text-space-primary px-4 py-1.5 rounded-2xl text-xs font-extrabold uppercase shadow-sm border-2 border-space-border/40">{sortedBusinesses.length}</span>
                </div>
                {activeMood && (
                  <button onClick={() => setActiveMood(null)} className="text-[10px] font-extrabold uppercase tracking-widest text-space-danger hover:underline">Ver Todo</button>
                )}
              </div>

              {sortedBusinesses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
                  {sortedBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={favoriteSlugs.includes(b.slug)} />)}
                </div>
              ) : (
                <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-space-border/30 shadow-2xl">
                  <div className="w-24 h-24 bg-space-bg rounded-full flex items-center justify-center mx-auto mb-8"><Scissors size={36} className="text-space-muted/40" /></div>
                  <h3 className="text-2xl font-extrabold text-space-text mb-3">Aún no hay barberías</h3>
                  <p className="text-space-muted font-semibold max-w-md mx-auto">Vuelve más tarde, estamos conectando a los mejores profesionales en tu área.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-40 border-t-2 border-space-border/30 pt-16 pb-10 bg-white relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-4 justify-center md:justify-start">
                <div className="w-14 h-14 bg-gradient-to-br from-space-text to-space-primary-dark rounded-2xl flex items-center justify-center text-white shadow-2xl overflow-hidden relative">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-cover object-top scale-110" />
                </div>
                <span className="text-4xl font-extrabold tracking-tight text-space-text">Spacey</span>
              </div>
              <p className="text-space-muted font-semibold mt-4">Agenda en segundos, brilla todo el día.</p>
            </div>
            <div className="text-center md:text-right bg-space-bg p-6 rounded-[2.5rem] border-2 border-space-border/30">
              <p className="text-space-text font-bold">© {new Date().getFullYear()} Spacey Platform</p>
              <p className="text-space-primary text-[10px] mt-1.5 uppercase tracking-widest font-extrabold">Diseñado para amantes del buen estilo</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Business Details Modal */}
      {selectedBusinessDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setSelectedBusinessDetails(null)}></div>
          <div className="relative w-full max-w-3xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-space-border/20 animate-scale-in">
            <button
              onClick={() => setSelectedBusinessDetails(null)}
              className="absolute top-5 right-5 z-50 w-11 h-11 bg-white/90 backdrop-blur-xl rounded-2xl border-2 border-space-border/40 flex items-center justify-center text-space-text hover:bg-white hover:shadow-xl transition-all duration-300"
            >
              <X size={22} />
            </button>

            <div className="h-56 sm:h-72 bg-space-bg relative">
              <img
                src={selectedBusinessDetails.banner_url || `https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800`}
                className="w-full h-full object-cover"
                alt="Banner"
              />
              <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
              <div className="absolute bottom-8 left-10 flex items-end gap-7">
                <div className="w-28 h-28 rounded-[2rem] bg-white p-1.5 shadow-2xl border-2 border-white/30 overflow-hidden">
                  <img
                    src={selectedBusinessDetails.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedBusinessDetails.name)}&background=1a2e28&color=fff`}
                    className="w-full h-full object-cover rounded-[1.7rem]"
                    alt="Logo"
                  />
                </div>
                <div className="mb-3">
                  <h2 className="text-4xl font-extrabold text-white tracking-tight leading-none">{selectedBusinessDetails.name}</h2>
                  <div className="flex items-center text-[11px] text-white/70 font-extrabold uppercase tracking-widest mt-3">
                    <MapPin size={12} className="mr-2 text-space-primary-light" />
                    {selectedBusinessDetails.city || 'Ubicación no especificada'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 pt-14">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="md:col-span-2">
                  <h4 className="text-[10px] font-extrabold text-space-muted uppercase tracking-[0.25em] mb-4">Sobre nosotros</h4>
                  <p className="text-sm text-space-text font-medium leading-relaxed">
                    {selectedBusinessDetails.description || 'Esta barbería aún no ha añadido una descripción, pero estamos felices de atenderte con la mejor calidad y estilo.'}
                  </p>

                  <div className="mt-10 flex flex-wrap gap-4">
                    {selectedBusinessDetails.instagram_url && (
                      <a href={selectedBusinessDetails.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-space-bg text-space-text hover:bg-space-primary/5 hover:text-space-primary transition-all duration-300 border-2 border-space-border/30 group shadow-sm hover:shadow-md">
                        <Instagram size={18} className="group-hover:scale-110 transition-transform duration-300" />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">Instagram</span>
                      </a>
                    )}
                    {selectedBusinessDetails.website_url && (
                      <a href={selectedBusinessDetails.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-space-bg text-space-text hover:bg-space-primary/5 hover:text-space-primary transition-all duration-300 border-2 border-space-border/30 group shadow-sm hover:shadow-md">
                        <Globe size={18} className="group-hover:scale-110 transition-transform duration-300" />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">Sitio Web</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="space-y-7">
                  <div className="p-6 rounded-[2rem] bg-space-bg border-2 border-space-border/30">
                    <h4 className="text-[10px] font-extrabold text-space-muted uppercase tracking-[0.25em] mb-3">Ubicación</h4>
                    <p className="text-xs font-bold text-space-text mb-4 leading-snug">
                      {selectedBusinessDetails.address || 'Consulta nuestra dirección exacta al reservar.'}
                    </p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedBusinessDetails.latitude},${selectedBusinessDetails.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-extrabold text-space-primary uppercase tracking-widest hover:underline flex items-center gap-2"
                    >
                      <Search size={13} />
                      Ver en Google Maps
                    </a>
                  </div>

                  <Link
                    to={`/book/${selectedBusinessDetails.slug}`}
                    className="w-full flex btn-primary h-16 items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all font-extrabold uppercase tracking-[0.2em] text-[10px]"
                  >
                    <Scissors size={20} />
                    Reservar Ahora
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