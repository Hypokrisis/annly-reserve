import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPin, Star, Scissors, Calendar, Clock, Heart, XCircle, Search, LogOut, LayoutDashboard, Menu } from 'lucide-react';
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
      className="group bg-space-card border border-space-border rounded-2xl overflow-hidden hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col h-full relative backdrop-blur-sm cursor-pointer"
    >
      <button
        onClick={(e) => toggleFavorite(e, business.slug)}
        className="absolute top-3 right-3 z-10 p-2 bg-space-card/80 backdrop-blur-md rounded-full hover:bg-space-card border border-space-border transition shadow-lg hover:scale-110"
      >
        <Heart size={18} className={`transition-colors ${isFavorite ? 'fill-space-danger text-space-danger' : 'text-space-muted hover:text-space-danger'}`} />
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
        <div className="absolute inset-0 bg-gradient-to-t from-space-bg via-space-bg/60 to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold leading-tight mb-1 text-white">{business.name}</h3>
          {business.city && (
            <div className="flex items-center text-xs text-space-muted font-medium">
              <MapPin size={12} className="mr-1 text-space-primary" />
              {business.city}
            </div>
          )}
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-space-success/20 text-space-success text-xs uppercase tracking-wider px-2 py-1 rounded-full font-bold border border-space-success/30">Disponible</span>
        </div>
        <p className="text-space-muted text-sm mb-5 line-clamp-2 flex-1">
          {business.description || 'Reserva tu cita con los mejores profesionales de la zona.'}
        </p>
        <div className="mt-auto pt-4 border-t border-space-border flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star size={14} className="text-space-yellow fill-space-yellow" />
            <span className="text-sm font-bold text-space-text">4.9</span>
            <span className="text-xs text-space-muted">(120+)</span>
          </div>
          <span className="text-space-primary text-sm font-bold group-hover:underline flex items-center gap-1">
            Reservar
            <Scissors size={14} className="group-hover:rotate-12 transition" />
          </span>
        </div>
      </div>
    </Link>
  );

  const favoriteBusinesses = allBusinesses.filter(b => favoriteSlugs.includes(b.slug));

  return (
    <div className="min-h-screen bg-space-bg text-space-text">
      {/* Header Pill */}
      <nav className="fixed w-full z-50 top-6 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="pill-nav flex justify-between items-center px-4">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo(0, 0)}>
              <div className="w-10 h-10 bg-gradient-to-br from-space-primary via-space-purple to-space-pink rounded-full flex items-center justify-center text-white shadow-lg animate-pulse-subtle">
                <Scissors size={22} className="text-white" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-space-primary to-space-purple bg-clip-text text-transparent">Spacey</span>
                <div className="text-[10px] uppercase tracking-widest text-space-muted font-bold">Reserva tu Barbero</div>
              </div>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#" className="text-sm font-medium text-space-muted hover:text-space-text transition">Inicio</a>
              <a href="#directory" className="text-sm font-medium text-space-muted hover:text-space-text transition">Barberías</a>
              <a href="#" className="text-sm font-medium text-space-muted hover:text-space-text transition">Servicios</a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-space-card transition border border-transparent hover:border-space-border"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-space-primary to-space-purple rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      {user.email?.[0].toUpperCase()}
                    </div>
                  </button>
                  {isAccountMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-space-card rounded-2xl shadow-2xl border border-space-border overflow-hidden py-1 z-50 animate-fade-in">
                      <div className="px-4 py-3 border-b border-space-border">
                        <p className="text-xs text-space-muted font-medium uppercase tracking-widest">Mi Cuenta</p>
                        <p className="text-sm font-bold text-space-text truncate">{user.email}</p>
                      </div>
                      <div className="p-1">
                        <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 text-sm text-space-muted hover:text-space-text hover:bg-space-card2 rounded-xl transition" onClick={() => setIsAccountMenuOpen(false)}>
                          <LayoutDashboard size={18} className="text-space-primary" />
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
                  <Link to="/login" className="text-xs font-bold text-space-muted hover:text-space-text transition px-4 py-2 rounded-full border border-space-border hover:border-space-primary bg-space-card2 hover:bg-space-card">
                    Acceso
                  </Link>
                  <Link to="/signup" className="bg-gradient-to-r from-space-primary to-space-purple hover:opacity-90 text-white px-5 py-2 rounded-full font-bold transition text-xs shadow-lg shadow-space-primary/30 hover:shadow-space-primary/50">
                    Registrar
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-space-bg via-space-card to-space-card2"></div>
          <div className="absolute top-1/4 left-10 w-72 h-72 bg-gradient-to-br from-space-primary/10 to-space-purple/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-gradient-to-br from-space-purple/10 to-space-pink/10 rounded-full blur-3xl animate-float-slow"></div>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(139, 92, 246, 0.3) 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl px-4 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left Column */}
            <div className="animate-slide-in">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-space-border bg-space-card2">
                <div className="w-2 h-2 rounded-full bg-space-success animate-pulse"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-space-success">+5,000 reservas este mes</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight text-white">
                Deja de <span className="block text-transparent bg-clip-text bg-gradient-to-r from-space-primary via-space-purple to-space-pink">buscar barberos</span>
                y empieza a <span className="block text-transparent bg-clip-text bg-gradient-to-r from-space-yellow via-space-primary to-space-purple">reservarlos.</span>
              </h1>

              <p className="text-xl text-space-muted mb-10 max-w-2xl font-light leading-relaxed">
                Spacey conecta a los mejores profesionales de barbería con clientes que valoran su tiempo. Agenda en segundos, sin llamadas, sin esperas.
              </p>

              {/* Search Box in Hero */}
              <form onSubmit={handleSearch} className="mb-12 max-w-lg">
                <div className="flex items-center bg-space-card border border-space-border rounded-full p-2 relative group focus-within:ring-2 focus-within:ring-space-primary/50 transition-all shadow-lg">
                  <Search className="ml-4 text-space-muted group-focus-within:text-space-primary transition-colors" size={20} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="¿Qué servicio buscas? (ej. Corte, Barba)"
                    className="flex-1 bg-transparent pl-4 text-space-text placeholder-space-muted focus:outline-none text-sm h-12"
                  />
                  <button type="submit" className="bg-gradient-to-r from-space-primary to-space-purple text-white px-8 py-3 rounded-full font-bold text-sm hover:opacity-90 transition shadow-lg shadow-space-primary/20">
                    Buscar
                  </button>
                </div>
              </form>

              {/* Stats */}
              <div className="flex flex-wrap gap-8">
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-space-primary to-space-purple bg-clip-text text-transparent">4.9★</div>
                  <div className="text-sm text-space-muted">Valoración promedio</div>
                </div>
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-space-purple to-space-pink bg-clip-text text-transparent">500+</div>
                  <div className="text-sm text-space-muted">Barberos profesionales</div>
                </div>
              </div>
            </div>

            {/* Right Column (Visual) */}
            <div className="animate-fade-in hidden lg:block relative">
              {/* Floating Elements (Testimonials) */}
              <div className="absolute -left-4 -top-8 glass-effect border border-space-border rounded-2xl p-5 w-64 shadow-xl z-20 animate-float">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-space-yellow to-orange-500 flex items-center justify-center text-white font-bold">JL</div>
                  <div>
                    <div className="font-bold text-white text-sm">José López</div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} size={10} className="text-space-yellow fill-space-yellow" />)}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-space-muted italic">"Spacey hizo mi vida más fácil. Reservo en 2 minutos y siempre encuentro horario."</p>
              </div>

              <div className="absolute -right-4 top-12 glass-effect border border-space-border rounded-2xl p-5 w-64 shadow-xl z-10 animate-float-slow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-space-purple to-space-pink flex items-center justify-center text-white font-bold">MR</div>
                  <div>
                    <div className="font-bold text-white text-sm">Miguel Rivera</div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} size={10} className="text-space-yellow fill-space-yellow" />)}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-space-muted italic">"Me encanta el sistema. Nunca más espero sentado en la barbería."</p>
              </div>

              {/* Decorative Card */}
              <div className="glass-effect border border-space-border rounded-3xl p-8 mt-20 shadow-2xl relative z-0">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-space-primary to-space-purple flex items-center justify-center shadow-lg shadow-space-primary/20">
                    <Search className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Búsqueda inteligente</h3>
                    <p className="text-sm text-space-muted">Encuentra el barbero perfecto</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Corte moderno', 'Barba', 'Tinte', 'Afeitado clásico'].map(tag => (
                    <span key={tag} className="text-xs px-3 py-1.5 rounded-full bg-space-card2 border border-space-border text-space-muted hover:border-space-primary hover:text-white transition cursor-pointer">
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
            <div className="bg-space-card border border-space-border rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
              <div className="bg-gradient-to-r from-space-primary/20 to-space-purple/20 border-b border-space-border px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="text-space-primary" size={20} />
                  <h2 className="text-lg font-bold text-white">Mis Próximas Citas</h2>
                </div>
                <span className="bg-space-primary/20 text-space-primary text-xs font-bold px-2 py-1 rounded-full border border-space-primary/30">
                  {customerAppointments.length} activa(s)
                </span>
              </div>
              <div className="p-4">
                {loadingApts ? (
                  <div className="py-8 flex justify-center"><LoadingSpinner /></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customerAppointments.map((apt: any) => (
                      <div key={apt.id} className="bg-space-card2 rounded-2xl p-5 border border-space-border shadow-sm flex justify-between items-center hover:border-space-primary/50 hover:shadow-lg transition-all group">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold text-space-primary uppercase tracking-widest px-2 py-0.5 bg-space-primary/20 rounded-full border border-space-primary/30 truncate max-w-[120px]">{apt.business?.name}</span>
                            {apt.statusBadge === 'today' && <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest px-2 py-0.5 bg-orange-400/20 rounded-full border border-orange-400/30">Hoy</span>}
                            {apt.statusBadge === 'late' && <span className="text-[10px] font-bold text-space-danger uppercase tracking-widest px-2 py-0.5 bg-space-danger/20 rounded-full border border-space-danger/30">Atrasada</span>}
                          </div>
                          <h4 className="font-bold text-lg mb-1 text-white">{apt.service_name}</h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-space-muted">
                            <div className="flex items-center gap-1.5"><Calendar size={14} className="text-space-primary" /><span>{formatRelativeTime(apt.appointment_date, apt.start_time)}</span></div>
                            <div className="flex items-center gap-1.5"><Clock size={14} className="text-space-primary" /><span>{apt.start_time.slice(0, 5)}</span></div>
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
          <div className="bg-space-card rounded-3xl p-12 shadow-xl flex flex-col items-center justify-center min-h-[300px] border border-space-border">
            <LoadingSpinner />
            <p className="text-space-muted mt-4 animate-pulse">Buscando las mejores barberías...</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Favorites Section */}
            {favoriteBusinesses.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6 px-2">
                  <span className="bg-space-yellow/20 p-2 rounded-lg text-space-yellow border border-space-yellow/30"><Star size={24} className="fill-space-yellow" /></span>
                  <h2 className="text-2xl font-bold text-white">Tus Favoritas</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {favoriteBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={true} />)}
                </div>
              </section>
            )}

            {/* Recent Section */}
            {recentBusinesses.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6 px-2">
                  <span className="bg-space-primary/20 p-2 rounded-lg text-space-primary border border-space-primary/30"><Clock size={24} /></span>
                  <h2 className="text-2xl font-bold text-white">Vistos Recientemente</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recentBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={favoriteSlugs.includes(b.slug)} />)}
                </div>
              </section>
            )}

            {/* All Businesses Section */}
            <section>
              <div className="flex items-center gap-3 mb-6 px-2">
                <h2 className="text-2xl font-bold text-white">Recomendadas para ti</h2>
                <span className="bg-space-card2 text-space-muted px-3 py-1 rounded-full text-xs font-bold border border-space-border">{allBusinesses.length}</span>
              </div>
              {allBusinesses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {allBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={favoriteSlugs.includes(b.slug)} />)}
                </div>
              ) : (
                <div className="bg-space-card rounded-3xl p-12 text-center border border-dashed border-space-border shadow-sm">
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
      <footer className="mt-20 border-t border-space-border pt-10 pb-6 bg-space-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <div className="w-9 h-9 bg-gradient-to-br from-space-primary to-space-purple rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Scissors size={20} />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">Spacey</span>
              </div>
              <p className="text-space-muted text-sm mt-2">Reserva tu barbero en segundos</p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-space-muted text-sm">b© {new Date().getFullYear()} Spacey. Todos los derechos reservados.</p>
              <p className="text-space-muted text-xs mt-1">Diseñado con pasión para amantes del buen estilo</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
