import React from 'react';
import { Link } from 'react-router-dom';

export default function CTAFinal() {
  return (
    <section className="px-4 py-5">
      <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[36px] bg-space-primary px-14 py-24 text-center max-sm:px-6 max-sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(34,50,28,0.10)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_60%_70%_at_50%_0%,black,transparent_80%)]"
        />
        <div className="relative mx-auto flex max-w-[720px] flex-col items-center gap-6">
          <h2 className="m-0 text-balance text-[clamp(34px,4.5vw,54px)] font-extrabold tracking-[-0.035em] text-space-ink">
            ¿Listo para modernizar tu <em className="font-serif font-normal italic">negocio</em>?
          </h2>
          <p className="m-0 max-w-[480px] text-[17px] font-semibold text-[#3f5a34]">
            Orden, control y automatización para tu negocio en menos de 10 minutos.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-full bg-[#0b110e] px-[30px] py-4 text-[15px] font-extrabold text-[#f0f4ee] no-underline shadow-[0_12px_32px_rgba(11,17,14,0.3)] transition hover:-translate-y-0.5"
          >
            Empieza gratis hoy <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
