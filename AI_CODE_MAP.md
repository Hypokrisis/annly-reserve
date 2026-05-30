═══════════════════════════════════════════════════════════════════════════════════
           📂 DÓNDE ENCONTRAR CADA COMPONENTE DE LA IA EN EL PROYECTO
═══════════════════════════════════════════════════════════════════════════════════

🔴 CÓDIGO FUENTE
─────────────────────────────────────────────────────────────────────────────────

┌─ FRONTEND (React UI)
│
├─ src/pages/dashboard/AIAssistantPage.tsx
│  ├─ Línea 1-50:     Interfaz del panel IA
│  ├─ Línea 51-150:   Estado y configuración del bot
│  ├─ Línea 151-200:  Handlers para guardar config
│  ├─ Línea 200-300:  QR modal y simulador
│  └─ Línea 300+:     Logs de conversaciones
│
├─ src/types/ (Tipos TypeScript)
│  └─ Buscar interfaces: BotConfig, BotLog, BusinessAI
│
└─ src/services/ (Servicios API)
   └─ NO hay servicio específico de IA (todo en webhook)

┌─ BACKEND (Lógica principal)
│
├─ supabase/functions/whatsapp-webhook/index.ts
│  │
│  ├─ Línea 1-50:       Imports y setup
│  ├─ Línea 50-150:     Helper functions (HMAC, time conversion)
│  ├─ Línea 150-300:    calculateFreeSlots() - Calcula disponibilidad
│  ├─ Línea 300-400:    serve() - Función principal
│  │  ├─ 1. HMAC verification
│  │  ├─ 2. Deduplication
│  │  ├─ 3. Business lookup
│  │  ├─ 4. Validation (active, schedule, rate limit)
│  │  ├─ 5. Data gathering (services, availability)
│  │  ├─ 6. Prompt compilation
│  │  └─ 7. Send to OpenAI
│  ├─ Línea 380-430:    OpenAI GPT-4o-mini API call
│  ├─ Línea 430-470:    Guardrails (validate hallucinations)
│  ├─ Línea 470-500:    Save logs + send to Evolution
│  │
│  └─ Línea 500-550:    sendGatewayMessage() - Envía por WhatsApp

└─ supabase/migrations/
   └─ Buscar: business_hours, bot_message_logs, whatsapp_* columns


🔷 BASE DE DATOS (Supabase PostgreSQL)
─────────────────────────────────────────────────────────────────────────────────

Tabla: businesses (Columnas importantes para IA)
├─ whatsapp_instance_id:        string (ID del QR scaneado)
├─ whatsapp_gateway_url:        string (URL de Evolution API)
├─ whatsapp_instance_token:     string (Token de autenticación)
├─ whatsapp_bot_active:         boolean (Encender/apagar)
├─ whatsapp_bot_prompt:         text (Instrucciones custom)
├─ whatsapp_booking_link:       string (Link de reserva)
├─ whatsapp_offer:              string (Promoción a mostrar)
├─ whatsapp_bot_personality:    string (quick/friendly/formal)
├─ whatsapp_bot_auto_schedule:  boolean (Activar rango horario)
├─ whatsapp_bot_start_hour:     string (ej: "09:00")
├─ whatsapp_bot_end_hour:       string (ej: "18:00")
├─ whatsapp_bot_anti_collision: boolean (Evitar respuestas si humano escribiendo)
└─ daily_msg_count:             integer (Counter para rate limit)

Tabla: bot_message_logs (Registro de conversaciones)
├─ id:              uuid
├─ business_id:     uuid (FK a businesses)
├─ from_number:     string (Número del cliente)
├─ user_message:    text (Lo que escribió el cliente)
├─ bot_response:    text (Lo que respondió la IA)
└─ created_at:      timestamptz

Tabla: processed_messages (Deduplication)
├─ id:          uuid
├─ message_id:  string (ID único del mensaje en WhatsApp)
└─ created_at:  timestamptz

Tabla: services (Catálogo de la barbería)
├─ id:                 uuid
├─ business_id:        uuid
├─ name:               string (ej: "Corte de Cabello")
├─ price:              decimal (ej: 20.00)
├─ duration_minutes:   integer (ej: 30)
└─ is_active:          boolean

Tabla: schedules (Horarios de barberos)
├─ id:              uuid
├─ barber_id:       uuid
├─ day_of_week:     integer (0-6: Sun-Sat)
├─ start_time:      time (ej: "09:00")
├─ end_time:        time (ej: "18:00")
└─ is_active:       boolean

Tabla: appointments (Citas - Usada para calcular disponibilidad)
├─ id:              uuid
├─ business_id:     uuid
├─ appointment_date: date
├─ start_time:      time
├─ end_time:        time
└─ status:          string (pending/confirmed/completed)


⚙️ VARIABLES DE AMBIENTE
─────────────────────────────────────────────────────────────────────────────────

En Supabase Console → Settings → Secrets:

OPENAI_API_KEY
├─ Origen:     https://platform.openai.com/account/api-keys
├─ Formato:    sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
├─ Usado en:   supabase/functions/whatsapp-webhook/index.ts:383
├─ Costo:      ~$0.001 por mensaje
└─ Alternativa: GPT-3.5-turbo (más barato)

WA_WEBHOOK_SECRET (Opcional, para HMAC)
├─ Origen:     El que proporcione Evolution API
├─ Formato:    string alfanumérico
├─ Usado en:   verifyHMAC() en index.ts:23
└─ Seguridad:  Valida que los webhooks vienen de Evolution API

