import React from 'react';

export default function ComoFunciona() {
  return (
    <section
      id="como-funciona"
      className="relative overflow-hidden bg-space-bg px-6 pb-[90px] pt-[110px] max-sm:px-5 max-sm:py-16"
    >
      {/* Glows decorativos */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-44 -top-44 h-[560px] w-[560px] [background:radial-gradient(circle,rgba(155,194,135,0.12),transparent_65%)]" />
        <div className="absolute -bottom-56 -right-40 h-[620px] w-[620px] [background:radial-gradient(circle,rgba(155,194,135,0.09),transparent_65%)]" />
      </div>

      <div className="relative mx-auto max-w-[1120px]">
        <div className="mb-18 text-center" style={{ marginBottom: 72 }}>
          <div className="mb-3.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-space-primary">
            Cómo funciona
          </div>
          <h2 className="m-0 text-balance text-[clamp(32px,4vw,48px)] font-extrabold tracking-[-0.03em] text-space-text">
            De WhatsApp a cita confirmada{' '}
            <em className="font-serif font-normal italic text-space-primary">en segundos</em>
          </h2>
        </div>

        <div className="relative">
          {/* Línea conectora */}
          <div
            aria-hidden
            className="absolute left-[16%] right-[16%] top-7 border-t-2 border-dashed border-space-border max-[960px]:hidden"
          />
          <div className="relative grid grid-cols-3 gap-10 max-[960px]:grid-cols-1 max-sm:gap-12">
            {/* Paso 1 */}
            <div className="flex flex-col items-center gap-[18px] text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-space-primary bg-space-card text-[22px] font-extrabold text-space-primary">
                1
              </div>
              <h3 className="m-0 text-[19px] font-extrabold tracking-tight text-space-text">
                Tu cliente escribe al WhatsApp
              </h3>
              <p className="m-0 max-w-[280px] text-sm leading-relaxed text-space-muted">
                Corte, manicura, masaje o consulta — sin app ni cuenta. Solo WhatsApp.
              </p>
              <div className="flex w-full max-w-[280px] flex-col gap-2 rounded-2xl border border-space-border bg-space-card p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <div className="max-w-[90%] self-end rounded-[12px_12px_2px_12px] bg-[#005c4b] px-3 py-2 text-left text-xs font-semibold text-[#e7f5ef]">
                  Hola, ¿tienen espacio hoy para un gel? 💅
                </div>
                <div className="flex items-center gap-[5px] self-start rounded-[12px_12px_12px_2px] bg-space-card2 px-3 py-2">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-[5px] w-[5px] animate-pulse-dot rounded-full bg-space-muted"
                      style={{ animationDelay: `${i * 0.2}s`, animationDuration: '1.2s' }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="flex flex-col items-center gap-[18px] text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-space-primary bg-space-card text-[22px] font-extrabold text-space-primary">
                2
              </div>
              <h3 className="m-0 text-[19px] font-extrabold tracking-tight text-space-text">
                Spacey agenda y confirma
              </h3>
              <p className="m-0 max-w-[280px] text-sm leading-relaxed text-space-muted">
                IA 24/7 que nunca duerme ni se equivoca de horario.
              </p>
              <div className="flex w-full max-w-[280px] items-center gap-3 rounded-2xl border border-space-border bg-space-card p-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-green-500/10 text-[17px]">
                  ✓
                </span>
                <div className="text-left">
                  <div className="text-xs font-extrabold text-space-text">Cita confirmada</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-space-muted">Hoy 2:00 PM · Gel · María</div>
                </div>
              </div>
            </div>

            {/* Paso 3 */}
            <div className="flex flex-col items-center gap-[18px] text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-space-primary bg-space-card text-[22px] font-extrabold text-space-primary">
                3
              </div>
              <h3 className="m-0 text-[19px] font-extrabold tracking-tight text-space-text">
                Tú lo ves todo en el dashboard
              </h3>
              <p className="m-0 max-w-[280px] text-sm leading-relaxed text-space-muted">
                Agenda en tiempo real + reportes por WhatsApp.
              </p>
              <div className="grid w-full max-w-[280px] grid-cols-2 gap-2.5 rounded-2xl border border-space-border bg-space-card p-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <div className="text-left">
                  <div className="text-lg font-extrabold text-space-primary">+38%</div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-space-muted">Reservas</div>
                </div>
                <div className="text-left">
                  <div className="text-lg font-extrabold text-space-text">−70%</div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-space-muted">No-shows</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
