import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
    Check, Star, Zap, Crown, ArrowRight, ShieldCheck,
    Loader2, CreditCard, CalendarClock, AlertTriangle,
    BadgeCheck, Settings2, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Subscription {
    id: string;
    tier_id: string;
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    stripe_customer_id: string | null;
}

interface Tier {
    id: string;
    name: string;
    price_monthly: number;
    stripe_price_id: string;
}

const PLANS = [
    {
        id: 'starter',
        name: 'Starter',
        price: '$19',
        description: 'Para barberos individuales que están comenzando.',
        icon: Star,
        features: ['1 Barbero', 'Reservas Ilimitadas', 'Página Web Personalizada', 'Panel Básico', 'Soporte por Email'],
        missingFeatures: ['Recordatorios WhatsApp Auto', 'Pasarela de Pagos Stripe', 'Múltiples Barberos'],
        color: 'text-gray-400',
        bg: 'bg-gray-400/10',
        border: 'border-space-border/40',
        activeBorder: 'border-gray-400',
        btn: 'bg-space-card hover:bg-space-border text-space-text',
        popular: false,
    },
    {
        id: 'essential',
        name: 'Essential',
        price: '$39',
        description: 'Para barberías pequeñas que quieren automatizar su flujo.',
        icon: Zap,
        features: ['Todo lo de Starter', 'Hasta 3 Barberos', 'Recordatorios WhatsApp Auto', 'Confirmaciones Instantáneas', 'Estadísticas Básicas'],
        missingFeatures: ['Cobro Automático (Deposits)', 'Depósitos via Stripe'],
        color: 'text-space-primary',
        bg: 'bg-space-primary/10',
        border: 'border-space-primary',
        activeBorder: 'border-space-primary',
        btn: 'bg-space-primary hover:bg-space-primary-dark text-white',
        popular: true,
    },
    {
        id: 'premium',
        name: 'Premium',
        price: '$79',
        description: 'Control absoluto y cobro online. Para negocios consolidados.',
        icon: Crown,
        features: ['Todo lo de Essential', 'Barberos Ilimitados', 'Pasarela de Pagos', 'Depósitos & No-Show Protection', 'Estadísticas Financieras', 'Soporte VIP 24/7'],
        missingFeatures: [],
        color: 'text-yellow-400',
        bg: 'bg-yellow-400/10',
        border: 'border-yellow-400/30',
        activeBorder: 'border-yellow-400',
        btn: 'bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-black font-black',
        popular: false,
    },
];

