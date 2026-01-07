import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPin, Star, Scissors, Calendar, Clock, Heart, XCircle, Search, LogOut, LayoutDashboard } from 'lucide-react';
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
}

function Home() {
  const { user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [allBusinesses, setAllBusinesses] = useState<BusinessResult[]>([]);
  const [recentBusinesses, setRecentBusinesses] = useState<BusinessResult[]>([]);
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [customerAppointments, setCustomerAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingApts, setLoadingApts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

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
        .select('id, name, slug, description, address, city, banner_url, logo_url')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);
      if (bError) throw bError;
      const businessesData = data || [];
      setAllBusinesses(businessesData);
      const recentSlugs = JSON.parse(localStorage.getItem('recentBusinesses') || '[]');
      if (recentSlugs.length > 0) {
        const foundRecents = businessesData.filter(b => recentSlugs.includes(b.slug));
        setRecentBusinesses(foundRecents);
      }
    } catch (err: any) {
      console.error('Error loading home data:', err);
      setError('No pudimos cargar las barberías. Intenta recargar la página.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    const el = document.getElementById('directory');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await logout();
    setIsAccountMenuOpen(false);
  };

  const BusinessCard = ({ business, isFavorite }: { business: BusinessResult, isFavorite: boolean }) => (
    <Link
      to={`/book/${business.slug}`}
      className="group bg-space-card border border-space-border/20 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-space-gold/5 hover:-translate-y-0.5 transition-all duration-300 flex flex-col h-full relative backdrop-blur-sm cursor-pointer"
    >
      <button
        onClick={(e) => toggleFavorite(e, business.slug)}
        className="absolute top-3 right-3 z-10 p-2 bg-space-card/80 backdrop-blur-md rounded-full hover:bg-space-card border border-space-gold/20 transition shadow-lg hover:scale-110"
      >
        <Heart size={18} className={`transition-colors ${isFavorite ? 'fill-space-danger text-space-danger' : 'text-space-gold hover:text-space-danger'}`} />
      </button>

      <div className="h-48 bg-space-card2 relative overflow-hidden">
        <img
          src={business.banner_url || business.logo_url || `https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800`}
          alt={business.name}
          className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-space-card via-space-card/60 to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold leading-tight mb-1 text-white font-serif tracking-wide">{business.name}</h3>
          {business.city && (
            <div className="flex items-center text-xs text-space-gold font-medium uppercase tracking-widest">
              <MapPin size={12} className="mr-1" />
              {business.city}
            </div>
          )}
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-space-success/10 text-space-success text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold border border-space-success/20">Disponible</span>
        </div>
        <p className="text-space-muted text-sm mb-5 line-clamp-2 flex-1 font-light">
          {business.description || 'Reserva tu cita con los mejores profesionales de la zona.'}
        </p>
        <div className="mt-auto pt-4 border-t border-space-border/20 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star size={14} className="text-space-gold fill-space-gold" />
            <span className="text-sm font-bold text-white">4.9</span>
            <span className="text-xs text-space-muted">(120+)</span>
          </div>
          <span className="text-space-gold text-sm font-bold group-hover:underline flex items-center gap-1 uppercase tracking-wider text-xs">
            Reservar
            <Scissors size={14} className="group-hover:rotate-12 transition" />
          </span>
        </div>
      </div>
    </Link>
  );

  const favoriteBusinesses = allBusinesses.filter(b => favoriteSlugs.includes(b.slug));

  return (
    <div className="min-h-screen bg-space-bg text-space-text font-sans">

      {/* 
        ========================================
        GEOMETRIC BACKGROUND (Luxury Minimalist)
        Replacing "blurry blobs" with Gold Lines & Circles
        ========================================
      */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Top Right Circle Outline */}
        <div className="absolute -top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full border border-space-gold/10 opacity-60"></div>
        <div className="absolute -top-[15%] -right-[5%] w-[50vw] h-[50vw] rounded-full border border-space-gold/5 opacity-40"></div>

        {/* Bottom Left Circle Outline */}
        <div className="absolute -bottom-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full border border-space-gold/10 opacity-60"></div>

        {/* Geometric Grid / Lines */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-space-gold/10 to-transparent"></div>
        <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-space-gold/10 to-transparent"></div>

        {/* Subtle texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#d4af37 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      </div>

      {/* Header Pill - RESTORED */}
      <nav className="fixed w-full z-50 top-6 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="pill-nav flex justify-between items-center px-4 backdrop-blur-xl bg-space-card/80 border border-space-gold/20 shadow-xl shadow-black/20">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo(0, 0)}>
              <div className="w-10 h-10 bg-gradient-to-br from-space-gold to-yellow-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-space-gold/20 animate-pulse-subtle">
                <Scissors size={22} className="text-white" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-space-gold to-white bg-clip-text text-transparent font-serif">Spacey</span>
                <div className="text-[10px] uppercase tracking-widest text-space-gold font-bold">Reserva tu Barbero</div>
              </div>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#" className="text-xs font-bold uppercase tracking-widest text-space-muted hover:text-space-gold transition">Inicio</a>
              <a href="#directory" className="text-xs font-bold uppercase tracking-widest text-space-muted hover:text-space-gold transition">Barberías</a>
              <a href="#" className="text-xs font-bold uppercase tracking-widest text-space-muted hover:text-space-gold transition">Servicios</a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-space-card transition border border-transparent hover:border-space-gold/30"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-space-gold to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      {user.email?.[0].toUpperCase()}
                    </div>
                  </button>
                  {isAccountMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-space-card rounded-2xl shadow-2xl border border-space-gold/20 overflow-hidden py-1 z-50 animate-fade-in">
                      <div className="px-4 py-3 border-b border-space-border/20">
                        <p className="text-xs text-space-muted font-medium uppercase tracking-widest">Mi Cuenta</p>
                        <p className="text-sm font-bold text-white truncate">{user.email}</p>
                      </div>
                      <div className="p-1">
                        <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 text-sm text-space-muted hover:text-white hover:bg-space-card2 rounded-xl transition" onClick={() => setIsAccountMenuOpen(false)}>
                          <LayoutDashboard size={18} className="text-space-gold" />
                          <span>Ir a mi Dashboard</span>
                        </Link>
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-space-danger hover:bg-space-danger/10 rounded-xl transition">
                          <LogOut size={18} />
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link to="/login" className="text-xs font-bold text-space-gold hover:text-white transition px-4 py-2 rounded-full border border-space-gold/30 hover:border-space-gold bg-space-card2 hover:bg-space-card uppercase tracking-wider">
                    Acceso
                  </Link>
                  <Link to="/signup" className="bg-gradient-to-r from-space-gold to-yellow-600 hover:brightness-110 text-white px-5 py-2 rounded-full font-bold transition text-xs shadow-lg shadow-space-gold/20 uppercase tracking-wider">
                    Registrar
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - RESTORED & THEMED */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl px-4 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left Column */}
            <div className="animate-slide-in">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-space-gold/30 bg-space-card/50 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-space-gold animate-pulse"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-space-gold">+5,000 reservas este mes</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight text-white font-serif">
                Deja de <span className="block text-transparent bg-clip-text bg-gradient-to-r from-space-gold via-white to-space-gold">buscar barberos</span>
                y empieza a <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-space-gold to-yellow-600">reservarlos.</span>
              </h1>

              <p className="text-xl text-space-muted mb-10 max-w-2xl font-light leading-relaxed">
                Spacey conecta a los mejores profesionales de barbería con clientes que valoran su tiempo. Agenda en segundos, sin llamadas, sin esperas.
              </p>

              {/* Search Box in Hero */}
              <form onSubmit={handleSearch} className="mb-12 max-w-lg">
                <div className="flex items-center bg-space-card border border-space-gold/30 rounded-full p-2 relative group focus-within:ring-2 focus-within:ring-space-gold/50 transition-all shadow-lg shadow-black/20">
                  <Search className="ml-4 text-space-gold group-focus-within:text-white transition-colors" size={20} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="¿Qué servicio buscas? (ej. Corte, Barba)"
                    className="flex-1 bg-transparent pl-4 text-white placeholder-space-muted focus:outline-none text-sm h-12"
                  />
                  <button type="submit" className="bg-gradient-to-r from-space-gold to-yellow-600 text-white px-8 py-3 rounded-full font-bold text-sm hover:brightness-110 transition shadow-lg shadow-space-gold/20 uppercase tracking-wide">
                    Buscar
                  </button>
                </div>
              </form>

              {/* Stats */}
              <div className="flex flex-wrap gap-8">
                <div>
                  <div className="text-3xl font-bold text-space-gold font-serif">4.9★</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-space-muted">Valoración</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white font-serif">500+</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-space-muted">Barberos Pro</div>
                </div>
              </div>
            </div>

            {/* Right Column (Visual) - RESTORED TESTIMONIALS */}
            <div className="animate-fade-in hidden lg:block relative">
              {/* Floating Elements (Testimonials) */}
              <div className="absolute -left-4 -top-8 glass-effect border border-space-gold/20 rounded-2xl p-5 w-64 shadow-xl shadow-black/20 z-20 animate-float bg-space-card/80 backdrop-blur-md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-space-gold to-yellow-600 flex items-center justify-center text-white font-bold">JL</div>
                  <div>
                    <div className="font-bold text-white text-sm">José López</div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} size={10} className="text-space-gold fill-space-gold" />)}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-space-muted italic">"Spacey hizo mi vida más fácil. Reservo en 2 minutos y siempre encuentro horario."</p>
              </div>

              <div className="absolute -right-4 top-12 glass-effect border border-space-gold/20 rounded-2xl p-5 w-64 shadow-xl shadow-black/20 z-10 animate-float-slow bg-space-card/80 backdrop-blur-md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-space-card2 to-space-card flex items-center justify-center text-white font-bold border border-space-gold/30">MR</div>
                  <div>
                    <div className="font-bold text-white text-sm">Miguel Rivera</div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} size={10} className="text-space-gold fill-space-gold" />)}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-space-muted italic">"Me encanta el sistema. Nunca más espero sentado en la barbería."</p>
              </div>

              {/* Decorative Card */}
              <div className="glass-effect border border-space-gold/20 rounded-3xl p-8 mt-20 shadow-2xl relative z-0 bg-space-card/60 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-space-gold to-yellow-600 flex items-center justify-center shadow-lg shadow-space-gold/20">
                    <Search className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white font-serif">Búsqueda inteligente</h3>
                    <p className="text-xs text-space-gold uppercase tracking-widest">Encuentra tu estilo</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Corte moderno', 'Barba', 'Tinte', 'Afeitado clásico'].map(tag => (
                    <span key={tag} className="text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full bg-space-card2 border border-space-border/50 text-space-muted hover:border-space-gold hover:text-white transition cursor-pointer">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Directory Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-20" id="directory">

        {/* Customer Appointments */}
        {customerAppointments.length > 0 && (
          <div className="mb-12 animate-fade-in">
            <div className="bg-space-card border border-space-gold/20 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
              <div className="bg-gradient-to-r from-space-card2 to-space-card border-b border-space-border/20 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="text-space-gold" size={20} />
                  <h2 className="text-lg font-bold text-white font-serif">Mis Próximas Citas</h2>
                </div>
                <span className="bg-space-gold/20 text-space-gold text-xs font-bold px-2 py-1 rounded-full border border-space-gold/30">
                  {customerAppointments.length} activa(s)
                </span>
              </div>
              <div className="p-4">
                {loadingApts ? (
                  <div className="py-8 flex justify-center"><LoadingSpinner /></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customerAppointments.map((apt: any) => (
                      <div key={apt.id} className="bg-space-card2 rounded-2xl p-5 border border-space-border/50 shadow-sm flex justify-between items-center hover:border-space-gold/50 hover:shadow-lg transition-all group">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold text-space-gold uppercase tracking-widest px-2 py-0.5 bg-space-gold/10 rounded-full border border-space-gold/20 truncate max-w-[120px]">{apt.business?.name}</span>
                            {apt.statusBadge === 'today' && <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest px-2 py-0.5 bg-orange-400/20 rounded-full border border-orange-400/30">Hoy</span>}
                          </div>
                          <h4 className="font-bold text-lg mb-1 text-white font-serif">{apt.service_name}</h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-space-muted">
                            <div className="flex items-center gap-1.5"><Calendar size={14} className="text-space-gold" /><span>{formatRelativeTime(apt.appointment_date, apt.start_time)}</span></div>
                            <div className="flex items-center gap-1.5"><Clock size={14} className="text-space-gold" /><span>{apt.start_time.slice(0, 5)}</span></div>
                          </div>
                        </div>
                        <button onClick={() => handleCancelApt(apt.id)} className="ml-4 w-10 h-10 flex items-center justify-center rounded-full text-space-muted hover:text-space-danger hover:bg-space-danger/10 transition-all border border-transparent hover:border-space-danger/30">
                          <XCircle size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {error && <div className="bg-space-danger/10 border border-space-danger/30 text-space-danger px-4 py-3 rounded-xl mb-8 shadow-sm text-center">⚠️ {error}</div>}

        {loading ? (
          <div className="bg-space-card rounded-3xl p-12 shadow-xl flex flex-col items-center justify-center min-h-[300px] border border-space-gold/20">
            <LoadingSpinner />
            <p className="text-space-gold mt-4 animate-pulse uppercase tracking-widest text-xs font-bold">Buscando las mejores barberías...</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Favorites Section */}
            {favoriteBusinesses.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6 px-2">
                  <span className="bg-space-gold/10 p-2 rounded-lg text-space-gold border border-space-gold/20"><Star size={24} className="fill-space-gold" /></span>
                  <h2 className="text-2xl font-bold text-white font-serif">Tus Favoritas</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {favoriteBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={true} />)}
                </div>
              </section>
            )}

            {/* All Businesses Section */}
            <section>
              <div className="flex items-center gap-3 mb-6 px-2">
                <h2 className="text-2xl font-bold text-white font-serif">Recomendadas para ti</h2>
                <span className="bg-space-card2 text-space-gold px-3 py-1 rounded-full text-xs font-bold border border-space-gold/20">{allBusinesses.length}</span>
              </div>
              {allBusinesses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {allBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={favoriteSlugs.includes(b.slug)} />)}
                </div>
              ) : (
                <div className="bg-space-card rounded-3xl p-12 text-center border border-dashed border-space-border/30 shadow-sm">
                  <div className="w-20 h-20 bg-space-card2 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50"><Scissors size={32} className="text-space-muted" /></div>
                  <h3 className="text-lg font-bold text-white mb-2">No encontramos barberías</h3>
                  <p className="text-space-muted max-w-md mx-auto">Parece que no hay negocios registrados o activos en este momento.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-20 border-t border-space-gold/10 pt-10 pb-6 bg-space-bg relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <div className="w-9 h-9 bg-gradient-to-br from-space-gold to-yellow-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-space-gold/10">
                  <Scissors size={20} />
                </div>
                <span className="text-xl font-bold tracking-tight text-white font-serif">Spacey</span>
              </div>
              <p className="text-space-muted text-sm mt-2 font-light">Reserva tu barbero en segundos</p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-space-muted text-sm">© {new Date().getFullYear()} Spacey. Todos los derechos reservados.</p>
              <p className="text-space-muted text-xs mt-1 uppercase tracking-widest text-[10px]">Diseñado con pasión para amantes del buen estilo</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
