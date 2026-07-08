import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
    Bell, Calendar, Check, Clock, Copy, CreditCard,
    Globe, LayoutDashboard, Lock, LogOut, Menu, Moon, Plus,
    Scissors, Settings, Sparkles, Sun, Users, X, Zap,
} from 'lucide-react';

interface DashboardLayoutProps { children: React.ReactNode; }

// ── Subscription gate screen ──────────────────────────────────────────────────
function TrialExpiredScreen() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#090d0b] px-4">
            <div className="w-full max-w-md rounded-3xl border border-[#243529] bg-[#131c17] p-10 text-center shadow-xl">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#ef4444]/10">
                    <Lock size={36} className="text-[#ef4444]" />
                </div>
                <h2 className="mb-3 text-2xl font-black text-[#f0f4ee]">Tu período de prueba expiró</h2>
                <p className="mb-8 leading-relaxed text-[#95ab8a]">
                    Para continuar usando Spacey Reserve y mantener acceso a tus citas, clientes y configuración, elige un plan.
                </p>
                <Link to="/dashboard/billing" className="block w-full rounded-full bg-[#9bc287] py-4 text-center font-extrabold text-[#22321c] transition hover:bg-[#86ad72]">
                    Ver planes y precios →
                </Link>
            </div>
        </div>
    );
}

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
    { name: 'Inicio',        href: '/dashboard',              icon: LayoutDashboard, roles: ['owner','admin','staff'] },
    { name: 'Citas',         href: '/dashboard/appointments', icon: Calendar,        roles: ['owner','admin','staff'] },
    { name: 'Clientes',      href: '/dashboard/clients',      icon: Users,           roles: ['owner','admin'] },
    { name: 'Servicios',     href: '/dashboard/services',     icon: Scissors,        roles: ['owner','admin'] },
    { name: 'Equipo',        href: '/dashboard/barbers',      icon: Users,           roles: ['owner','admin'] },
    { name: 'Horarios',      href: '/dashboard/schedules',    icon: Clock,           roles: ['owner','admin'] },
    { name: 'Marketing',     href: '/dashboard/campaigns',    icon: Zap,             roles: ['owner','admin'] },
    { name: 'Asistente IA',  href: '/dashboard/ai-assistant', icon: Sparkles,        roles: ['owner','admin'] },
    { name: 'Suscripción',   href: '/dashboard/billing',      icon: CreditCard,      roles: ['owner','admin'] },
    { name: 'Configuración', href: '/dashboard/settings',     icon: Settings,        roles: ['owner','admin'] },
];

const PAGE_INFO: Record<string, { title: string; subtitle: string }> = {
    '/dashboard':              { title: 'Inicio',        subtitle: 'Resumen del día' },
    '/dashboard/appointments': { title: 'Citas',         subtitle: 'Gestión de reservas' },
    '/dashboard/clients':      { title: 'Clientes',      subtitle: 'Directorio de clientes' },
    '/dashboard/services':     { title: 'Servicios',     subtitle: 'Catálogo de servicios' },
    '/dashboard/barbers':      { title: 'Equipo',        subtitle: 'Barberos y staff' },
    '/dashboard/schedules':    { title: 'Horarios',      subtitle: 'Disponibilidad' },
    '/dashboard/campaigns':    { title: 'Marketing',     subtitle: 'Campañas y recordatorios' },
    '/dashboard/ai-assistant': { title: 'Asistente IA',  subtitle: 'Bot de WhatsApp' },
    '/dashboard/billing':      { title: 'Suscripción',   subtitle: 'Plan y facturación' },
    '/dashboard/settings':     { title: 'Configuración', subtitle: 'Datos del negocio' },
    '/dashboard/team':         { title: 'Staff',          subtitle: 'Gestión del equipo' },
};

const DEMO_NOTIFS = [
    { icon: '💬', title: 'Reserva vía WhatsApp', desc: 'Carlos Méndez · Corte + Barba · 3:30 PM', time: 'hace 2m' },
    { icon: '✅', title: 'Cita confirmada',       desc: 'José M. · 2:00 PM con Kevin',             time: 'hace 15m' },
    { icon: '⭐', title: 'Nueva reseña',          desc: '4.9 — "Excelente servicio"',              time: 'hace 1h' },
];

