import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPin, Star, Scissors, Calendar, Clock, Heart, XCircle, Search, LogOut, LayoutDashboard, Check } from 'lucide-react';
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
            <span className="text-xs text-space-muted font-medium">(120+)</span>
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
      <nav className="fixed w-full z-50 top-6 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="pill-nav flex justify-between items-center px-4 backdrop-blur-xl bg-white/80 border border-space-border shadow-md shadow-space-primary/5">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo(0, 0)}>
              <div className="w-10 h-10 bg-space-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-space-primary/20 hover:scale-105 transition-transform rotate-3">
                <Scissors size={20} className="text-white -rotate-3" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-space-text uppercase">Spacey</span>
                <div className="text-[9px] uppercase tracking-[0.2em] text-space-muted font-bold -mt-1">Reserva tu Barbero</div>
              </div>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#" className="text-xs font-bold uppercase tracking-widest text-space-text hover:text-space-primary transition">Inicio</a>
              <a href="#directory" className="text-xs font-bold uppercase tracking-widest text-space-muted hover:text-space-primary transition">Barberías</a>
              <a href="#" className="text-xs font-bold uppercase tracking-widest text-space-muted hover:text-space-primary transition">Servicios</a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-space-bg transition border border-transparent hover:border-space-border"
                  >
                    <div className="w-9 h-9 bg-space-primary-light text-space-primary rounded-full flex items-center justify-center font-black text-sm border border-space-primary/20 shadow-sm">
                      {user.email?.[0].toUpperCase()}
                    </div>
                  </button>
                  {isAccountMenuOpen && (
                    <div className="absolute right-0 mt-3 w-64 bg-white rounded-[1.5rem] shadow-card-xl border border-space-border overflow-hidden py-1 z-50 animate-fade-in">
                      <div className="px-5 py-4 border-b border-space-border bg-space-bg">
                        <p className="text-[10px] text-space-muted font-black uppercase tracking-widest">Cuenta</p>
                        <p className="text-sm font-bold text-space-text truncate mt-0.5">{user.email}</p>
                      </div>
                      <div className="p-2 space-y-1">
                        <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-space-text hover:text-space-primary hover:bg-space-primary/5 rounded-xl transition" onClick={() => setIsAccountMenuOpen(false)}>
                          <LayoutDashboard size={18} />
                          <span>Ir al Dashboard</span>
                        </Link>
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-space-danger hover:bg-space-danger/10 rounded-xl transition">
                          <LogOut size={18} />
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link to="/login" className="text-xs font-bold text-space-text hover:text-space-primary transition px-5 py-2.5 rounded-full border border-space-border/50 hover:border-space-primary bg-white hover:bg-space-bg uppercase tracking-widest hidden sm:block">
                    Acceso
                  </Link>
                  <Link to="/signup" className="btn-primary py-2.5 px-6 text-xs uppercase tracking-widest shadow-btn">
                    Registrar
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20">
        <div className="relative z-10 w-full max-w-7xl px-4 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left Column */}
            <div className="animate-slide-in">
              <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-space-primary/20 bg-space-primary/5">
                <div className="w-2 h-2 rounded-full bg-space-success animate-pulse shadow-[0_0_8px_rgba(61,153,112,0.6)]"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-space-primary">Red de profesionales activos</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-[1.05] text-space-text uppercase">
                Deja de <span className="block text-space-primary">buscar.</span>
                Empieza a <span className="text-transparent bg-clip-text bg-gradient-to-r from-space-primary to-[#2a9d8f]">reservar.</span>
              </h1>

              <p className="text-lg md:text-xl text-space-muted mb-10 max-w-xl font-medium leading-relaxed">
                Spacey conecta a los profesionales más top con clientes que valoran su estilo. Agenda tu corte en segundos, sin filas.
              </p>

              {/* Search Box in Hero */}
              <form onSubmit={handleSearch} className="mb-12 max-w-xl">
                <div className="flex items-center bg-white border border-space-border hover:border-space-primary/50 focus-within:border-space-primary rounded-full p-2 relative group transition-all shadow-card">
                  <Search className="ml-4 text-space-muted group-focus-within:text-space-primary transition-colors shrink-0" size={20} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Barbería, Nombre, Servicio..."
                    className="flex-1 bg-transparent pl-4 text-space-text placeholder-space-muted/50 focus:outline-none text-sm h-14 font-medium"
                  />
                  <button type="submit" className="btn-primary h-12 px-8 uppercase tracking-widest text-xs ml-2">
                    Buscar
                  </button>
                </div>
              </form>

              {/* Stats */}
              <div className="flex flex-wrap gap-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-space-primary-light/30 rounded-2xl flex items-center justify-center text-space-primary"><Star size={20} className="fill-space-primary" /></div>
                  <div>
                    <div className="text-2xl font-black text-space-text">4.9/5</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-space-muted">Valoración</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-space-success/10 rounded-2xl flex items-center justify-center text-space-success"><Scissors size={20} /></div>
                  <div>
                    <div className="text-2xl font-black text-space-text">500+</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-space-muted">Barberos Pro</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (Visual Testimonials) */}
            <div className="animate-fade-in hidden lg:block relative h-[500px]">
              
              {/* Floating Profile 1 */}
              <div className="absolute right-0 top-10 bg-white border border-space-border/50 rounded-3xl p-6 w-72 shadow-card-xl z-20 animate-float">
                <div className="flex items-center gap-4 mb-4">
                  <img src="https://i.pravatar.cc/150?u=a" alt="User" className="w-12 h-12 rounded-2xl object-cover border border-space-border" />
                  <div>
                    <div className="font-bold text-space-text text-sm">Miguel Rivera</div>
                    <div className="flex gap-0.5 mt-0.5">
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} className="text-[#f59e0b] fill-[#f59e0b]" />)}
                    </div>
                  </div>
                </div>
                <p className="text-sm font-medium text-space-text leading-relaxed bg-space-bg p-4 rounded-2xl border border-space-border/50">"Reservé mi corte en 2 minutos. Nunca más espero sentado en una sala llena."</p>
              </div>

               {/* Floating Profile 2 */}
              <div className="absolute left-4 bottom-20 bg-white border border-space-border/50 rounded-3xl p-6 w-72 shadow-card-xl z-30 animate-float-slow">
                <div className="flex items-center justify-between mb-4 border-b border-space-border pb-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-space-primary flex items-center justify-center shadow-lg"><Calendar className="text-white" size={18} /></div>
                     <div>
                       <div className="font-black text-space-text text-sm uppercase tracking-wider">Cita Lista</div>
                       <div className="text-[10px] font-bold uppercase tracking-widest text-space-primary">Hoy 16:00</div>
                     </div>
                  </div>
                  <Check className="text-space-success bg-space-success/10 p-1 rounded-full" size={24} />
                </div>
                <div className="flex justify-between items-center bg-space-bg px-4 py-3 rounded-2xl">
                  <span className="text-xs font-bold text-space-muted">Servicio:</span>
                  <span className="text-xs font-black text-space-text">Corte Premium</span>
                </div>
              </div>

              {/* Decorative Background Blob behind cards */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-space-primary/10 rounded-full blur-[60px] -z-10"></div>
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
                  <h2 className="text-2xl font-black text-space-text uppercase tracking-tight">Recomendadas</h2>
                  <span className="bg-space-bg text-space-primary px-3 py-1 rounded-lg text-xs font-black uppercase shadow-sm border border-space-border">{allBusinesses.length}</span>
                </div>
              </div>
              
              {allBusinesses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {allBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={favoriteSlugs.includes(b.slug)} />)}
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