SUPABASE_URL
├─ Auto-incluido por Supabase
├─ Formato:    https://xxxxx.supabase.co
└─ Usado en:   Crear cliente de Supabase

SUPABASE_SERVICE_ROLE_KEY
├─ Auto-incluido por Supabase
├─ Seguridad:  Máximo nivel (NO publicar)
└─ Usado en:   Acceder a BD con permisos totales


🔗 INTEGRACIONES EXTERNAS
─────────────────────────────────────────────────────────────────────────────────

1. OpenAI API
   └─ Endpoint:  https://api.openai.com/v1/chat/completions
      Model:     gpt-4o-mini
      Request:   POST + Authorization header
      Línea:     394 en index.ts

2. Evolution API (WhatsApp Gateway)
   ├─ Webhook IN:  Recibe mensajes de WhatsApp
   ├─ Endpoint OUT: /message/sendText/{instanceId}
   ├─ Auth:        API key en header
   └─ Línea:       Función sendGatewayMessage() línea 520+

3. Supabase Database
   ├─ Queries:    SELECT, INSERT, UPDATE
   ├─ Auth:       Service Role Key (máximos permisos)
   └─ Cliente:    Deno.land Supabase JS client


📊 FLUJO DE DATOS PASO A PASO
─────────────────────────────────────────────────────────────────────────────────

INPUT (Cliente WhatsApp):
"Hola, ¿cuál es el precio del corte?"
     ↓
Webhook recibe → Valida → Busca negocio en BD
     ↓
SELECT services WHERE business_id = ?
SELECT schedules WHERE barber_id IN (?)
SELECT appointments WHERE business_id = ? AND status IN ('confirmed', 'pending')
     ↓
Construye PROMPT con datos reales
     ↓
POST a OpenAI con:
{
  "model": "gpt-4o-mini",
  "system": "[SYSTEM_PROMPT_CON_DATOS_REALES]",
  "messages": [
    { "role": "user", "content": "Hola, ¿cuál es el precio...?" }
  ]
}
     ↓
OpenAI responde:
{
  "choices": [
    { "message": { "content": "El corte cuesta $20..." } }
  ]
}
     ↓
Guardrails validan respuesta (no alucinaciones)
     ↓
INSERT INTO bot_message_logs (...)
     ↓
POST a Evolution API sendText → WhatsApp del cliente
     ↓
OUTPUT (Cliente recibe):
"¡Hola! El corte cuesta $20..."


🧪 CÓMO TESTEAR LOCALMENTE
─────────────────────────────────────────────────────────────────────────────────

1. Mockear OpenAI (Sin API key real):
   En index.ts línea 386, comentar:
   
   // if (!openaiApiKey) {
   //   aiResponse = "Fallback message sin IA";
   // }

2. Test directo con curl:
   
   curl -X POST http://localhost:3000/whatsapp-webhook \
     -H "Content-Type: application/json" \
     -d '{
       "data": {
         "key": { "remoteJid": "5551234567@s.whatsapp.net" },
         "message": { "conversation": "Hola" }
       },
       "instanceId": "test-instance"
     }'

3. Ver logs en Supabase:
   SELECT * FROM bot_message_logs
   ORDER BY created_at DESC
   LIMIT 10;

4. Verificar errores en Function logs:
   Supabase Console → Functions → whatsapp-webhook → Logs


💡 PUNTOS CLAVE DEL CÓDIGO
─────────────────────────────────────────────────────────────────────────────────

1. HMAC Verification (Línea 23):
   Verifica que el webhook viene de Evolution API (seguridad)

2. Deduplication (Línea 247):
   Evita procesar 2 veces el mismo mensaje si falla la red

3. Rate Limiting (Línea 385):
   Max 100 mensajes/día por negocio para ahorrar costos

4. calculateFreeSlots() (Línea 72):
   ⭐ Lógica core que calcula disponibilidad real
   • Busca appointments confirmados
   • Resta de horarios de trabajo
   • Maneja zona horaria (Puerto Rico AST UTC-4)
   • Agrupa en turnos (Mañana/Tarde/Noche)

5. Prompt Injection (Línea 408):
   Inyecta datos REALES del negocio en el prompt
   • Esto hace que OpenAI responda con info actualizada

6. Guardrails (Línea 442):
   Si la IA inventa un horario que no existe:
   ✗ Rechaza
   ✓ Ofrece horarios válidos de la lista real

7. sendGatewayMessage() (Línea 520):
   Envía respuesta por Evolution API de vuelta a WhatsApp


🎯 PRÓXIMOS PASOS DESPUÉS DE ACTIVAR
─────────────────────────────────────────────────────────────────────────────────

1. Mejorar Prompt:
   → Ir a Dashboard → Asistente IA
   → Escribir instrucciones custom más específicas
   → Ejemplo: "Siempre menciona nuestra oferta de verano..."

2. Analizar Logs:
   → Supabase → SELECT FROM bot_message_logs
   → Ver qué preguntan los clientes
   → Mejorar prompt según patrones

3. Entrenar Modelo:
   → Usar GPT-4 Turbo para respuestas mejores
   → Costaría ~$0.005/msg pero más inteligente

4. Agregar Más Canales:
   → SMS (Twilio)
   → Telegram
   → Facebook Messenger
   → Todo usa el mismo webhook

5. Automatización Avanzada:
   → Confirmar citas automáticamente en BD
   → Enviar recordatorios 24h antes
   → Generar reportes de conversaciones


═══════════════════════════════════════════════════════════════════════════════════