// ── Layout ────────────────────────────────────────────────────────────────────
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const location = useLocation();
    const { user, currentBusiness, logout, role } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { subscription, loadingSubscription } = useBusiness();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [notifOpen,  setNotifOpen]  = useState(false);
    const [copied,     setCopied]     = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    // Close notification dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Close drawer on route change
    useEffect(() => { setMobileOpen(false); }, [location.pathname]);

    // ── Subscription gate ───────────────────────────────────────────────────
    const isBillingRoute = location.pathname === '/dashboard/billing';

    if (!isBillingRoute && loadingSubscription) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#090d0b]">
                <LoadingSpinner />
            </div>
        );
    }

    const isExpired =
        !isBillingRoute &&
        !!subscription &&
        subscription.status !== 'active' &&
        !!subscription.current_period_end &&
        new Date(subscription.current_period_end) < new Date();

    if (isExpired) return <TrialExpiredScreen />;

    // ── Derived ─────────────────────────────────────────────────────────────
    const nav      = NAV_ITEMS.filter(i => i.roles.includes(role || 'staff'));
    const pageInfo = PAGE_INFO[location.pathname] || { title: 'Dashboard', subtitle: '' };
    const initials = currentBusiness?.name?.slice(0, 2).toUpperCase() || 'SP';
    const bookingUrl = currentBusiness?.slug
        ? `${window.location.origin}/book/${currentBusiness.slug}`
        : null;

    const handleLogout   = async () => { try { await logout(); } catch {} };
    const handleCopyLink = () => {
        if (!bookingUrl) return;
        navigator.clipboard.writeText(bookingUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Shared sidebar/drawer content ───────────────────────────────────────
    const SidebarContent = () => (
        <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-[#1d2a23] px-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                    style={{ background: 'linear-gradient(135deg, #9bc287, #3a7553)' }}>
                    <img src="/logo.png" alt="Spacey" className="h-full w-full object-cover object-top" />
                </div>
                <span className="text-[17px] font-extrabold tracking-tight text-[#f0f4ee]">Spacey</span>
                <button
                    className="ml-auto rounded-lg p-1.5 text-[#95ab8a] transition hover:text-[#f0f4ee] lg:hidden"
                    onClick={() => setMobileOpen(false)}>
                    <X size={18} />
                </button>
            </div>

            {/* Business card */}
            {currentBusiness && (
                <div className="mx-3 mb-1 mt-4 shrink-0 rounded-[14px] border border-[#243529] bg-[#1d2a23] p-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-[12px] font-extrabold text-white"
                            style={{ background: 'linear-gradient(135deg, #9bc287, #3a7553)' }}>
                            {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-extrabold text-[#f0f4ee]">{currentBusiness.name}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#95ab8a]">{role}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Booking link card */}
            {bookingUrl && (
                <div className="mx-3 mt-2 shrink-0 rounded-[14px] border border-[#1d2a23] p-3"
                    style={{ background: '#0b1409' }}>
                    <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#95ab8a]">Link de reservas</p>
                    <div className="flex items-center gap-2">
                        <span className="flex-1 truncate font-mono text-[10px] text-[#9bc287]">
                            {bookingUrl.replace(/^https?:\/\//, '')}
                        </span>
                        <button
                            onClick={handleCopyLink}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1d2a23] text-[#95ab8a] transition hover:bg-[#243529] hover:text-[#9bc287]">
                            {copied ? <Check size={11} className="text-[#9bc287]" /> : <Copy size={11} />}
                        </button>
                    </div>
                </div>
            )}

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'none' }}>
                <div className="space-y-0.5">
                    {nav.map(item => {
                        const active = location.pathname === item.href;
                        const Icon   = item.icon;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all ${
                                    active
                                        ? 'bg-[#9bc287] text-[#22321c]'
                                        : 'text-[#95ab8a] hover:bg-[#1d2a23] hover:text-[#f0f4ee]'
                                }`}>
                                <Icon size={16} className="shrink-0" />
                                <span className="flex-1">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Footer */}
            <div className="shrink-0 space-y-0.5 border-t border-[#1d2a23] px-3 py-4">
                <Link
                    to="/"
                    onClick={() => setMobileOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-[#95ab8a] transition hover:bg-[#1d2a23] hover:text-[#f0f4ee]">
                    <Globe size={16} className="shrink-0" />
                    Ver página principal
                </Link>
                <button
                    onClick={toggleTheme}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-[#95ab8a] transition hover:bg-[#1d2a23] hover:text-[#f0f4ee]">
                    {theme === 'dark' ? <Sun size={16} className="shrink-0" /> : <Moon size={16} className="shrink-0" />}
                    {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                </button>
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-[#ef4444] transition hover:bg-[#ef4444]/10">
                    <LogOut size={16} className="shrink-0" />
                    Cerrar sesión
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-[100dvh] bg-[#090d0b] text-[#f0f4ee]" style={{ overflowX: 'clip' }}>

            {/* Drawer backdrop (mobile) */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    style={{ backdropFilter: 'blur(2px)' }}
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar — desktop fixed, mobile drawer */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col transition-transform duration-[250ms] ease-out ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full'
                } lg:translate-x-0`}
                style={{ background: '#0e1611', borderRight: '1px solid #1d2a23' }}>
                <SidebarContent />
            </aside>

            {/* Main area */}
            <div className="flex min-w-0 flex-1 flex-col lg:ml-[240px]">

                {/* Top bar — sticky glass */}
                <header
                    className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center justify-between px-4 sm:px-6"
                    style={{
                        background: 'rgba(9,13,11,0.85)',
                        borderBottom: '1px solid #1d2a23',
                        backdropFilter: 'blur(20px)',
                    }}>

                    {/* Left: hamburger + title */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#95ab8a] transition hover:bg-[#1d2a23] hover:text-[#f0f4ee] lg:hidden">
                            <Menu size={18} />
                        </button>
                        <div>
                            <h1 className="text-[15px] font-extrabold leading-none text-[#f0f4ee]">{pageInfo.title}</h1>
                            <p className="mt-0.5 hidden text-[11px] text-[#95ab8a] sm:block">{pageInfo.subtitle}</p>
                        </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1.5">
                        {/* + Nueva cita */}
                        <Link
                            to="/dashboard/appointments"
                            className="hidden items-center gap-1.5 rounded-full bg-[#9bc287] px-4 py-2 text-[13px] font-extrabold text-[#22321c] no-underline transition hover:bg-[#86ad72] sm:flex">
                            <Plus size={14} /> Nueva cita
                        </Link>

                        {/* Theme toggle (desktop only; also in sidebar) */}
                        <button
                            onClick={toggleTheme}
                            className="hidden h-9 w-9 items-center justify-center rounded-xl text-[#95ab8a] transition hover:bg-[#1d2a23] hover:text-[#f0f4ee] lg:flex">
                            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                        </button>

                        {/* Bell + dropdown */}
                        <div className="relative" ref={notifRef}>
                            <button
                                onClick={() => setNotifOpen(o => !o)}
                                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[#95ab8a] transition hover:bg-[#1d2a23] hover:text-[#f0f4ee]">
                                <Bell size={16} />
                                <span className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full bg-[#9bc287]" />
                            </button>

                            {notifOpen && (
                                <div
                                    className="absolute right-0 top-11 w-[300px] rounded-[16px] border border-[#243529] p-1 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)]"
                                    style={{ background: 'rgba(19,28,23,0.97)', backdropFilter: 'blur(24px)' }}>
                                    <div className="flex items-center justify-between border-b border-[#243529]/50 px-3 py-2.5">
                                        <span className="text-[13px] font-extrabold text-[#f0f4ee]">Notificaciones</span>
                                        <button onClick={() => setNotifOpen(false)} className="text-[#95ab8a] transition hover:text-[#f0f4ee]">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    {DEMO_NOTIFS.map((n, i) => (
                                        <div key={i} className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[#1d2a23]">
                                            <span className="mt-0.5 shrink-0 text-base">{n.icon}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[12px] font-bold text-[#f0f4ee]">{n.title}</p>
                                                <p className="truncate text-[11px] text-[#95ab8a]">{n.desc}</p>
                                            </div>
                                            <span className="shrink-0 text-[10px] text-[#95ab8a]">{n.time}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Avatar */}
                        <div
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-[12px] font-extrabold text-white"
                            style={{ background: 'linear-gradient(135deg, #9bc287, #3a7553)' }}>
                            {(currentBusiness?.name || user?.email || 'S')[0].toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="min-w-0 flex-1 overflow-x-clip px-4 py-6 sm:px-6 lg:px-8">
                    {children}
                </main>
            </div>
        </div>
    );
};
