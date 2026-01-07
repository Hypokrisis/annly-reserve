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
    X,
    Settings
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
        { name: 'Configuración', href: '/dashboard/settings', icon: Settings, roles: ['owner', 'admin'] },
        { name: 'Ver Web Pública', href: '/', icon: LayoutDashboard, roles: ['owner', 'admin', 'staff'] },
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
        <div className="min-h-screen bg-space-bg text-space-text flex">
            {/* Mobile Header */}
            <header className="lg:hidden bg-space-card/80 backdrop-blur-md border-b border-space-border fixed top-0 w-full z-40 h-16 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-space-primary to-space-purple rounded-lg flex items-center justify-center text-white shadow-lg">
                        <Scissors size={16} />
                    </div>
                    <h1 className="text-lg font-bold text-white">Spacey</h1>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-space-muted hover:text-white hover:bg-space-card2 rounded-lg transition"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Backdrop for mobile menu */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed lg:sticky top-0 inset-y-0 left-0 w-72 bg-space-card border-r border-space-border z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-y-auto ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                <div className="flex flex-col min-h-screen">
                    {/* Logo */}
                    <div className="p-6 border-b border-space-border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-space-primary to-space-purple rounded-xl flex items-center justify-center text-white shadow-lg shadow-space-primary/20">
                                <Scissors size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white tracking-tight">Spacey</h1>
                                <p className="text-[10px] text-space-muted uppercase tracking-widest font-bold">Dashboard</p>
                            </div>
                            <button className="lg:hidden ml-auto" onClick={() => setIsMobileMenuOpen(false)}>
                                <X size={20} className="text-space-muted hover:text-white" />
                            </button>
                        </div>
                        {currentBusiness && (
                            <div className="mt-6 p-3 bg-space-card2 rounded-xl border border-space-border flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-space-bg flex items-center justify-center text-space-primary border border-space-border">
                                    <span className="text-xs font-bold">{currentBusiness.name.substring(0, 2).toUpperCase()}</span>
                                </div>
                                <div className="truncate">
                                    <p className="text-xs text-space-muted font-medium">Gestionando:</p>
                                    <p className="text-sm font-bold text-white truncate">{currentBusiness.name}</p>
                                </div>
                            </div>
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
                                    className={`flex items-center px-4 py-3.5 rounded-xl transition group relative overflow-hidden ${isActive
                                        ? 'text-white font-bold bg-space-card2 border border-space-border shadow-lg'
                                        : 'text-space-muted hover:text-white hover:bg-space-card2/50 hover:shadow-md border border-transparent'
                                        }`}
                                >
                                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-space-primary rounded-l-xl"></div>}
                                    <Icon size={20} className={`mr-3 transition-colors ${isActive ? 'text-space-primary' : 'text-space-muted group-hover:text-space-primary'}`} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-space-border bg-space-bg/30">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] uppercase font-bold text-space-muted tracking-widest mb-0.5">Usuario</p>
                                <p className="text-sm font-bold text-white truncate">
                                    {user?.email}
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="ml-3 p-2.5 text-space-muted hover:text-space-danger hover:bg-space-danger/10 rounded-xl transition border border-transparent hover:border-space-danger/20"
                                title="Cerrar sesión"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 p-4 md:p-8 pt-20 lg:pt-8 overflow-y-auto max-w-full">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};
