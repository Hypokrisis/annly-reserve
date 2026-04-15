// ============================================================
// send-twilio/index.ts — PRODUCTION READY v3
// Deploy: supabase functions deploy send-twilio --no-verify-jwt
//
// SUPABASE SECRETS REQUIRED:
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_WHATSAPP_NUMBER   (e.g. +14155238886 or whatsapp:+14155238886)
//   TWILIO_SMS_NUMBER        (optional, fallback / barber notifications)
//   TWILIO_TEMPLATE_CONFIRMED   (ContentSid HXxxx for booking confirmation)
//   TWILIO_TEMPLATE_CANCELLED   (ContentSid HXxxx for cancellation)
//   TWILIO_TEMPLATE_RESCHEDULED (ContentSid HXxxx for reschedule)
//   TWILIO_TEMPLATE_REMINDER    (ContentSid HXxxx for reminders — can reuse CONFIRMED)
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalize any phone string to E.164 format (+XXXXXXXXXXX).
 * Does NOT assume country — just strips formatting.
 * If the number has no + prefix it adds one.
 * Numbers written as 10-digit with country prefix 1 (US/CA/PR) already
 * stored with country code will stay correct.
 */
function normalizePhone(raw: string): string {
    if (!raw) return '';
    // Strip everything except digits and leading +
    let p = raw.trim().replace(/[\s\-().]/g, '');
    if (!p.startsWith('+')) {
        // Try to detect US/PR 10-digit without country code
        if (/^\d{10}$/.test(p)) {
            p = '+1' + p;  // US / Puerto Rico
        } else {
            p = '+' + p;   // Assume caller stored with country code already
        }
    }
    return p;
}

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
    const hour   = parseInt(h, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const h12    = hour % 12 || 12;
    return `${h12}:${m} ${suffix}`;
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // ── 0. Init Supabase (service role) ────────────────────────────────
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')             ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // ── 1. Read Twilio credentials ONCE (not inside loop) ──────────────
        const accountSid     = Deno.env.get('TWILIO_ACCOUNT_SID')         ?? '';
        const authToken      = Deno.env.get('TWILIO_AUTH_TOKEN')          ?? '';
        const waNumber       = Deno.env.get('TWILIO_WHATSAPP_NUMBER')     ?? '';
        const smsNumber      = Deno.env.get('TWILIO_SMS_NUMBER')          ?? '';
        const tmplConfirmed  = Deno.env.get('TWILIO_TEMPLATE_CONFIRMED')  ?? '';
        const tmplCancelled  = Deno.env.get('TWILIO_TEMPLATE_CANCELLED')  ?? '';
        const tmplRescheduled= Deno.env.get('TWILIO_TEMPLATE_RESCHEDULED')?? '';
        const tmplReminder   = Deno.env.get('TWILIO_TEMPLATE_REMINDER')   || tmplConfirmed; // fallback

        if (!accountSid || !authToken) {
            throw new Error('TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set');
        }
        if (!waNumber && !smsNumber) {
            throw new Error('No sender configured. Set TWILIO_WHATSAPP_NUMBER or TWILIO_SMS_NUMBER');
        }

        const credential = btoa(`${accountSid}:${authToken}`);
        const twilioUrl  = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

        // Normalize the WhatsApp From number (must include whatsapp: prefix)
        const waFrom = waNumber.startsWith('whatsapp:') ? waNumber : `whatsapp:${waNumber}`;
        const smsFrom = smsNumber.startsWith('whatsapp:') ? smsNumber.replace('whatsapp:', '') : smsNumber;

        // ── 2. Fetch pending jobs (with optimistic limit) ─────────────────
        const { data: jobs, error: fetchError } = await supabase
            .from('notification_jobs')
            .select('*')
            .eq('status', 'pending')
            .lte('run_after', new Date().toISOString())
            .order('created_at', { ascending: true })
            .limit(10);

        if (fetchError) throw fetchError;

        if (!jobs || jobs.length === 0) {
            return new Response(JSON.stringify({ message: 'No pending jobs' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        console.log(`Processing ${jobs.length} jobs...`);
        const results: any[] = [];

        // ── 3. Process each job ────────────────────────────────────────────
        for (const job of jobs) {
            try {
                // A. Optimistic lock — prevents double-processing
                const { error: lockError } = await supabase
                    .from('notification_jobs')
                    .update({ status: 'processing', processed_at: new Date().toISOString() })
                    .eq('id', job.id)
                    .eq('status', 'pending'); // only lock if still pending

                if (lockError) {
                    console.warn(`Job ${job.id} lock failed, skipping`);
                    continue;
                }

                // B. Fetch fresh appointment data (single join)
                const { data: apt, error: aptError } = await supabase
                    .from('appointments')
                    .select(`
                        id, business_id, status, customer_name, customer_phone,
                        appointment_date, start_time, customer_notes,
                        barbers:barber_id  (name, phone),
                        services:service_id (name)
                    `)
                    .eq('id', job.appointment_id)
                    .single();

                if (aptError || !apt) {
                    throw new Error(`Appointment ${job.appointment_id} not found: ${aptError?.message}`);
                }

                // C. Check bot is still active for this business
                const { data: waSettings } = await supabase
                    .from('whatsapp_settings')
                    .select('is_active')
                    .eq('business_id', apt.business_id)
                    .single();

                if (!waSettings?.is_active) {
                    await supabase.from('notification_jobs')
                        .update({ status: 'skipped', last_error: 'Bot inactive for business' })
                        .eq('id', job.id);
                    results.push({ id: job.id, status: 'skipped', reason: 'bot_inactive' });
                    continue;
                }

                const customerPhone = apt.customer_phone?.trim();
                if (!customerPhone) {
                    await supabase.from('notification_jobs')
                        .update({ status: 'skipped', last_error: 'Customer has no phone number' })
                        .eq('id', job.id);
                    results.push({ id: job.id, status: 'skipped', reason: 'no_phone' });
                    continue;
                }

                // D. Build message content based on event type
                const customerName = apt.customer_name  || 'Cliente';
                const serviceName  = (apt.services as any)?.name || 'Servicio';
                const humanDate    = getHumanDate(apt.appointment_date);
                const time         = formatTime(apt.start_time);

                let contentSid    = '';
                let templateVars: Record<string, string> = {};
                let smsFallback   = '';

                const et = job.event_type as string;

                if (et === 'cancelled') {
                    contentSid   = tmplCancelled;
                    templateVars = { "1": customerName, "2": humanDate, "3": time };
                    smsFallback  = `❌ Hola ${customerName}, tu cita del ${humanDate} a las ${time} ha sido cancelada.`;

                } else if (et === 'rescheduled') {
                    const oldDate = job.payload?.old_date ? getHumanDate(job.payload.old_date) : 'anterior';
                    const oldTime = job.payload?.old_time ? formatTime(job.payload.old_time)   : '';
                    contentSid   = tmplRescheduled;
                    templateVars = { "1": customerName, "2": oldDate, "3": oldTime, "4": humanDate, "5": time };
                    smsFallback  = `✏️ Hola ${customerName}, tu cita fue reagendada.\nAntes: ${oldDate} ${oldTime}\nAhora: ${humanDate} a las ${time}`;

                } else if (et.startsWith('reminder')) {
                    contentSid   = tmplReminder;
                    const badge  = et === 'reminder_30m' ? '⏰ ¡En 30 minutos!' : '📅 Recordatorio (mañana)';
                    templateVars = { "1": customerName, "2": serviceName, "3": humanDate, "4": time };
                    smsFallback  = `${badge}\nHola ${customerName}, recuerda tu cita de ${serviceName} el ${humanDate} a las ${time}.`;

                } else {
                    // created / confirmed / default
                    contentSid   = tmplConfirmed;
                    templateVars = { "1": customerName, "2": serviceName, "3": humanDate, "4": time };
                    smsFallback  = `✅ Hola ${customerName}, tu cita de ${serviceName} está confirmada para el ${humanDate} a las ${time}.`;
                }

                // E. Send notifications
                const logs: any[] = [];
                const cleanPhone  = normalizePhone(customerPhone);

                // Try WhatsApp template first
                if (contentSid && waNumber) {
                    try {
                        const params = new URLSearchParams({
                            From:             waFrom,
                            To:               `whatsapp:${cleanPhone}`,
                            ContentSid:       contentSid,
                            ContentVariables: JSON.stringify(templateVars),
                        });

                        const resp = await fetch(twilioUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'Authorization': `Basic ${credential}`,
                            },
                            body: params,
                        });

                        if (!resp.ok) {
                            const txt = await resp.text();
                            let parsed: any = {};
                            try { parsed = JSON.parse(txt); } catch (_) {}
                            throw new Error(`Twilio ${resp.status} (code ${parsed.code}): ${parsed.message || txt}`);
                        }

                        const data = await resp.json();
                        logs.push({ channel: 'whatsapp', status: 'sent', sid: data.sid });

                    } catch (waErr: any) {
                        console.warn(`WhatsApp failed for job ${job.id}: ${waErr.message}`);

                        // Fallback to SMS
                        if (smsNumber) {
                            try {
                                const smsParams = new URLSearchParams({
                                    From: smsFrom,
                                    To:   cleanPhone,
                                    Body: smsFallback,
                                });

                                const smsResp = await fetch(twilioUrl, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                        'Authorization': `Basic ${credential}`,
                                    },
                                    body: smsParams,
                                });

                                if (!smsResp.ok) {
                                    const t = await smsResp.text();
                                    throw new Error(`SMS ${smsResp.status}: ${t}`);
                                }

                                const smsData = await smsResp.json();
                                logs.push({ channel: 'sms_fallback', status: 'sent', sid: smsData.sid, wa_error: waErr.message });

                            } catch (smsErr: any) {
                                logs.push({ channel: 'sms_fallback', status: 'failed', error: smsErr.message, wa_error: waErr.message });
                            }
                        } else {
                            logs.push({ channel: 'whatsapp', status: 'failed', error: waErr.message });
                        }
                    }

                } else if (smsNumber) {
                    // No WhatsApp template — send plain SMS
                    try {
                        const smsParams = new URLSearchParams({
                            From: smsFrom,
                            To:   cleanPhone,
                            Body: smsFallback,
                        });

                        const smsResp = await fetch(twilioUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'Authorization': `Basic ${credential}`,
                            },
                            body: smsParams,
                        });

                        if (!smsResp.ok) {
                            const t = await smsResp.text();
                            throw new Error(`SMS ${smsResp.status}: ${t}`);
                        }

                        const smsData = await smsResp.json();
                        logs.push({ channel: 'sms', status: 'sent', sid: smsData.sid });

                    } catch (smsErr: any) {
                        logs.push({ channel: 'sms', status: 'failed', error: smsErr.message });
                    }
                } else {
                    logs.push({ channel: 'none', status: 'skipped', error: 'No sender configured (no WA template + no SMS number)' });
                }

                // F. Evaluate success / failure
                const sentCount   = logs.filter(l => l.status === 'sent').length;
                const failedCount = logs.filter(l => l.status === 'failed').length;

                if (sentCount === 0 && failedCount > 0) {
                    throw new Error(logs.map(l => l.error).filter(Boolean).join(' | '));
                }

                await supabase.from('notification_jobs').update({
                    status:      'completed',
                    last_error:  null,
                    processed_at: new Date().toISOString(),
                    payload:     { ...job.payload, delivery_logs: logs },
                }).eq('id', job.id);

                results.push({ id: job.id, status: 'success', logs });

            } catch (err: any) {
                console.error(`Job ${job.id} error: ${err.message}`);

                const attempts = (job.attempts ?? 0) + 1;
                // Exponential backoff: 1m, 2m, 4m, 8m, 16m max
                const backoffMs  = Math.min(Math.pow(2, attempts - 1) * 60_000, 16 * 60_000);
                const nextRun    = new Date(Date.now() + backoffMs);
                const finalFail  = attempts >= 5;

                await supabase.from('notification_jobs').update({
                    status:    finalFail ? 'failed' : 'pending',
                    attempts,
                    last_error: err.message,
                    run_after:  finalFail ? null : nextRun.toISOString(),
                }).eq('id', job.id);

                results.push({ id: job.id, status: 'error', attempt: attempts, error: err.message });
            }
        }

        return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('Fatal worker error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
})
