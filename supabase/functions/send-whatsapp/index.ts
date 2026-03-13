// ⚠️ DEPRECATED - DO NOT USE THIS FUNCTION
// This function has been replaced by send-twilio.
// Kept as a placeholder to prevent deployment errors if referenced.
// If this function is deployed to Supabase, it will do NOTHING.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    console.warn("send-whatsapp is DEPRECATED. Use send-twilio instead.");

    return new Response(
        JSON.stringify({
            deprecated: true,
            message: "This function is disabled. Use send-twilio instead."
        }),
        {
            status: 410, // 410 Gone
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
    );
})
