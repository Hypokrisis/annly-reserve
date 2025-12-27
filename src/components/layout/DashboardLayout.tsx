import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    LayoutDashboard,
    Scissors,
    Users,
    Calendar,
    LogOut,
    Menu,
    X
} from 'lucide-react';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const location = useLocation();
    const { user, currentBusiness, logout, role } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const allNavigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'admin', 'staff'] },
        { name: 'Servicios', href: '/dashboard/services', icon: Scissors, roles: ['owner', 'admin'] },
        { name: 'Barberos', href: '/dashboard/barbers', icon: Users, roles: ['owner', 'admin'] },
        { name: 'Citas', href: '/dashboard/appointments', icon: Calendar, roles: ['owner', 'admin', 'staff'] },
        { name: 'Website / Home', href: '/home', icon: LayoutDashboard, roles: ['owner', 'admin', 'staff'] },
    ];

    const navigation = allNavigation.filter(item => item.roles.includes(role || 'staff'));

    const handleLogout = async () => {
        try {
            await logout();
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Header */}
            <header className="lg:hidden bg-white border-b border-gray-200 fixed top-0 w-full z-40 h-16 flex items-center justify-between px-4">
                <h1 className="text-xl font-bold text-indigo-600">Annly Reserve</h1>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Backdrop for mobile menu */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-indigo-600">Annly Reserve</h1>
                            <button className="lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>
                        {currentBusiness && (
                            <p className="text-sm text-gray-600 mt-1">{currentBusiness.name}</p>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1">
                        {navigation.map((item) => {
                            const isActive = location.pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center px-4 py-3 rounded-lg transition ${isActive
                                        ? 'bg-indigo-50 text-indigo-600 font-semibold'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <Icon size={20} className="mr-3" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-500 mb-1">Usuario</p>
                                <p className="text-sm font-bold text-gray-900 truncate">
                                    {user?.email}
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="ml-3 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                title="Cerrar sesión"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="lg:ml-64 p-4 md:p-8 pt-20 lg:pt-8">
                {children}
            </main>
        </div>
    );
};
