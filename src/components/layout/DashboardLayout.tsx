import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    LayoutDashboard,
    Scissors,
    Users,
    Calendar,
    LogOut,
    Menu,
    X,
    Settings,
    Globe,
    Clock,
    CreditCard
} from 'lucide-react';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, currentBusiness, logout, role } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const allNavigation = [
        { name: 'Dashboard',      href: '/dashboard',              icon: LayoutDashboard, roles: ['owner', 'admin', 'staff'] },
        { name: 'Servicios',      href: '/dashboard/services',     icon: Scissors,        roles: ['owner', 'admin'] },
        { name: 'Equipo',         href: '/dashboard/barbers',      icon: Users,           roles: ['owner', 'admin'] },
        { name: 'Horarios',       href: '/dashboard/schedules',    icon: Clock,           roles: ['owner', 'admin'] },
        { name: 'Citas',          href: '/dashboard/appointments', icon: Calendar,        roles: ['owner', 'admin', 'staff'] },
        { name: 'Clientes',       href: '/dashboard/clients',      icon: Users,           roles: ['owner', 'admin'] },
        { name: 'Suscripción',    href: '/dashboard/billing',      icon: CreditCard,      roles: ['owner', 'admin'] },
        { name: 'Configuración',  href: '/dashboard/settings',     icon: Settings,        roles: ['owner', 'admin'] },
        { name: 'Ver Página',     href: '/',                       icon: Globe,           roles: ['owner', 'admin', 'staff'] },
    ];

    const navigation = allNavigation.filter(item => item.roles.includes(role || 'staff'));

    const handleLogout = async () => {
        try {
            await logout();
            setIsMobileMenuOpen(false);
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const initials = currentBusiness?.name?.substring(0, 2).toUpperCase() || 'SP';

    return (
        <div className="min-h-screen bg-space-bg text-space-text flex">

            {/* ── Mobile Header (Pill Bar) ───────────────────── */}
            <header className="lg:hidden fixed top-4 left-4 right-4 z-40 h-16 bg-white/95 backdrop-blur-md rounded-full border border-space-border shadow-lg flex items-center justify-between px-6">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-space-primary rounded-full flex items-center justify-center shadow-btn">
                        <Scissors size={18} className="text-white" />
                    </div>
                    <span className="font-bold text-space-text text-lg tracking-tight uppercase">Spacey</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2.5 text-space-muted hover:text-space-primary hover:bg-space-card2 rounded-full transition"
                    aria-label="Toggle menu"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* ── Mobile Backdrop ───────────────────────────────── */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-space-text/30 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* ── Sidebar ───────────────────────────────────────── */}
            <aside className={`
                fixed lg:sticky top-0 inset-y-0 left-0 w-64 
                bg-white border-r border-space-border z-50 
                flex flex-col h-screen
                transform transition-transform duration-300 ease-in-out
                lg:translate-x-0 overflow-y-auto
                ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            `}>
                {/* Logo */}
                <div className="h-16 px-5 flex items-center border-b border-space-border flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-space-primary rounded-xl flex items-center justify-center shadow-btn flex-shrink-0">
                            <Scissors size={18} className="text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-space-text leading-tight">Spacey</p>
                            <p className="text-[10px] text-space-muted font-medium tracking-widest uppercase">Dashboard</p>
                        </div>
                    </div>
                    <button className="lg:hidden ml-auto p-1 text-space-muted hover:text-space-primary" onClick={() => setIsMobileMenuOpen(false)}>
                        <X size={18} />
                    </button>
                </div>

                {/* Business Badge */}
                {currentBusiness && (
                    <div className="mx-4 mt-4 p-3 bg-space-card2 rounded-xl border border-space-border flex items-center gap-3 flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-space-primary flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-space-muted font-semibold uppercase tracking-wider">Negocio</p>
                            <p className="text-sm font-semibold text-space-text truncate">{currentBusiness.name}</p>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                    <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-space-muted/70">Menú</p>
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`
                                    flex items-center gap-3 px-3 py-2.5 rounded-xl 
                                    text-sm font-medium transition-all duration-150
                                    ${isActive
                                        ? 'bg-space-primary text-white shadow-btn'
                                        : 'text-space-muted hover:text-space-primary hover:bg-space-card2'
                                    }
                                `}
                            >
                                <Icon size={18} className="flex-shrink-0" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Footer (Desktop only) */}
                <div className="hidden lg:block px-3 py-4 border-t border-space-border flex-shrink-0 mb-6 font-bold">
                    <div className="flex items-center gap-3 bg-space-card2 p-3 rounded-2xl border border-space-border/50">
                        <div className="w-10 h-10 rounded-full bg-space-primary-light flex items-center justify-center text-space-primary font-black text-sm flex-shrink-0 shadow-sm border border-space-primary/10">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-space-text truncate">{user?.email}</p>
                            <p className="text-[10px] text-space-muted font-bold uppercase tracking-widest">{role}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-3 bg-white text-space-danger hover:text-white hover:bg-space-danger rounded-xl transition flex-shrink-0 shadow-sm border border-space-border/50"
                            title="Cerrar sesión"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Mobile Bottom Navigation (Definitive Fix) ───────────────────── */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-space-border px-8 py-3 pb-safe flex items-center justify-between shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
                <Link to="/dashboard" className={`flex flex-col items-center gap-1 ${location.pathname === '/dashboard' ? 'text-space-primary' : 'text-space-muted'}`}>
                    <LayoutDashboard size={22} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Panel</span>
                </Link>
                
                <div className="relative">
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-14 h-14 bg-space-primary rounded-full flex items-center justify-center text-white shadow-xl border-4 border-white active:scale-90 transition-transform">
                        <Scissors size={24} />
                    </div>
                </div>

                <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-space-danger animate-pulse">
                    <LogOut size={22} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Salir</span>
                </button>
            </div>

            {/* ── Main Content ──────────────────────────────────── */}
            <main className="flex-1 min-w-0 overflow-y-auto pt-20 lg:pt-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                    {children}
                </div>
            </main>
        </div>
    );
};
