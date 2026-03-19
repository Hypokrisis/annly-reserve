import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPin, Star, Scissors, Calendar, Clock, Heart, XCircle, LogOut, LayoutDashboard, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
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
}

function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
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

  const BusinessCard = ({ business, isFavorite }: { business: BusinessResult, isFavorite: boolean }) => (
    <Link
      to={`/book/${business.slug}`}
      className="group bg-white border border-space-border hover:border-space-primary/40 rounded-[2rem] overflow-hidden hover:shadow-card-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full relative cursor-pointer"
    >
      <button
        onClick={(e) => toggleFavorite(e, business.slug)}
        className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center bg-white/90 backdrop-blur-md rounded-full border border-space-border/50 hover:bg-white transition shadow-sm hover:scale-110"
      >
        <Heart size={16} className={`transition-colors ${isFavorite ? 'fill-space-danger text-space-danger' : 'text-space-muted hover:text-space-danger'}`} />
      </button>

      <div className="h-48 bg-space-bg relative overflow-hidden p-2 pb-0">
        <div className="w-full h-full rounded-t-[1.5rem] overflow-hidden relative">
          <img
            src={business.banner_url || business.logo_url || `https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800`}
            alt={business.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800';
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-xl font-black leading-tight mb-1 text-white tracking-tight">{business.name}</h3>
            {business.city && (
              <div className="flex items-center text-[10px] text-white/90 font-bold uppercase tracking-widest drop-shadow-md">
                <MapPin size={10} className="mr-1" />
                {business.city}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-space-success/10 text-space-success text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-lg font-bold border border-space-success/20">Disponible</span>
        </div>
        <p className="text-space-muted text-sm mb-5 line-clamp-2 flex-1 font-medium">
          {business.description || 'Reserva tu cita con los mejores profesionales de la zona.'}
        </p>
        <div className="mt-auto pt-5 border-t border-space-border flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Star size={14} className="text-[#f59e0b] fill-[#f59e0b]" />
            <span className="text-sm font-bold text-space-text">4.9</span>
            {sortByDistance && userLocation && business.latitude && (
              <span className="text-[10px] text-space-primary font-black ml-2 px-2 py-1 bg-space-primary/10 rounded-full border border-space-primary/20">
                {calculateDistance(userLocation.lat, userLocation.lng, business.latitude, business.longitude!).toFixed(1)} km
              </span>
            )}
          </div>
          <span className="text-space-primary text-[11px] font-black group-hover:underline flex items-center gap-1 uppercase tracking-widest transition-colors group-hover:text-space-primary-dark">
            Reservar
            <Scissors size={14} className="group-hover:rotate-12 transition group-hover:scale-110" />
          </span>
        </div>
      </div>
    </Link>
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
      className={`relative flex-shrink-0 w-full sm:w-auto flex-1 min-w-[200px] rounded-3xl overflow-hidden p-6 flex flex-col items-start justify-between transition-all duration-300 hover:scale-[1.02] shadow-sm border-2 ${activeMood === mood.id ? 'border-space-primary ring-4 ring-space-primary/10' : 'border-space-border bg-white'}`}
    >
      <div className="flex items-center justify-between w-full mb-4">
        <span className="text-3xl">{mood.emoji}</span>
        <div className={`w-8 h-8 rounded-full ${mood.color} ${mood.border} border flex items-center justify-center`}>
           <ArrowRight size={14} className={mood.text} />
        </div>
      </div>
      <div className="text-left">
        <p className="text-[10px] font-black uppercase tracking-widest text-space-muted mb-1">{mood.description}</p>
        <h3 className="text-space-text text-lg font-black uppercase tracking-tight">{mood.label}</h3>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-space-bg text-space-text">

      {/* 
        ========================================
        NEW BACKGROUND (Clean Light Green Theme)
        ========================================
      */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#fbfdf9]">
        {/* Soft Blurry Orbs */}
        <div className="absolute -top-[10%] -right-[5%] w-[50vw] h-[50vw] rounded-full bg-space-primary-light/10 blur-[100px]"></div>
        <div className="absolute top-[40%] -left-[10%] w-[40vw] h-[40vw] rounded-full bg-space-primary/5 blur-[120px]"></div>
        <div className="absolute -bottom-[20%] right-[20%] w-[60vw] h-[60vw] rounded-full bg-space-accent/10 blur-[100px]"></div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.02] mix-blend-multiply" style={{ backgroundImage: 'radial-gradient(#1a2e28 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      </div>

      {/* Header Pill */}
      <nav className="fixed w-full z-50 top-4 px-4 sm:top-6">
        <div className="max-w-7xl mx-auto flex justify-center">
          <div className="pill-nav flex justify-between items-center w-full max-w-[95%] sm:max-w-none px-4 sm:px-6 h-14 sm:h-16 rounded-full backdrop-blur-xl bg-white/80 border border-space-border shadow-lg shadow-space-primary/5">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-space-primary rounded-full flex items-center justify-center text-white shadow-lg shadow-space-primary/20 hover:scale-105 transition-transform rotate-3">
                <Scissors size={16} className="text-white -rotate-3 sm:hidden" />
                <Scissors size={20} className="text-white -rotate-3 hidden sm:block" />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-black tracking-tight text-space-text uppercase">Spacey</span>
                <div className="text-[7px] sm:text-[9px] uppercase tracking-[0.2em] text-space-muted font-bold -mt-1 hidden xs:block">Reserva tu Barbero</div>
              </div>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#" className="text-xs font-bold uppercase tracking-widest text-space-text hover:text-space-primary transition">Inicio</a>
              <a href="#directory" className="text-xs font-bold uppercase tracking-widest text-space-muted hover:text-space-primary transition">Barberías</a>
              <a href="#" className="text-xs font-bold uppercase tracking-widest text-space-muted hover:text-space-primary transition">Servicios</a>
            </div>

            {/* Auth Buttons */}
            {/* Auth Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-space-bg transition border border-transparent hover:border-space-border"
                  >
                    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-space-primary-light text-space-primary rounded-full flex items-center justify-center font-black text-xs sm:text-sm border border-space-primary/20 shadow-sm">
                      {user.email?.[0].toUpperCase()}
                    </div>
                  </button>
                  {isAccountMenuOpen && (
                    <div className="absolute right-0 mt-3 w-64 bg-white rounded-[2rem] shadow-card-xl border border-space-border overflow-hidden py-1 z-50 animate-fade-in">
                      <div className="px-5 py-5 border-b border-space-border bg-space-bg flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-space-muted font-black uppercase tracking-widest">Cuenta</p>
                          <p className="text-xs font-bold text-space-text truncate mt-0.5 max-w-[150px]">{user.email}</p>
                        </div>
                        <button onClick={() => setIsAccountMenuOpen(false)} className="sm:hidden p-2 text-space-muted"><XCircle size={18} /></button>
                      </div>
                      <div className="p-2 space-y-1">
                        <Link to="/dashboard" className="flex items-center gap-3 px-4 py-4 sm:py-3 text-sm font-semibold text-space-text hover:text-space-primary hover:bg-space-primary/5 rounded-2xl transition" onClick={() => setIsAccountMenuOpen(false)}>
                          <LayoutDashboard size={20} className="text-space-primary" />
                          <span>Ir al Dashboard</span>
                        </Link>
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-4 sm:py-3 text-sm font-semibold text-space-danger hover:bg-space-danger/10 rounded-2xl transition">
                          <LogOut size={20} />
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-3">
                  <Link to="/login" className="text-[10px] sm:text-xs font-black text-space-text hover:text-white hover:bg-space-text transition px-4 sm:px-6 py-2 sm:py-3 rounded-full border-2 border-space-text uppercase tracking-widest">
                    Acceder
                  </Link>
                  <Link to="/signup" className="btn-primary py-2 sm:py-3 px-4 sm:px-6 text-[10px] sm:text-xs uppercase tracking-widest shadow-btn hidden xs:flex">
                    Unirse
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section (Booking App Dashboard Style) */}
      <div className="relative min-h-[85vh] flex flex-col items-center justify-start overflow-hidden pt-36 pb-12">
        <div className="relative z-10 w-full max-w-7xl px-4">
          
          <div className="animate-slide-in flex flex-col items-start text-left mb-12">
            <button 
              onClick={handleGeoLocation}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 transition-all ${sortByDistance ? 'bg-space-primary text-white shadow-lg' : 'bg-space-primary/10 text-space-primary hover:bg-space-primary/20'}`}
            >
              <MapPin size={12} className={isLocating ? 'animate-bounce' : ''} />
              <span>{isLocating ? 'Ubicando...' : sortByDistance ? 'Cerca de ti: ACTIVADO' : '¿Usar mi ubicación?'}</span>
            </button>
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black mb-6 tracking-tighter leading-[0.9] text-space-text uppercase">
              RESERVA TU <br />
              <span className="text-space-primary">PRÓXIMO NIVEL</span>
            </h1>
            <p className="text-sm sm:text-lg text-space-muted font-bold uppercase tracking-widest max-w-xl">Sin fricción. Sin esperas. Solo los mejores profesionales en un solo lugar.</p>
          </div>

          {/* BRUTAL FEATURE: One-Tap Rebooking */}
          {user && lastAppointment && (
            <div className="mb-12 animate-fade-in">
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-xs font-black text-space-muted uppercase tracking-[0.4em]">¿Lo de siempre?</h2>
                <span className="h-px flex-1 bg-space-border/50"></span>
              </div>
              <button 
                onClick={() => navigate(`/book/${(lastAppointment as any).business?.slug}`)}
                className="w-full bg-white border-2 border-space-primary/30 p-6 rounded-[2rem] flex items-center justify-between hover:border-space-primary hover:shadow-xl transition-all group"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-16 h-16 bg-space-primary rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg group-hover:scale-110 transition-transform">
                    {(lastAppointment as any).business?.name?.[0].toUpperCase() || 'B'}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-space-primary uppercase tracking-widest mb-1">Repetir última reserva</p>
                    <h3 className="text-xl font-black text-space-text uppercase tracking-tight">{(lastAppointment as any).business?.name}</h3>
                    <p className="text-xs text-space-muted font-bold uppercase tracking-widest">{(lastAppointment as any).service_name}</p>
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2 text-space-primary font-black text-sm uppercase tracking-widest">
                    <span>Reservar ahora</span>
                    <ArrowRight size={18} />
                  </div>
                  <p className="text-[9px] text-space-muted font-bold uppercase tracking-[0.2em]">Sincronizado con tus preferencias</p>
                </div>
              </button>
            </div>
          )}

          {/* User Gamification Stats Card - Hidden if Rebooking is shown to avoid clutter */}
          {user && showStats && !lastAppointment && (
            <div className="mb-12 animate-fade-in relative">
               <div className="bg-space-text text-white rounded-[2rem] p-6 sm:p-8 shadow-2xl overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-space-primary/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                  <button onClick={() => setShowStats(false)} className="absolute top-4 right-4 text-white/40 hover:text-white transition"><XCircle size={20} /></button>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
                     <div className="flex flex-col items-center sm:items-start">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-2">Tu Estado Actual</p>
                        <div className="flex items-center gap-3">
                           <div className="text-4xl font-black italic">ESTILO AL 85%</div>
                           <div className="px-3 py-1 bg-space-primary rounded-lg text-[10px] font-black animate-pulse">LEVEL UP</div>
                        </div>
                     </div>
                     <div className="h-px sm:h-12 w-full sm:w-px bg-white/10"></div>
                     <div className="flex-1 w-full">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                           <span>Progreso de Frescura</span>
                           <span>Proxima cita: pronto</span>
                        </div>
                        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                           <div className="w-[85%] h-full bg-space-primary shadow-[0_0_15px_rgba(74,132,99,0.5)]"></div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* Energy Filters (The Main Intent Engine) */}
          <div className="w-full relative mb-12">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <h2 className="text-xs font-black text-space-muted uppercase tracking-[0.4em]">¿En qué modo estás hoy?</h2>
                  <div className="h-px w-24 bg-space-border/50 hidden sm:block"></div>
                </div>
             </div>
             
             {/* Simple Grid */}
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {energyFilters.map((mood) => (
                  <MoodCard key={mood.id} mood={mood} />
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Directory Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-20" id="directory">

        {/* Customer Appointments */}
        {customerAppointments.length > 0 && (
          <div className="mb-20 animate-fade-in group">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="bg-space-primary p-2.5 rounded-xl shadow-btn"><Calendar size={20} className="text-white" /></div>
              <h2 className="text-2xl font-black text-space-text tracking-tight uppercase">Mis Próximas Citas</h2>
            </div>
            <div className="bg-white border text-space-text border-space-border rounded-[2.5rem] shadow-card p-6 md:p-8">
                {loadingApts ? (
                  <div className="py-8 flex justify-center"><LoadingSpinner /></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {customerAppointments.map((apt: any) => (
                      <div key={apt.id} className="bg-space-bg rounded-3xl p-6 border border-space-border shadow-sm flex flex-col justify-between hover:border-space-primary/40 hover:shadow-lg transition-all relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-space-primary/5 rounded-full blur-[20px] pointer-events-none"></div>
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] font-black text-space-text uppercase tracking-widest px-3 py-1 bg-white rounded-lg border border-space-border shadow-sm truncate max-w-[140px]">{apt.business?.name}</span>
                            {apt.statusBadge === 'today' && <span className="text-[10px] font-black text-white uppercase tracking-widest px-3 py-1 bg-space-danger rounded-lg shadow-sm">Hoy</span>}
                          </div>
                          <h4 className="font-bold text-lg mb-4 text-space-text leading-tight">{apt.service_name}</h4>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-sm text-space-muted font-bold"><Calendar size={14} className="text-space-primary" /><span>{formatRelativeTime(apt.appointment_date, apt.start_time)}</span></div>
                            <div className="flex items-center gap-2 text-sm text-space-muted font-bold"><Clock size={14} className="text-space-primary" /><span>{apt.start_time.slice(0, 5)}</span></div>
                          </div>
                        </div>
                        <button onClick={() => handleCancelApt(apt.id)} className="w-full mt-2 h-10 border-2 border-space-border/60 hover:border-space-danger hover:bg-space-danger text-space-danger rounded-xl flex items-center justify-center font-bold text-xs uppercase tracking-widest transition-all hover:text-white group/btn">
                          Cancelar Cita
                        </button>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}

        {error && <div className="bg-space-danger/10 border border-space-danger/30 text-space-danger px-6 py-4 rounded-2xl mb-12 shadow-sm text-center font-bold text-sm tracking-wide">⚠️ {error}</div>}

        {loading ? (
          <div className="bg-white rounded-[3rem] p-16 shadow-card border border-space-border flex flex-col items-center justify-center min-h-[400px]">
            <LoadingSpinner />
            <p className="text-space-primary mt-6 uppercase tracking-widest text-[10px] font-black animate-pulse">Cargando profesionales...</p>
          </div>
        ) : (
          <div className="space-y-16">
            {/* Favorites Section */}
            {favoriteBusinesses.length > 0 && (
              <section className="animate-fade-in">
                <div className="flex items-center justify-between mb-8 px-2 border-b border-space-border pb-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-[#f59e0b] p-2.5 rounded-xl shadow-lg shadow-[#f59e0b]/20"><Star size={20} className="text-white fill-white" /></span>
                    <h2 className="text-2xl font-black text-space-text uppercase tracking-tight">Tus Favoritas</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {favoriteBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={true} />)}
                </div>
              </section>
            )}

            {/* All Businesses Section */}
            <section className="animate-fade-in delay-100">
              <div className="flex items-center justify-between mb-8 px-2 border-b border-space-border pb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-space-text uppercase tracking-tight">
                    {activeMood ? `Resultados: ${energyFilters.find(m => m.id === activeMood)?.label}` : 'Recomendadas'}
                  </h2>
                  <span className="bg-space-bg text-space-primary px-3 py-1 rounded-lg text-xs font-black uppercase shadow-sm border border-space-border">{sortedBusinesses.length}</span>
                </div>
                {activeMood && (
                  <button onClick={() => setActiveMood(null)} className="text-[10px] font-black uppercase tracking-widest text-space-danger hover:underline">Ver Todo</button>
                )}
              </div>
              
              {sortedBusinesses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {sortedBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={favoriteSlugs.includes(b.slug)} />)}
                </div>
              ) : (
                <div className="bg-white rounded-[3rem] p-16 text-center border border-space-border shadow-card">
                  <div className="w-20 h-20 bg-space-bg rounded-full flex items-center justify-center mx-auto mb-6"><Scissors size={32} className="text-space-muted opacity-50" /></div>
                  <h3 className="text-xl font-black text-space-text mb-2 uppercase tracking-tight">Aún no hay barberías</h3>
                  <p className="text-space-muted font-medium max-w-sm mx-auto">Vuelve más tarde, estamos conectando a los mejores profesionales en tu área.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-32 border-t border-space-border pt-12 pb-8 bg-white relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <div className="w-10 h-10 bg-space-text rounded-xl flex items-center justify-center text-white shadow-md">
                  <Scissors size={20} />
                </div>
                <span className="text-2xl font-black tracking-tight text-space-text uppercase">Spacey</span>
              </div>
              <p className="text-space-muted text-sm mt-3 font-semibold">Agenda en segundos, brilla todo el día.</p>
            </div>
            <div className="text-center md:text-right bg-space-bg p-5 rounded-3xl border border-space-border">
              <p className="text-space-text font-bold text-sm">© {new Date().getFullYear()} Spacey Platform</p>
              <p className="text-space-primary text-[10px] mt-1 uppercase tracking-widest font-black">Diseñado para amantes del buen estilo</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
