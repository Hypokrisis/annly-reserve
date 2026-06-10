// test-twilio: validates per-business Twilio credentials by sending one
// real WhatsApp test message. Called from the dashboard "Probar conexión".
// Browsers can't call Twilio directly (no CORS), so this runs server-side.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizePhone(raw: string): string {
  if (!raw) return '';
  let p = raw.trim().replace(/[\s\-().]/g, '');
  if (p.startsWith('whatsapp:')) p = p.slice('whatsapp:'.length);
  if (!p.startsWith('+')) {
    if (/^\d{10}$/.test(p)) p = '+1' + p; // US / Puerto Rico
    else p = '+' + p;
  }
  return p;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { account_sid, auth_token, whatsapp_from, to } = await req.json();

    if (!account_sid || !auth_token || !whatsapp_from || !to) {
      return new Response(
        JSON.stringify({ success: false, error: 'Faltan datos: account_sid, auth_token, whatsapp_from o número de prueba.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fromClean = normalizePhone(whatsapp_from);
    const toClean = normalizePhone(to);
    const waFrom = `whatsapp:${fromClean}`;
    const waTo = `whatsapp:${toClean}`;

    const credential = btoa(`${account_sid}:${auth_token}`);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${account_sid}/Messages.json`;

    const params = new URLSearchParams({
      From: waFrom,
      To: waTo,
      Body: '✅ Spacey: tu conexión de WhatsApp con Twilio funciona correctamente.',
    });

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credential}`,
      },
      body: params,
    });

    const text = await resp.text();
    if (!resp.ok) {
      let parsed: any = {};
      try { parsed = JSON.parse(text); } catch (_) {}
      // Twilio error codes: 20003 auth, 21211 invalid 'to', 63007 invalid from, 21608 sandbox not joined
      const msg = parsed.message || text;
      return new Response(
        JSON.stringify({ success: false, error: `Twilio ${resp.status} (code ${parsed.code ?? '?'}): ${msg}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = JSON.parse(text);
    return new Response(
      JSON.stringify({ success: true, sid: data.sid }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e?.message || 'Error inesperado.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
