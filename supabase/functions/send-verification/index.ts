// send-verification/index.ts
// Genera código de 4 dígitos y lo manda por SMS via Twilio.
// Requiere JWT de Supabase (usuario autenticado).
// Deploy: supabase functions deploy send-verification

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizePhone(raw: string): string {
    let p = raw.trim().replace(/[\s\-().]/g, '');
    if (!p.startsWith('+')) {
        p = /^\d{10}$/.test(p) ? '+1' + p : '+' + p;
    }
    return p;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        // ── Auth: leer user desde JWT ─────────────────────────────────
        const authHeader = req.headers.get('Authorization') ?? '';
        if (!authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')             ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: { user }, error: userError } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
        );
        if (userError || !user) throw new Error('Token inválido');

        // ── Body ──────────────────────────────────────────────────────
        const { phone } = await req.json();
        if (!phone) throw new Error('phone es requerido');

        const phoneE164 = normalizePhone(phone);
        if (!/^\+\d{7,15}$/.test(phoneE164)) throw new Error('Número de teléfono inválido');

        // ── Rate limit: mínimo 60s entre solicitudes por usuario ─────
        const { data: lastCode } = await supabase
            .from('phone_verifications')
            .select('created_at')
            .eq('user_id', user.id)
            .eq('used', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (lastCode) {
            const secsSince = (Date.now() - new Date(lastCode.created_at).getTime()) / 1000;
            if (secsSince < 60) {
                return new Response(JSON.stringify({ success: false, error: `Espera ${Math.ceil(60 - secsSince)} segundos antes de solicitar otro código.` }), {
                    status: 429,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        // ── Generar código ────────────────────────────────────────────
        const code      = Math.floor(1000 + Math.random() * 9000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        // Invalidar códigos anteriores del mismo usuario
        await supabase.from('phone_verifications')
            .update({ used: true })
            .eq('user_id', user.id)
            .eq('used', false);

        // Guardar nuevo código
        const { error: insertErr } = await supabase.from('phone_verifications')
            .insert({ user_id: user.id, phone: phoneE164, code, expires_at: expiresAt });
        if (insertErr) throw insertErr;

        // ── Enviar SMS via Twilio ─────────────────────────────────────
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
        const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN')  ?? '';
        const smsFrom    = Deno.env.get('TWILIO_SMS_NUMBER')  ?? '';

        if (!accountSid || !authToken || !smsFrom) {
            throw new Error('Twilio SMS no configurado (TWILIO_SMS_NUMBER faltante)');
        }

        const from = smsFrom.startsWith('whatsapp:') ? smsFrom.replace('whatsapp:', '') : smsFrom;

        const params = new URLSearchParams({
            From: from,
            To:   phoneE164,
            Body: `Tu código de verificación de Spacey Reserve es: ${code}. Expira en 10 minutos.`,
        });

        const resp = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
                method:  'POST',
                headers: {
                    'Content-Type':  'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
                },
                body: params,
            }
        );

        if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(`Twilio ${resp.status}: ${txt}`);
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error('send-verification:', err.message);
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
