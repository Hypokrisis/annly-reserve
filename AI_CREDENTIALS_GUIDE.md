═══════════════════════════════════════════════════════════════════════════════════
   🔑 GUÍA ESPECÍFICA: CÓMO OBTENER CADA CREDENCIAL Y CONFIGURARLA
═══════════════════════════════════════════════════════════════════════════════════

CONTENIDO:
1. OpenAI API Key
2. Evolution API (WhatsApp)
3. Supabase Secrets
4. Dashboard Configuration


═══════════════════════════════════════════════════════════════════════════════════
1️⃣  OPENAI API KEY - PASO A PASO
═══════════════════════════════════════════════════════════════════════════════════

PASO 1.1: Crear cuenta en OpenAI (si no la tienes)
───────────────────────────────────────────────────
1. Ve a: https://openai.com
2. Click: "Sign up"
3. Opciones:
   • Email + contraseña
   • Google account
   • Microsoft account
4. Verifica tu email
5. Completa tu perfil (nombre, país, etc)

PASO 1.2: Acceder a API Keys
──────────────────────────────
1. Ve a: https://platform.openai.com/account/api-keys
2. Verás: "API keys"
3. Deberías ver una lista de tus claves (probablemente vacía)

PASO 1.3: Crear nueva Secret Key
──────────────────────────────────
1. Click: "+ Create new secret key"
2. Elige un nombre: "annly-reserve-bot" (para recordar)
3. Click: "Create secret key"
4. **IMPORTANTE**: Copia la clave INMEDIATAMENTE
   Formato: sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

   ⚠️  NUNCA podrás ver esta clave nuevamente
   ⚠️  Si la pierdes, debes crear una nueva

PASO 1.4: Verificar créditos y billing
───────────────────────────────────────
1. Ve a: https://platform.openai.com/account/billing/overview
2. Verás:
   ✓ Balance actual (si tienes prepago)
   ✓ Usage this month
   ✓ Límite de gastos

3. Si no tienes crédito:
   → Click: "Add to credit balance"
   → Agrega $5-20 USD (suficiente para test)
   → O habilita "Billing" para pago automático

COSTO APROXIMADO:
─────────────────
• GPT-4o-mini:    $0.15 per 1M input tokens, $0.60 per 1M output tokens
• Promedio:       ~$0.001 por mensaje completo
• 100 msgs/día:   ~$3/mes
• 500 msgs/día:   ~$15/mes


═══════════════════════════════════════════════════════════════════════════════════
2️⃣  EVOLUTION API - WHATSAPP GATEWAY
═══════════════════════════════════════════════════════════════════════════════════

OPCIÓN A: Evolution API Gratuito (RECOMENDADO PARA TEST)
─────────────────────────────────────────────────────────

PASO 2.1: Crear instancia
──────────────────────────
1. Ve a: https://app.evolution-api.com
2. Sign up (Google o email)
3. Verifica tu email

PASO 2.2: Crear nueva instancia
─────────────────────────────────
1. Dashboard → "+ Create Instance"
2. Nombre: "barberia-ia" o similar
3. Click: "Create"
4. Espera 1-2 minutos mientras se crea

PASO 2.3: Obtener datos de la instancia
────────────────────────────────────────
En el dashboard de tu instancia, verás:

📌 Instance ID:
   Ejemplo: barberia-ia
   (Cópialo)

📌 API Token (Authentication):
   Formato: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Click: "Copy API Token" o el icono de copy
   (Cópialo)

📌 API URL:
   Valor por defecto: https://api.evolution-api.com
   (O tu URL local si usas self-hosted)

PASO 2.4: Conectar WhatsApp
─────────────────────────────
1. En Evolution API Dashboard, busca: "QR Code"
2. Si no ves QR:
   → Click: "Generate QR" o "Connect WhatsApp"
   → Espera a que aparezca el código QR

3. En tu teléfono, abre WhatsApp
4. Ve a: Settings (⚙️) → Linked Devices → Link a device
5. Escanea el QR con tu teléfono
6. Confirma el acceso en WhatsApp

