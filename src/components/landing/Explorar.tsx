import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/supabaseClient';

type Biz = {
  id: string;
  name: string;
  city: string;
  slug: string;
  services: string;
  rating: string;
  photo?: string;
};

export default function Explorar() {
  const [businesses, setBusinesses] = useState<Biz[]>([]);
  const [towns, setTowns] = useState<string[]>(['Todos']);
  const [town, setTown] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('businesses')
        .select('id, name, slug, city, avg_rating, banner_url, logo_url, services(name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(24);

      if (data) {
        const mapped: Biz[] = data.map((b: any) => ({
          id: b.id,
          name: b.name,
          city: b.city || '',
          slug: b.slug,
          services: (b.services as { name: string }[])
            .slice(0, 3)
            .map((s) => s.name)
            .join(' · '),
          rating: b.avg_rating != null ? Number(b.avg_rating).toFixed(1) : '—',
          photo: b.banner_url || b.logo_url || undefined,
        }));
        setBusinesses(mapped);
        const uniqueCities = [
          'Todos',
          ...Array.from(new Set(mapped.map((b) => b.city).filter(Boolean))),
        ];
        setTowns(uniqueCities);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = town === 'Todos' ? businesses : businesses.filter((b) => b.city === town);

  return (
    <section id="explorar" className="relative overflow-hidden bg-space-bg px-6 py-[110px] max-sm:px-5 max-sm:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 [background:radial-gradient(ellipse,rgba(155,194,135,0.12),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-[1120px]">
        <div className="mb-11 text-center">
          <div className="mb-3.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-space-primary">Explorar</div>
          <h2 className="m-0 text-balance text-[clamp(32px,4vw,48px)] font-extrabold tracking-[-0.03em] text-space-text">
            Encuentra tu lugar <em className="font-serif font-normal italic text-space-primary">favorito</em>
          </h2>
          <p className="mx-auto mt-3.5 max-w-[480px] text-pretty text-base leading-relaxed text-space-muted">
            Barberías, salones, spas, nails y más — reserva en segundos por WhatsApp o web.
          </p>
        </div>

        {/* Filtro por pueblo */}
        <div className="mb-11 flex flex-wrap justify-center gap-2">
          {towns.map((t) => (
            <button
              key={t}
              onClick={() => setTown(t)}
              className={`rounded-full border px-[18px] py-[9px] text-[13px] font-bold transition-all ${
                t === town
                  ? 'border-space-primary bg-space-primary text-space-ink'
                  : 'border-space-border bg-space-card text-space-muted hover:border-space-primary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Carrusel horizontal con snap */}
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-space-border border-t-space-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-space-border bg-space-card p-16 text-center">
            <p className="text-sm font-semibold text-space-muted">
              {town === 'Todos' ? 'Aún no hay negocios activos.' : `Sin negocios en ${town}.`}
            </p>
          </div>
        ) : (
          <div className="flex gap-5 overflow-x-auto px-1 pb-5 pt-1 [-webkit-overflow-scrolling:touch] [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filtered.map((b) => (
              <div
                key={b.id}
                className="flex w-[300px] shrink-0 snap-start flex-col overflow-hidden rounded-[22px] border border-space-border bg-space-card transition hover:-translate-y-0.5 hover:border-space-primary max-sm:w-[82vw]"
              >
                {b.photo ? (
                  <img src={b.photo} alt={b.name} className="h-[170px] w-full border-b border-space-border object-cover" />
                ) : (
                  <div className="flex h-[170px] w-full items-center justify-center border-b border-space-border bg-space-card2 text-xs font-semibold text-space-muted">
                    {b.name}
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2.5 p-5">
                  <div className="flex items-center justify-between gap-2.5">
                    <h3 className="m-0 text-[17px] font-extrabold tracking-tight text-space-text">{b.name}</h3>
                    {b.rating !== '—' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-space-card2 px-[9px] py-1 text-xs font-extrabold text-space-text">
                        ★ {b.rating}
                      </span>
                    )}
                  </div>
                  {b.city && (
                    <div className="text-xs font-bold text-space-muted">📍 {b.city}, Puerto Rico</div>
                  )}
                  {b.services && (
                    <div className="text-[13px] font-semibold text-space-muted">{b.services}</div>
                  )}
                  <Link
                    to={`/book/${b.slug}`}
                    className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full border border-space-border px-[18px] py-[11px] text-[13px] font-extrabold text-space-text no-underline transition-colors hover:border-space-primary hover:bg-space-primary hover:text-space-ink"
                  >
                    Reservar →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
