# 🤖 GUÍA COMPLETA: Activar la IA de WhatsApp en Annly Reserve

**Objetivo:** Poner en funcionamiento el asistente de IA para que responda automáticamente en WhatsApp.

**Tiempo estimado:** 30-45 minutos

**Requisitos:**
- Acceso a OpenAI (ChatGPT Pro o API paid)
- Acceso a Supabase Console
- WhatsApp conectado (o simulado para test)

---

## 🔑 PASO 1: OBTENER API KEY DE OPENAI (5 minutos)

### 1.1 Ir a OpenAI y crear una API Key

1. Ve a **https://platform.openai.com/account/api-keys**
2. Inicia sesión con tu cuenta (si no tienes, crea una en https://openai.com)
3. Haz click en **"Create new secret key"**
4. Copia la clave (ejemplo: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx`)
5. **GUARDA ESTA CLAVE EN UN LUGAR SEGURO** ⚠️ No la compartas

### 1.2 Verificar créditos en OpenAI

1. Ve a **https://platform.openai.com/account/billing/overview**
2. Comprueba que tienes créditos o que el pago está activo
3. Verifica el límite de uso en **Usage limits**

> **Nota:** Cada mensaje cuesta ~$0.001 USD con GPT-4o-mini. Con 100 mensajes/día = ~$3/día.

---

## 🔐 PASO 2: AGREGAR OPENAI API KEY A SUPABASE (5 minutos)

### 2.1 Ir a Supabase Console

1. Ve a **https://app.supabase.com**
2. Selecciona tu proyecto (ej: "annly-reserve")
3. En el menú izquierdo, ve a **Settings** → **Secrets and Vault** (o **Secrets**)

### 2.2 Crear el Secret

1. Click en **"+ New secret"**
2. **Name:** `OPENAI_API_KEY`
3. **Value:** Pega la clave de OpenAI que copiaste (ej: `sk-proj-xxx...`)
4. Click **"Save"**

### 2.3 Verificar que se guardó

```
✅ OPENAI_API_KEY = sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 📱 PASO 3: CONFIGURAR EVOLUTION API (WhatsApp Gateway)

### Opción A: Evolution API GRATIS (Recomendado para test)

#### 3.1 Crear una instancia gratuita

1. Ve a **https://app.evolution-api.com** (o tu instancia local)
2. Crea una cuenta o inicia sesión
3. Haz click en **"Create Instance"** / **"Nueva Instancia"**
4. Nombre: `barberia-ia-test` (cualquier nombre)
5. Click **"Create"**

#### 3.2 Escanear el QR de WhatsApp

1. Abre WhatsApp en tu teléfono
2. Ve a **Configuración** → **Dispositivos conectados** → **Conectar dispositivo**
3. Escanea el **QR que aparece en Evolution API**
4. Confirma el acceso

> ✅ **Ahora WhatsApp está conectado a Evolution API**

#### 3.3 Obtener los datos de conexión

En Evolution API, copia:
- **Instance ID** (ej: `barberia-ia-test`)
- **API Token** (token largo que comienza con `eyJ...`)
- **API URL** (generalmente: `https://api.evolution-api.com` o tu URL local)

**Ejemplo:**
```
Instance ID:  barberia-ia-test
API Token:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
API URL:      https://api.evolution-api.com
```

### Opción B: Evolution API PAGO (Para producción)

Si quieres usar WhatsApp oficial (no simulado):

1. Contrata a **Evolution API** en **https://evolution-api.com**
2. O usa **Twilio** en **https://www.twilio.com** (más caro)
3. O usa **Meta Business Suite** para WhatsApp oficial

> Para este guide usaremos Evolution API (opción gratuita de test es suficiente)

---

## 💾 PASO 4: GUARDAR DATOS DE WHATSAPP EN SUPABASE

### 4.1 En el Dashboard de Annly

1. Abre tu app en **http://localhost:5173** (o producción)
2. Inicia sesión como dueño de barbería
3. Ve a **Dashboard** → **Asistente IA**

### 4.2 Rellenar los campos

```
🤖 CONFIGURACIÓN DE IA:

1. Enlace de Reservas:
   https://annly-reserve.netlify.app/book/tu-slug-barberia

2. Prompt personalizado:
   (Dejar el que viene por defecto o customizar)

3. Personalidad del bot:
   "quick" (rápido y directo)

4. Oferta activa:
   (ej: "Primer corte con 20% descuento")

5. Activar auto-horario:
   ✓ Sí (para que funcione solo de 9am-6pm)

6. Horario inicio: 09:00
   Horario fin: 18:00

7. Anti-colisión:
   ✓ Sí (evita responder si estás escribiendo)
```

### 4.3 Guardar configuración

Click en **"Guardar Configuración"** → **Debería aparecer "✨ Configuración guardada"**

---

## 🔗 PASO 5: CONECTAR EVOLUTION API A SUPABASE (5 minutos)

### 5.1 En la tabla `businesses` de Supabase

1. Ve a **https://app.supabase.com** → tu proyecto
2. Menú izquierdo: **SQL Editor**
3. Crea un nuevo query y pega esto (reemplaza con tus datos):

```sql
UPDATE businesses
SET 
  whatsapp_instance_id = 'barberia-ia-test',
  whatsapp_gateway_url = 'https://api.evolution-api.com',
  whatsapp_instance_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  whatsapp_bot_active = true,
  whatsapp_bot_prompt = 'Eres un asistente amable de la barbería. Tu objetivo es ayudar al cliente a reservar una cita.',
  whatsapp_booking_link = 'https://annly-reserve.netlify.app/book/tu-slug'
WHERE slug = 'tu-slug-barberia';
```

4. Click **"Run"** → **Success**

### 5.2 Verificar que se guardó

```sql
SELECT 
  name,
  whatsapp_instance_id,
  whatsapp_bot_active,
  whatsapp_booking_link
FROM businesses
WHERE slug = 'tu-slug-barberia';
```

Debería mostrar tus datos.

---

## 🔄 PASO 6: DESPLEGAR LA FUNCIÓN A PRODUCCIÓN

### 6.1 Ir a tu carpeta del proyecto

```bash
cd c:\Users\loann\annly-reserve
```

### 6.2 Desplegar la función de Supabase

```bash
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

Output esperado:
```
✓ Deploying...
✓ Successfully deployed function whatsapp-webhook
✓ Function URL: https://xxxxx.functions.supabase.co/whatsapp-webhook
```

### 6.3 Obtener la URL de la función

La URL es: `https://xxxxx.functions.supabase.co/whatsapp-webhook`

**Cópiala, la necesitarás en el siguiente paso.**

---

## 🪝 PASO 7: CONFIGURAR WEBHOOK EN EVOLUTION API

### 7.1 En Evolution API Dashboard

1. Ve a tu instancia en **https://app.evolution-api.com**
2. Busca **Webhooks** o **Settings** → **Webhooks**
3. Click en **"Add Webhook"** o **"Nuevo Webhook"**

### 7.2 Rellenar el formulario

```
📌 WEBHOOK CONFIGURATION:

URL:      https://xxxxx.functions.supabase.co/whatsapp-webhook
(La URL que obtuviste en 6.3)

Events:   ✓ messages
          ✓ message_ack
          (Al menos "messages")

Active:   ✓ Sí
```

### 7.3 Guardar

Click **"Save"** o **"Guardar"**

> ✅ **Ahora Evolution API enviará todos los mensajes de WhatsApp a tu función de Supabase**

---

## 🧪 PASO 8: PROBAR LA IA (5 minutos)

### 8.1 Opción A: Test con Evolution API (Recomendado)

1. Abre WhatsApp (el que conectaste en el Paso 3)
2. Envía un mensaje a tu número desde otro teléfono/Telegram
3. **Ejemplos para probar:**

```
Cliente envía:     "¿Cuál es el precio del corte?"
IA responde:       (Debería responder con precios reales de servicios)

Cliente envía:     "¿Tienes disponibilidad mañana?"
IA responde:       (Debería listar horarios de mañana)

Cliente envía:     "Quiero una cita a las 10am"
IA responde:       (Debería confirmar y enviar link de reserva)
```

### 8.2 Verificar logs

1. Ve a **Supabase** → **SQL Editor**
2. Ejecuta:

```sql
SELECT * FROM bot_message_logs
ORDER BY created_at DESC
LIMIT 5;
```

Deberías ver tus mensajes registrados.

### 8.3 Opción B: Test en el Dashboard

1. En **Dashboard** → **Asistente IA**
2. Busca **"Simulador de Chat"** (si está implementado)
3. Escribe un mensaje de prueba
4. Verifica que la IA responda

---

## ✅ CHECKLIST DE ACTIVACIÓN

```
Fase 1: Configuración (10 min)
  ✓ OpenAI API Key obtenida
  ✓ Secret OPENAI_API_KEY agregado en Supabase
  ✓ Datos guardados en tabla businesses

Fase 2: Evolution API (10 min)
  ✓ Cuenta creada en Evolution API
  ✓ QR escaneado en WhatsApp
  ✓ Webhook configurado

Fase 3: Deployment (5 min)
  ✓ Función deployada: supabase functions deploy whatsapp-webhook
  ✓ Webhook agregado en Evolution API

Fase 4: Testing (10 min)
  ✓ Mensaje de test enviado desde WhatsApp
  ✓ Respuesta de IA recibida
  ✓ Logs verificados en Supabase
```

---

## 🔧 TROUBLESHOOTING

### Problema: "OpenAI API Key not found"

**Solución:**
```bash
# 1. Verifica que el secret existe en Supabase
supabase secrets list

# 2. Si no aparece, agrégalo:
supabase secrets set OPENAI_API_KEY=sk-proj-xxxxx

# 3. Redeploy:
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

### Problema: "No response from IA"

**Solución:**
1. Verifica que `whatsapp_bot_active = true` en la tabla businesses
2. Verifica que la función se deployó correctamente
3. Revisa logs de Supabase: **Functions** → **whatsapp-webhook** → **Logs**

### Problema: "Webhook no recibe mensajes"

**Solución:**
1. Verifica que el webhook está registrado en Evolution API
2. Comprueba que la URL es correcta (sin espacios)
3. Verifica que WhatsApp está conectado (escanea el QR nuevamente)

### Problema: "IA responde pero con horarios incorrectos"

**Solución:**
1. Verifica que los horarios (schedules) están bien configurados en el Dashboard
2. Verifica que las citas no bloquean los horarios (appointments)
3. Ejecuta el SQL de actualización de schedules correctamente

---

## 💡 TIPS FINALES

### Para producción:
1. Usa Evolution API PAGO o Meta Official WhatsApp API
2. Configura HTTPS webhook
3. Agrega verificación de firma (HMAC) más robusta
4. Implementa rate limiting más estricto
5. Monitorea costos de OpenAI

### Para maximizar efectividad:
1. Personaliza el prompt según el estilo de tu barbería
2. Mantén actualizado el catálogo de servicios
3. Revisa logs regularmente para mejorar respuestas
4. Entrena a clientes sobre cómo usar el bot

### Para ahorrar costos:
1. Limita a 50 mensajes/día si es beta
2. Usa GPT-3.5 Turbo en vez de GPT-4o-mini (más barato)
3. Implementa caching de respuestas frecuentes

---

## 📞 SOPORTE

Si tienes problemas:
1. Revisa los logs en **Supabase** → **Functions** → **Logs**
2. Verifica el estado del webhook en **Evolution API**
3. Prueba manualmente en **SQL Editor** de Supabase

**Comando para ver errores:**
```sql
-- Ver los últimos errores de función
SELECT 
  execution_id,
  status,
  error_message,
  created_at
FROM pg_stat_statements
WHERE function_name = 'whatsapp-webhook'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 SIGUIENTE PASO

Una vez que la IA funcione:
1. Personaliza el prompt para tu barbería
2. Configura horarios específicos
3. Agrega servicios con precios reales
4. Entrena al bot con conversaciones reales
5. Monitorea métricas en el dashboard

**¡Listo! Tu barbería ahora tiene un asistente de IA automático en WhatsApp! 🚀**
