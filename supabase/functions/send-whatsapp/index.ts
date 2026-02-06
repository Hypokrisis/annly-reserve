// Setup: npm install -g supabase
// Deploy: supabase functions deploy send-whatsapp --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. INIT SUPABASE CLIENT
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 2. FETCH PENDING JOBS
        // Only fetch 'pending' jobs that are ready (run_after <= now)
        // Ignoring failed jobs unless manually reset to pending
        const { data: jobs, error: fetchError } = await supabase
            .from('notification_jobs')
            .select('*')
            .eq('status', 'pending')
            .lte('run_after', new Date().toISOString())
            .limit(5); // Process batch of 5

        if (fetchError) throw fetchError;

        if (!jobs || jobs.length === 0) {
            return new Response(JSON.stringify({ message: 'No pending jobs found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        console.log(`Processing ${jobs.length} pending jobs...`);
        const results = [];

        // 3. PROCESS EACH JOB
        for (const job of jobs) {
            try {
                // A. LOCK JOB (Optimistic Locking)
                const { error: lockError } = await supabase
                    .from('notification_jobs')
                    .update({ status: 'processing', processed_at: new Date().toISOString() })
                    .eq('id', job.id)
                    .eq('status', 'pending');

                if (lockError) {
                    console.warn(`Job ${job.id} skipped (already locked)`);
                    continue;
                }

                // B. PREPARE TWILIO CONFIG
                const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
                const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
                const fromNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER'); // "whatsapp:+14155238886"

                if (!accountSid || !authToken || !fromNumber) {
                    throw new Error("Missing Twilio Secrets (SID, TOKEN, or NUMBER)");
                }

                // C. NORMALIZE PHONE (E.164 + WhatsApp prefix)
                let toPhone = job.to_phone || "";
                toPhone = toPhone.replace(/\s+/g, '').replace(/[^\d+]/g, ''); // Remove spaces, allowed chars only

                // Heuristic for Puerto Rico / US (10 digits -> Add +1)
                if (/^[0-9]{10}$/.test(toPhone)) {
                    toPhone = "+1" + toPhone;
                } else if (toPhone.length > 7 && !toPhone.startsWith("+")) {
                    // Fallback: If it looks like a number but has no +
                    toPhone = "+" + toPhone;
                }

                const toTwilio = toPhone.startsWith('whatsapp:') ? toPhone : `whatsapp:${toPhone}`;
                const messageBody = buildMessage(job.event_type, job.payload);

                console.log(`Job ${job.id}: Sending to ${toTwilio}`);

                // D. SEND TO TWILIO (Basic Auth)
                const credentials = btoa(`${accountSid}:${authToken}`);

                const params = new URLSearchParams();
                params.append('To', toTwilio);
                params.append('From', fromNumber);
                params.append('Body', messageBody);

                const twilioResp = await fetch(
                    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Authorization': `Basic ${credentials}`
                        },
                        body: params,
                    }
                );

                const responseText = await twilioResp.text();
                let responseJson = {};
                try { responseJson = JSON.parse(responseText); } catch (e) { }

                const responseCode = twilioResp.status;

                // E. HANDLE RESPONSE
                if (!twilioResp.ok) {
                    const twilioCode = responseJson.code; // Specific Twilio Error Code
                    const detail = responseJson.message || responseText;

                    // Detailed Error for Database
                    const fullError = `Status: ${responseCode} | Code: ${twilioCode} | Msg: ${detail}`;
                    console.error(`Twilio Failure: ${fullError}`);

                    // Check for PERMANENT Failures (Jobs that should NOT retry)
                    // 401/403: Auth errors
                    // 21211: Invalid number
                    // 20003: Auth error detail
                    // 20404: wrong Account SID
                    if ([401, 403].includes(responseCode) || [20003, 20404, 21211].includes(twilioCode)) {
                        throw new Error(`PERMANENT_ERROR: ${fullError}`);
                    }

                    throw new Error(fullError);
                }

                // F. SUCCESS
                await supabase
                    .from('notification_jobs')
                    .update({
                        status: 'completed',
                        last_error: null,
                        payload: { ...job.payload, twilio_sid: responseJson.sid }
                    })
                    .eq('id', job.id);

                results.push({ id: job.id, status: 'success', sid: responseJson.sid });

            } catch (err: any) {
                console.error(`Job ${job.id} Failed Logic:`, err.message);

                // RETRY LOGIC
                const currentAttempts = (job.attempts || 0) + 1;
                const maxAttempts = 5;
                let newStatus = 'pending';
                let nextRun = new Date();

                if (err.message.includes("PERMANENT_ERROR")) {
                    newStatus = 'failed_permanent';
                } else if (currentAttempts >= maxAttempts) {
                    newStatus = 'failed';
                } else {
                    // Backoff: 1m, 2m, 4m...
                    const backoffMinutes = Math.pow(2, currentAttempts - 1);
                    nextRun = new Date(Date.now() + backoffMinutes * 60 * 1000);
                }

                await supabase
                    .from('notification_jobs')
                    .update({
                        status: newStatus,
                        last_error: err.message, // Saves full Twilio error details
                        attempts: currentAttempts,
                        run_after: nextRun.toISOString()
                    })
                    .eq('id', job.id);

                results.push({ id: job.id, status: 'error', error: err.message });
            }
        }

        return new Response(JSON.stringify({ success: true, processed: results }), {
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

function buildMessage(type: string, data: any): string {
    const { barber_name, service_name, appointment_date, start_time, customer_name, old_date, old_time } = data;
    if (type === 'created') return `📅 *Nueva Cita*\n👤 ${customer_name}\n✂️ ${service_name}\n🕒 ${appointment_date} @ ${start_time}`;
    if (type === 'cancelled') return `❌ *Cita Cancelada*\n👤 ${customer_name}\n📅 ${appointment_date}`;
    if (type === 'rescheduled') return `✏️ *Cambio de Cita*\n👤 ${customer_name}\n⏮️ Antes: ${old_date} ${old_time}\n⏭️ Ahora: *${appointment_date} ${start_time}*`;
    return `Notificación para ${barber_name}`;
}
