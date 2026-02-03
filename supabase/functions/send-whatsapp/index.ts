// Setup: npm install -g supabase
// Deploy: supabase functions deploy send-whatsapp --no-verify-jwt

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
        // 1. SECURITY: Verify X-WEBHOOK-SECRET
        const secret = req.headers.get('X-WEBHOOK-SECRET')
        const expectedSecret = Deno.env.get('WEBHOOK_SECRET')

        if (!expectedSecret || secret !== expectedSecret) {
            console.error("⛔ Unauthorized: Invalid or missing X-WEBHOOK-SECRET")
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const body = await req.json()
        const { record } = body

        if (!record || !record.id) {
            console.error("⛔ Invalid Payload: No record ID")
            return new Response(JSON.stringify({ error: 'No record found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        console.log(`Processing job ${record.id} for business ${record.business_id}`)

        // 2. LOCKING (Anti-Duplicados)
        // Intentamos "reclamar" el trabajo. Solo si está 'pending'.
        const { data: job, error: claimError } = await supabaseClient
            .from('notification_jobs')
            .update({ status: 'processing', processed_at: new Date().toISOString() })
            .eq('id', record.id)
            .eq('status', 'pending') // STRICT LOCKING
            .select()
            .single()

        if (claimError || !job) {
            console.warn(`⚠️ Job ${record.id} could not be claimed (Already processing/completed or not pending).`)
            return new Response(JSON.stringify({ message: 'Job already claimed or not pending' }), { headers: corsHeaders, status: 200 })
        }

        // 3. OBTENER CONFIGURACIÓN
        const { data: settings, error: settingsError } = await supabaseClient
            .from('whatsapp_settings')
            .select('*')
            .eq('business_id', record.business_id)
            .single()

        // Manejo de estado 'skipped' si no hay config o no hay destinatario
        if (settingsError || !settings || !settings.is_active || !settings.recipient_phone) {
            const reason = !settings ? 'Missing Settings' : (!settings.is_active ? 'Not Active' : 'No Recipient Phone')
            console.warn(`⏭️ Skipping Job ${record.id}: ${reason}`)

            await supabaseClient.from('notification_jobs')
                .update({ status: 'skipped', error_message: `Skipped: ${reason}` })
                .eq('id', record.id)

            return new Response(JSON.stringify({ message: 'Skipped', reason }), { headers: corsHeaders, status: 200 })
        }

        // 4. PREPARAR ENVÍO
        const payload = record.payload
        const phoneId = settings.phone_number_id
        const token = settings.access_token
        const recipientPhone = settings.recipient_phone // MVP: Enviar SIEMPRE al teléfono configurado (Dueño)

        console.log(`Sending ${record.event_type} message to ${recipientPhone}`)

        // Construir Mensaje
        const messageBody = buildMessage(record.event_type, payload)

        // 5. LLAMADA A META GRAPH API
        const response = await fetch(
            `https://graph.facebook.com/v17.0/${phoneId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: recipientPhone,
                    type: 'text',
                    text: { body: messageBody },
                }),
            }
        )

        const whatsappData = await response.json()

        if (!response.ok) {
            console.error('⛔ WhatsApp API Error:', JSON.stringify(whatsappData))

            // Manejo de Error + Retry Count
            await supabaseClient.from('notification_jobs').update({
                status: 'failed',
                error_message: JSON.stringify(whatsappData),
                retry_count: (record.retry_count || 0) + 1
            }).eq('id', record.id)

            // Retornamos 200 para que Supabase Webhook no reintente indefinidamente si es error de lógica,
            // o 500 si queremos que Supabase insista. 
            // Para este MVP, marcamos como failed en DB y retornamos 200 OK al webhook para "cerrar" el evento.
            return new Response(JSON.stringify({ error: whatsappData }), { headers: corsHeaders, status: 200 })
        }

        // 6. ÉXITO
        console.log(`✅ Message sent for Job ${record.id}`)
        await supabaseClient.from('notification_jobs')
            .update({ status: 'completed', error_message: null })
            .eq('id', record.id)

        return new Response(JSON.stringify({ success: true, meta_id: whatsappData.messages?.[0]?.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error("🔥 System Error:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})

// Helper de Mensajes
function buildMessage(type: string, data: any): string {
    const { barber_name, service_name, appointment_date, start_time, customer_name, old_date, old_time } = data

    // Wording solicitado
    if (type === 'created') {
        return `📅 *Nueva cita creada*\n\nHola, se ha agendado una nueva cita.\n\n👤 Cliente: ${customer_name}\n💈 Barbero: ${barber_name}\n✂️ Servicio: ${service_name}\n🗓 Fecha: ${appointment_date}\n⏰ Hora: ${start_time}`
    }

    if (type === 'cancelled') {
        return `❌ *Cita Cancelada*\n\nLa cita de ${customer_name} para el ${appointment_date} ha sido cancelada.`
    }

    if (type === 'rescheduled') {
        return `⚠️ *Cita Reprogramada*\n\nCambio para la cita de ${customer_name}:\n\nAntes: ${old_date} ${old_time}\nAhora: *${appointment_date} ${start_time}*`
    }

    return 'Notificación de Annly Reserve'
}
