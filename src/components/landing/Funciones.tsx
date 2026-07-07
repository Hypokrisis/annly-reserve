import React from 'react';

const CAL_HOURS = ['9:00', '10:00', '11:00', '12:00', '1:00', '2:00', '3:00', '4:00'];

type Block = { col: string; label: string; sub: string; variant: 'primary' | 'amber' | 'soft' | 'blocked' };
type Row = { initial: string; name: string; role: string; blocks: Block[] };

const CAL_ROWS: Row[] = [
  {
    initial: 'K', name: 'Kevin', role: 'Barbero',
    blocks: [
      { col: '2 / span 2', label: 'José M.', sub: 'Corte + Barba', variant: 'primary' },
      { col: '5 / span 1', label: 'Bloqueado', sub: '', variant: 'blocked' },
      { col: '7 / span 2', label: 'Luis R.', sub: 'Fade clásico', variant: 'primary' },
    ],
  },
  {
    initial: 'Á', name: 'Ángel', role: 'Barbero',
    blocks: [
      { col: '3 / span 1', label: 'Carlos M.', sub: 'Corte', variant: 'amber' },
      { col: '6 / span 2', label: 'Marcos V.', sub: 'Barba premium', variant: 'primary' },
    ],
  },
  {
    initial: 'M', name: 'María', role: 'Estética',
    blocks: [
      { col: '4 / span 2', label: 'Valeria S.', sub: 'Cejas + Facial', variant: 'soft' },
      { col: '8 / span 1', label: 'Nadia', sub: 'Mani', variant: 'amber' },
    ],
  },
];

const BLOCK_CLS: Record<Block['variant'], string> = {
  primary: 'bg-gradient-to-r from-space-primary to-space-primary-dark text-white',
  amber: 'bg-[#f0cf9a] text-[#5c4415]',
  soft: 'border border-space-primary/50 bg-space-primary/25 text-space-text',
  blocked: 'border border-dashed border-space-border bg-space-card2 text-space-muted',
};

function CalendarBlock({ b }: { b: Block }) {
  return (
    <div className={`m-1 overflow-hidden rounded-[9px] px-2.5 py-[7px] ${BLOCK_CLS[b.variant]}`} style={{ gridColumn: b.col }}>
      <div className={`whitespace-nowrap text-[11px] font-extrabold ${b.variant === 'blocked' ? 'text-[9px] uppercase tracking-wide' : ''}`}>
        {b.label}
      </div>
      {b.sub && <div className="whitespace-nowrap text-[9px] font-bold opacity-80">{b.sub}</div>}
    </div>
  );
}

