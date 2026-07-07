import React from 'react';

const TICKER_TEXT =
  'Bot WhatsApp · Reservas 24/7 · Orden · Control · Automatización · Barberías · Salones · Spas · Hecho en PR 🇵🇷 · ';

export default function Ticker() {
  return (
    <div className="mt-5 overflow-hidden bg-space-primary py-3.5">
      <div className="flex w-max animate-marquee">
        {[0, 1].map((i) => (
          <span
            key={i}
            className="whitespace-nowrap pr-6 text-sm font-extrabold uppercase tracking-wider text-space-ink"
          >
            {TICKER_TEXT}
          </span>
        ))}
      </div>
    </div>
  );
}
