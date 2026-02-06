// Setup: npm install -g supabase
// Deploy: supabase functions deploy send-whatsapp --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts" // Standard library for base64

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

        if (!supabaseUrl || !supabaseKey) {
            console.error("Missing SUPABASE env vars");
            return new Response(JSON.stringify({ error: "Configuration Error" }), { status: 500, headers: corsHeaders });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 2. FETCH PENDING JOBS - Limit 5
        const { data: jobs, error: fetchError } = await supabase
            .from('notification_jobs')
            .select('*')
            .eq('status', 'pending')
            .lte('run_after', new Date().toISOString())
            .limit(5);

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
                // A. LOCK JOB (Optimistic Locking to 'processing')
                const { error: lockError } = await supabase
                    .from('notification_jobs')
                    .update({ status: 'processing', processed_at: new Date().toISOString() })
                    .eq('id', job.id)
                    .eq('status', 'pending');

                if (lockError) {
                    console.warn(`Skipping job ${job.id} (already locked)`);
                    continue;
                }

                // B. PREPARE TWILIO AUTH & CONFIG
                const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
                const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
                const fromNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

                if (!accountSid || !authToken || !fromNumber) {
                    throw new Error("Missing Twilio Secrets (SID, TOKEN, or NUMBER)");
                }

                // C. RECIPIENT FORMATTING (E.164 Enforcement)
                let toPhone = job.to_phone || "";
                toPhone = toPhone.replace(/\s+/g, '').trim(); // Remove spaces

                // Add +1 if missing for PR/US numbers (heuristic)
                // Assuming PR/US numbers are 10 digits starting with 7 or 9 or 8
                if (/^[0-9]{10}$/.test(toPhone)) {
                    toPhone = "+1" + toPhone;
                } else if (!toPhone.startsWith("+")) {
                    toPhone = "+" + toPhone;
                }

                // Ensure 'whatsapp:' prefix for Twilio
                const toTwilio = toPhone.startsWith('whatsapp:') ? toPhone : `whatsapp:${toPhone}`;
                const messageBody = buildMessage(job.event_type, job.payload);

                console.log(`Job ${job.id}: Sending to ${toTwilio}`);

                // D. SEND REQUEST TO TWILIO API
                const authHeader = `Basic ${encode(accountSid + ":" + authToken)}`;

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
                            'Authorization': authHeader
                        },
                        body: params,
                    }
                );

                const responseStatus = twilioResp.status;
                const responseText = await twilioResp.text(); // Read body once
                let responseData;

                try {
                    responseData = JSON.parse(responseText);
                } catch (e) {
                    responseData = { body: responseText };
                }

                // Logging for observability
                console.log(`Twilio Response [${responseStatus}]:`, JSON.stringify(responseData));

                // E. HANDLE ERRORS
                if (!twilioResp.ok) {
                    const errorCode = responseData.code; // Twilio error code
                    const errorMessage = responseData.message || responseText;

                    // CHECK FOR PERMANENT AUTH ERRORS (OAuth / Credentials)
                    // 20003: Authenticate, 20404: Not Found (wrong SID), 21211: Invalid Phone Number
                    if (responseStatus === 401 || responseStatus === 403 || errorCode === 20003 || errorCode === 20404) {
                        throw new Error(`PERMANENT_AUTH_ERROR: ${errorMessage}`);
                    }

                    if (errorCode === 21211) { // Invalid number
                        throw new Error(`PERMANENT_INVALID_NUMBER: ${errorMessage}`);
                    }

                    throw new Error(`Twilio API Error (${responseStatus}): ${errorMessage}`);
                }

                // F. SUCCESS
                await supabase
                    .from('notification_jobs')
                    .update({
                        status: 'completed',
                        last_error: null,
                        payload: { ...job.payload, twilio_sid: responseData.sid }
                    })
                    .eq('id', job.id);

                results.push({ id: job.id, status: 'success', sid: responseData.sid });

            } catch (err: any) {
                console.error(`Job ${job.id} Failed:`, err.message);

                // RETRY LOGIC WITH BACKOFF
                const currentAttempts = (job.attempts || 0) + 1;
                const maxAttempts = 5;
                let newStatus = 'pending';
                let nextRun = new Date(); // Default: immediate retry (logic below adjusts)

                // If fatal error, mark as failed_permanent immediately
                if (err.message.includes("PERMANENT")) {
                    newStatus = 'failed_permanent';
                } else if (currentAttempts >= maxAttempts) {
                    newStatus = 'failed'; // Max retries reached
                } else {
                    // Incremental Backoff: 2^attempt * 1 minute (1m, 2m, 4m, 8m...)
                    const backoffMinutes = Math.pow(2, currentAttempts - 1);
                    nextRun = new Date(Date.now() + backoffMinutes * 60 * 1000);
                    newStatus = 'pending';
                }

                // Updates job status
                await supabase
                    .from('notification_jobs')
                    .update({
                        status: newStatus,
                        last_error: err.message,
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
        console.error("System Critical Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
})

// Helper Message Builder (Templates)
function buildMessage(type: string, data: any): string {
    const { barber_name, service_name, appointment_date, start_time, customer_name, old_date, old_time } = data;

    // Format cleaner text for WhatsApp
    if (type === 'created') {
        return `📅 *Nueva Cita*\n👤 ${customer_name}\n✂️ ${service_name}\n🕒 ${appointment_date} @ ${start_time}`;
    }

    if (type === 'cancelled') {
        return `❌ *Cita Cancelada*\n👤 ${customer_name}\n📅 ${appointment_date}`;
    }

    if (type === 'rescheduled') {
        return `✏️ *Cambio de Cita*\n👤 ${customer_name}\n⏮️ Antes: ${old_date} ${old_time}\n⏭️ Ahora: *${appointment_date} ${start_time}*`;
    }

    return `Nueva notificación de Annly Reserve para ${barber_name}`;
}
