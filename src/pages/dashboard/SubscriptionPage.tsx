import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Check, Star, Zap, Crown, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function SubscriptionPage() {
    const { currentBusiness } = useAuth();
    const [isLoading, setIsLoading] = React.useState<string | null>(null);

    const handleSubscribe = async (tierId: string) => {
        if (!currentBusiness?.id) return alert('Negocio no encontrado');
        
        setIsLoading(tierId);
        try {
            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: {
                    businessId: currentBusiness.id,
                    tierId,
                    successUrl: `${window.location.origin}/dashboard/settings?payment=success`,
                    cancelUrl: `${window.location.origin}/dashboard/billing?payment=cancelled`,
                }
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url; // Redirect to Stripe Checkout
            } else {
                throw new Error('No URL returned from Stripe');
            }
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Error al conectar con pago seguro');
        } finally {
            setIsLoading(null);
        }
    };
    const plans = [
        {
            id: 'starter',
            name: 'Spacey Starter',
            price: '$19',
            description: 'Perfecto para barberos individuales que están comenzando.',
            icon: Star,
            features: [
                'Hasta 1 Barbero',
                'Reservas Ilimitadas',
                'Página Web Personalizada',
                'Panel de Administración Básico',
                'Soporte por Email'
            ],
            missingFeatures: [
                'Recordatorios por WhatsApp Automáticos',
                'Pasarela de Pagos (Stripe)',
                'Manejo de Equipo / Múltiples Barberos'
            ],
            color: 'text-gray-400',
            bg: 'bg-gray-400/10',
            borderColor: 'border-space-border',
            buttonBase: 'bg-space-card hover:bg-space-border text-space-text',
            popular: false
        },
        {
            id: 'essential',
            name: 'Spacey Essential',
            price: '$39',
            description: 'Diseñado para barberías pequeñas que quieren automatizar su flujo.',
            icon: Zap,
            features: [
                'Todo lo de Starter',
                'Hasta 3 Barberos/Empleados',
                'Recordatorios por WhatsApp (Auto)',
                'Recordatorios por WhatsApp (Manuales)',
                'Confirmaciones Instantáneas',
                'Estadísticas Básicas'
            ],
            missingFeatures: [
                'Cobro Automático por Adelantado',
                'Depósitos Obligatorios via Stripe'
            ],
            color: 'text-space-primary',
            bg: 'bg-space-primary/10',
            borderColor: 'border-space-primary',
            buttonBase: 'bg-space-primary hover:bg-space-primary-light text-white',
            popular: true
        },
        {
            id: 'premium',
            name: 'Spacey Premium',
            price: '$79',
            description: 'Para negocios consolidados que necesitan control absoluto y cobrar online.',
            icon: Crown,
            features: [
                'Todo lo de Essential',
                'Barberos / Empleados Ilimitados',
                'Pasarela de Pagos Stripe',
                'Depósitos y No-Show Protection',
                'Sincronización de Google Calendar',
                'Estadísticas Financieras Avanzadas',
                'Soporte Prioritario VIP 24/7'
            ],
            missingFeatures: [],
            color: 'text-yellow-400',
            bg: 'bg-yellow-400/10',
            borderColor: 'border-yellow-400/50',
            buttonBase: 'bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-black font-black',
            popular: false
        }
    ];

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto">
                <div className="mb-10 text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-space-primary/10 text-space-primary text-xs font-black uppercase tracking-widest border border-space-primary/20 mb-2">
                        <ShieldCheck size={14} /> Prueba Gratis de 14 Días
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-space-text tracking-tight uppercase">
                        Elige tu <span className="text-space-primary">Plan</span>
                    </h1>
                    <p className="text-space-muted max-w-2xl mx-auto text-lg leading-relaxed">
                        Desbloquea todo el potencial de tu negocio con recordatorios automáticos, reservas ilimitadas y pagos integrados.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan) => {
                        const Icon = plan.icon;
                        return (
                            <div 
                                key={plan.id}
                                className={`
                                    relative flex flex-col p-8 rounded-3xl bg-space-card2 border-2 transition-all duration-300
                                    ${plan.popular ? `border-space-primary shadow-[0_0_40px_-10px_rgba(206,255,26,0.2)] md:-translate-y-4` : `border-space-border/40 hover:border-space-border`}
                                `}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-space-primary text-space-bg text-xs font-black uppercase tracking-widest rounded-full shadow-lg">
                                        Más Popular
                                    </div>
                                )}

                                <div className="mb-6">
                                    <div className={`w-14 h-14 rounded-2xl ${plan.bg} ${plan.color} flex items-center justify-center mb-6 border border-white/5`}>
                                        <Icon size={28} />
                                    </div>
                                    <h3 className="text-xl font-bold text-space-text mb-2">{plan.name}</h3>
                                    <p className="text-space-muted text-sm leading-relaxed h-10">{plan.description}</p>
                                </div>

                                <div className="mb-8 flex items-end gap-1">
                                    <span className="text-5xl font-black text-space-text tracking-tighter">{plan.price}</span>
                                    <span className="text-space-muted font-medium mb-1.5">/mes</span>
                                </div>

                                <button 
                                    disabled={isLoading !== null}
                                    onClick={() => handleSubscribe(plan.id)}
                                    className={`
                                        w-full py-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 uppercase tracking-widest text-xs font-bold shadow-btn mb-8 disabled:opacity-50
                                        ${plan.buttonBase}
                                    `}
                                >
                                    {isLoading === plan.id ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <>
                                            Seleccionar Plan
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>

                                <div className="space-y-4 flex-1">
                                    <p className="text-xs uppercase tracking-widest text-space-muted font-bold mb-4">¿Qué incluye?</p>
                                    
                                    {plan.features.map((feature, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="mt-0.5 w-5 h-5 rounded-full bg-space-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Check size={12} className="text-space-primary" />
                                            </div>
                                            <span className="text-sm text-space-text/90 leading-snug">{feature}</span>
                                        </div>
                                    ))}

                                    {plan.missingFeatures.map((feature, i) => (
                                        <div key={`missing-${i}`} className="flex items-start gap-3 opacity-40">
                                            <div className="mt-0.5 w-5 h-5 rounded-full bg-space-bg flex items-center justify-center flex-shrink-0 border border-space-border">
                                                <div className="w-1.5 h-1.5 rounded-full bg-space-muted" />
                                            </div>
                                            <span className="text-sm text-space-text decoration-space-muted leading-snug">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </DashboardLayout>
    );
}
