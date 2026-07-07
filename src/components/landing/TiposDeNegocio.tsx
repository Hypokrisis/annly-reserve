import React from 'react';

const TYPES = [
  { icon: '💈', label: 'Barberías' },
  { icon: '💇‍♀️', label: 'Salones de belleza' },
  { icon: '💆', label: 'Spas y masajes' },
  { icon: '💅', label: 'Nails y estética' },
  { icon: '🖋️', label: 'Estudios de tatuaje' },
  { icon: '🦷', label: 'Clínicas y consultorios' },
  { icon: '🏋️', label: 'Entrenadores personales' },
  { icon: '🐶', label: 'Grooming de mascotas' },
];

export default function TiposDeNegocio() {
  return (
    <section className="bg-space-bg px-6 pt-24 max-sm:px-5 max-sm:pt-16">
      <div className="mx-auto max-w-[1120px] text-center">
        <div className="mb-3.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-space-primary">
          Para tu tipo de negocio
        </div>
        <h2 className="m-0 mb-3.5 text-balance text-[clamp(28px,3.6vw,42px)] font-extrabold tracking-[-0.03em] text-space-text">
          Si trabajas con citas, Spacey es{' '}
          <em className="font-serif font-normal italic text-space-primary">para ti</em>
        </h2>
        <p className="mx-auto mb-10 mt-0 max-w-[520px] text-pretty text-base leading-relaxed text-space-muted">
          El mismo bot, la misma agenda y el mismo control — sin importar lo que reserves.
        </p>
        <div className="mx-auto flex max-w-[880px] flex-wrap justify-center gap-3">
          {TYPES.map((t) => (
            <span
              key={t.label}
              className="inline-flex items-center gap-2 rounded-full border border-space-border bg-space-card px-5 py-3 text-sm font-bold text-space-text transition hover:-translate-y-0.5 hover:border-space-primary"
            >
              <span className="text-base">{t.icon}</span> {t.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
