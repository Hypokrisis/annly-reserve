import React from 'react';
import { Link } from 'react-router-dom';

const COLS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: 'Producto',
    links: [
      { label: 'Funciones', href: '#funciones' },
      { label: 'Precios', href: '#precios' },
      { label: 'Cómo funciona', href: '#como-funciona' },
    ],
  },
  {
    title: 'Explorar',
    links: [
      { label: 'Barberías', href: '#explorar' },
      { label: 'Salones de belleza', href: '#explorar' },
      { label: 'Spas y masajes', href: '#explorar' },
      { label: 'Nails y estética', href: '#explorar' },
      { label: 'Registra tu negocio', href: '/register' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Términos de servicio', href: '/terms' },
      { label: 'Política de privacidad', href: '/privacy' },
    ],
  },
];

const SOCIAL = [
  { icon: '📷', label: 'Instagram', href: '#' },
  { icon: '💬', label: 'WhatsApp', href: '#' },
  { icon: '👥', label: 'Facebook', href: '#' },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#090d0b] px-6 pb-10 pt-[72px]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-56 left-1/2 h-[440px] w-[1000px] -translate-x-1/2 [background:radial-gradient(ellipse,rgba(155,194,135,0.09),transparent_70%)]" />
        <div className="absolute inset-0 [background-image:radial-gradient(rgba(155,194,135,0.07)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent_60%)]" />
      </div>

      <div className="relative mx-auto max-w-[1120px]">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-12 border-b border-[#1d2a23] pb-12 max-[960px]:grid-cols-2">
          {/* Marca */}
          <div className="flex flex-col items-start gap-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-[34px] w-[34px] items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-space-primary to-space-primary-dark">
                <img src="/logo.png" alt="Spacey" className="h-full w-full object-cover object-top" />
              </span>
              <span className="text-[19px] font-extrabold tracking-tight text-[#f0f4ee]">Spacey</span>
            </div>
            <p className="m-0 max-w-[260px] text-[13px] leading-relaxed text-[#95ab8a]">
              La plataforma de reservas con bot de WhatsApp inteligente para barberías, salones, spas y cualquier
              negocio con citas.
            </p>
            <div className="flex gap-2.5">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  title={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#1d2a23] bg-[#131c17] text-sm no-underline transition-colors hover:border-space-primary"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Columnas de links */}
          {COLS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#f0f4ee]">{col.title}</div>
              {col.links.map((l) =>
                l.href.startsWith('#') || l.href.startsWith('/') ? (
                  l.href.startsWith('#') ? (
                    <a
                      key={l.label}
                      href={l.href}
                      className="text-[13px] font-semibold text-[#95ab8a] no-underline transition-colors hover:text-space-primary"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      key={l.label}
                      to={l.href}
                      className="text-[13px] font-semibold text-[#95ab8a] no-underline transition-colors hover:text-space-primary"
                    >
                      {l.label}
                    </Link>
                  )
                ) : null
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-7">
          <span className="text-xs font-semibold text-[#95ab8a]">© 2026 Spacey Reserve · Todos los derechos reservados</span>
          <span className="text-xs font-bold text-space-primary">Hecho en Puerto Rico 🇵🇷</span>
        </div>
      </div>
    </footer>
  );
}
