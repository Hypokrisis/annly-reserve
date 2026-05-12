import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Star, Scissors, Calendar, Clock, Heart, XCircle, LogOut, LayoutDashboard, ArrowRight, Info, Instagram, Globe, X, Search, Moon, Sun } from 'lucide-react';
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
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [selectedBusinessDetails, setSelectedBusinessDetails] = useState<BusinessResult | null>(null);

  useEffect(() => {
    loadData();
    loadFavorites();
  }, []);

  const location = useLocation();

  useEffect(() => {
    loadCustomerAppointments();
  }, [user, location.pathname]);

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
      const enriched = data.map(apt => ({ ...apt, statusBadge: 'confirmed' })).filter(apt => apt.status === 'confirmed');
      setCustomerAppointments(enriched);
      if (enriched.length > 0) setLastAppointment(enriched[0]);
    } catch (err) {
      console.error('Error loading customer appointments', err);
    } finally {
      setLoadingApts(false);
    }
  }, [user]);

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
        .order('created_at', { ascending: false });
      if (bError) throw bError;
      const businessesData = (data || []).map(b => ({
        ...b,
        hasAhorro: b.services?.some((s: any) => s.is_active && s.price >= 10 && s.price <= 20),
        hasPremium: b.services?.some((s: any) => s.is_active && s.price >= 40),
        isFlash: true 
      }));
      setAllBusinesses(businessesData as any);
    } catch (err: any) {
      console.error('Error loading home data:', err);
      setError('No pudimos cargar las barberías.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsAccountMenuOpen(false);
  };

  const handleGeoLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortByDistance(true);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      }
    );
  };

  const energyFilters = [
    { id: 'saving', label: 'Económico', emoji: '💎', color: 'bg-zinc-800', description: 'Eficiencia máxima' },
    { id: 'premium', label: 'Exclusivo', emoji: '✨', color: 'bg-zinc-800', description: 'Experiencia VIP' },
    { id: 'flash', label: 'Inmediato', emoji: '⚡', color: 'bg-zinc-800', description: 'Disponible ahora' },
  ];

  const filteredBusinesses = activeMood
    ? allBusinesses.filter(b => {
      if (activeMood === 'saving') return (b as any).hasAhorro;
      if (activeMood === 'premium') return (b as any).hasPremium;
      return true;
    })
    : allBusinesses;

  const BusinessCard = ({ business, isFavorite }: { business: BusinessResult, isFavorite: boolean }) => (
    <div className="group card overflow-hidden flex flex-col h-full relative">
      <button
        onClick={(e) => toggleFavorite(e, business.slug)}
        className="absolute top-6 right-6 z-20 w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-space-primary hover:border-space-primary transition-all duration-500"
      >
        <Heart size={20} className={isFavorite ? 'fill-white text-white' : 'text-white/60'} />
      </button>

      <Link to={`/book/${business.slug}`} className="block h-64 relative overflow-hidden">
        <img
          src={business.banner_url || `https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800`}
          alt={business.name}
          className="w-full h-full object-cover group-hover:scale-110 transition duration-1000 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        
        <div className="absolute bottom-6 left-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md p-1 border border-white/20">
            <img
              src={business.logo_url || business.banner_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(business.name)}&background=000&color=fff`}
              className="w-full h-full object-cover rounded-xl"
              alt="Logo"
            />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tighter">{business.name}</h3>
            <div className="flex items-center text-[10px] text-white/60 font-black uppercase tracking-widest mt-1">
              <MapPin size={10} className="mr-1 text-space-primary" />
              {business.city}
            </div>
          </div>
        </div>
      </Link>

      <div className="p-8 flex-1 flex flex-col">
        <p className="text-zinc-400 text-sm mb-8 line-clamp-2 font-medium leading-relaxed">
          {business.description || 'Reserva tu cita con los mejores profesionales.'}
        </p>

        <div className="mt-auto flex items-center gap-4">
          <button
            onClick={() => setSelectedBusinessDetails(business)}
            className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <Info size={20} />
          </button>
          <Link
            to={`/book/${business.slug}`}
            className="flex-1 btn-primary h-14"
          >
            Reservar
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-space-bg text-space-text font-sans selection:bg-space-primary selection:text-space-bg">
      
      {/* Background Orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-space-primary/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 p-6 flex justify-center">
        <div className="w-full max-w-6xl h-20 bg-black/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] px-8 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-space-primary rounded-2xl flex items-center justify-center text-space-bg shadow-[0_0_20px_rgba(0,230,118,0.3)]">
              <Scissors size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter text-white">SPACEY</span>
          </div>

          <div className="hidden md:flex items-center gap-10">
            {['Inicio', 'Explorar', 'Precios'].map((item) => (
              <a key={item} href="#" className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white transition-colors">{item}</a>
            ))}
          </div>

          <div className="flex items-center gap-4">
             <button onClick={toggleTheme} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
               {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             {user ? (
               <Link to="/dashboard" className="w-12 h-12 rounded-2xl bg-space-primary flex items-center justify-center text-space-bg font-black">
                 {user.email?.[0].toUpperCase()}
               </Link>
             ) : (
               <Link to="/login" className="px-8 h-12 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-space-primary transition-all flex items-center">
                 Acceder
               </Link>
             )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-20">
        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-12 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-space-primary animate-ping"></span>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">The Future of Grooming</span>
        </div>

        <h1 className="text-7xl sm:text-8xl md:text-[12rem] font-black tracking-tighter leading-[0.8] mb-16 animate-fade-up">
          RESERVA <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-800">EL ESTILO</span>
        </h1>

        <div className="max-w-xl animate-fade-up delay-200">
          <p className="text-lg sm:text-xl text-zinc-500 font-medium leading-relaxed mb-12">
            Conecta con los mejores barberos y estilistas de tu ciudad. 
            Sin esperas. Sin fricción. Solo resultados impecables.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
            <button 
              onClick={() => document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-primary w-full sm:w-auto h-16 px-12 text-sm"
            >
              Comenzar ahora
            </button>
            <button 
              onClick={handleGeoLocation}
              className="w-full sm:w-auto h-16 px-12 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all flex items-center justify-center gap-3"
            >
              <MapPin size={18} className={isLocating ? 'animate-bounce' : ''} />
              {isLocating ? 'Ubicando...' : 'Cerca de mí'}
            </button>
          </div>
        </div>
      </header>

      {/* Intent Engine */}
      <section className="max-w-6xl mx-auto px-6 py-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {energyFilters.map((mood) => (
            <button
              key={mood.id}
              onClick={() => setActiveMood(activeMood === mood.id ? null : mood.id)}
              className={`group relative p-10 rounded-[3rem] border transition-all duration-700 text-left ${
                activeMood === mood.id 
                ? 'bg-space-primary/10 border-space-primary/40 shadow-[0_0_50px_-10px_rgba(0,230,118,0.2)]' 
                : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="text-5xl mb-12 group-hover:scale-110 transition-transform duration-500">{mood.emoji}</div>
              <h3 className="text-3xl font-black text-white tracking-tighter mb-2">{mood.label}</h3>
              <p className="text-zinc-500 font-medium">{mood.description}</p>
              
              <div className={`absolute bottom-10 right-10 w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center transition-all duration-500 ${
                activeMood === mood.id ? 'bg-space-primary text-space-bg rotate-90' : 'text-white/20'
              }`}>
                <ArrowRight size={20} />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Directory */}
      <main id="directory" className="max-w-7xl mx-auto px-6 py-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-24">
          <div>
            <h2 className="text-5xl sm:text-7xl font-black text-white tracking-tighter mb-6">
              EXPLORAR
            </h2>
            <div className="flex items-center gap-4 text-zinc-500 font-black text-[10px] uppercase tracking-[0.4em]">
              <span className="w-12 h-[2px] bg-space-primary"></span>
              {filteredBusinesses.length} resultados encontrados
            </div>
          </div>
          
          {activeMood && (
            <button onClick={() => setActiveMood(null)} className="text-[10px] font-black uppercase tracking-[0.3em] text-space-primary border-b border-space-primary pb-2">
              Limpiar filtros
            </button>
          )}
        </div>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-8 bg-white/5 rounded-[4rem] border border-white/5 backdrop-blur-xl">
            <LoadingSpinner />
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-space-primary animate-pulse">Analizando Disponibilidad</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredBusinesses.map(b => (
              <BusinessCard key={b.id} business={b} isFavorite={favoriteSlugs.includes(b.slug)} />
            ))}
          </div>
        )}
      </main>

      {/* Professional CTA */}
      <section className="max-w-6xl mx-auto px-6 py-32">
        <div className="relative p-16 sm:p-24 rounded-[4rem] bg-gradient-to-br from-zinc-900 to-black border border-white/5 overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-space-primary/10 rounded-full blur-[100px] -mr-48 -mt-48 group-hover:bg-space-primary/20 transition-all duration-1000"></div>
          
          <div className="relative z-10 max-w-2xl">
            <span className="text-space-primary text-[10px] font-black uppercase tracking-[0.5em] mb-8 block">For Professionals</span>
            <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tighter leading-none mb-10">
              POTENCIA TU <br /> NEGOCIO
            </h2>
            <p className="text-zinc-400 text-lg font-medium mb-12">
              Únete a la red más exclusiva de barberos y estilistas. 
              Agenda inteligente, pagos automáticos y crecimiento real.
            </p>
            <Link to="/how-it-works" className="btn-primary h-16 px-12">
              Registrar mi negocio
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between gap-20 mb-20">
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-space-primary rounded-2xl flex items-center justify-center text-space-bg">
                  <Scissors size={24} />
                </div>
                <span className="text-2xl font-black tracking-tighter text-white">SPACEY</span>
              </div>
              <p className="text-zinc-500 max-w-xs font-medium leading-relaxed">
                La plataforma líder para la reserva de servicios de estética y barbería.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-20">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white mb-8">Plataforma</h4>
                <div className="flex flex-col gap-4">
                  {['Explorar', 'Precios', 'Soporte'].map(item => (
                    <a key={item} href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">{item}</a>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white mb-8">Legal</h4>
                <div className="flex flex-col gap-4">
                  {['Privacidad', 'Términos', 'Cookies'].map(item => (
                    <a key={item} href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">{item}</a>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-16 border-t border-white/5">
            <p className="text-zinc-600 text-xs font-medium italic">© {new Date().getFullYear()} SPACEY PLATFORM. BEYOND STYLE.</p>
            <div className="flex items-center gap-6">
              {[Instagram, Globe].map((Icon, i) => (
                <a key={i} href="#" className="text-zinc-600 hover:text-white transition-colors">
                  <Icon size={20} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Modal Details */}
      {selectedBusinessDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-fade-in">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setSelectedBusinessDetails(null)}></div>
          <div className="relative w-full max-w-4xl bg-zinc-900 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
            <button onClick={() => setSelectedBusinessDetails(null)} className="absolute top-8 right-8 z-50 w-14 h-14 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all">
              <X size={24} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="h-64 md:h-full relative">
                <img src={selectedBusinessDetails.banner_url} className="w-full h-full object-cover" alt="Banner" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent"></div>
              </div>
              
              <div className="p-12 md:p-20">
                <div className="w-24 h-24 rounded-3xl bg-white/5 p-1 border border-white/10 mb-8">
                  <img src={selectedBusinessDetails.logo_url} className="w-full h-full object-cover rounded-2xl" alt="Logo" />
                </div>
                <h2 className="text-5xl font-black text-white tracking-tighter mb-6 leading-none">{selectedBusinessDetails.name}</h2>
                <div className="flex items-center text-[10px] text-space-primary font-black uppercase tracking-[0.4em] mb-10">
                  <MapPin size={12} className="mr-3" />
                  {selectedBusinessDetails.city}
                </div>
                
                <p className="text-zinc-400 text-lg font-medium leading-relaxed mb-12">
                  {selectedBusinessDetails.description}
                </p>
                
                <Link to={`/book/${selectedBusinessDetails.slug}`} className="btn-primary w-full h-20 text-sm">
                  RESERVAR AHORA
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;