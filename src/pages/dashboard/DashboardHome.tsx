import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardHome() {
    const { business, barbers, services } = useBusiness();
    const { user, role } = useAuth();

    return (
        <DashboardLayout>
            <div className="max-w-6xl">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Bienvenido, {user?.email}
                </h1>
                <p className="text-gray-600 mb-8">
                    Rol: <span className="font-semibold capitalize">{role}</span>
                </p>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Servicios</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">
                                    {services.length}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">✂️</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Barberos</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">
                                    {barbers.filter(b => b.is_active).length}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">👥</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Negocio</p>
                                <p className="text-lg font-bold text-gray-900 mt-1">
                                    {business?.name || 'N/A'}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">🏪</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Public Link Card */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 shadow-lg text-white mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold mb-2">Tu Página de Reservas</h2>
                            <p className="text-indigo-100 mb-4">
                                Comparte este enlace con tus clientes para que puedan agendar citas.
                            </p>
                            <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                                <code className="text-sm font-mono flex-1">
                                    {window.location.origin}/book/{business?.slug}
                                </code>
                                <a
                                    href={`/book/${business?.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-white text-indigo-600 rounded-md text-sm font-semibold hover:bg-indigo-50 transition"
                                >
                                    Abrir
                                </a>
                            </div>
                        </div>
                        <div className="hidden md:block text-6xl opacity-20">
                            🔗
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link
                            to="/dashboard/services"
                            className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
                        >
                            <h3 className="font-semibold text-gray-900">Gestionar Servicios</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Añade o edita los servicios que ofreces
                            </p>
                        </Link>
                        <Link
                            to="/dashboard/barbers"
                            className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
                        >
                            <h3 className="font-semibold text-gray-900">Gestionar Barberos</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Administra tu equipo de trabajo
                            </p>
                        </Link>
                        <Link
                            to="/dashboard/schedules"
                            className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
                        >
                            <h3 className="font-semibold text-gray-900">Configurar Horarios</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Define los horarios de trabajo
                            </p>
                        </Link>
                        <Link
                            to="/dashboard/appointments"
                            className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
                        >
                            <h3 className="font-semibold text-gray-900">Ver Citas</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Gestiona las reservas del día
                            </p>
                        </Link>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
