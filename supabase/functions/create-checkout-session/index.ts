import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14.10.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

        if (!stripeKey) {
            throw new Error('STRIPE_SECRET_KEY no está configurado en Supabase Secrets');
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        });

        const authHeader = req.headers.get('Authorization')!;
        const supabaseUserClient = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } }
        });
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Verificar usuario autenticado
        const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
        if (userError || !user) throw new Error('No autorizado');

        // Leer argumentos
        const { businessId, tierId, successUrl, cancelUrl } = await req.json();
        if (!businessId || !tierId || !successUrl || !cancelUrl) {
            throw new Error('Faltan parámetros: businessId, tierId, successUrl, cancelUrl');
        }

        // Verificar que el usuario es dueño del negocio
        const { data: businessRole, error: roleErr } = await supabaseAdmin
            .from('users_businesses')
            .select('role, businesses(name)')
            .eq('user_id', user.id)
            .eq('business_id', businessId)
            .single();

        if (roleErr || !businessRole || !['owner', 'admin'].includes(businessRole.role)) {
            throw new Error('Solo los dueños pueden administrar la suscripción');
        }

        const businessName = (businessRole.businesses as any)?.name;

        // Obtener el plan (tier) con su stripe_price_id real
        const { data: tier, error: tierErr } = await supabaseAdmin
            .from('subscription_tiers')
            .select('*')
            .eq('id', tierId)
            .single();

        if (tierErr || !tier) throw new Error('Plan no existe en la base de datos');
        if (!tier.stripe_price_id) throw new Error(`El plan "${tier.name}" no tiene un stripe_price_id configurado. Ejecuta STRIPE_PRICE_IDS.sql en Supabase.`);

        // Buscar suscripción existente para obtener el customer_id
        const { data: existingSub } = await supabaseAdmin
            .from('business_subscriptions')
            .select('stripe_customer_id')
            .eq('business_id', businessId)
            .single();

        let customerId = existingSub?.stripe_customer_id;

        // Crear el cliente en Stripe si no existe
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: businessName || user.email,
                metadata: { business_id: businessId, user_id: user.id }
            });
            customerId = customer.id;

            await supabaseAdmin.from('business_subscriptions').upsert({
                business_id: businessId,
                tier_id: tierId,
                stripe_customer_id: customerId,
                status: 'incomplete'
            });
        }

        // Crear la sesión de Checkout con el Price ID real de Stripe
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: tier.stripe_price_id, quantity: 1 }],
            success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl,
            subscription_data: {
                trial_period_days: 14,
                metadata: { business_id: businessId, tier_id: tierId }
            },
            client_reference_id: businessId,
            allow_promotion_codes: true,
        });

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('Stripe Checkout Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
