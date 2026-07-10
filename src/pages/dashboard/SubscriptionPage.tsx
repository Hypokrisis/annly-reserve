import { useEffect, useState } from 'react';
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

const PLANS = [
    {
        id: 'starter',
        name: 'Starter',
        price: '$19',
        description: 'Ideal para profesionales independientes o equipos pequeños que están arrancando.',
        icon: Star,
        features: [
            'Hasta 3 Barberos / Especialistas',
            'Hasta 150 Citas Completadas al mes',
            'Recordatorios ilimitados por Email y Push',
            'Cobros y Depósitos vía Stripe (0% Com.)',
            'Página Web de Reservas profesional'
        ],
        missingFeatures: [
            'Recordatorios automáticos por WhatsApp',
            'Estadísticas y Reportes Financieros',
            'Control de Inventario y Herramientas Pro'
        ],
        iconColor: '#95ab8a',
        iconBg: 'rgba(149,171,138,0.1)',
        borderColor: '#243529',
        activeBorderColor: '#95ab8a',
        badgeBg: 'rgba(149,171,138,0.1)',
        badgeColor: '#95ab8a',
        buttonStyle: { background: '#1d2a23', color: '#f0f4ee', border: '1px solid #243529' } as React.CSSProperties,
        popular: false,
    },
    {
        id: 'essential',
        name: 'Essential',
        price: '$39',
        description: 'Perfecto para barberías y salones establecidos con flujo constante.',
        icon: Zap,
        features: [
            'Hasta 6 Barberos / Especialistas',
            'Hasta 500 Citas Completadas al mes',
            'Todo lo de Starter incluido',
            'Automatización de WhatsApp (400 sms/mes)',
            'Reportes de ganancias y retención básica'
        ],
        missingFeatures: [
            'Citas mensuales ilimitadas',
            'Gestión de Inventario de Productos',
            'Reportes avanzados y exportación de datos'
        ],
        iconColor: '#9bc287',
        iconBg: 'rgba(155,194,135,0.1)',
        borderColor: '#9bc287',
        activeBorderColor: '#9bc287',
        badgeBg: 'rgba(155,194,135,0.1)',
        badgeColor: '#9bc287',
        buttonStyle: { background: '#9bc287', color: '#22321c' } as React.CSSProperties,
        popular: true,
    },
    {
        id: 'premium',
        name: 'Premium',
        price: '$79',
        description: 'Control absoluto, automatización masiva y reportes avanzados sin límites.',
        icon: Crown,
        features: [
            'Hasta 20 Barberos / Especialistas',
            'Citas Mensuales ILIMITADAS',
            'Todo lo de Essential incluido',
            'Automatización de WhatsApp (1200 sms/mes)',
            'Control de Inventario de Productos',
            'Reportes avanzados y exportación de datos'
        ],
        missingFeatures: [],
        iconColor: '#f59e0b',
        iconBg: 'rgba(245,158,11,0.1)',
        borderColor: 'rgba(245,158,11,0.3)',
        activeBorderColor: '#f59e0b',
        badgeBg: 'rgba(245,158,11,0.1)',
        badgeColor: '#f59e0b',
        buttonStyle: { background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#1a1000' } as React.CSSProperties,
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
                body: { businessId: currentBusiness.id, returnUrl: `${window.location.origin}/dashboard/billing` }
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
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest"
                        style={{ background: 'rgba(155,194,135,0.1)', color: '#9bc287', border: '1px solid rgba(155,194,135,0.2)' }}>
                        <ShieldCheck size={14} /> 14 Días de Prueba Gratis
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#f0f4ee]">
                        {hasActiveSub ? 'Tu Plan Actual' : 'Elige tu'} <span className="text-[#9bc287]">{hasActiveSub ? '' : 'Plan'}</span>
                    </h1>
                </div>

                {loadingSub && (
                    <div className="flex justify-center py-12">
                        <Loader2 size={32} className="animate-spin" style={{ color: '#9bc287' }} />
                    </div>
                )}

                {/* Past due alert */}
                {!loadingSub && isPastDue && (
                    <div className="flex items-start gap-4 p-6 rounded-3xl border-2" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' }}>
                        <AlertTriangle size={28} style={{ color: '#ef4444' }} className="flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="font-black text-lg mb-1" style={{ color: '#ef4444' }}>Pago Fallido — Acción Requerida</h3>
                            <p className="text-sm text-[#95ab8a]">Tu pago mensual no pudo procesarse. Actualiza tu método de pago para evitar la suspensión del servicio.</p>
                        </div>
                        <button onClick={handleManagePortal} disabled={isLoadingPortal}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest whitespace-nowrap transition disabled:opacity-50"
                            style={{ background: '#ef4444', color: 'white' }}>
                            {isLoadingPortal ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                            Actualizar Pago
                        </button>
                    </div>
                )}

                {/* Active subscription card */}
                {!loadingSub && hasActiveSub && activePlan && (
                    <div className="p-8 rounded-3xl border-2 relative overflow-hidden" style={{ background: '#131c17', borderColor: activePlan.activeBorderColor }}>
                        <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(155,194,135,0.04)', marginRight: '-8rem', marginTop: '-8rem' }} />
                        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                                style={{ background: activePlan.iconBg, color: activePlan.iconColor }}>
                                <activePlan.icon size={32} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-2xl font-black text-[#f0f4ee]">Spacey {activePlan.name}</h2>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest"
                                        style={isTrialing
                                            ? { background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }
                                            : isActive
                                                ? { background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }
                                                : { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }
                                        }>
                                        <BadgeCheck size={12} />
                                        {isTrialing ? `Trial · ${daysLeft} días restantes` : isActive ? 'Activo' : 'Cancelado'}
                                    </span>
                                </div>
                                {subscription?.current_period_end && (
                                    <div className="flex items-center gap-2 text-sm font-medium text-[#95ab8a]">
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
                                <button onClick={loadSubscription}
                                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition"
                                    style={{ borderColor: '#243529', color: '#95ab8a' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#f0f4ee'; e.currentTarget.style.color = '#f0f4ee'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#243529'; e.currentTarget.style.color = '#95ab8a'; }}>
                                    <RefreshCw size={14} /> Actualizar
                                </button>
                                <button onClick={handleManagePortal} disabled={isLoadingPortal}
                                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition disabled:opacity-50"
                                    style={{ background: '#f0f4ee', color: '#22321c' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#9bc287'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#f0f4ee'; }}>
                                    {isLoadingPortal ? <Loader2 size={14} className="animate-spin" /> : <Settings2 size={14} />}
                                    Gestionar Plan
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Trial ending soon */}
                {!loadingSub && isTrialing && daysLeft <= 3 && (
                    <div className="flex items-center gap-4 p-5 rounded-2xl border-2" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)' }}>
                        <AlertTriangle size={22} style={{ color: '#f59e0b' }} className="flex-shrink-0" />
                        <p className="text-sm font-bold flex-1 text-[#f0f4ee]">
                            Tu periodo de prueba vence en <strong>{daysLeft} {daysLeft === 1 ? 'día' : 'días'}</strong>. Agrega un método de pago para no perder el acceso.
                        </p>
                        <button onClick={handleManagePortal} disabled={isLoadingPortal}
                            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition whitespace-nowrap"
                            style={{ background: '#f59e0b', color: '#1a0f00' }}>
                            Añadir Tarjeta
                        </button>
                    </div>
                )}

                {/* Plan cards */}
                {!loadingSub && (
                    <>
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-black uppercase tracking-tight text-[#f0f4ee]">
                                {hasActiveSub ? 'Cambiar de Plan' : 'Selecciona un Plan'}
                            </h2>
                            <span className="h-px flex-1" style={{ background: '#243529' }} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {PLANS.map((plan) => {
                                const Icon = plan.icon;
                                const isCurrent = subscription?.tier_id === plan.id && hasActiveSub;
                                return (
                                    <div
                                        key={plan.id}
                                        className="relative flex flex-col p-7 rounded-3xl border-2 transition-all duration-300"
                                        style={{
                                            background: '#131c17',
                                            borderColor: isCurrent ? plan.activeBorderColor : plan.popular ? plan.borderColor : '#243529',
                                            transform: !isCurrent && plan.popular ? 'translateY(-12px)' : 'none',
                                            boxShadow: !isCurrent && plan.popular ? `0 0 40px -10px rgba(155,194,135,0.3)` : 'none',
                                        }}
                                    >
                                        {plan.popular && !isCurrent && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest"
                                                style={{ background: '#9bc287', color: '#22321c' }}>
                                                Más Popular
                                            </div>
                                        )}
                                        {isCurrent && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border"
                                                style={{ background: plan.badgeBg, color: plan.badgeColor, borderColor: plan.activeBorderColor }}>
                                                ✓ Plan Actual
                                            </div>
                                        )}

                                        <div className="mb-5">
                                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                                                style={{ background: plan.iconBg, color: plan.iconColor }}>
                                                <Icon size={24} />
                                            </div>
                                            <h3 className="text-lg font-bold text-[#f0f4ee] mb-1">Spacey {plan.name}</h3>
                                            <p className="text-sm leading-relaxed text-[#95ab8a]">{plan.description}</p>
                                        </div>

                                        <div className="mb-7 flex items-end gap-1">
                                            <span className="text-4xl font-black tracking-tighter text-[#f0f4ee]">{plan.price}</span>
                                            <span className="font-medium mb-1 text-[#95ab8a]">/mes</span>
                                        </div>

                                        <button
                                            disabled={isLoadingCheckout !== null || isCurrent}
                                            onClick={() => !isCurrent && handleSubscribe(plan.id)}
                                            className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 uppercase tracking-widest text-xs font-bold mb-6 disabled:opacity-50"
                                            style={isCurrent
                                                ? { background: '#1d2a23', color: '#95ab8a', border: '1px solid #243529', cursor: 'not-allowed' }
                                                : plan.buttonStyle
                                            }
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
                                                    <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                                        style={{ background: 'rgba(155,194,135,0.1)' }}>
                                                        <Check size={11} style={{ color: '#9bc287' }} />
                                                    </div>
                                                    <span className="text-sm text-[#f0f4ee]/90">{f}</span>
                                                </div>
                                            ))}
                                            {plan.missingFeatures.map((f, i) => (
                                                <div key={i} className="flex items-start gap-3 opacity-35">
                                                    <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border" style={{ background: '#090d0b', borderColor: '#243529' }}>
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#95ab8a' }} />
                                                    </div>
                                                    <span className="text-sm text-[#f0f4ee]">{f}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 text-xs font-bold uppercase tracking-widest text-[#95ab8a]">
                    <span className="flex items-center gap-2"><ShieldCheck size={14} style={{ color: '#9bc287' }} /> Pagos 100% seguros via Stripe</span>
                    <span className="flex items-center gap-2"><CreditCard size={14} style={{ color: '#9bc287' }} /> Cancela en cualquier momento</span>
                    <span className="flex items-center gap-2"><BadgeCheck size={14} style={{ color: '#9bc287' }} /> 14 días de prueba gratis</span>
                </div>
            </div>
        </DashboardLayout>
    );
}