7. De vuelta en Evolution API:
   → Debería mostrar: "✓ Connected"
   → Si aparece: "Ready to receive messages"

PASO 2.5: Probar que funciona
──────────────────────────────
1. Abre WhatsApp en tu teléfono
2. Envía un mensaje a tu número desde otro teléfono
3. El mensaje debería aparecer en Evolution API
4. Si aparece → ✓ Webhook funciona


OPCIÓN B: Evolution API PAGO (Para producción)
───────────────────────────────────────────────
1. Ve a: https://evolution-api.com
2. Elige plan ($10-50/mes)
3. Sigue instrucciones de setup
4. Obtendrás: URL custom, token permanente

OPCIÓN C: Twilio (Alternativa)
───────────────────────────────
1. Ve a: https://www.twilio.com
2. Sign up
3. Compra número de WhatsApp Business
4. Costo: ~$1/mes + $0.005 por mensaje


═══════════════════════════════════════════════════════════════════════════════════
3️⃣  AGREGAR SECRETS A SUPABASE
═══════════════════════════════════════════════════════════════════════════════════

PASO 3.1: Ir a Supabase Console
────────────────────────────────
1. Ve a: https://app.supabase.com
2. Inicia sesión (si no estás)
3. Selecciona tu proyecto: "annly-reserve" (o tu nombre)

PASO 3.2: Ir a Secrets
──────────────────────
1. Menú izquierdo: ⚙️ Settings
2. Busca: "Secrets and Vault" o "Secrets"
3. Debería haber una sección "Database Secrets" o similar

ALTERNATIVA (si no encuentras):
1. Menú izquierdo: Functions
2. Click: whatsapp-webhook
3. Busca: Environment Variables o Secrets
4. Click: "New Secret"

PASO 3.3: Agregar OPENAI_API_KEY
──────────────────────────────────
1. Click: "+ New secret"
2. Name:  OPENAI_API_KEY
3. Value: (Pega la clave de OpenAI que copiaste)
   Ej:     sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
4. Click: "Save"
5. Debería mostrar: ✓ Secret created

PASO 3.4: Agregar WA_WEBHOOK_SECRET (Opcional)
────────────────────────────────────────────────
1. Click: "+ New secret"
2. Name:  WA_WEBHOOK_SECRET
3. Value: (Un string random para seguridad)
   Ej:     super-secret-webhook-key-12345
4. Click: "Save"

PASO 3.5: Verificar secrets
─────────────────────────────
Deberías ver:
✓ OPENAI_API_KEY = **** (mostrado cifrado)
✓ WA_WEBHOOK_SECRET = **** (mostrado cifrado)

IMPORTANTE:
───────────
• Los secrets está cifrados en Supabase
• Cada deploy de función automáticamente usa los últimos secrets
• Si cambias un secret, debes redeploy la función:
  
  supabase functions deploy whatsapp-webhook --no-verify-jwt


═══════════════════════════════════════════════════════════════════════════════════
4️⃣  CONFIGURAR EN DASHBOARD
═══════════════════════════════════════════════════════════════════════════════════

PASO 4.1: Acceder al Dashboard
────────────────────────────────
1. Abre: http://localhost:5173 (desarrollo) o tu URL en producción
2. Inicia sesión como dueño de la barbería
3. Ve a: Dashboard → Asistente IA

PASO 4.2: Rellenar "Enlace de Reservas"
─────────────────────────────────────────
Campo: "Enlace de Reservas"
Valor: https://annly-reserve.netlify.app/book/tu-slug-barberia

Ejemplo real:
    https://annly-reserve.netlify.app/book/barberia-juan

(Si no sabes tu slug, ve a Dashboard → Configuración → Negocio)

PASO 4.3: Rellenar "Prompt Personalizado" (Opcional)
──────────────────────────────────────────────────────
Campo: "Prompt Personalizado"

Ejemplo 1 (Simple):
    "Eres un asistente amable de la barbería [nombre]. Ayuda a los clientes 
     a reservar citas. Siempre menciona nuestros precios reales y horarios. 
     Sé conciso y responde en español."

