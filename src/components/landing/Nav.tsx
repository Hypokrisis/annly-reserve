import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

const NAV_LINKS = [
  { href: '#explorar', label: 'Explorar', icon: '💈', sub: 'Negocios cerca de ti' },
  { href: '#funciones', label: 'Funciones', icon: '✨', sub: 'Bot, agenda y estadísticas' },
  { href: '#precios', label: 'Precios', icon: '💵', sub: 'Planes desde $19.99/mes' },
  { href: '#como-funciona', label: 'Cómo funciona', icon: '⚡', sub: 'De WhatsApp a cita en segundos' },
];

export default function Nav() {
  const { user, role, currentBusiness, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const closeMenus = () => { setMenuOpen(false); setAccountOpen(false); };
  const handleLogout = async () => { await logout(); closeMenus(); };

  const userInitials = user?.email?.[0]?.toUpperCase() ?? '?';
  const roleLabel =
    role === 'owner' || role === 'admin' ? 'Owner' :
    role === 'barber' ? 'Staff' : 'Cliente activo';

  return (
    <>
      <nav className="fixed top-4 inset-x-0 z-50 px-4">
        {/* Pill */}
        <div className="mx-auto flex h-[60px] max-w-[1120px] items-center justify-between rounded-full border border-space-border bg-space-card/80 pl-5 pr-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          {/* Logo */}
          <a href="#top" className="flex items-center gap-2.5 text-space-text no-underline">
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-space-primary to-space-primary-dark">
              <img src="/logo.png" alt="Spacey" className="h-full w-full object-cover object-top" />
            </span>
            <span className="text-[19px] font-extrabold tracking-tight">Spacey</span>
          </a>

          {/* Links desktop */}
          <div className="mx-4 hidden shrink-0 items-center gap-6 min-[1081px]:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-space-muted no-underline transition-colors hover:text-space-primary"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              title="Cambiar tema"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[15px] text-space-muted transition-colors hover:bg-space-card2 hover:text-space-primary"
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>

            {user ? (
              /* Cuenta — usuario autenticado */
              <button
                onClick={() => { setAccountOpen(!accountOpen); setMenuOpen(false); }}
                title="Mi cuenta"
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-space-primary to-space-primary-dark text-xs font-extrabold text-white transition-colors hover:opacity-90"
              >
                {userInitials}
              </button>
            ) : (
              /* Login / Register — visitante */
              <>
                <Link
                  to="/login"
                  className="hidden whitespace-nowrap rounded-full border border-space-border px-4 py-[9px] text-xs font-bold text-space-text no-underline transition-colors hover:border-space-primary min-[641px]:block"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/register"
                  className="hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-space-primary px-[18px] py-2.5 text-xs font-extrabold text-space-ink no-underline shadow-[0_4px_20px_rgba(155,194,135,0.35)] transition-colors hover:bg-space-primary-hover min-[561px]:inline-flex"
                >
                  Registra tu negocio <span className="text-[13px]">→</span>
                </Link>
              </>
            )}

            {/* Hamburguesa (solo < 1081px) */}
            <button
              onClick={() => { setMenuOpen(!menuOpen); setAccountOpen(false); }}
              title="Menú"
              className="hidden h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-space-border bg-space-card2 text-base text-space-text max-[1080px]:flex"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Menú móvil */}
        {menuOpen && (
          <div className="mx-auto mt-2.5 flex max-w-[1120px] animate-menu-in flex-col gap-1 overflow-hidden rounded-[28px] border border-space-border bg-space-card/80 p-2.5 shadow-[0_32px_80px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={closeMenus}
                className="flex items-center justify-between gap-3 rounded-[18px] px-4 py-3.5 no-underline transition-colors hover:bg-space-card2"
              >
                <span className="flex items-center gap-3.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-space-primary/20 bg-space-primary/10 text-[17px]">
                    {l.icon}
                  </span>
                  <span>
                    <span className="block text-[15px] font-extrabold tracking-tight text-space-text">{l.label}</span>
                    <span className="mt-px block text-[11px] font-semibold text-space-muted">{l.sub}</span>
                  </span>
                </span>
                <span className="text-sm text-space-muted">→</span>
              </a>
            ))}
            {!user && (
              <div className="grid grid-cols-2 gap-2 px-1.5 pb-1.5 pt-2">
                <Link
                  to="/login"
                  onClick={closeMenus}
                  className="flex items-center justify-center rounded-full border border-space-border py-3.5 text-[13px] font-extrabold text-space-text no-underline transition-colors hover:border-space-primary"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/register"
                  onClick={closeMenus}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-space-primary py-3.5 text-[13px] font-extrabold text-space-ink no-underline shadow-[0_6px_20px_rgba(155,194,135,0.35)] transition-colors hover:bg-space-primary-hover"
                >
                  Registrarme →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Menú de cuenta (solo cuando autenticado) */}
        {accountOpen && user && (
          <div className="mx-auto mt-2.5 flex max-w-[1120px] justify-end">
            <div className="w-72 animate-menu-in overflow-hidden rounded-[26px] border border-space-border bg-space-card/80 shadow-[0_32px_80px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
              {/* Header */}
              <div className="relative border-b border-space-border bg-gradient-to-br from-space-primary/20 to-space-primary-dark/10 px-[18px] pb-4 pt-5">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(155,194,135,0.18)_1px,transparent_1px)] [background-size:18px_18px]"
                />
                <div className="relative flex items-center gap-3">
                  <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-space-primary to-space-primary-dark text-base font-extrabold text-white shadow-[0_6px_16px_rgba(58,117,83,0.4)]">
                    {userInitials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="max-w-[160px] truncate text-[15px] font-extrabold tracking-tight text-space-text">
                      {currentBusiness?.name || user.email}
                    </div>
                    <div className="mt-[3px] inline-flex items-center gap-[5px] text-[10px] font-extrabold uppercase tracking-[0.08em] text-space-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> {roleLabel}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="flex flex-col gap-0.5 p-2">
                {/* Owner / Admin */}
                {(role === 'owner' || role === 'admin') && (
                  <>
                    <Link to="/dashboard" onClick={closeMenus} className="flex items-center gap-3 rounded-[14px] px-3 py-[11px] no-underline transition-colors hover:bg-space-card2">
                      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-space-primary/10 text-[15px]">📊</span>
                      <span className="text-[13px] font-bold text-space-text">Dashboard</span>
                    </Link>
                    {currentBusiness && (
                      <Link to={`/book/${currentBusiness.slug}`} onClick={closeMenus} className="flex items-center gap-3 rounded-[14px] px-3 py-[11px] no-underline transition-colors hover:bg-space-card2">
                        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-space-primary/10 text-[15px]">✂️</span>
                        <span className="text-[13px] font-bold text-space-text">Ver mi página pública</span>
                      </Link>
                    )}
                    <Link to="/dashboard/settings" onClick={closeMenus} className="flex items-center gap-3 rounded-[14px] px-3 py-[11px] no-underline transition-colors hover:bg-space-card2">
                      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-space-primary/10 text-[15px]">⚙️</span>
                      <span className="text-[13px] font-bold text-space-text">Configuración</span>
                    </Link>
                  </>
                )}

                {/* Staff */}
                {role === 'barber' && (
                  <Link to="/staff" onClick={closeMenus} className="flex items-center gap-3 rounded-[14px] px-3 py-[11px] no-underline transition-colors hover:bg-space-card2">
                    <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-space-primary/10 text-[15px]">📅</span>
                    <span className="text-[13px] font-bold text-space-text">Mis citas de hoy</span>
                  </Link>
                )}

                {/* Client */}
                {role !== 'owner' && role !== 'admin' && role !== 'barber' && (
                  <>
                    <Link to="/client" onClick={closeMenus} className="flex items-center justify-between gap-2.5 rounded-[14px] px-3 py-[11px] no-underline transition-colors hover:bg-space-card2">
                      <span className="flex items-center gap-3">
                        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-space-primary/10 text-[15px]">📅</span>
                        <span className="text-[13px] font-bold text-space-text">Mis reservas</span>
                      </span>
                    </Link>
                    <Link to="/create-business" onClick={closeMenus} className="flex items-center gap-3 rounded-[14px] px-3 py-[11px] no-underline transition-colors hover:bg-space-card2">
                      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-space-primary/10 text-[15px]">🏢</span>
                      <span className="text-[13px] font-bold text-space-text">Crear mi negocio</span>
                    </Link>
                  </>
                )}

                <div className="mx-2 my-1.5 h-px bg-space-border" />
                <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-[14px] px-3 py-[11px] text-left transition-colors hover:bg-red-500/10">
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-red-500/10 text-sm text-red-500">↪</span>
                  <span className="text-[13px] font-bold text-red-500">Cerrar sesión</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Backdrop */}
      {(menuOpen || accountOpen) && (
        <div onClick={closeMenus} className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm" />
      )}
    </>
  );
}
