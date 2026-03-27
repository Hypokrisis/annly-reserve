import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14.10.0"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createCryptoProvider();

serve(async (req) => {
    try {
        const signature = req.headers.get('stripe-signature');
        if (!signature) {
            return new Response('No signature', { status: 400 });
        }

        const body = await req.text();
        const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string;
        let event;

        try {
            event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret, undefined, cryptoProvider);
        } catch (err: any) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log(`[Stripe Webhook] Received event: ${event.type}`);

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.mode === 'subscription') {
                    const businessId = session.subscription_details?.metadata?.business_id || session.metadata?.business_id;
                    const tierId = session.subscription_details?.metadata?.tier_id || session.metadata?.tier_id;
                    
                    if (businessId && tierId) {
                        try {
                            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
                            await supabase.from('business_subscriptions').update({
                                stripe_subscription_id: subscription.id,
                                status: subscription.status,
                                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                                tier_id: tierId, // Aseguramos mantener el tier seleccionado
                            }).eq('business_id', businessId);
                            console.log(`[Stripe Webhook] Checkout completed for business: ${businessId}`);
                        } catch (e: any) {
                             console.error(`Error updating business tracking after checkout: ${e.message}`);
                        }
                    }
                }
                break;
            }

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                
                // Obtener el business_id o mediante metadatos si no se guardaron directamente
                const customerId = subscription.customer as string;
                
                await supabase.from('business_subscriptions').update({
                    status: subscription.status,
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                    cancel_at_period_end: subscription.cancel_at_period_end,
                }).eq('stripe_customer_id', customerId);
                
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                if (invoice.subscription) {
                    const customerId = invoice.customer as string;
                    await supabase.from('business_subscriptions').update({
                        status: 'active'
                    }).eq('stripe_customer_id', customerId);
                }
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                if (invoice.subscription) {
                    const customerId = invoice.customer as string;
                    await supabase.from('business_subscriptions').update({
                        status: 'past_due'
                    }).eq('stripe_customer_id', customerId);
                }
                break;
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
