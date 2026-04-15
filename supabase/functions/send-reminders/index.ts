// Deploy: supabase functions deploy send-reminders --no-verify-jwt
//
// Campaña de Recordatorios de Inactividad — PRODUCTION READY
// Envía WhatsApp via ContentSid (template aprobado) o SMS fallback.
//
// SUPABASE SECRETS REQUIRED:
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_WHATSAPP_NUMBER
//   TWILIO_SMS_NUMBER        (optional fallback)
//   TWILIO_TEMPLATE_REMINDER (ContentSid HXxxx — your approved "come back" template)
//                             Falls back to TWILIO_TEMPLATE_CONFIRMED if not set.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Phone normalizer ──────────────────────────────────────────
function normalizePhone(raw: string): string {
    if (!raw) return '';
    let p = raw.trim().replace(/[\s\-().]/g, '');
    if (!p.startsWith('+')) {
        if (/^\d{10}$/.test(p)) p = '+1' + p;  // US/PR
        else p = '+' + p;
    }
    return p;
}

// ── Main Handler ──────────────────────────────────────────────
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // ── 0. Init ──────────────────────────────────────────
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')             ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const accountSid    = Deno.env.get('TWILIO_ACCOUNT_SID')        ?? '';
        const authToken     = Deno.env.get('TWILIO_AUTH_TOKEN')         ?? '';
        const waNumber      = Deno.env.get('TWILIO_WHATSAPP_NUMBER')    ?? '';
        const smsNumber     = Deno.env.get('TWILIO_SMS_NUMBER')         ?? '';
        const tmplReminder  = (Deno.env.get('TWILIO_TEMPLATE_REMINDER')
                           || Deno.env.get('TWILIO_TEMPLATE_CONFIRMED')) ?? '';

        if (!accountSid || !authToken) {
            throw new Error('TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set');
        }
        if (!waNumber && !smsNumber) {
            throw new Error('No sender configured: set TWILIO_WHATSAPP_NUMBER or TWILIO_SMS_NUMBER');
        }

        const credential = btoa(`${accountSid}:${authToken}`);
        const twilioUrl  = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const waFrom     = waNumber.startsWith('whatsapp:') ? waNumber : `whatsapp:${waNumber}`;
        const smsFrom    = smsNumber.startsWith('whatsapp:') ? smsNumber.replace('whatsapp:', '') : smsNumber;

        // ── 1. Parse request body ────────────────────────────
        const body = await req.json().catch(() => ({}));
        const bodyBusinessId: string | null   = body?.businessId ?? null;
        const bodyInactiveDays: number | null = typeof body?.inactiveDays === 'number' ? body.inactiveDays : null;
        // customClients = [{ phone, name, lastDate }]
        const bodyCustomClients: any[] | null = Array.isArray(body?.customClients) && body.customClients.length > 0
            ? body.customClients
            : null;

        // businessId is REQUIRED — campaigns are always per-business
        if (!bodyBusinessId) {
            throw new Error('businessId is required in the request body');
        }

        // ── 2. Verify business exists and bot is active ──────
        const { data: waSettings, error: wsErr } = await supabase
            .from('whatsapp_settings')
            .select('is_active')
            .eq('business_id', bodyBusinessId)
            .maybeSingle();

        // Fetch business name for result labeling
        const { data: biz } = await supabase
            .from('businesses')
            .select('id, name, slug, reminder_inactive_days')
            .eq('id', bodyBusinessId)
            .single();

        if (!biz) throw new Error('Business not found');

        const botActive = waSettings?.is_active ?? false;

        // If bot not active, still allow manual sends (selectedEmails), but warn
        if (!botActive && !bodyCustomClients) {
            return new Response(JSON.stringify({
                success: false,
                results: [{ business: biz.name, sent: 0, reason: 'WhatsApp Bot está desactivado para este negocio. Actívalo en Configuración.' }],
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // ── 3. Determine target clients ──────────────────────
        let targetClients: { name: string; phone: string }[] = [];

        if (bodyCustomClients) {
            // Manual mode — use exactly the clients sent from the frontend
            targetClients = bodyCustomClients
                .filter(c => c.phone && c.phone.trim())
                .map(c => ({ name: c.name || 'Cliente', phone: c.phone }));
        } else {
            // Automatic inactivity mode
            const inactiveDays = bodyInactiveDays ?? biz.reminder_inactive_days ?? 14;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
            const cutoffStr = cutoffDate.toISOString().split('T')[0];

            const { data: appointments, error: aptErr } = await supabase
                .from('appointments')
                .select('customer_name, customer_phone, appointment_date')
                .eq('business_id', bodyBusinessId)
                .order('appointment_date', { ascending: false });

            if (aptErr || !appointments) throw new Error('Error fetching appointments');

            // Deduplicate: keep only the most recent visit per phone
            const clientMap: Record<string, { name: string; phone: string; lastDate: string }> = {};
            for (const apt of appointments) {
                if (!apt.customer_phone?.trim()) continue;
                const phone = apt.customer_phone.trim();
                if (!clientMap[phone]) {
                    clientMap[phone] = {
                        name: apt.customer_name || 'Cliente',
                        phone,
                        lastDate: apt.appointment_date,
                    };
                }
                // appointments are ordered desc, so first hit is already most recent
            }

            targetClients = Object.values(clientMap)
                .filter(c => c.lastDate <= cutoffStr);
        }

        if (targetClients.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                results: [{ business: biz.name, sent: 0, reason: 'No hay clientes inactivos para enviar en este momento.' }],
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // ── 4. Send messages ─────────────────────────────────
        const bookingLink = `https://spaceyreserve.netlify.app/book/${biz.slug}`;
        let sentCount = 0;
        const sendErrors: string[] = [];

        for (const client of targetClients) {
            const cleanPhone = normalizePhone(client.phone);
            if (!cleanPhone || cleanPhone.length < 8) {
                sendErrors.push(`${client.name}: número inválido (${client.phone})`);
                continue;
            }

            let sent = false;

            // Try WhatsApp via approved template first
            if (waNumber && tmplReminder) {
                try {
                    const params = new URLSearchParams({
                        From:             waFrom,
                        To:               `whatsapp:${cleanPhone}`,
                        ContentSid:       tmplReminder,
                        ContentVariables: JSON.stringify({
                            "1": client.name,
                            "2": biz.name,
                            "3": bookingLink,
                        }),
                    });

                    const resp = await fetch(twilioUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type':  'application/x-www-form-urlencoded',
                            'Authorization': `Basic ${credential}`,
                        },
                        body: params,
                    });

                    if (!resp.ok) {
                        const txt = await resp.text();
                        let parsed: any = {};
                        try { parsed = JSON.parse(txt); } catch (_) {}
                        throw new Error(`Twilio WA ${resp.status} (code ${parsed.code}): ${parsed.message || txt}`);
                    }

                    sentCount++;
                    sent = true;
                } catch (waErr: any) {
                    console.warn(`WA failed for ${cleanPhone}: ${waErr.message}. Trying SMS fallback...`);
                }
            }

            // SMS fallback
            if (!sent && smsNumber) {
                try {
                    const smsBody = `¡Hola ${client.name}! Es momento de tu próximo corte en ${biz.name}. Reserva aquí: ${bookingLink}`;
                    const params = new URLSearchParams({
                        From: smsFrom,
                        To:   cleanPhone,
                        Body: smsBody,
                    });

                    const resp = await fetch(twilioUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type':  'application/x-www-form-urlencoded',
                            'Authorization': `Basic ${credential}`,
                        },
                        body: params,
                    });

                    if (!resp.ok) {
                        const txt = await resp.text();
                        throw new Error(`SMS ${resp.status}: ${txt}`);
                    }

                    sentCount++;
                    sent = true;
                } catch (smsErr: any) {
                    sendErrors.push(`${client.name} (${cleanPhone}): ${smsErr.message}`);
                }
            }

            if (!sent && !smsNumber) {
                sendErrors.push(`${client.name}: No hay plantilla WA ni número SMS configurado`);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            results: [{
                business:      biz.name,
                targetClients: targetClients.length,
                sent:          sentCount,
                errors:        sendErrors.length > 0 ? sendErrors : undefined,
            }],
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('send-reminders fatal:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
})