Ejemplo 2 (Avanzado):
    "Eres Juan, el asistente virtual de la Barbería Juan's Cuts. 
     Tu objetivo es convertir consultas en reservas.
     
     REGLAS:
     1. Responde SIEMPRE en español
     2. Usa emojis de barbería (✂️, 💈)
     3. Sé amigable y profesional
     4. Nunca inventes precios
     5. Si el cliente pregunta por algo que no sabes, ofrece el enlace de reserva
     
     Objetivo: Conseguir que reserve"

Si dejas vacío: Usará el prompt por defecto

PASO 4.4: Seleccionar "Personalidad"
──────────────────────────────────────
Opciones:
• quick       - Respuestas cortas y directas
• friendly    - Cálido y conversacional
• formal      - Profesional y serio

Ejemplo: Elige "friendly" para barbería casual

PASO 4.5: Rellenar "Oferta Activa" (Opcional)
──────────────────────────────────────────────
Ejemplo valores:
• "Primer corte 20% OFF"
• "Promoción: 2 cortes por $30"
• "Descuento de verano: 15% a todos"
• (Dejar vacío si no hay promo)

El bot automáticamente mencionará esta oferta

PASO 4.6: Configurar "Horario de Funcionamiento"
──────────────────────────────────────────────────
Toggle: "Activar auto-horario"

Si ACTIVADO (✓):
    Horario Inicio: 09:00 (9 AM)
    Horario Fin:    18:00 (6 PM)
    
    El bot SOLO responderá entre estas horas
    (Fuera de horario: no responde)

Si DESACTIVADO (vacío):
    El bot responde 24/7

PASO 4.7: Guardar
──────────────────
1. Click: "Guardar Configuración"
2. Debería mostrar: "✨ Configuración guardada con éxito"
3. ✓ Listo


═══════════════════════════════════════════════════════════════════════════════════
5️⃣  DESPLEGAR LA FUNCIÓN
═══════════════════════════════════════════════════════════════════════════════════

PASO 5.1: Abrir Terminal
──────────────────────────
1. En tu proyecto: c:\Users\loann\annly-reserve
2. Abre: PowerShell o Command Prompt
3. Navega a la carpeta:
   
   cd c:\Users\loann\annly-reserve

PASO 5.2: Desplegar
────────────────────
Ejecuta:

    supabase functions deploy whatsapp-webhook --no-verify-jwt

Output esperado:
    ✓ Deploying function whatsapp-webhook
    ✓ Successfully deployed function whatsapp-webhook
    ✓ Function URL: https://xxxxx.functions.supabase.co/whatsapp-webhook

COPIA LA URL (la necesitarás en el siguiente paso)

PASO 5.3: Verificar Deploy
────────────────────────────
1. Ve a: Supabase Console → Functions → whatsapp-webhook
2. Deberías ver: ✓ Last deployment: ...minutes ago


═══════════════════════════════════════════════════════════════════════════════════
6️⃣  CONFIGURAR WEBHOOK EN EVOLUTION API
═══════════════════════════════════════════════════════════════════════════════════

PASO 6.1: Ir a Webhooks en Evolution API
───────────────────────────────────────────
1. Evolution API Dashboard → tu instancia
2. Menú: Settings → Webhooks
3. O busca: "Webhooks" en las opciones

PASO 6.2: Crear Webhook
────────────────────────
1. Click: "Add Webhook" o "+ New Webhook"
2. Rellena:

   URL: https://xxxxx.functions.supabase.co/whatsapp-webhook
   (La URL que obtuviste en PASO 5.2)

   Events: ✓ messages
           ✓ message_ack (opcional)

   Active: ✓ Enabled/Sí/Activo

3. Click: "Save" o "Create"

PASO 6.3: Verificar
─────────────────────
El webhook debería mostrar:
✓ Status: Active
✓ Last triggered: ...

Si dice "Error" o "Inactive":
→ Verifica que la URL sea correcta (sin espacios)
→ Verifica que copiaste exactamente
→ Vuelve a intentar


═══════════════════════════════════════════════════════════════════════════════════
7️⃣  CONFIGURAR EN LA BD (SQL)
═══════════════════════════════════════════════════════════════════════════════════

