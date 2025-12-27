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
      className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full relative"
    >
      <button
        onClick={(e) => toggleFavorite(e, business.slug)}
        className="absolute top-3 right-3 z-10 p-2 bg-black/40 backdrop-blur-md rounded-full hover:bg-black/60 transition shadow-sm border border-white/20"
      >
        <Heart size={18} className={`${isFavorite ? 'fill-red-500 text-red-500' : 'text-white hover:text-red-400'}`} />
      </button>

      <div className="h-48 bg-gray-200 relative overflow-hidden">
        <img
          src={business.banner_url || business.logo_url || `https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800`}
          alt={business.name}
          className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="text-xl font-bold leading-tight mb-1">{business.name}</h3>
          {business.city && (
            <div className="flex items-center text-xs text-gray-300 font-medium">
              <MapPin size={12} className="mr-1 text-indigo-400" />
              {business.city}
            </div>
          )}
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col bg-white">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-green-100 text-green-700 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold">Disponible</span>
        </div>
        <p className="text-gray-600 text-sm mb-5 line-clamp-2 flex-1">
          {business.description || 'Reserva tu cita con los mejores profesionales de la zona.'}
        </p>
        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-bold text-gray-900">4.9</span>
            <span className="text-xs text-gray-400">(120+)</span>
          </div>
          <span className="text-indigo-600 text-sm font-bold group-hover:underline">Reservar</span>
        </div>
      </div>
    </Link>
  );

  const favoriteBusinesses = allBusinesses.filter(b => favoriteSlugs.includes(b.slug));

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="fixed w-full z-50 transition-all duration-300 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
              <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center text-white shadow-lg">
                <Scissors size={20} />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">AnnlyReserve</span>
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition border border-gray-100"
                  >
                    <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {user.email?.[0].toUpperCase()}
                    </div>
                  </button>
                  {isAccountMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden py-1 z-50">
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Mi Cuenta</p>
                        <p className="text-sm font-bold text-gray-900 truncate">{user.email}</p>
                      </div>
                      <div className="p-1">
                        <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition" onClick={() => setIsAccountMenuOpen(false)}>
                          <LayoutDashboard size={18} className="text-indigo-600" />
                          <span>Ir a mi Dashboard</span>
                        </Link>
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition">
                          <LogOut size={18} />
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-row items-center gap-1.5">
                  <Link to="/login" className="text-[10px] sm:text-xs font-bold text-gray-500 hover:text-black transition uppercase tracking-tighter px-2 py-1.5 border border-gray-100 rounded-lg whitespace-nowrap">Acceso</Link>
                  <Link to="/signup" className="bg-black hover:bg-gray-800 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold transition text-[10px] sm:text-xs shadow-sm uppercase tracking-tight whitespace-nowrap">Registrar</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="relative h-[400px] md:h-[500px] flex items-center justify-center bg-gray-900 overflow-hidden pt-16">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070&auto=format&fit=crop" alt="Barber" className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-gray-50"></div>
        </div>
        <div className="relative z-10 w-full max-w-4xl px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight drop-shadow-lg">Descubre y reserva <br className="hidden md:block" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-white">los mejores barberos</span></h1>
          <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl mx-auto font-light leading-relaxed">Sin llamadas. Sin esperas. Agenda tu estilo en segundos.</p>
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative group px-2">
            <div className="relative flex items-center bg-white rounded-2xl md:rounded-full p-1.5 shadow-2xl transition-transform group-hover:scale-[1.01]">
              <Search className="absolute left-4 md:left-6 text-gray-400" size={20} />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="¿Qué servicio buscas?" className="w-full pl-10 md:pl-14 pr-24 md:pr-36 py-3 rounded-full text-gray-900 placeholder-gray-400 focus:outline-none text-sm md:text-base" />
              <button type="submit" className="absolute right-1.5 bg-black hover:bg-gray-800 text-white px-5 md:px-8 py-2.5 md:py-3 rounded-xl md:rounded-full font-semibold transition shadow-md text-sm md:text-base">Buscar</button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 -mt-12 md:-mt-20 relative z-20" id="directory">
        {customerAppointments.length > 0 && (
          <div className="mb-12">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-indigo-50">
              <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-2"><Calendar size={20} /><h2 className="text-lg font-bold">Mis Próximas Citas</h2></div>
                <span className="bg-white/20 text-xs font-bold px-2 py-1 rounded-full">{customerAppointments.length} activa(s)</span>
              </div>
              <div className="p-2 md:p-4">
                {loadingApts ? <div className="py-8 flex justify-center"><LoadingSpinner /></div> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customerAppointments.map((apt: any) => (
                      <div key={apt.id} className="bg-white rounded-2xl p-5 border border-indigo-50 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-all">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest px-2 py-0.5 bg-indigo-50 rounded-full">{apt.business?.name}</span>
                            {apt.statusBadge === 'today' && <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest px-2 py-0.5 bg-orange-50 rounded-full">Hoy</span>}
                            {apt.statusBadge === 'late' && <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest px-2 py-0.5 bg-red-50 rounded-full">Atrasada</span>}
                            {apt.statusBadge === 'expired' && <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 py-0.5 bg-gray-50 rounded-full">Expirada</span>}
                            {apt.statusBadge === 'upcoming' && <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest px-2 py-0.5 bg-green-50 rounded-full">Próxima</span>}
                          </div>
                          <h4 className="font-bold text-gray-900 text-lg mb-1">{apt.service_name}</h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                            <div className="flex items-center gap-1.5"><Calendar size={14} className="text-indigo-400" /><span>{formatRelativeTime(apt.appointment_date, apt.start_time)}</span></div>
                            <div className="flex items-center gap-1.5"><Clock size={14} className="text-indigo-400" /><span>{apt.start_time.slice(0, 5)}</span></div>
                          </div>
                        </div>
                        <button onClick={() => handleCancelApt(apt.id)} className="ml-4 w-11 h-11 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"><XCircle size={22} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-8 shadow-sm">⚠️ {error}</div>}

        {loading ? (
          <div className="bg-white rounded-3xl p-12 shadow-xl flex flex-col items-center justify-center min-h-[300px]">
            <LoadingSpinner /><p className="text-gray-500 mt-4 animate-pulse">Buscando las mejores barberías...</p>
          </div>
        ) : (
          <div className="space-y-12">
            {favoriteBusinesses.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6 px-2"><span className="bg-yellow-100 p-2 rounded-lg text-yellow-600"><Star size={24} className="fill-yellow-600" /></span><h2 className="text-2xl font-bold text-gray-900">Tus Favoritas</h2></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{favoriteBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={true} />)}</div>
              </section>
            )}
            {recentBusinesses.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6 px-2"><span className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Clock size={24} /></span><h2 className="text-2xl font-bold text-gray-900">Vistos Recientemente</h2></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{recentBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={favoriteSlugs.includes(b.slug)} />)}</div>
              </section>
            )}
            <section>
              <div className="flex items-center gap-3 mb-6 px-2"><h2 className="text-2xl font-bold text-gray-900">Recomendadas para ti</h2><span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">{allBusinesses.length}</span></div>
              {allBusinesses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">{allBusinesses.map(b => <BusinessCard key={b.id} business={b} isFavorite={favoriteSlugs.includes(b.slug)} />)}</div>
              ) : (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300 shadow-sm">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50"><Scissors size={32} /></div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No encontramos barberías</h3>
                  <p className="text-gray-500 max-w-md mx-auto">Parece que no hay negocios registrados o activos en este momento.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <footer className="bg-white border-t border-gray-100 py-16 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div>
            <div className="flex items-center gap-2 justify-center md:justify-start mb-4"><div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white"><Scissors size={16} /></div><span className="text-lg font-bold text-gray-900">AnnlyReserve</span></div>
            <p className="text-gray-500 text-sm max-w-xs">La plataforma líder para reservar citas de belleza y bienestar en tu ciudad.</p>
          </div>
          <div className="flex gap-8 text-sm font-medium text-gray-600"><a href="#" className="hover:text-black">Explorar</a><a href="#" className="hover:text-black">Para Negocios</a><a href="#" className="hover:text-black">Ayuda</a></div>
          <p className="text-gray-400 text-xs">&copy; {new Date().getFullYear()} AnnlyReserve Inc.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
