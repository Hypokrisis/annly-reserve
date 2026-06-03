import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
    LayoutDashboard, Scissors, Users, Calendar, LogOut, Menu, X,
    Settings, Globe, Clock, CreditCard, Zap, Moon, Sun, Sparkles, ChevronRight
} from 'lucide-react';

interface DashboardLayoutProps { children: React.ReactNode; }

const NAV_ITEMS = [
    { name: 'Inicio',         href: '/dashboard',              icon: LayoutDashboard, roles: ['owner','admin','staff'] },
    { name: 'Citas',          href: '/dashboard/appointments', icon: Calendar,        roles: ['owner','admin','staff'] },
    { name: 'Clientes',       href: '/dashboard/clients',      icon: Users,           roles: ['owner','admin'] },
    { name: 'Servicios',      href: '/dashboard/services',     icon: Scissors,        roles: ['owner','admin'] },
    { name: 'Equipo',         href: '/dashboard/barbers',      icon: Users,           roles: ['owner','admin'] },
    { name: 'Horarios',       href: '/dashboard/schedules',    icon: Clock,           roles: ['owner','admin'] },
    { name: 'Marketing',      href: '/dashboard/campaigns',    icon: Zap,             roles: ['owner','admin'] },
    { name: 'Asistente IA',   href: '/dashboard/ai-assistant', icon: Sparkles,        roles: ['owner','admin'] },
    { name: 'Suscripción',    href: '/dashboard/billing',      icon: CreditCard,      roles: ['owner','admin'] },
    { name: 'Configuración',  href: '/dashboard/settings',     icon: Settings,        roles: ['owner','admin'] },
];

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, currentBusiness, logout, role } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [mobileOpen, setMobileOpen] = React.useState(false);

    const nav = NAV_ITEMS.filter(i => i.roles.includes(role || 'staff'));

    const handleLogout = async () => {
        try { await logout(); navigate('/login'); } catch {}
        setMobileOpen(false);
    };

    const initials = currentBusiness?.name?.slice(0, 2).toUpperCase() || 'SP';

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 h-16 border-b border-space-border flex-shrink-0">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0" style={{ background: `rgb(var(--space-primary))` }}>
                    <img src="/logo.png" alt="Spacey" className="w-full h-full object-cover object-top scale-110" />
                </div>
                <span className="font-bold text-space-text text-base tracking-tight">Spacey</span>
                <button className="lg:hidden ml-auto p-1 text-space-muted hover:text-space-text transition" onClick={() => setMobileOpen(false)}>
                    <X size={18} />
                </button>
            </div>

            {/* Business */}
            {currentBusiness && (
                <div className="mx-3 mt-4 mb-1 px-3 py-2.5 rounded-xl flex items-center gap-2.5 flex-shrink-0" style={{ background: `rgb(var(--space-card2))`, border: `1px solid rgb(var(--space-border))` }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: `linear-gradient(135deg, rgb(var(--space-primary-light)), rgb(var(--space-primary)))` }}>
                        {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold truncate" style={{ color: `rgb(var(--space-text))` }}>{currentBusiness.name}</p>
                        <p className="text-[9px] uppercase tracking-widest font-medium" style={{ color: `rgb(var(--space-muted))` }}>{role}</p>
                    </div>
                </div>
            )}

            {/* Nav */}
            <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-hide">
                <p className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: `rgba(var(--space-muted), 0.6)` }}>Navegación</p>
                {nav.map(item => {
                    const active = location.pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`nav-item ${active ? 'active' : ''}`}
                        >
                            <Icon size={16} className="flex-shrink-0" />
                            <span className="flex-1">{item.name}</span>
                            {active && <ChevronRight size={12} className="opacity-60 flex-shrink-0" />}
                        </Link>
                    );
                })}

                <div className="pt-2 mt-2" style={{ borderTop: `1px solid rgb(var(--space-border))` }}>
                    <Link to="/" onClick={() => setMobileOpen(false)} className="nav-item">
                        <Globe size={16} className="flex-shrink-0" />
                        <span>Ver Página</span>
                    </Link>
                </div>
            </nav>

            {/* User footer */}
            <div className="px-3 py-4 flex-shrink-0" style={{ borderTop: `1px solid rgb(var(--space-border))` }}>
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: `rgb(var(--space-card2))` }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: `rgba(var(--space-primary), 0.15)`, color: `rgb(var(--space-primary))` }}>
                        {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold truncate" style={{ color: `rgb(var(--space-text))` }}>{user?.email}</p>
                    </div>
                    <button
                        onClick={toggleTheme}
                        title="Cambiar tema"
                        className="p-1.5 rounded-lg transition-all hover:opacity-80 flex-shrink-0"
                        style={{ color: `rgb(var(--space-muted))` }}
                    >
                        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                    </button>
                    <button
                        onClick={handleLogout}
                        title="Cerrar sesión"
                        className="p-1.5 rounded-lg transition-all hover:opacity-80 flex-shrink-0"
                        style={{ color: `rgb(var(--space-danger))` }}
                    >
                        <LogOut size={15} />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex" style={{ background: `rgb(var(--space-bg))`, color: `rgb(var(--space-text))` }}>

            {/* Mobile top bar */}
            <header
                className="lg:hidden fixed top-3 left-3 right-3 z-40 h-14 rounded-2xl flex items-center justify-between px-4 shadow-lg"
                style={{ background: `rgba(var(--space-card), 0.95)`, backdropFilter: 'blur(20px)', border: `1px solid rgb(var(--space-border))` }}
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0" style={{ background: `rgb(var(--space-primary))` }}>
                        <img src="/logo.png" alt="Spacey" className="w-full h-full object-cover object-top scale-110" />
                    </div>
                    <span className="font-bold text-space-text text-sm">Spacey</span>
                </div>
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="p-2 rounded-lg transition-all hover:opacity-80"
                    style={{ color: `rgb(var(--space-muted))` }}
                >
                    {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </header>

            {/* Mobile backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 lg:hidden"
                    style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 w-56 z-50 flex flex-col h-screen transform transition-transform duration-250 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:block`}
                style={{ background: `rgb(var(--sidebar-bg))`, borderRight: `1px solid rgb(var(--space-border))` }}
            >
                <SidebarContent />
            </aside>

            {/* Main */}
            <main className="flex-1 min-w-0 overflow-y-auto lg:ml-56 pt-20 lg:pt-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
                    {children}
                </div>
            </main>
        </div>
    );
};
