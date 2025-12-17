import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MapPin, Star, ArrowRight, Scissors, Calendar, Clock, Heart } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface BusinessResult {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address?: string;
  city?: string;
}

function Home() {
  const navigate = useNavigate();
  const [allBusinesses, setAllBusinesses] = useState<BusinessResult[]>([]);
  const [recentBusinesses, setRecentBusinesses] = useState<BusinessResult[]>([]);
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    const saved = localStorage.getItem('favoriteBusinesses');
    if (saved) {
      setFavoriteSlugs(JSON.parse(saved));
    }
  };

  const toggleFavorite = (e: React.MouseEvent, slug: string) => {
    e.preventDefault(); // Prevent navigation
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
    try {
      // Fetch all businesses (active)
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, slug, description, address, city')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const businesses = data || [];
      setAllBusinesses(businesses);

      // Load Recent from LocalStorage IDs/Slugs and match with fetched data
      // Or fetch specifically if needed, but for now we filter from the loaded list 
      // (Optimization: In a real app, fetch specifics by ID)
      const recentSlugs = JSON.parse(localStorage.getItem('recentBusinesses') || '[]');
      if (recentSlugs.length > 0) {
        // We can fetch just these specific ones to be sure
        const { data: recentData } = await supabase
          .from('businesses')
          .select('id, name, slug, description, address, city')
          .in('slug', recentSlugs);

        if (recentData) setRecentBusinesses(recentData);
      }

    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const BusinessCard = ({ business, isFavorite }: { business: BusinessResult, isFavorite: boolean }) => (
    <Link
      to={`/book/${business.slug}`}
      className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition flex flex-col h-full relative"
    >
      <button
        onClick={(e) => toggleFavorite(e, business.slug)}
        className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition shadow-sm"
      >
        <Heart
          size={20}
          className={`${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'}`}
        />
      </button>

      <div className="h-40 bg-gray-100 relative">
        <img
          src={`https://source.unsplash.com/random/800x600/?barbershop,${business.id}`}
          alt={business.name}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-4 left-4 text-white">
          <h3 className="text-lg font-bold">{business.name}</h3>
          {business.city && (
            <div className="flex items-center text-xs text-gray-200 mt-1">
              <MapPin size={12} className="mr-1" />
              {business.city}
            </div>
          )}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Activa</span>
        </div>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-1">
          {business.description || 'Agenda tu cita con los mejores profesionales.'}
        </p>
        <div className="flex items-center justify-between text-indigo-600 text-sm font-medium group-hover:translate-x-1 transition">
          <span>Reservar</span>
          <ArrowRight size={16} />
        </div>
      </div>
    </Link>
  );

  const favoriteBusinesses = allBusinesses.filter(b => favoriteSlugs.includes(b.slug));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <Scissors size={20} />
              </div>
              <span className="text-xl font-bold text-gray-900">AnnlyReserve</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium text-sm md:text-base">
                Soy Barbero
              </Link>
              <Link
                to="/signup"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm md:text-base"
              >
                Registrar Negocio
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Header Hero */}
        <div className="text-center py-8">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            Reserva tu próxima cita
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explora las mejores barberías y salones. Sin llamadas, sin esperas.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Favorites Section */}
            {favoriteBusinesses.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <Star className="text-yellow-400 fill-yellow-400" />
                  <h2 className="text-2xl font-bold text-gray-900">Tus Favoritas</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {favoriteBusinesses.map(b => (
                    <BusinessCard key={b.id} business={b} isFavorite={true} />
                  ))}
                </div>
              </section>
            )}

            {/* Recents Section */}
            {recentBusinesses.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="text-indigo-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Vistos Recientemente</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recentBusinesses.map(b => (
                    <BusinessCard key={b.id} business={b} isFavorite={favoriteSlugs.includes(b.slug)} />
                  ))}
                </div>
              </section>
            )}

            {/* All Businesses Directory */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Todas las Barberías</h2>
                <span className="text-sm text-gray-500">{allBusinesses.length} resultados</span>
              </div>
              {allBusinesses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {allBusinesses.map(b => (
                    <BusinessCard key={b.id} business={b} isFavorite={favoriteSlugs.includes(b.slug)} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-500">No hay negocios registrados aún.</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500">
          <p>&copy; {new Date().getFullYear()} AnnlyReserve</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