PASO 7.1: Ir a SQL Editor en Supabase
───────────────────────────────────────
1. Supabase Console → SQL Editor
2. Click: "New Query" o "New"

PASO 7.2: Ejecutar UPDATE
──────────────────────────
Pega este SQL (reemplaza los valores):

    UPDATE businesses
    SET 
      whatsapp_instance_id = 'barberia-ia',
      whatsapp_gateway_url = 'https://api.evolution-api.com',
      whatsapp_instance_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      whatsapp_bot_active = true,
      whatsapp_bot_prompt = 'Tu prompt aquí',
      whatsapp_booking_link = 'https://annly-reserve.netlify.app/book/tu-slug'
    WHERE slug = 'tu-slug-barberia';

Cambios necesarios:
• whatsapp_instance_id = 'barberia-ia'
  → Reemplaza con tu Instance ID de Evolution API

• whatsapp_instance_token = 'eyJ...'
  → Reemplaza con tu API Token de Evolution API

• whatsapp_booking_link = '...'
  → Tu link de reserva

• WHERE slug = 'tu-slug-barberia'
  → Tu slug de barbería

PASO 7.3: Ejecutar
────────────────────
1. Click: "Run" (botón verde)
2. Debería mostrar: "Success. No rows returned" o "1 rows affected"

PASO 7.4: Verificar
──────────────────────
SQL para verificar:

    SELECT 
      name,
      slug,
      whatsapp_instance_id,
      whatsapp_bot_active,
      whatsapp_booking_link
    FROM businesses
    WHERE slug = 'tu-slug-barberia';

Deberías ver tus datos configurados.


═══════════════════════════════════════════════════════════════════════════════════
8️⃣  PROBAR QUE TODO FUNCIONA
═══════════════════════════════════════════════════════════════════════════════════

PRUEBA 1: Enviar mensaje desde WhatsApp
─────────────────────────────────────────
1. Abre WhatsApp (el que conectaste en Evolution API)
2. Desde OTRO teléfono o número, envía un mensaje
3. Ejemplos:
   • "Hola"
   • "¿Cuál es el precio del corte?"
   • "¿Tienes disponibilidad hoy?"

4. Espera 2-5 segundos
5. Si funciona: La IA responde automáticamente ✓

PRUEBA 2: Verificar Logs
─────────────────────────
En Supabase SQL Editor, ejecuta:

    SELECT * FROM bot_message_logs
    ORDER BY created_at DESC
    LIMIT 10;

Deberías ver tus mensajes registrados.

PRUEBA 3: Ver errores
──────────────────────
En Supabase Console:
1. Functions → whatsapp-webhook → Logs
2. Busca errores recientes
3. Si ves errores:
   • OPENAI_API_KEY not found → Verificar secret en Supabase
   • Connection failed → Verificar Evolution API
   • Invalid URL → Verificar webhook URL


═══════════════════════════════════════════════════════════════════════════════════
RESUMEN RÁPIDO DE CREDENCIALES NECESARIAS
═══════════════════════════════════════════════════════════════════════════════════

Para hacerlo funcionar necesitas 3 API Keys:

1. OpenAI API Key
   ├─ Obtener de: https://platform.openai.com/account/api-keys
   ├─ Guardar en: Supabase → OPENAI_API_KEY
   ├─ Costo: ~$3/mes (100 msgs/día)
   └─ Formato: sk-proj-xxxxx

2. Evolution API Token
   ├─ Obtener de: https://app.evolution-api.com → Tu instancia
   ├─ Guardar en: Supabase BD (tabla businesses)
   ├─ Costo: Gratis (test) o $10-50/mes (producción)
   └─ Formato: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

3. Evolution API Instance ID
   ├─ Obtener de: https://app.evolution-api.com → Dashboard
   ├─ Guardar en: Supabase BD (tabla businesses)
   ├─ Costo: Incluido en Evolution API
   └─ Formato: barberia-ia

Si tienes estos 3 → Tu IA funciona ✓


═══════════════════════════════════════════════════════════════════════════════════
