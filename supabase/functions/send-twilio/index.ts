// Deploy: supabase functions deploy send-twilio --no-verify-jwt
// ✅ Uses ContentSid + ContentVariables for WhatsApp (no freeform Body).
// ✅ Uses Body/SMS for barber and as fallback.
// ✅ Reads from notification_jobs table. send-whatsapp is DEPRECATED.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ────────────────────────────────────────────────────────────
// APPROVED TEMPLATE CONTENT SIDs (set in Twilio Console)
// Set these as Supabase secrets or replace with your actual SIDs:
//   TWILIO_TEMPLATE_CONFIRMED   → ContentSid for appointment_confirmation
//   TWILIO_TEMPLATE_CANCELLED   → ContentSid for appointment_cancelled
//   TWILIO_TEMPLATE_RESCHEDULED → ContentSid for appointment_rescheduled
// ────────────────────────────────────────────────────────────

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. FETCH PENDING JOBS
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

        // 2. PROCESS EACH JOB
        for (const job of jobs) {
            try {
                // A. LOCK JOB
                const { error: lockError } = await supabase
                    .from('notification_jobs')
                    .update({ status: 'processing', processed_at: new Date().toISOString() })
                    .eq('id', job.id)
                    .eq('status', 'pending');

                if (lockError) {
                    console.warn(`Job ${job.id} skipped (already locked)`);
                    continue;
                }

                // B. FETCH FRESH APPOINTMENT DATA
                const appointmentId = job.appointment_id;
                if (!appointmentId) throw new Error("Job missing appointment_id");

                const { data: apt, error: aptError } = await supabase
                    .from('appointments')
                    .select(`
                        *,
                        barbers:barber_id (name, phone),
                        services:service_id (name),
                        businesses:business_id (name, whatsapp_bot_active)
                    `)
                    .eq('id', appointmentId)
                    .single();

                if (aptError || !apt) {
                    throw new Error(`Appointment ${appointmentId} not found: ${aptError?.message}`);
                }

                const barberName    = apt.barbers?.name  || "Barbero";
                const barberPhone   = apt.barbers?.phone;
                const serviceName   = apt.services?.name || "Servicio";
                const customerName  = apt.customer_name  || "Cliente";
                const customerPhone = apt.customer_phone;

                const humanDate = getHumanDate(apt.appointment_date);
                const time      = formatTime(apt.start_time);

                const isReschedule   = job.event_type === 'rescheduled';
                const isCancellation = apt.status === 'cancelled' || job.event_type === 'cancelled';

                // C. TWILIO SECRETS
                const accountSid      = Deno.env.get('TWILIO_ACCOUNT_SID');
                const authToken       = Deno.env.get('TWILIO_AUTH_TOKEN');
                const whatsappNumber  = Deno.env.get('TWILIO_WHATSAPP_NUMBER');
                const smsNumber       = Deno.env.get('TWILIO_SMS_NUMBER');

                // Template SIDs (set in Supabase Edge Function Secrets)
                const tmplConfirmed   = Deno.env.get('TWILIO_TEMPLATE_CONFIRMED');
                const tmplCancelled   = Deno.env.get('TWILIO_TEMPLATE_CANCELLED');
                const tmplRescheduled = Deno.env.get('TWILIO_TEMPLATE_RESCHEDULED');

                if (!accountSid || !authToken) {
                    throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
                }
                if (!whatsappNumber && !smsNumber) {
                    throw new Error("No sender configured. Set TWILIO_WHATSAPP_NUMBER or TWILIO_SMS_NUMBER");
                }

                const credential = btoa(`${accountSid}:${authToken}`);

                // ── HELPERS ──────────────────────────────────────────────

                function normalizePhone(raw: string): string {
                    let p = raw.replace(/\s+/g, '').replace(/[^\d+]/g, '');
                    if (/^[0-9]{10}$/.test(p)) p = "+1" + p;
                    else if (p.length > 7 && !p.startsWith("+")) p = "+" + p;
                    return p;
                }

                // Send via WhatsApp using APPROVED TEMPLATE (ContentSid + ContentVariables)
                // NO Body field – avoids error 63016!
                const sendWhatsAppTemplate = async (toPhone: string, contentSid: string, variables: Record<string, string>) => {
                    const cleanPhone = normalizePhone(toPhone);

                    let fromNum = whatsappNumber!;
                    if (!fromNum.startsWith('whatsapp:')) fromNum = `whatsapp:${fromNum}`;

                    const params = new URLSearchParams();
                    params.append('To',               `whatsapp:${cleanPhone}`);
                    params.append('From',             fromNum);
                    params.append('ContentSid',       contentSid);
                    params.append('ContentVariables', JSON.stringify(variables));

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
                        let parsed: any = {};
                        try { parsed = JSON.parse(txt); } catch (_) {}
                        throw new Error(`Twilio WA Error (${resp.status} code:${parsed.code}): ${parsed.message || txt}`);
                    }
                    return await resp.json();
                };

                // Send via SMS (Body text) – used for barber & fallback
                const sendSMS = async (toPhone: string, body: string) => {
                    if (!smsNumber) throw new Error("TWILIO_SMS_NUMBER not configured");
                    const cleanPhone = normalizePhone(toPhone);
                    const from = smsNumber.startsWith('whatsapp:')
                        ? smsNumber.replace('whatsapp:', '')
                        : smsNumber;

                    const params = new URLSearchParams();
                    params.append('To',   cleanPhone);
                    params.append('From', from);
                    params.append('Body', body);

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
                        let parsed: any = {};
                        try { parsed = JSON.parse(txt); } catch (_) {}
                        throw new Error(`Twilio SMS Error (${resp.status} code:${parsed.code}): ${parsed.message || txt}`);
                    }
                    return await resp.json();
                };

                // ── D. BUILD CONTENT ─────────────────────────────────────

                let contentSid: string | null = null;
                let templateVars: Record<string, string> = {};

                // SMS body for barber (always freeform text, barber doesn't use WA template)
                let barberSmsBody = "";

                if (isCancellation) {
                    contentSid = tmplCancelled ?? null;
                    templateVars = { "1": customerName, "2": humanDate, "3": time };
                    barberSmsBody = `❌ Cita Cancelada\nCliente: ${customerName}\nServicio: ${serviceName}\n📅 ${humanDate} a las ${time}`;
                } else if (isReschedule) {
                    const oldDateHuman = job.payload?.old_date ? getHumanDate(job.payload.old_date) : "fecha anterior";
                    const oldTime      = job.payload?.old_time ? formatTime(job.payload.old_time)   : "";
                    contentSid = tmplRescheduled ?? null;
                    templateVars = { "1": customerName, "2": oldDateHuman, "3": oldTime, "4": humanDate, "5": time };
                    barberSmsBody = `✏️ Cita Reagendada\nCliente: ${customerName}\nAntes: ${oldDateHuman} ${oldTime}\nAhora: ${humanDate} a las ${time}`;
                } else if (job.event_type.startsWith('reminder')) {
                    // Recordatorios
                    contentSid = tmplConfirmed ?? null; // Ideally use TWILIO_TEMPLATE_REMINDER if available
                    templateVars = { "1": customerName, "2": serviceName, "3": humanDate, "4": time };
                    let tiempoTxt = "pronto";
                    if (job.event_type === 'reminder_24h') tiempoTxt = "en 24 horas";
                    if (job.event_type === 'reminder_30m') tiempoTxt = "en 30 minutos";
                    
                    barberSmsBody = `⏱️ Recordatorio (${tiempoTxt})\nCliente: ${customerName}\nServicio: ${serviceName}\n📅 ${humanDate} a las ${time}`;
                } else {
                    // New / Confirmed
                    contentSid = tmplConfirmed ?? null;
                    templateVars = { "1": customerName, "2": serviceName, "3": humanDate, "4": time };
                    barberSmsBody = `✂️ Nueva Cita\nCliente: ${customerName}\nServicio: ${serviceName}\n📅 ${humanDate} a las ${time}`;
                }

                // Fallback SMS body for customer (if WhatsApp template fails)
                const customerSmsFallbackBody = barberSmsBody
                    .replace("Barbero\n", "")
                    .replace("Nueva Cita", `Hola ${customerName}, tu cita está confirmada`)
                    .replace(/Recordatorio.*/, `Hola ${customerName}, te recordamos tu cita hoy a las ${time}`);

                // ── E. SEND NOTIFICATIONS ──────────────────────────────────
                const logs: any[] = [];

                // ── CUSTOMER: WhatsApp via Template → fallback to SMS ──────
                const botActive = (apt.businesses as any)?.whatsapp_bot_active ?? true;

                if (customerPhone && botActive) {
                    if (contentSid && whatsappNumber) {
                        try {
                            const res = await sendWhatsAppTemplate(customerPhone, contentSid, templateVars);
                            logs.push({ target: 'customer', sid: res.sid, status: 'sent', channel: 'whatsapp' });
                        } catch (waErr: any) {
                            console.warn(`Customer WA failed: ${waErr.message}`);
                            if (smsNumber) {
                                try {
                                    const res = await sendSMS(customerPhone, customerSmsFallbackBody);
                                    logs.push({ target: 'customer', sid: res.sid, status: 'sent', channel: 'fallback_sms', wa_error: waErr.message });
                                } catch (smsErr: any) {
                                    logs.push({ target: 'customer', status: 'failed', error: `WA: ${waErr.message} | SMS: ${smsErr.message}` });
                                }
                            } else {
                                logs.push({ target: 'customer', status: 'failed', error: waErr.message });
                            }
                        }
                    } else if (smsNumber) {
                        // No WA template configured → direct SMS
                        try {
                            const res = await sendSMS(customerPhone, customerSmsFallbackBody);
                            logs.push({ target: 'customer', sid: res.sid, status: 'sent', channel: 'sms' });
                        } catch (smsErr: any) {
                            logs.push({ target: 'customer', status: 'failed', error: smsErr.message });
                        }
                    } else {
                        logs.push({ target: 'customer', status: 'skipped', error: 'No template or SMS configured' });
                    }
                } else if (customerPhone && !botActive) {
                    logs.push({ target: 'customer', status: 'skipped', error: 'WhatsApp Bot is disabled in settings' });
                } else {
                    logs.push({ target: 'customer', status: 'skipped', error: 'Missing phone' });
                }

                // ── BARBER: Disabled to save costs (Opt-in later) ────────
                // if (barberPhone) {
                //     if (smsNumber) {
                //         try {
                //             const res = await sendSMS(barberPhone, barberSmsBody);
                //             logs.push({ target: 'barber', sid: res.sid, status: 'sent', channel: 'sms' });
                //         } catch (smsErr: any) {
                //             logs.push({ target: 'barber', status: 'failed', error: smsErr.message });
                //         }
                //     } else {
                //         logs.push({ target: 'barber', status: 'skipped', error: 'TWILIO_SMS_NUMBER not set' });
                //     }
                // } else {
                //     logs.push({ target: 'barber', status: 'skipped', error: 'Missing phone' });
                // }
                logs.push({ target: 'barber', status: 'skipped', error: 'Barber notifications disabled' });

                // ── F. EVALUATE & COMPLETE ──────────────────────────────────
                const attempted = logs.filter(l => l.status !== 'skipped');
                const failed    = logs.filter(l => l.status === 'failed');

                if (attempted.length > 0 && attempted.length === failed.length) {
                    const combinedError = failed.map(l => `[${l.target}] ${l.error}`).join(' | ');
                    throw new Error(`All notifications failed: ${combinedError}`);
                }

                await supabase
                    .from('notification_jobs')
                    .update({
                        status: 'completed',
                        last_error: null,
                        payload: { ...job.payload, delivery_logs: logs }
                    })
                    .eq('id', job.id);

                results.push({ id: job.id, status: 'success', logs });

            } catch (err: any) {
                console.error(`Job ${job.id} failed: ${err.message}`);
                const currentAttempts = (job.attempts || 0) + 1;
                const nextRun = new Date(Date.now() + Math.pow(2, currentAttempts) * 60000);

                await supabase
                    .from('notification_jobs')
                    .update({
                        status: currentAttempts >= 5 ? 'failed' : 'pending',
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
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
})

// ── DATE / TIME HELPERS ─────────────────────────────────────

function getHumanDate(dateStr: string): string {
    if (!dateStr) return "Fecha desconocida";
    const date  = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
    if (diff === 0)  return "Hoy";
    if (diff === 1)  return "Mañana";
    if (diff === -1) return "Ayer";

    return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }).format(date);
}

function formatTime(timeStr: string): string {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(':');
    const hour   = parseInt(h);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const h12    = hour % 12 || 12;
    return `${h12}:${m} ${suffix}`;
}
