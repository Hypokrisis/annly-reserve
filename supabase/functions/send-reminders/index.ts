// Deploy: supabase functions deploy send-reminders --no-verify-jwt
//
// Modern Dispatcher — Marketing Campaigns & Automated Reminders
// Supports scheduled campaigns, inactivity triggers, and tier limits.
//
// TWILIO VARIABLES (Recommended Template):
// "¡Hola {{1}}! Soy {{2}} de {{3}}. Te tengo este mensaje: {{4}}. Agenda aquí: {{5}}"
// Or simpler: "Hola {{1}}, de {{2}}: {{3}}. Agenda: {{4}}" (Using 4 vars).
//
// SUPABASE SECRETS: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, 
//                   TWILIO_TEMPLATE_REMINDER (ContentSid)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizePhone(raw: string): string {
    if (!raw) return '';
    let p = raw.trim().replace(/[\s\-().]/g, '');
    if (!p.startsWith('+')) {
        if (/^\d{10}$/.test(p)) p = '+1' + p;
        else p = '+' + p;
    }
    return p;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const accountSid   = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
        const authToken    = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
        const waNumber     = Deno.env.get('TWILIO_WHATSAPP_NUMBER') ?? '';
        const tmplSid      = Deno.env.get('TWILIO_TEMPLATE_REMINDER') ?? '';

        if (!accountSid || !authToken || !waNumber) throw new Error('Twilio config missing');

        const credential = btoa(`${accountSid}:${authToken}`);
        const twilioUrl  = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const waFrom     = waNumber.startsWith('whatsapp:') ? waNumber : `whatsapp:${waNumber}`;

        // 1. Parse Request
        const body = await req.json().catch(() => ({}));
        const businessId: string | null = body?.businessId ?? null;
        const campaignId: string | null = body?.campaignId ?? null;
        const customClients: any[] | null = body?.customClients ?? null;
        const customMessage: string | null = body?.customMessage ?? null;

        if (!businessId) throw new Error('businessId is required');

        // 2. Fetch Business, Settings, and TIER LIMITS
        const [{ data: biz }, { data: sub }, { data: waSettings }] = await Promise.all([
            supabase.from('businesses').select('*').eq('id', businessId).single(),
            supabase.from('business_subscriptions')
                .select('tier_id, subscription_tiers(max_marketing_messages)')
                .eq('business_id', businessId)
                .maybeSingle(),
            supabase.from('whatsapp_settings').select('is_active').eq('business_id', businessId).maybeSingle()
        ]);

        if (!biz) throw new Error('Business not found');
        const botActive = waSettings?.is_active ?? false;
        const maxMessages = (sub?.subscription_tiers as any)?.max_marketing_messages ?? 20;

        // 3. Determine Audience and Content
        let targetClients: { name: string; phone: string }[] = [];
        let marketingContent = customMessage || biz.whatsapp_offer || 'Te extrañamos en la barbería';
        const bookingLink = `https://spaceyreserve.netlify.app/book/${biz.slug}`;

        if (campaignId) {
            // CAMPAIGN MODE
            const { data: campaign } = await supabase.from('marketing_campaigns').select('*').eq('id', campaignId).single();
            if (!campaign) throw new Error('Campaign not found');
            marketingContent = campaign.content;

            const { data: apts } = await supabase.from('appointments').select('customer_name, customer_phone').eq('business_id', businessId).order('created_at', { ascending: false });
            const seen = new Set();
            apts?.forEach(a => {
                if (a.customer_phone && !seen.has(a.customer_phone)) {
                    seen.add(a.customer_phone);
                    targetClients.push({ name: a.customer_name || 'Cliente', phone: a.customer_phone });
                }
            });
        } else if (customClients) {
            // MANUAL MODE (from Clients Page)
            targetClients = customClients.map(c => ({ name: c.name || 'Cliente', phone: c.phone }));
        } else {
            // AUTOMATED REMINDER MODE
            const { data: apts } = await supabase.from('appointments').select('customer_name, customer_phone').eq('business_id', businessId).order('created_at', { ascending: false });
            const seen = new Set();
            apts?.forEach(a => {
                if (a.customer_phone && !seen.has(a.customer_phone)) {
                    seen.add(a.customer_phone);
                    targetClients.push({ name: a.customer_name || 'Cliente', phone: a.customer_phone });
                }
            });
        }

        // 4. ENFORCE LIMITS
        const initialCount = targetClients.length;
        if (targetClients.length > maxMessages) {
            console.log(`[Limit Enforcement] Slicing audience from ${targetClients.length} to ${maxMessages} for tier: ${sub?.tier_id}`);
            targetClients = targetClients.slice(0, maxMessages);
        }

        // 5. Broadcaster Loop
        let sentCount = 0;
        let errorCount = 0;

        for (const client of targetClients) {
            const cleanPhone = normalizePhone(client.phone);
            if (!cleanPhone) continue;

            try {
                const params = new URLSearchParams({
                    From: waFrom,
                    To: `whatsapp:${cleanPhone}`,
                    ContentSid: tmplSid,
                    ContentVariables: JSON.stringify({
                        "1": client.name,
                        "2": "el staff",
                        "3": biz.name,
                        "4": marketingContent,
                        "5": bookingLink
                    })
                });

                const resp = await fetch(twilioUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${credential}`
                    },
                    body: params
                });

                if (resp.ok) sentCount++;
                else errorCount++;
            } catch (err) {
                errorCount++;
            }
        }

        // 6. Update Campaign Status
        if (campaignId) {
            await supabase.from('marketing_campaigns').update({
                status: 'sent',
                sent_count: sentCount,
                updated_at: new Date().toISOString()
            }).eq('id', campaignId);
        }

        return new Response(JSON.stringify({
            success: true,
            sent: sentCount,
            errors: errorCount,
            totalLimitApplied: initialCount > maxMessages
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error: any) {
        console.error('send-reminders fatal:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
})
