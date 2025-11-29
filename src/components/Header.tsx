import { Calendar } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Sistema de Reservas</h1>
          </div>
          <nav className="flex space-x-6">
            <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors">
              Inicio
            </a>
            <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors">
              Mis Reservas
            </a>
            <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors">
              Contacto
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
