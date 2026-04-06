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
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (!stripeKey) throw new Error('STRIPE_SECRET_KEY no configurado en Supabase Secrets');

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        });

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        const authHeader = req.headers.get('Authorization')!;
        const supabaseUserClient = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } }
        });
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Verificar usuario autenticado
        const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
        if (userError || !user) throw new Error('No autorizado');

        const { businessId, returnUrl } = await req.json();
        if (!businessId) throw new Error('businessId es requerido');

        // Verificar que el usuario es dueño del negocio
        const { data: businessRole, error: roleErr } = await supabaseAdmin
            .from('users_businesses')
            .select('role')
            .eq('user_id', user.id)
            .eq('business_id', businessId)
            .single();

        if (roleErr || !businessRole || !['owner', 'admin'].includes(businessRole.role)) {
            throw new Error('Solo los dueños pueden gestionar la suscripción');
        }

        // Obtener el stripe_customer_id del negocio
        const { data: sub, error: subErr } = await supabaseAdmin
            .from('business_subscriptions')
            .select('stripe_customer_id')
            .eq('business_id', businessId)
            .single();

        if (subErr || !sub?.stripe_customer_id) {
            throw new Error('Este negocio no tiene una suscripción activa en Stripe');
        }

        // Crear sesión del Customer Portal de Stripe
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: sub.stripe_customer_id,
            return_url: returnUrl || `${req.headers.get('origin')}/dashboard/billing`,
        });

        return new Response(JSON.stringify({ url: portalSession.url }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('Portal Session Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
