import React from 'react';
import { Link } from 'react-router-dom';

const APPOINTMENTS = [
  { time: '2:00 PM', initials: 'JM', name: 'José Martínez', detail: 'Corte + Barba · Kevin', status: 'Confirmada', statusCls: 'text-green-500 bg-green-500/10' },
  { time: '2:45 PM', initials: 'LR', name: 'Luis Rivera', detail: 'Fade clásico · Ángel', status: 'Pendiente', statusCls: 'text-yellow-500 bg-yellow-500/10' },
  { time: '3:30 PM', initials: 'CM', name: 'Carlos Méndez', detail: 'Corte + Barba · Kevin', status: 'Vía Bot', statusCls: 'text-space-primary bg-space-primary/10' },
];

export default function Hero() {
  return (
    <div id="top" className="px-4 pt-24">
      <header className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[36px] border border-[#26382c] bg-[#0e1611] bg-gradient-to-b from-[#121b15] via-[#0b120e] to-[#0a0f0c] px-14 pb-22 pt-[110px] max-sm:px-6 max-sm:pb-18 max-sm:pt-24">
        {/* Fondo decorativo */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-80 left-1/2 h-[700px] w-[1100px] -translate-x-1/2 blur-[20px] [background:radial-gradient(ellipse_at_center,rgba(155,194,135,0.15)_0%,rgba(155,194,135,0.06)_40%,transparent_70%)]" />
          <div className="absolute inset-0 [background-image:radial-gradient(rgba(155,194,135,0.13)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black_20%,transparent_75%)]" />
          <div className="absolute left-1/2 top-10 h-[1400px] w-[1400px] -translate-x-1/2 rounded-full border border-space-primary/10" />
          <div className="absolute left-1/2 top-[120px] h-[1100px] w-[1100px] -translate-x-1/2 rounded-full border border-space-primary/[0.07]" />
        </div>

        <div className="relative mx-auto grid max-w-[1120px] grid-cols-[minmax(0,1fr)_minmax(0,520px)] items-center gap-12 max-[960px]:grid-cols-1 max-[960px]:gap-10">
          {/* Columna izquierda */}
          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#2c4033] bg-[#131c17]/80 px-3.5 py-[7px] text-xs font-bold text-[#a9bd9e]">
              <span>🇵🇷</span> Hecho para negocios en Puerto Rico
            </span>

            <h1 className="m-0 text-balance text-[clamp(40px,5.4vw,68px)] font-extrabold leading-[1.02] tracking-[-0.035em] text-[#f0f4ee]">
              El calendario{' '}
              <em className="font-serif font-normal italic tracking-[-0.01em] text-space-primary">inteligente</em>{' '}
              para tu negocio
            </h1>

            <p className="m-0 max-w-[460px] text-pretty text-lg leading-relaxed text-[#a9bd9e]">
              Orden, control y automatización: bot de WhatsApp, reservas online y dashboard completo en un solo lugar.
            </p>

            <div className="flex items-center gap-3 text-[13px] font-bold text-[#a9bd9e]">
              <span className="text-space-primary">24/7</span> Reservas
              <span className="h-[3px] w-[3px] rounded-full bg-[#35503f]" />
              WhatsApp Bot
              <span className="h-[3px] w-[3px] rounded-full bg-[#35503f]" />
              Dashboard Pro
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full bg-space-primary px-[26px] py-[15px] text-[15px] font-extrabold text-space-ink no-underline shadow-[0_6px_28px_rgba(155,194,135,0.4)] transition hover:-translate-y-px hover:bg-space-primary-hover"
              >
                Registra tu negocio gratis <span>→</span>
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center gap-2 rounded-full border border-[#2c4033] px-[26px] py-[15px] text-[15px] font-bold text-[#f0f4ee] no-underline transition hover:border-space-primary hover:text-space-primary"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1d2a23] text-[9px]">▶</span>
                Ver demo
              </a>
            </div>
          </div>

          {/* Columna derecha: dashboard flotante */}
          <div className="relative min-h-[480px] max-[960px]:mx-auto max-[960px]:min-h-0 max-[960px]:w-full max-[960px]:max-w-[560px]">
            <div className="animate-floaty2 overflow-hidden rounded-[20px] border border-[#26382c] bg-[#131c17] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6),0_0_0_1px_rgba(155,194,135,0.06),0_0_60px_-12px_rgba(155,194,135,0.15)]">
              {/* Barra de ventana */}
              <div className="flex items-center gap-1.5 border-b border-[#26382c] bg-[#1a2620] px-4 py-3">
                <span className="h-[9px] w-[9px] rounded-full bg-red-500/80" />
                <span className="h-[9px] w-[9px] rounded-full bg-yellow-500/80" />
                <span className="h-[9px] w-[9px] rounded-full bg-green-500/80" />
                <span className="ml-2.5 text-[10px] font-bold tracking-wide text-[#95ab8a]">spacey.app/dashboard</span>
              </div>

              <div className="flex flex-col gap-3.5 p-[18px] pb-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[15px] font-extrabold tracking-tight text-[#f0f4ee]">Hoy, viernes 4 de julio</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-[#95ab8a]">Barbería Los Reyes · San Juan</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-space-primary/25 bg-space-primary/10 px-2.5 py-[5px] text-[10px] font-extrabold uppercase tracking-[0.08em] text-space-primary">
                    <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-space-primary" /> En vivo
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { v: '14', l: 'Citas hoy', cls: 'text-[#f0f4ee]' },
                    { v: '$385', l: 'Ingresos', cls: 'text-space-primary' },
                    { v: '92%', l: 'Ocupación', cls: 'text-[#f0f4ee]' },
                  ].map((s) => (
                    <div key={s.l} className="rounded-xl border border-[#26382c] bg-[#1a2620] p-3">
                      <div className={`text-xl font-extrabold ${s.cls}`}>{s.v}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-[#95ab8a]">{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Agenda */}
                <div className="flex flex-col gap-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#95ab8a]">Próximas citas</div>
                  {APPOINTMENTS.map((a) => (
                    <div key={a.name} className="flex items-center gap-2.5 rounded-xl border border-[#26382c] bg-[#1a2620] px-3 py-2.5">
                      <span className="min-w-[52px] text-[11px] font-extrabold text-space-primary">{a.time}</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#35503f] to-[#26382c] text-[10px] font-extrabold text-[#f0f4ee]">
                        {a.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#f0f4ee]">{a.name}</div>
                        <div className="text-[10px] font-semibold text-[#95ab8a]">{a.detail}</div>
                      </div>
                      <span className={`rounded-full px-2 py-[3px] text-[9px] font-extrabold uppercase tracking-wide ${a.statusCls}`}>
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Notificación WhatsApp: flota en desktop, entra al flujo en <961px para no chocar con el dashboard */}
            <div className="absolute -bottom-5 -left-9 flex max-w-[300px] animate-floaty items-center gap-3 rounded-2xl border border-[#26382c] bg-[#131c17] py-3.5 pl-3.5 pr-[18px] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6),0_0_32px_-8px_rgba(155,194,135,0.2)] max-[960px]:static max-[960px]:mx-auto max-[960px]:mt-4 max-[960px]:max-w-full">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500 text-[19px]">💬</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-[#f0f4ee]">Nueva reserva vía WhatsApp</span>
                  <span className="h-[7px] w-[7px] shrink-0 animate-pulse-dot rounded-full bg-space-primary" />
                </div>
                <div className="mt-0.5 text-[11px] font-semibold text-[#95ab8a]">Carlos Méndez · Corte + Barba · 3:30 PM</div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
