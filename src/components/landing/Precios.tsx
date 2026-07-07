import React, { useState } from 'react';
import { Link } from 'react-router-dom';

type Plan = {
  name: string;
  desc: string;
  monthly: string;
  annual: string;
  bullets: string[];
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: 'Starter',
    desc: 'Para cualquier negocio que empieza a organizar su agenda',
    monthly: '$19.99',
    annual: '$15.99',
    bullets: ['Bot WhatsApp con keywords', 'Página de reservas pública', 'Recordatorios automáticos', 'Dashboard básico'],
  },
  {
    name: 'Essential',
    desc: 'IA conversacional completa',
    monthly: '$39.99',
    annual: '$31.99',
    featured: true,
    bullets: [
      'Todo lo de Starter',
      'IA conversacional en español',
      'Cola de espera inteligente',
      'Clientes frecuentes reconocidos',
      'Reportes cada 2h por WhatsApp',
    ],
  },
  {
    name: 'Premium',
    desc: 'Para equipos grandes',
    monthly: '$79',
    annual: '$63.20',
    bullets: [
      'Todo lo de Essential',
      'Multi-empleado con reportes',
      'Agente proactivo anti-churn',
      'Reporte diario de ingresos',
      'Clientes VIP automáticos',
    ],
  },
];

export default function Precios() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  return (
    <section id="precios" className="px-4 pt-5">
      <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[36px] border border-[#26382c] bg-gradient-to-b from-[#121b15] to-[#0b120e] px-14 py-[90px] max-sm:px-6 max-sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-64 left-1/2 h-[500px] w-[900px] -translate-x-1/2 [background:radial-gradient(ellipse,rgba(155,194,135,0.08),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-[1120px]">
          <div className="mb-10 text-center">
            <div className="mb-3.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-space-primary">Precios</div>
            <h2 className="m-0 text-balance text-[clamp(32px,4vw,48px)] font-extrabold tracking-[-0.03em] text-[#f0f4ee]">
              Un plan para cada <em className="font-serif font-normal italic text-space-primary">etapa</em>
            </h2>
          </div>

          {/* Toggle */}
          <div className="mb-[52px] flex justify-center">
            <div className="flex gap-1 rounded-full border border-[#26382c] bg-[#131c17] p-1">
              <button
                onClick={() => setBilling('monthly')}
                className={`rounded-full px-5 py-[9px] text-[13px] font-extrabold transition-all ${
                  billing === 'monthly' ? 'bg-space-primary text-space-ink' : 'text-[#95ab8a]'
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBilling('annual')}
                className={`rounded-full px-5 py-[9px] text-[13px] font-extrabold transition-all ${
                  billing === 'annual' ? 'bg-space-primary text-space-ink' : 'text-[#95ab8a]'
                }`}
              >
                Anual <span className="text-[11px] opacity-80">−20%</span>
              </button>
            </div>
          </div>

          {/* Planes */}
          <div className="grid grid-cols-3 items-stretch gap-5 max-[960px]:grid-cols-1">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`relative flex flex-col gap-5 rounded-3xl p-8 ${
                  p.featured
                    ? 'border-2 border-space-primary bg-[#131c17] shadow-[0_0_60px_-12px_rgba(155,194,135,0.25)]'
                    : 'border border-[#26382c] bg-[#131c17]'
                }`}
              >
                {p.featured && (
                  <span className="absolute -top-[13px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-space-primary px-3.5 py-[5px] text-[11px] font-extrabold uppercase tracking-[0.08em] text-space-ink">
                    Más popular
                  </span>
                )}
                <div>
                  <div className={`text-[15px] font-extrabold ${p.featured ? 'text-space-primary' : 'text-[#f0f4ee]'}`}>
                    {p.name}
                  </div>
                  <div className="mt-1 text-[13px] font-semibold text-[#95ab8a]">{p.desc}</div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[42px] font-extrabold tracking-tight text-[#f0f4ee]">
                    {billing === 'annual' ? p.annual : p.monthly}
                  </span>
                  <span className="text-[13px] font-bold text-[#95ab8a]">/mes</span>
                </div>
                <ul className="m-0 flex flex-1 list-none flex-col gap-[11px] p-0">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex gap-2.5 text-sm font-semibold text-[#dbe6d4]">
                      <span className="text-space-primary">✓</span> {b}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block rounded-full py-[13px] text-center text-sm font-extrabold no-underline transition-colors ${
                    p.featured
                      ? 'bg-space-primary text-space-ink shadow-[0_6px_24px_rgba(155,194,135,0.35)] hover:bg-space-primary-hover'
                      : 'border border-[#35503f] text-[#f0f4ee] hover:border-space-primary hover:text-space-primary'
                  }`}
                >
                  {p.featured ? 'Empezar con Essential →' : 'Empezar'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
