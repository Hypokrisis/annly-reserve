import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Heart, ArrowRight, CheckCircle2 } from 'lucide-react';

/**
 * Tarjeta de negocio del directorio público. Compartida entre el landing (Home)
 * y el panel de cliente (/client) para que sean literalmente las mismas tarjetas.
 * Module-level + React.memo → identidad estable (React no la remonta por render).
 */
export interface BusinessResult {
    id: string;
    name: string;
    slug: string;
    description?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    business_type?: string;
    is_verified?: boolean;
    avg_rating?: number;
    total_reviews?: number;
    created_at?: string;
    banner_url?: string;
    logo_url?: string;
    latitude?: number;
    longitude?: number;
    instagram_url?: string;
    website_url?: string;
    services?: { name: string }[];
}

export const TYPE_META: Record<string, { label: string; emoji: string }> = {
    barberia: { label: 'Barbería', emoji: '💈' },
    salon: { label: 'Salón', emoji: '✂️' },
    nails: { label: 'Nail Salon', emoji: '💅' },
    barba: { label: 'Barbería', emoji: '🧔' },
};

export function isNew(createdAt?: string) {
    if (!createdAt) return false;
    return Date.now() - new Date(createdAt).getTime() < 30 * 24 * 60 * 60 * 1000;
}

export const BusinessCard = React.memo(({ business, isFav, isLoggedIn, onToggleFavorite }: {
    business: BusinessResult;
    isFav: boolean;
    isLoggedIn: boolean;
    onToggleFavorite: (e: React.MouseEvent, slug: string) => void;
}) => {
    const typeMeta = TYPE_META[business.business_type || 'barberia'] || TYPE_META.barberia;
    const rating = business.avg_rating || 0;
    const reviews = business.total_reviews || 0;
    const serviceNames = (business.services || []).map(s => s.name).slice(0, 3).join(' · ');
    const isNewBiz = isNew(business.created_at);

    return (
      <div className="group bg-space-card border border-space-border/60 hover:border-space-primary/40 rounded-[2rem] overflow-hidden hover:shadow-xl hover:shadow-space-primary/10 hover:-translate-y-1.5 transition-all duration-400 flex flex-col">
        {/* Banner */}
        <div className="relative">
          <Link to={`/business/${business.slug}`} className="block h-36 overflow-hidden bg-space-card2">
            <img
              src={business.banner_url || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=600'}
              alt={business.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </Link>

          {/* Top-left badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
            {business.is_verified && (
              <span className="px-2 py-1 rounded-lg bg-space-primary text-space-card text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <CheckCircle2 size={9} /> Verificado
              </span>
            )}
            {isNewBiz && (
              <span className="px-2 py-1 rounded-lg bg-space-yellow text-space-text text-[8px] font-extrabold uppercase tracking-wider shadow-sm">
                ✨ Nuevo
              </span>
            )}
          </div>

          {isLoggedIn && (
            <button onClick={(e) => onToggleFavorite(e, business.slug)}
              className="absolute top-3 right-3 w-8 h-8 bg-space-card/90 backdrop-blur rounded-xl flex items-center justify-center border border-space-border/40 hover:scale-110 transition-all">
              <Heart size={14} className={isFav ? 'fill-space-danger text-space-danger' : 'text-space-muted'} />
            </button>
          )}

          {/* Logo */}
          <div className="absolute -bottom-6 left-4 w-12 h-12 rounded-xl bg-space-card p-0.5 shadow-lg border border-space-border/30 overflow-hidden">
            <img
              src={business.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(business.name)}&background=1a2e28&color=fff`}
              className="w-full h-full object-cover rounded-lg"
              alt=""
            />
          </div>
        </div>

        <div className="p-4 pt-8 flex flex-col flex-1">
          {/* Name + rating */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <Link to={`/business/${business.slug}`} className="min-w-0">
              <h3 className="font-extrabold text-space-text text-sm leading-tight hover:text-space-primary transition-colors truncate">{business.name}</h3>
            </Link>
            {reviews > 0 ? (
              <div className="flex items-center gap-1 flex-shrink-0 text-[11px] font-bold text-space-text">
                <Star size={11} className="fill-space-yellow text-space-yellow" />
                {rating.toFixed(1)}
                <span className="text-space-muted font-medium">({reviews})</span>
              </div>
            ) : (
              <span className="flex-shrink-0 text-[9px] font-bold text-space-muted/50 uppercase tracking-wider">Sin reseñas</span>
            )}
          </div>

          {/* Type + city */}
          <div className="flex items-center gap-1 text-[10px] text-space-muted font-bold tracking-wide mb-2">
            <span>{typeMeta.emoji}</span>
            <span className="text-space-primary">{typeMeta.label}</span>
            {business.city && <><span className="text-space-muted/40">·</span><span>{business.city}, {business.state || 'PR'}</span></>}
          </div>

          {/* Services */}
          {serviceNames ? (
            <p className="text-[11px] text-space-muted/80 line-clamp-1 mb-3 flex-1">
              <span className="font-bold text-space-text/70">Servicios:</span> {serviceNames}
            </p>
          ) : (
            <p className="text-[11px] text-space-muted/60 line-clamp-2 mb-3 flex-1">{business.description || 'Reserva tu cita con los mejores profesionales.'}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-auto">
            <Link to={`/business/${business.slug}`}
              className="flex-1 h-9 flex items-center justify-center text-[10px] font-extrabold uppercase tracking-wider rounded-xl border border-space-border/60 text-space-muted hover:border-space-primary/30 hover:text-space-text transition-all">
              Ver detalles
            </Link>
            <Link to={`/book/${business.slug}`}
              className="flex-1 h-9 flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-wider rounded-xl bg-space-primary text-space-card hover:bg-space-primary-dark transition-all shadow-sm">
              Reservar <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>
    );
});
