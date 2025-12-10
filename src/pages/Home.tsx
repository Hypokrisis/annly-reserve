import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MapPin, Star, ArrowRight, Scissors, Calendar, Clock } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<BusinessResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, slug, description, address, city')
        .ilike('name', `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      console.error('Error searching businesses:', error);
      alert('Error de conexión: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
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
              <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                Soy Barbero
              </Link>
              <Link
                to="/signup"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                Registrar Negocio
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-indigo-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Tu estilo, tu tiempo.
            <br />
            <span className="text-indigo-400">Reserva en segundos.</span>
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Encuentra las mejores barberías cerca de ti y agenda tu cita sin llamadas ni esperas.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative">
            <div className="relative flex items-center">
              <Search className="absolute left-4 text-gray-400" size={24} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Busca por nombre de barbería..."
                className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 text-lg focus:ring-4 focus:ring-indigo-500 focus:outline-none shadow-xl"
              />
              <button
                type="submit"
                className="absolute right-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition"
              >
                Buscar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Search Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : hasSearched ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {searchResults.length > 0
                ? `Resultados para "${searchTerm}"`
                : `No encontramos barberías con el nombre "${searchTerm}"`}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((business) => (
                <Link
                  key={business.id}
                  to={`/book/${business.slug}`}
                  className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition flex flex-col h-full"
                >
                  <div className="h-48 bg-gray-100 relative">
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
                      <h3 className="text-xl font-bold">{business.name}</h3>
                      {business.city && (
                        <div className="flex items-center text-sm text-gray-200 mt-1">
                          <MapPin size={14} className="mr-1" />
                          {business.city}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <p className="text-gray-600 mb-4 line-clamp-2 flex-1">
                      {business.description || 'Sin descripción disponible.'}
                    </p>
                    <div className="flex items-center justify-between text-indigo-600 font-medium group-hover:translate-x-1 transition">
                      <span>Reservar Cita</span>
                      <ArrowRight size={20} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          /* Features Section (Default View) */
          <div className="py-12">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">¿Por qué usar AnnlyReserve?</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                La forma más fácil de gestionar tus citas, ya seas cliente o dueño de negocio.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
                  <Calendar size={32} />
                </div>
                <h3 className="text-xl font-bold mb-3">Reserva 24/7</h3>
                <p className="text-gray-600">
                  Agenda tu cita en cualquier momento, desde cualquier lugar. Sin llamadas ni esperas.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-purple-600">
                  <Clock size={32} />
                </div>
                <h3 className="text-xl font-bold mb-3">Ahorra Tiempo</h3>
                <p className="text-gray-600">
                  Olvídate de las filas. Llega a tu hora y recibe el servicio que mereces.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-pink-600">
                  <Star size={32} />
                </div>
                <h3 className="text-xl font-bold mb-3">Los Mejores Profesionales</h3>
                <p className="text-gray-600">
                  Encuentra a los barberos más calificados y lee reseñas de otros clientes.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
          <p>&copy; {new Date().getFullYear()} AnnlyReserve. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
