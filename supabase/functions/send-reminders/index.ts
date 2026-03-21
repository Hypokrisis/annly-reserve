// supabase/functions/send-reminders/index.ts
// Deploy: supabase functions deploy send-reminders --no-verify-jwt
// Called by a Cron Job or manually.
// Finds clients who have NOT had an appointment in 14+ days
// and sends them a WhatsApp reminder via freeform message (wa.me link is generated)
// OR via Twilio if a Content SID is configured in TWILIO_TEMPLATE_REMINDER.

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
        // Optional: a specific approved template for reminders
        const tmplReminder   = Deno.env.get('TWILIO_TEMPLATE_REMINDER');

        if (!accountSid || !authToken || !whatsappNumber) {
            throw new Error("Missing Twilio credentials");
        }

        const credential = btoa(`${accountSid}:${authToken}`);

        // ── 1. Get all businesses with bot active ──────────────────
        const { data: businesses, error: bizErr } = await supabase
            .from('businesses')
            .select('id, name, whatsapp_bot_active, whatsapp_reminder_template, whatsapp_booking_link')
            .eq('whatsapp_bot_active', true);

        if (bizErr) throw bizErr;
        if (!businesses || businesses.length === 0) {
            return new Response(JSON.stringify({ message: 'No active businesses' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        const results: any[] = [];

        for (const biz of businesses) {
            // ── 2. Find clients who haven't visited in 14+ days ──────
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 14);
            const cutoffStr = cutoff.toISOString().split('T')[0];

            // Get the most recent appointment per customer
            const { data: appointments, error: aptErr } = await supabase
                .from('appointments')
                .select('customer_name, customer_phone, appointment_date')
                .eq('business_id', biz.id)
                .eq('status', 'confirmed')
                .order('appointment_date', { ascending: false });

            if (aptErr || !appointments) continue;

            // Group by phone, keep the most recent visit
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

            // Filter: only those whose last visit was before the cutoff
            const inactiveClients = Object.values(clientMap).filter(c => c.lastDate <= cutoffStr);

            if (inactiveClients.length === 0) {
                results.push({ business: biz.name, sent: 0, reason: 'No inactive clients' });
                continue;
            }

            // ── 3. Send reminder to each inactive client ─────────────
            const bookingLink = biz.whatsapp_booking_link || '';
            const defaultTemplate = biz.whatsapp_reminder_template
                || `¡Hola {{name}}! Ya llevas un tiempo sin visitarnos 💈 Te echamos de menos. Reserva tu próxima cita aquí: ${bookingLink}`;

            let sentCount = 0;
            const sendErrors: string[] = [];

            for (const client of inactiveClients) {
                try {
                    const message = defaultTemplate.replace('{{name}}', client.name);
                    const cleanPhone = normalizePhone(client.phone);

                    let fromNum = whatsappNumber!;
                    if (!fromNum.startsWith('whatsapp:')) fromNum = `whatsapp:${fromNum}`;

                    const params = new URLSearchParams();
                    params.append('To', `whatsapp:${cleanPhone}`);
                    params.append('From', fromNum);

                    // If there's an approved reminder template, use it
                    if (tmplReminder) {
                        params.append('ContentSid', tmplReminder);
                        params.append('ContentVariables', JSON.stringify({ "1": client.name, "2": bookingLink }));
                    } else {
                        // Freeform (only works if client has messaged you first / in sandbox)
                        params.append('Body', message);
                    }

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
                inactiveClients: inactiveClients.length,
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