export default function Funciones() {
  return (
    <section id="funciones" className="relative overflow-hidden bg-space-bg px-6 py-[110px] max-sm:px-5 max-sm:py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -right-56 -top-52 h-[640px] w-[640px] [background:radial-gradient(circle,rgba(155,194,135,0.11),transparent_65%)]" />
        <div className="absolute -bottom-64 -left-44 h-[560px] w-[560px] [background:radial-gradient(circle,rgba(155,194,135,0.08),transparent_65%)]" />
      </div>

      <div className="relative mx-auto max-w-[1120px]">
        <div className="mb-16 text-center">
          <div className="mb-3.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-space-primary">Funciones</div>
          <h2 className="m-0 text-balance text-[clamp(32px,4vw,48px)] font-extrabold tracking-[-0.03em] text-space-text">
            Todo lo que tu negocio con citas{' '}
            <em className="font-serif font-normal italic text-space-primary">necesita</em>
          </h2>
        </div>

        {/* Card grande: calendario */}
        <div className="mb-5 overflow-hidden rounded-3xl border border-space-border bg-space-card">
          <div className="flex items-center gap-1.5 border-b border-space-border bg-space-card2 px-[18px] py-3">
            <span className="h-[9px] w-[9px] rounded-full bg-red-500/80" />
            <span className="h-[9px] w-[9px] rounded-full bg-yellow-500/80" />
            <span className="h-[9px] w-[9px] rounded-full bg-green-500/80" />
            <span className="ml-2.5 text-[10px] font-bold tracking-wide text-space-muted">spacey.app/dashboard/agenda</span>
          </div>
          <div className="p-6 pb-7">
            <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 rounded-full border border-space-border bg-space-card2 p-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs text-space-muted">‹</span>
                <span className="px-3.5 text-[13px] font-bold text-space-text">viernes, 4 de julio</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs text-space-muted">›</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-green-500">Hoy</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-space-primary px-4 py-2 text-xs font-extrabold text-space-ink">+ Nueva cita</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-space-border [-webkit-overflow-scrolling:touch]">
              <div className="grid min-w-[760px] grid-cols-[120px_repeat(8,1fr)] border-b border-space-border bg-space-card2">
                <div className="border-r border-space-border px-3 py-2.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-space-muted">Equipo</div>
                {CAL_HOURS.map((h) => (
                  <div key={h} className="px-2 py-2.5 text-[10px] font-bold text-space-muted">{h}</div>
                ))}
              </div>
              {CAL_ROWS.map((row, i) => (
                <div
                  key={row.name}
                  className={`grid min-h-16 min-w-[760px] grid-cols-[120px_repeat(8,1fr)] ${i < CAL_ROWS.length - 1 ? 'border-b border-space-border' : ''}`}
                >
                  <div className="flex items-center gap-2 border-r border-space-border px-3 py-2.5">
                    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-space-border bg-space-card2 text-[11px] font-extrabold text-space-primary">
                      {row.initial}
                    </span>
                    <div>
                      <div className="text-xs font-extrabold text-space-text">{row.name}</div>
                      <div className="text-[9px] font-bold text-space-muted">{row.role}</div>
                    </div>
                  </div>
                  {row.blocks.map((b) => (
                    <CalendarBlock key={b.label} b={b} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2 medianas */}
        <div className="mb-5 grid grid-cols-2 gap-5 max-[960px]:grid-cols-1">
          <div className="flex flex-col gap-3 rounded-3xl border border-space-border bg-space-card p-9 transition-colors hover:border-space-primary max-sm:p-6">
            <h3 className="m-0 text-2xl font-extrabold tracking-tight text-space-text">
              Recordatorios <em className="font-serif font-normal italic text-space-primary">automáticos</em>.
            </h3>
            <p className="m-0 text-sm leading-relaxed text-space-muted">
              Mensajes de WhatsApp 24h y 1h antes de cada cita. Menos no-shows, sin mover un dedo.
            </p>
            <div className="mt-auto flex flex-col gap-2.5 pt-5">
              <div className="max-w-[340px] self-start rounded-[14px_14px_14px_3px] border border-space-border bg-space-card2 px-[15px] py-3">
                <div className="text-xs font-bold leading-normal text-space-text">
                  ⏰ Recordatorio: tu cita es mañana a las <b className="text-space-primary">2:00 PM</b> con Kevin 💈
                </div>
              </div>
              <div className="flex gap-2">
                <span className="rounded-full bg-space-primary px-3.5 py-[7px] text-[11px] font-extrabold text-space-ink">Confirmar ✓</span>
                <span className="rounded-full border border-space-border px-3.5 py-[7px] text-[11px] font-extrabold text-space-muted">Reagendar</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-3xl border border-space-border bg-space-card p-9 transition-colors hover:border-space-primary max-sm:p-6">
            <h3 className="m-0 text-2xl font-extrabold tracking-tight text-space-text">
              Estadísticas en <em className="font-serif font-normal italic text-space-primary">tiempo real</em>.
            </h3>
            <p className="m-0 text-sm leading-relaxed text-space-muted">
              Ingresos, ocupación y clientes frecuentes de un vistazo — y un reporte por WhatsApp cada 2 horas.
            </p>
            <div className="mt-auto pt-5">
              <div className="mb-3.5 flex items-baseline gap-2">
                <span className="text-[26px] font-extrabold tracking-tight text-space-text">$2,140</span>
                <span className="text-xs font-extrabold text-green-500">+38% esta semana</span>
              </div>
              <div className="flex h-[84px] items-end gap-2">
                {[40, 55, 45, 70, 60, 85, 100].map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-md ${
                      i === 6
                        ? 'bg-gradient-to-b from-space-primary to-space-primary-dark'
                        : i === 5
                          ? 'bg-space-primary'
                          : i >= 3
                            ? 'bg-space-primary/45'
                            : 'bg-space-primary/30'
                    }`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3 pequeñas */}
        <div className="grid grid-cols-3 gap-5 max-[960px]:grid-cols-1">
          <div className="flex flex-col gap-2.5 rounded-3xl border border-space-border bg-space-card p-[30px] transition-colors hover:border-space-primary max-sm:p-6">
            <h3 className="m-0 text-[19px] font-extrabold tracking-tight text-space-text">
              Multi-<em className="font-serif font-normal italic text-space-primary">empleado</em>.
            </h3>
            <p className="m-0 text-[13px] leading-relaxed text-space-muted">
              Cada miembro de tu equipo con su agenda, horario y servicios propios.
            </p>
            <div className="mt-auto flex items-center pt-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-space-card bg-gradient-to-br from-space-primary to-space-primary-dark text-xs font-extrabold text-white">K</span>
              {['Á', 'M'].map((c) => (
                <span key={c} className="-ml-2.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-space-card bg-space-card2 text-xs font-extrabold text-space-text">{c}</span>
              ))}
              <span className="-ml-2.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-space-border bg-space-card2 text-sm font-extrabold text-space-muted">+</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 rounded-3xl border border-space-border bg-space-card p-[30px] transition-colors hover:border-space-primary max-sm:p-6">
            <h3 className="m-0 text-[19px] font-extrabold tracking-tight text-space-text">
              Reservas online <em className="font-serif font-normal italic text-space-primary">24/7</em>.
            </h3>
            <p className="m-0 text-[13px] leading-relaxed text-space-muted">
              Tu página pública de reservas siempre abierta, incluso de madrugada.
            </p>
            <div className="mt-auto flex items-center gap-2 rounded-full border border-space-border bg-space-card2 py-2 pl-4 pr-2 pt-2">
              <span className="flex-1 font-mono text-[11px] font-bold text-space-muted">spacey.app/book/los-reyes</span>
              <span className="rounded-full bg-space-primary px-3 py-1.5 text-[11px] font-extrabold text-space-ink">Reservar</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 rounded-3xl border border-space-border bg-space-card p-[30px] transition-colors hover:border-space-primary max-sm:p-6">
            <h3 className="m-0 text-[19px] font-extrabold tracking-tight text-space-text">
              Gestión de <em className="font-serif font-normal italic text-space-primary">pagos</em>.
            </h3>
            <p className="m-0 text-[13px] leading-relaxed text-space-muted">
              Registra pagos y depósitos por cita sin salir del dashboard.
            </p>
            <div className="mt-auto flex items-center gap-2.5 rounded-[14px] border border-space-border bg-space-card2 px-3.5 py-3">
              <div className="flex-1">
                <div className="text-xs font-extrabold text-space-text">Corte + Barba</div>
                <div className="text-[10px] font-bold text-space-muted">José M. · 2:00 PM</div>
              </div>
              <span className="text-sm font-extrabold text-space-text">$35</span>
              <span className="rounded-full bg-green-500/10 px-[9px] py-1 text-[10px] font-extrabold text-green-500">Pagado ✓</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
