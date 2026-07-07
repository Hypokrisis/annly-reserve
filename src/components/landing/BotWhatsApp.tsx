import React from 'react';

const BULLETS = [
  'Responde y agenda 24/7 en español natural',
  'Confirma, reagenda y cancela citas solo',
  'Recordatorios automáticos 24h y 1h antes',
  'Reconoce a tus clientes frecuentes por nombre',
];

export default function BotWhatsApp() {
  return (
    <section className="px-4 pt-5">
      <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[36px] border border-[#26382c] bg-gradient-to-b from-[#121b15] to-[#0b120e] px-14 py-[90px] max-sm:px-6 max-sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-52 -top-52 h-[700px] w-[700px] [background:radial-gradient(circle,rgba(155,194,135,0.08),transparent_65%)]"
        />
        <div className="relative mx-auto grid max-w-[1120px] grid-cols-[minmax(0,1fr)_minmax(0,420px)] items-center gap-[72px] max-[960px]:grid-cols-1">
          {/* Texto */}
          <div className="flex flex-col items-start gap-[22px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-space-primary/25 bg-space-primary/[0.08] px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-space-primary">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-space-primary" /> Conoce el bot
            </span>
            <h2 className="m-0 text-balance text-[clamp(32px,4vw,48px)] font-extrabold tracking-[-0.03em] text-[#f0f4ee]">
              Tu asistente de WhatsApp,{' '}
              <em className="font-serif font-normal italic text-space-primary">siempre disponible</em>
            </h2>
            <p className="m-0 max-w-[440px] text-pretty text-[17px] leading-relaxed text-[#95ab8a]">
              Responde, agenda y confirma citas por ti — en barberías, salones, spas o clínicas. En español natural, a
              cualquier hora, sin que muevas un dedo.
            </p>
            <ul className="m-0 mt-2 flex list-none flex-col gap-3.5 p-0">
              {BULLETS.map((b) => (
                <li key={b} className="flex items-start gap-3 text-[15px] font-semibold text-[#dbe6d4]">
                  <span className="mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-space-primary/30 bg-space-primary/10 text-[11px] text-space-primary">
                    ✓
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Chat mockup */}
          <div className="relative">
            <div className="overflow-hidden rounded-[28px] border border-[#26382c] bg-[#0f1a14] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7),0_0_50px_-10px_rgba(155,194,135,0.12)]">
              {/* Header chat */}
              <div className="flex items-center gap-3 border-b border-[#26382c] bg-[#16211a] px-[18px] py-4">
                <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-space-primary to-space-primary-dark">
                  <img src="/logo.png" alt="" className="h-full w-full object-cover object-top" />
                </span>
                <div className="flex-1">
                  <div className="text-sm font-extrabold text-[#f0f4ee]">Barbería Los Reyes</div>
                  <div className="flex items-center gap-[5px] text-[11px] font-semibold text-space-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Spacey Bot · en línea
                  </div>
                </div>
                <span className="text-base text-[#95ab8a]">⋮</span>
              </div>

              {/* Mensajes */}
              <div className="flex flex-col gap-2.5 px-4 pb-6 pt-5 [background-image:radial-gradient(rgba(155,194,135,0.05)_1px,transparent_1px)] [background-size:22px_22px]">
                <div className="max-w-[85%] self-end rounded-[14px_14px_3px_14px] bg-[#005c4b] px-[13px] py-[9px] text-[13px] font-medium leading-normal text-[#e7f5ef]">
                  Hola, ¿tienen espacio hoy para un corte?
                </div>
                <div className="max-w-[85%] self-start rounded-[14px_14px_14px_3px] bg-[#1d2a23] px-[13px] py-[9px] text-[13px] font-medium leading-normal text-[#dbe6d4]">
                  ¡Hola José! 👋 Claro que sí. Kevin tiene disponible hoy a las{' '}
                  <b className="text-space-primary">2:00 PM</b> y <b className="text-space-primary">4:30 PM</b>. ¿Cuál
                  prefieres?
                </div>
                <div className="max-w-[85%] self-end rounded-[14px_14px_3px_14px] bg-[#005c4b] px-[13px] py-[9px] text-[13px] font-medium leading-normal text-[#e7f5ef]">
                  La de 2pm 👍
                </div>
                <div className="max-w-[85%] self-start rounded-[14px_14px_14px_3px] bg-[#1d2a23] px-[13px] py-[9px] text-[13px] font-medium leading-normal text-[#dbe6d4]">
                  Listo ✂️ Tu cita quedó así:
                  <br />
                  <b className="text-[#f0f4ee]">Corte · hoy 2:00 PM · Kevin</b>
                  <br />
                  Te envío un recordatorio 1 hora antes. ¡Nos vemos!
                </div>
              </div>
            </div>

            {/* Notificación flotante */}
            <div className="absolute -bottom-[18px] -right-4 flex animate-floaty items-center gap-2.5 rounded-[14px] border border-[#26382c] bg-[#131c17] px-4 py-3 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.7)]">
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-green-500/15 text-sm text-green-500">
                ✓
              </span>
              <span className="text-xs font-extrabold text-[#f0f4ee]">Nueva reserva</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
