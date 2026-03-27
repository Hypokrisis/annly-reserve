import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14.10.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 1. Manejo de CORS (Preflight request)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 2. Variables de Entorno Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

        if (!stripeKey) {
            throw new Error('STRIPE_SECRET_KEY is not set in Supabase Secrets');
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        });

        // Cliente Supabase del usuario autenticado
        const authHeader = req.headers.get('Authorization')!;
        const supabaseUserClient = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } }
        });

        // Cliente Supabase con permisos de Admin (Service Role)
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // 3. Obtener Usuario Autenticado
        const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
        if (userError || !user) throw new Error('Unauthorized');

        // 4. Leer argumentos de la petición
        const { businessId, tierId, successUrl, cancelUrl } = await req.json();

        if (!businessId || !tierId || !successUrl || !cancelUrl) {
             throw new Error('Faltan parametros requeridos: businessId, tierId, successUrl, cancelUrl');
        }

        // 5. Validar que el usuario es dueño del negocio
        const { data: businessRole, error: roleErr } = await supabaseAdmin
            .from('users_businesses')
            .select('role, businesses(name)')
            .eq('user_id', user.id)
            .eq('business_id', businessId)
            .single();

        if (roleErr || !businessRole || !['owner', 'admin'].includes(businessRole.role)) {
            throw new Error('Solo los dueños pueden administrar la suscripción');
        }

        const businessName = businessRole.businesses?.name;

        // 6. Obtener info del Plan (Tier) de la DB
        const { data: tier, error: tierErr } = await supabaseAdmin
            .from('subscription_tiers')
            .select('*')
            .eq('id', tierId)
            .single();

        if (tierErr || !tier) {
             throw new Error('Plan seleccionado no existe en la base de datos');
        }

        // 7. Buscar si ya existe la suscripción de este negocio en DB
        const { data: existingSub } = await supabaseAdmin
            .from('business_subscriptions')
            .select('stripe_customer_id')
            .eq('business_id', businessId)
            .single();

        let customerId = existingSub?.stripe_customer_id;

        // Si no existe el cliente en Stripe, crearlo!
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: `${businessName} (Dueño: ${user.email})`,
                metadata: {
                    business_id: businessId,
                    user_id: user.id
                }
            });
            customerId = customer.id;

            // Guardar stub de suscripción en DB
            await supabaseAdmin.from('business_subscriptions').upsert({
                business_id: businessId,
                tier_id: tierId,
                stripe_customer_id: customerId,
                status: 'incomplete'
            });
        }

        // 8. Crear la sesión de Checkout 
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: tier.name, // ej: "Spacey Premium"
                            description: `Suscripción para ${businessName}`,
                        },
                        unit_amount: Math.round(tier.price_monthly * 100), // En centavos
                        recurring: {
                            interval: 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl,
            subscription_data: {
                trial_period_days: 14, // Siempre le damos 14 días gratis al iniciar
                metadata: {
                    business_id: businessId,
                    tier_id: tierId
                }
            },
            client_reference_id: businessId
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
