// Deploy: supabase functions deploy send-reminders --no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        const accountSid     = Deno.env.get('TWILIO_ACCOUNT_SID');
        const authToken      = Deno.env.get('TWILIO_AUTH_TOKEN');
        const whatsappNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

        if (!accountSid || !authToken || !whatsappNumber) {
            throw new Error("Missing Twilio credentials");
        }

        // Parse Request Body Options
        let bodyInactiveDays: number | null = null;
        let bodyBusinessId: string | null = null;
        let bodyCustomClients: any[] | null = null;

        try {
            const body = await req.json();
            if (body?.inactiveDays && typeof body.inactiveDays === 'number') {
                bodyInactiveDays = body.inactiveDays;
            }
            if (body?.businessId) {
                bodyBusinessId = body.businessId;
            }
            if (body?.customClients && Array.isArray(body.customClients)) {
                bodyCustomClients = body.customClients;
            }
        } catch (_) { /* no body is fine */ }

        const credential = btoa(`${accountSid}:${authToken}`);

        // ── 1. Get businesses with bot active ──────────────────
        let query = supabase
            .from('businesses')
            .select('id, name, slug, whatsapp_bot_active, whatsapp_reminder_template, whatsapp_booking_link, reminder_inactive_days')
            .eq('whatsapp_bot_active', true);

        // If manual trigger is for a specific business, only fetch that one
        if (bodyBusinessId) {
            query = query.eq('id', bodyBusinessId);
        }

        const { data: businesses, error: bizErr } = await query;

        if (bizErr) throw bizErr;
        if (!businesses || businesses.length === 0) {
            return new Response(JSON.stringify({ message: 'No active businesses found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        const results: any[] = [];

        for (const biz of businesses) {
            let targetClients: any[] = [];
            const inactiveDays = bodyInactiveDays ?? biz.reminder_inactive_days ?? 14;

            // ── A. Manual Mode ──────────────────
            if (bodyCustomClients && bodyCustomClients.length > 0) {
                targetClients = bodyCustomClients;
            } 
            // ── B. Automatic Inactivity Mode ──────────────────
            else {
                const { data: appointments, error: aptErr } = await supabase
                    .from('appointments')
                    .select('customer_name, customer_phone, appointment_date')
                    .eq('business_id', biz.id)
                    .eq('status', 'confirmed')
                    .order('appointment_date', { ascending: false });

                if (aptErr || !appointments) continue;

                const clientMap: Record<string, { name: string; phone: string; lastDate: string }> = {};
                for (const apt of appointments) {
                    if (!apt.customer_phone) continue;
                    if (!clientMap[apt.customer_phone]) {
                        clientMap[apt.customer_phone] = {
                            name: apt.customer_name || 'Cliente',
                            phone: apt.customer_phone,
                            lastDate: apt.appointment_date,
                        };
                    }
                }

                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - inactiveDays);
                const cutoffStr = cutoff.toISOString().split('T')[0];
                targetClients = Object.values(clientMap).filter(c => c.lastDate <= cutoffStr);
            }

            if (targetClients.length === 0) {
                results.push({ business: biz.name, sent: 0, reason: 'No inactive clients' });
                continue;
            }

            // Match the approved Twilio template string exactly so Twilio recognizes it
            const bookingLink = biz.whatsapp_booking_link || `https://spaceyreserve.netlify.app/book/${biz.slug}`;
            const dbTemplate = biz.whatsapp_reminder_template;
            
            // If the user hasn't configured a template in their Spacey dashboard, fallback to the one from the Twilio screenshot
            const activeTemplate = dbTemplate && dbTemplate.length > 10 
                ? dbTemplate 
                : `¡Hola! Te escribimos de tu barbería 💈 {{client_name}}, ya llevas un tiempo sin visitarnos. Reserva tu próxima cita aquí: {{booking_link}} ¡Te esperamos pronto!`;

            let sentCount = 0;
            const sendErrors: string[] = [];

            for (const client of targetClients) {
                try {
                    // Replace variables accurately
                    const message = activeTemplate
                        .replace('{{client_name}}', client.name)
                        .replace('{{customer_name}}', client.name) // fallback for old syntax
                        .replace('{{name}}', client.name)
                        .replace('{{booking_link}}', bookingLink);

                    const cleanPhone = normalizePhone(client.phone);

                    let fromNum = whatsappNumber!;
                    if (!fromNum.startsWith('whatsapp:')) fromNum = `whatsapp:${fromNum}`;

                    const params = new URLSearchParams();
                    params.append('To', `whatsapp:${cleanPhone}`);
                    params.append('From', fromNum);
                    params.append('Body', message);

                    const resp = await fetch(
                        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'Authorization': `Basic ${credential}`
                            },
                            body: params
                        }
                    );

                    if (!resp.ok) {
                        const txt = await resp.text();
                        throw new Error(`Twilio ${resp.status}: ${txt}`);
                    }
                    sentCount++;
                } catch (e: any) {
                    sendErrors.push(`${client.phone}: ${e.message}`);
                }
            }

            results.push({
                business: biz.name,
                targetClients: targetClients.length,
                sent: sentCount,
                errors: sendErrors.length > 0 ? sendErrors : undefined,
            });
        }

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
})

function normalizePhone(raw: string): string {
    let p = raw.replace(/\s+/g, '').replace(/[^\d+]/g, '');
    if (/^[0-9]{10}$/.test(p)) p = "+1" + p;
    else if (p.length > 7 && !p.startsWith("+")) p = "+" + p;
    return p;
}