function getDaysRemaining(dateStr: string): number {
    const end = new Date(dateStr);
    const now = new Date();
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function SubscriptionPage() {
    const { currentBusiness } = useAuth();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loadingSub, setLoadingSub] = useState(true);
    const [isLoadingCheckout, setIsLoadingCheckout] = useState<string | null>(null);
    const [isLoadingPortal, setIsLoadingPortal] = useState(false);

    useEffect(() => {
        if (!currentBusiness?.id) return;
        loadSubscription();
    }, [currentBusiness?.id]);

    const loadSubscription = async () => {
        setLoadingSub(true);
        try {
            const { data } = await supabase
                .from('business_subscriptions')
                .select('*')
                .eq('business_id', currentBusiness!.id)
                .single();
            setSubscription(data || null);
        } catch {
            setSubscription(null);
        } finally {
            setLoadingSub(false);
        }
    };

    const handleSubscribe = async (tierId: string) => {
        if (!currentBusiness?.id) return;
        setIsLoadingCheckout(tierId);
        try {
            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: {
                    businessId: currentBusiness.id,
                    tierId,
                    successUrl: `${window.location.origin}/dashboard/billing`,
                    cancelUrl: `${window.location.origin}/dashboard/billing`,
                }
            });
            if (error) throw error;
            if (data?.url) window.location.href = data.url;
            else throw new Error('No se recibió URL de Stripe');
        } catch (err: any) {
            alert(err.message || 'Error al conectar con el sistema de pago');
        } finally {
            setIsLoadingCheckout(null);
        }
    };

    const handleManagePortal = async () => {
        if (!currentBusiness?.id) return;
        setIsLoadingPortal(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-portal-session', {
                body: {
                    businessId: currentBusiness.id,
                    returnUrl: `${window.location.origin}/dashboard/billing`,
                }
            });
            if (error) throw error;
            if (data?.url) window.location.href = data.url;
            else throw new Error('No se recibió URL del portal');
        } catch (err: any) {
            alert(err.message || 'Error al abrir el portal de gestión');
        } finally {
            setIsLoadingPortal(false);
        }
    };

    const activePlan = PLANS.find(p => p.id === subscription?.tier_id);
    const isTrialing = subscription?.status === 'trialing';
    const isActive = subscription?.status === 'active';
    const isPastDue = subscription?.status === 'past_due';
    const isCanceled = subscription?.status === 'canceled';
    const hasActiveSub = (isTrialing || isActive) && !isCanceled;
    const daysLeft = subscription?.current_period_end ? getDaysRemaining(subscription.current_period_end) : 0;

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-space-primary/10 text-space-primary text-xs font-black uppercase tracking-widest border border-space-primary/20">
                        <ShieldCheck size={14} /> 14 Días de Prueba Gratis
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-space-text tracking-tight">
                        {hasActiveSub ? 'Tu Plan Actual' : 'Elige tu'} <span className="text-space-primary">{hasActiveSub ? '' : 'Plan'}</span>
                    </h1>
                </div>

                {/* Loading State */}
                {loadingSub && (
                    <div className="flex justify-center py-12">
                        <Loader2 size={32} className="animate-spin text-space-primary" />
                    </div>
                )}

                {/* PAST DUE ALERT */}
                {!loadingSub && isPastDue && (
                    <div className="flex items-start gap-4 p-6 bg-red-50 border-2 border-red-300 rounded-3xl">
                        <AlertTriangle size={28} className="text-space-danger flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="font-black text-space-danger text-lg mb-1">Pago Fallido — Acción Requerida</h3>
                            <p className="text-red-700 text-sm">Tu pago mensual no pudo procesarse. Actualiza tu método de pago para evitar la suspensión del servicio.</p>
                        </div>
                        <button
                            onClick={handleManagePortal}
                            disabled={isLoadingPortal}
                            className="flex items-center gap-2 px-5 py-3 bg-space-danger text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition whitespace-nowrap"
                        >
                            {isLoadingPortal ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                            Actualizar Pago
                        </button>
                    </div>
                )}

                {/* ACTIVE SUBSCRIPTION CARD */}
                {!loadingSub && hasActiveSub && activePlan && (
                    <div className={`p-8 rounded-3xl border-2 ${activePlan.activeBorder} bg-space-card relative overflow-hidden`}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-space-primary/5 rounded-full -mr-32 -mt-32 pointer-events-none" />
                        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                            <div className={`w-16 h-16 rounded-2xl ${activePlan.bg} ${activePlan.color} flex items-center justify-center flex-shrink-0`}>
                                <activePlan.icon size={32} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-2xl font-black text-space-text">Spacey {activePlan.name}</h2>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                                        isTrialing ? 'bg-blue-100 text-blue-700' :
                                        isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                        <BadgeCheck size={12} />
                                        {isTrialing ? `Trial · ${daysLeft} días restantes` : isActive ? 'Activo' : 'Cancelado'}
                                    </span>
                                </div>
                                {subscription?.current_period_end && (
                                    <div className="flex items-center gap-2 text-space-muted text-sm font-medium">
                                        <CalendarClock size={14} />
                                        {isTrialing
                                            ? `Trial vence el ${formatDate(subscription.current_period_end)}`
                                            : subscription.cancel_at_period_end
                                                ? `Cancela el ${formatDate(subscription.current_period_end)}`
                                                : `Se renueva el ${formatDate(subscription.current_period_end)}`
                                        }
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={loadSubscription}
                                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-2 border-space-border text-space-muted hover:text-space-text hover:border-space-text text-xs font-black uppercase tracking-widest transition"
                                >
                                    <RefreshCw size={14} /> Actualizar
                                </button>
                                <button
                                    onClick={handleManagePortal}
                                    disabled={isLoadingPortal}
                                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-space-text text-white text-xs font-black uppercase tracking-widest hover:bg-space-primary transition disabled:opacity-50"
                                >
                                    {isLoadingPortal ? <Loader2 size={14} className="animate-spin" /> : <Settings2 size={14} />}
                                    Gestionar Plan
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* TRIAL ENDING SOON WARNING */}
                {!loadingSub && isTrialing && daysLeft <= 3 && (
                    <div className="flex items-center gap-4 p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl">
                        <AlertTriangle size={22} className="text-amber-600 flex-shrink-0" />
                        <p className="text-amber-800 text-sm font-bold flex-1">
                            Tu periodo de prueba vence en <strong>{daysLeft} {daysLeft === 1 ? 'día' : 'días'}</strong>. Agrega un método de pago para no perder el acceso.
                        </p>
                        <button onClick={handleManagePortal} disabled={isLoadingPortal} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition whitespace-nowrap">
                            Añadir Tarjeta
                        </button>
                    </div>
                )}

                {/* PLAN CARDS — always shown, even on active sub */}
                {!loadingSub && (
                    <>
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-black text-space-text uppercase tracking-tight">
                                {hasActiveSub ? 'Cambiar de Plan' : 'Selecciona un Plan'}
                            </h2>
                            <span className="h-px flex-1 bg-space-border" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {PLANS.map((plan) => {
                                const Icon = plan.icon;
                                const isCurrent = subscription?.tier_id === plan.id && hasActiveSub;
                                return (
                                    <div
                                        key={plan.id}
                                        className={`relative flex flex-col p-7 rounded-3xl border-2 transition-all duration-300 bg-space-card
                                            ${isCurrent ? `${plan.activeBorder} shadow-lg` : plan.popular ? 'border-space-primary md:-translate-y-3 shadow-[0_0_40px_-10px_rgba(123,160,108,0.3)]' : 'border-space-border/40 hover:border-space-border'}
                                        `}
                                    >
                                        {plan.popular && !isCurrent && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-space-primary text-white text-xs font-black uppercase tracking-widest rounded-full">
                                                Más Popular
                                            </div>
                                        )}
                                        {isCurrent && (
                                            <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 ${plan.bg} ${plan.color} border ${plan.activeBorder} text-xs font-black uppercase tracking-widest rounded-full`}>
                                                ✓ Plan Actual
                                            </div>
                                        )}

                                        <div className="mb-5">
                                            <div className={`w-12 h-12 rounded-2xl ${plan.bg} ${plan.color} flex items-center justify-center mb-5`}>
                                                <Icon size={24} />
                                            </div>
                                            <h3 className="text-lg font-bold text-space-text mb-1">Spacey {plan.name}</h3>
                                            <p className="text-space-muted text-sm leading-relaxed">{plan.description}</p>
                                        </div>

                                        <div className="mb-7 flex items-end gap-1">
                                            <span className="text-4xl font-black text-space-text tracking-tighter">{plan.price}</span>
                                            <span className="text-space-muted font-medium mb-1">/mes</span>
                                        </div>

                                        <button
                                            disabled={isLoadingCheckout !== null || isCurrent}
                                            onClick={() => !isCurrent && handleSubscribe(plan.id)}
                                            className={`w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 uppercase tracking-widest text-xs font-bold mb-6 disabled:opacity-50
                                                ${isCurrent ? 'bg-space-bg text-space-muted cursor-not-allowed border border-space-border' : plan.btn}
                                            `}
                                        >
                                            {isLoadingCheckout === plan.id ? (
                                                <Loader2 size={15} className="animate-spin" />
                                            ) : isCurrent ? (
                                                <><BadgeCheck size={15} /> Plan Actual</>
                                            ) : (
                                                <>{hasActiveSub ? 'Cambiar a este Plan' : 'Comenzar Ahora'} <ArrowRight size={15} /></>
                                            )}
                                        </button>

                                        <div className="space-y-3 flex-1">
                                            {plan.features.map((f, i) => (
                                                <div key={i} className="flex items-start gap-3">
                                                    <div className="mt-0.5 w-5 h-5 rounded-full bg-space-primary/10 flex items-center justify-center flex-shrink-0">
                                                        <Check size={11} className="text-space-primary" />
                                                    </div>
                                                    <span className="text-sm text-space-text/90">{f}</span>
                                                </div>
                                            ))}
                                            {plan.missingFeatures.map((f, i) => (
                                                <div key={i} className="flex items-start gap-3 opacity-35">
                                                    <div className="mt-0.5 w-5 h-5 rounded-full bg-space-bg flex items-center justify-center flex-shrink-0 border border-space-border">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-space-muted" />
                                                    </div>
                                                    <span className="text-sm text-space-text">{f}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Footer Info */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 text-space-muted text-xs font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-space-primary" /> Pagos 100% seguros via Stripe</span>
                    <span className="flex items-center gap-2"><CreditCard size={14} className="text-space-primary" /> Cancela en cualquier momento</span>
                    <span className="flex items-center gap-2"><BadgeCheck size={14} className="text-space-primary" /> 14 días de prueba gratis</span>
                </div>

            </div>
        </DashboardLayout>
    );
}
