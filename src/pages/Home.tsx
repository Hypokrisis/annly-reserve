import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPin, Star, Scissors, Calendar, Clock, Heart, XCircle, Search, LogOut, LayoutDashboard, Menu, ArrowRight } from 'lucide-react';
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    loadData();
    loadFavorites();

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
      className="group bg-space-card border border-space-border/50 rounded-none overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col h-full relative"
    >
      {/* Geometric Accent Line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-space-gold transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left z-20"></div>

      <button
        onClick={(e) => toggleFavorite(e, business.slug)}
        className="absolute top-3 right-3 z-10 p-2 bg-space-luxury/80 backdrop-blur-md hover:bg-space-luxury border border-space-gold/20 transition shadow-lg"
      >
        <Heart size={16} className={`transition-colors ${isFavorite ? 'fill-space-danger text-space-danger' : 'text-space-gold hover:text-space-danger'}`} />
      </button>

      <div className="h-56 bg-space-card2 relative overflow-hidden">
        <img
          src={business.banner_url || business.logo_url || `https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800`}
          alt={business.name}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-1000 grayscale group-hover:grayscale-0"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800';
          }}
        />
        <div className="absolute inset-0 bg-space-luxury/40 group-hover:bg-transparent transition-colors duration-500 mix-blend-multiply"></div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-space-luxury to-transparent">
          <h3 className="text-xl font-bold leading-tight text-white font-serif tracking-wide">{business.name}</h3>
          {business.city && (
            <div className="flex items-center text-xs text-space-gold mt-1 uppercase tracking-widest font-bold">
              <MapPin size={10} className="mr-1" />
              {business.city}
            </div>
          )}
        </div>
      </div>
      <div className="p-6 flex-1 flex flex-col bg-space-card relative">
        <p className="text-space-muted text-sm mb-6 line-clamp-2 flex-1 font-light leading-relaxed">
          {business.description || 'Experiencia premium de barbería. Reserva tu cita hoy.'}
        </p>
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-space-border/30">
          <div className="flex items-center gap-1">
            <Star size={12} className="text-space-gold fill-space-gold" />
            <span className="text-sm font-bold text-white">5.0</span>
          </div>
          <span className="text-space-gold text-xs font-black uppercase tracking-widest group-hover:underline flex items-center gap-2 group-hover:gap-3 transition-all">
            Reservar
            <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );

  const favoriteBusinesses = allBusinesses.filter(b => favoriteSlugs.includes(b.slug));

  return (
    <div className="min-h-screen bg-space-luxury text-space-text font-sans selection:bg-space-gold selection:text-space-luxury text-sm md:text-base">

      {/* Smooth Header */}
      <nav className={`fixed w-full z-50 top-0 transition-all duration-500 ${scrolled ? 'bg-space-luxury/90 backdrop-blur-md shadow-2xl py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo(0, 0)}>
            <div className="w-10 h-10 border border-space-gold/50 flex items-center justify-center text-space-gold shadow-[0_0_15px_rgba(212,175,55,0.1)] group-hover:bg-space-gold group-hover:text-space-luxury transition-all duration-500">
              <Scissors size={20} />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white font-serif uppercase">YourBrand</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="text-xs font-bold uppercase tracking-[0.2em] text-space-muted hover:text-space-gold transition-colors duration-300">Inicio</a>
            <a href="#directory" className="text-xs font-bold uppercase tracking-[0.2em] text-space-muted hover:text-space-gold transition-colors duration-300">Colección</a>
            <a href="#" className="text-xs font-bold uppercase tracking-[0.2em] text-space-muted hover:text-space-gold transition-colors duration-300">Premium</a>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  className="flex items-center gap-2"
                >
                  <span className="hidden md:block text-xs font-bold uppercase tracking-widest text-space-gold mr-2">Mi Cuenta</span>
                  <div className="w-8 h-8 rounded-full border border-space-gold/50 flex items-center justify-center text-space-gold text-xs font-bold hover:bg-space-gold hover:text-space-luxury transition-all">
                    {user.email?.[0].toUpperCase()}
                  </div>
                </button>
                {isAccountMenuOpen && (
                  <div className="absolute right-0 mt-4 w-64 bg-space-luxury border border-space-gold/20 shadow-2xl p-2 z-50 animate-fade-in flex flex-col gap-1">
                    <Link to="/dashboard" className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-space-muted hover:bg-space-gold/10 hover:text-white transition-colors flex items-center gap-3">
                      <LayoutDashboard size={14} /> Dashboard
                    </Link>
                    <button onClick={handleLogout} className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-space-danger hover:bg-space-danger/10 transition-colors flex items-center gap-3 w-full text-left">
                      <LogOut size={14} /> Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-xs font-bold uppercase tracking-widest text-white hover:text-space-gold transition-colors">
                  Login
                </Link>
                <Link to="/signup" className="px-6 py-2.5 bg-space-gold text-space-luxury text-xs font-black uppercase tracking-widest hover:bg-white transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - Geometric Luxury */}
      <div className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-space-luxury">
        {/* Geometric Background Shapes */}
        <div className="absolute top-0 right-0 w-[50vw] h-[80vh] bg-space-gold/5 transform rotate-12 translate-x-20 -translate-y-20 rounded-[100px] blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[40vw] h-[60vh] bg-space-luxury transform -rotate-12 -translate-x-20 translate-y-20 border border-space-gold/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Geometric Overlay Lines */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[10%] left-[5%] w-[1px] h-[300px] bg-space-gold"></div>
          <div className="absolute top-[10%] left-[5%] w-[300px] h-[1px] bg-space-gold"></div>
          <div className="absolute bottom-[10%] right-[5%] w-[1px] h-[300px] bg-space-gold"></div>
          <div className="absolute bottom-[10%] right-[5%] w-[300px] h-[1px] bg-space-gold"></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left Content */}
            <div className="animate-slide-in">
              <span className="text-space-gold text-xs font-black uppercase tracking-[0.3em] mb-4 block">Minimalist Luxury</span>
              <h1 className="text-6xl md:text-8xl font-serif text-white mb-8 leading-[0.9]">
                Elevate <br />
                <span className="text-space-gold italic">Your Style.</span>
              </h1>

              <p className="text-lg text-space-muted mb-12 max-w-md font-light leading-relaxed border-l border-space-gold/30 pl-6">
                Experience the art of grooming. Connect with elite barbers who understand that time is your most valuable asset.
              </p>

              {/* Search Box - Minimalist */}
              <form onSubmit={handleSearch} className="mb-12 max-w-md relative group">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="SEARCH SERVICES..."
                  className="w-full bg-transparent border-b border-space-muted/30 py-4 text-white text-sm font-bold uppercase tracking-widest placeholder-space-muted/50 focus:outline-none focus:border-space-gold transition-colors"
                />
                <button type="submit" className="absolute right-0 top-1/2 -translate-y-1/2 text-space-gold hover:text-white transition-colors">
                  <ArrowRight size={24} />
                </button>
              </form>
            </div>

            {/* Right Content - Abstract Visuals */}
            <div className="hidden lg:block relative h-[600px] animate-fade-in">
              <div className="absolute top-0 right-0 w-full h-full border border-space-gold/20 rounded-full opacity-20 animate-spin-slow"></div>
              <div className="absolute top-10 right-10 w-[90%] h-[90%] border border-space-gold/10 rounded-full opacity-20 animate-spin-reverse-slow"></div>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-[450px] bg-space-card overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=1000&auto=format&fit=crop"
                  alt="Hero"
                  className="w-full h-full object-cover grayscale opacity-80 mix-blend-luminosity hover:scale-110 transition-transform duration-[2s]"
                />
                <div className="absolute inset-0 border border-space-gold/20"></div>
              </div>

              <div className="absolute bottom-20 -left-10 bg-space-luxury border border-space-gold/30 p-6 max-w-[200px]">
                <p className="text-space-gold text-2xl font-serif italic mb-2">"Pure Class."</p>
                <p className="text-[10px] text-space-muted uppercase tracking-widest">Premium Service</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Directory Section */}
      <div className="bg-space-card relative z-20 py-24" id="directory">
        <div className="absolute top-0 left-0 w-full h-px bg-space-gold/20"></div>

        <div className="max-w-7xl mx-auto px-6">

          {/* Customer Appointments Ticket Style */}
          {customerAppointments.length > 0 && (
            <div className="mb-20 animate-fade-in">
              <div className="flex items-end justify-between mb-8 border-b border-space-border/50 pb-4">
                <h2 className="text-3xl font-serif text-white">Your Appointments</h2>
                <span className="text-xs font-bold text-space-gold uppercase tracking-widest">Upcoming</span>
              </div>

              <div className="grid gap-6">
                {customerAppointments.map((apt: any) => (
                  <div key={apt.id} className="group relative bg-space-luxury border border-space-gold/10 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between hover:border-space-gold/30 transition-all duration-500">
                    <div className="flex items-center gap-6 w-full md:w-auto">
                      <div className="text-center px-4 border-r border-space-border/50">
                        <p className="text-xs font-bold text-space-muted uppercase tracking-widest">Date</p>
                        <p className="text-2xl font-serif text-white mt-1">{apt.start_time.slice(0, 5)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-space-gold uppercase tracking-widest mb-1">{apt.business?.name}</p>
                        <p className="text-xl text-white font-light">{apt.service_name}</p>
                      </div>
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center gap-6">
                      <div className="hidden md:block w-32 h-px bg-space-border/50 group-hover:bg-space-gold/50 transition-colors"></div>
                      <button onClick={() => handleCancelApt(apt.id)} className="text-xs font-bold text-space-muted hover:text-space-danger uppercase tracking-widest transition-colors py-2 px-4 border border-transparent hover:border-space-danger/30">
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center border border-space-gold/10">
              <LoadingSpinner />
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-space-gold animate-pulse">Curating Selection...</p>
            </div>
          ) : (
            <div className="space-y-24">
              {favoriteBusinesses.length > 0 && (
                <section>
                  <div className="flex items-center gap-4 mb-10">
                    <span className="w-12 h-px bg-space-gold"></span>
                    <h2 className="text-2xl font-serif text-white italic">Favorites</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {favoriteBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={true} />)}
                  </div>
                </section>
              )}

              <section>
                <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-4">
                    <span className="w-12 h-px bg-space-gold"></span>
                    <h2 className="text-2xl font-serif text-white italic">Strictly Curated</h2>
                  </div>
                  <span className="text-xs font-bold text-space-muted uppercase tracking-widest">{allBusinesses.length} Locations</span>
                </div>

                {allBusinesses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                    {allBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={favoriteSlugs.includes(b.slug)} />)}
                  </div>
                ) : (
                  <div className="py-24 text-center border border-space-gold/10 bg-space-luxury/50">
                    <p className="text-space-gold font-serif text-xl italic mb-2">Exclusive.</p>
                    <p className="text-xs text-space-muted uppercase tracking-widest">No locations available at the moment.</p>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-space-luxury border-t border-space-gold/20 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h3 className="text-4xl font-serif text-white mb-6">YourBrand</h3>
          <div className="flex justify-center gap-8 mb-12">
            {['Instagram', 'Twitter', 'LinkedIn'].map(social => (
              <a key={social} href="#" className="text-xs font-bold uppercase tracking-widest text-space-muted hover:text-space-gold transition-colors">{social}</a>
            ))}
          </div>
          <p className="text-[10px] text-space-muted uppercase tracking-widest">© {new Date().getFullYear()} Spacey Reserve. Minimalist Luxury.</p>
        </div>
      </footer>

    </div>
  );
}

export default Home;
