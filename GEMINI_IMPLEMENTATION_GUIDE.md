═══════════════════════════════════════════════════════════════════════════════════
   🤖 IMPLEMENTAR GOOGLE GEMINI GRATIS (15 req/min, 1500/día)
═══════════════════════════════════════════════════════════════════════════════════

VENTAJAS vs OpenAI:
✅ Completamente GRATIS (no pide tarjeta de crédito)
✅ 15 peticiones por MINUTO
✅ 1,500 peticiones por DÍA
✅ Modelo Gemini 1.5 Flash (rápido y potente)
✅ Sin límite de tiempo (perpetuo)
❌ OpenAI cuesta $0.001 por mensaje

DESVENTAJAS:
⚠️  Límite de tasa (pero suficiente para MVP)
⚠️  Requiere Google Account


═══════════════════════════════════════════════════════════════════════════════════
PASO 1: OBTENER API KEY DE GOOGLE GEMINI (2 minutos)
═══════════════════════════════════════════════════════════════════════════════════

1.1 Ir a Google AI Studio
──────────────────────────
URL: https://aistudio.google.com

1.2 Iniciar sesión
──────────────────
Si no tienes Google Account:
→ Crea una en https://accounts.google.com

1.3 Crear API Key
─────────────────
1. En AI Studio, busca: "Get API Key" o "API Keys"
2. Click: "Create API Key" o "New API Key"
3. Selecciona: "Create API Key in new project"
4. **COPIA LA CLAVE** (formato: AIzaSy...)
5. GUARDA EN LUGAR SEGURO

⚠️  IMPORTANTE:
   Esta clave es PRIVADA. No la compartas.
   Solo la usaremos en Netlify Functions (servidor).


═══════════════════════════════════════════════════════════════════════════════════
PASO 2: CREAR TABLA EN SUPABASE PARA HISTORIAL
═══════════════════════════════════════════════════════════════════════════════════

Ve a: Supabase Console → SQL Editor → New Query

Pega este SQL:

```sql
-- Tabla para guardar el historial de chat
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) DEFAULT 'Nueva conversación',
  messages JSONB DEFAULT '[]',
  -- Estructura de messages:
  -- [
  --   { "sender": "user", "text": "Hola", "timestamp": "2026-05-27T..." },
  --   { "sender": "ai", "text": "Hola! Cómo estás?", "timestamp": "2026-05-27T..." },
  --   ...
  -- ]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS chat_conversations_business_id_idx 
  ON chat_conversations(business_id);

CREATE INDEX IF NOT EXISTS chat_conversations_user_id_idx 
  ON chat_conversations(user_id);
```

Click: "Run" → Success ✓


═══════════════════════════════════════════════════════════════════════════════════
PASO 3: GUARDAR API KEY EN SUPABASE SECRETS
═══════════════════════════════════════════════════════════════════════════════════

En Supabase Console:
1. Settings → Secrets and Vault
2. "+ New Secret"
3. Name: GOOGLE_AI_API_KEY
4. Value: (Pega la clave de Google)
5. Save ✓


═══════════════════════════════════════════════════════════════════════════════════
PASO 4: CREAR NETLIFY FUNCTION PARA EL CHAT
═══════════════════════════════════════════════════════════════════════════════════

Crear archivo:
netlify/functions/chat.ts

Contenido:

```typescript
import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { message, conversationId, businessId, userId } = JSON.parse(event.body || '{}');

    if (!message) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Message required' }),
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // 1️⃣  INICIALIZAR GOOGLE GEMINI (API KEY SEGURA EN SERVIDOR)
    // ═══════════════════════════════════════════════════════════════
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'GOOGLE_AI_API_KEY not configured' }),
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // ═══════════════════════════════════════════════════════════════
    // 2️⃣  INICIALIZAR SUPABASE PARA GUARDAR HISTORIAL
    // ═══════════════════════════════════════════════════════════════
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Supabase credentials not found' }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ═══════════════════════════════════════════════════════════════
    // 3️⃣  CARGAR HISTORIAL SI EXISTE
    // ═══════════════════════════════════════════════════════════════
    let conversationMessages: Array<{ sender: string; text: string; timestamp: string }> = [];
    let newConversationId = conversationId;

    if (conversationId) {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('messages')
        .eq('id', conversationId)
        .single();

      if (!error && data?.messages) {
        conversationMessages = data.messages;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 4️⃣  CONSTRUIR HISTORIAL PARA GEMINI
    // ═══════════════════════════════════════════════════════════════
    const geminiHistory = conversationMessages.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    // ═══════════════════════════════════════════════════════════════
    // 5️⃣  LLAMAR A GOOGLE GEMINI CON CONTEXTO
    // ═══════════════════════════════════════════════════════════════
    const systemPrompt = `Eres un asistente servicial para una barbería. 
Tu objetivo es ayudar a los clientes a reservar citas y responder preguntas.
Sé amigable, conciso y siempre sugiere hacer una reserva.
Responde en español.`;

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(systemPrompt + '\n\nCliente: ' + message);
    const aiResponse = result.response.text();

    // ═══════════════════════════════════════════════════════════════
    // 6️⃣  GUARDAR EN SUPABASE
    // ═══════════════════════════════════════════════════════════════
    const timestamp = new Date().toISOString();

    // Agregar nuevos mensajes al historial
    const updatedMessages = [
      ...conversationMessages,
      { sender: 'user', text: message, timestamp },
      { sender: 'ai', text: aiResponse, timestamp },
    ];

    // Guardar o actualizar en BD
    if (newConversationId) {
      // Actualizar conversación existente
      await supabase
        .from('chat_conversations')
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', newConversationId);
    } else {
      // Crear nueva conversación
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          business_id: businessId,
          user_id: userId,
          messages: updatedMessages,
          title: message.substring(0, 50), // Primeras 50 caracteres como título
        })
        .select('id')
        .single();

      if (!error && data) {
        newConversationId = data.id;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 7️⃣  RETORNAR RESPUESTA AL FRONTEND
    // ═══════════════════════════════════════════════════════════════
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        conversationId: newConversationId,
        aiResponse,
        timestamp,
      }),
    };
  } catch (error: any) {
    console.error('Chat function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};

export { handler };
```

═══════════════════════════════════════════════════════════════════════════════════
PASO 5: INSTALAR DEPENDENCIA DE GOOGLE AI
═══════════════════════════════════════════════════════════════════════════════════

En PowerShell (en tu carpeta del proyecto):

npm install @google/generative-ai

Esto agrega la librería de Google Gemini.


═══════════════════════════════════════════════════════════════════════════════════
PASO 6: CREAR COMPONENTE REACT PARA EL CHAT
═══════════════════════════════════════════════════════════════════════════════════

Crear archivo:
src/components/GeminiChatWidget.tsx

Contenido:

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface GeminiChatWidgetProps {
  conversationId?: string;
}

export default function GeminiChatWidget({ conversationId: initialConversationId }: GeminiChatWidgetProps) {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll cuando llega mensaje nuevo
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !business) return;

    const userMessage: Message = {
      sender: 'user',
      text: input,
      timestamp: new Date().toISOString(),
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // ═══════════════════════════════════════════════════════════════
      // LLAMAR NETLIFY FUNCTION (API KEY SEGURA EN SERVIDOR)
      // ═══════════════════════════════════════════════════════════════
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          conversationId,
          businessId: business.id,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en el chat');
      }

      // Guardar ID de conversación si es nueva
      if (!conversationId) {
        setConversationId(data.conversationId);
      }

      // Agregar respuesta de la IA
      const aiMessage: Message = {
        sender: 'ai',
        text: data.aiResponse,
        timestamp: data.timestamp,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage: Message = {
        sender: 'ai',
        text: `Error: ${error.message}. Intenta nuevamente.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* HISTORIAL DE MENSAJES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">
            <p className="text-lg">💬 ¿En qué puedo ayudarte?</p>
            <p className="text-sm mt-2">Haz una pregunta o solicita una reserva</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.sender === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg rounded-bl-none">
              <Loader className="animate-spin w-4 h-4" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div className="border-t p-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Escribe tu pregunta..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Send className="w-4 h-4" />
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
```

═══════════════════════════════════════════════════════════════════════════════════
PASO 7: INTEGRAR EN AIAssistantPage
═══════════════════════════════════════════════════════════════════════════════════

En: src/pages/dashboard/AIAssistantPage.tsx

Reemplaza la sección del simulador con:

```typescript
import GeminiChatWidget from '@/components/GeminiChatWidget';

// Dentro del componente:
<div className="mt-6 bg-gray-50 p-4 rounded-lg">
  <h3 className="text-lg font-semibold mb-3">💬 Chat con Gemini AI</h3>
  <div className="h-96 border border-gray-200 rounded-lg overflow-hidden">
    <GeminiChatWidget />
  </div>
</div>
```

═══════════════════════════════════════════════════════════════════════════════════
PASO 8: DESPLEGAR A NETLIFY
═══════════════════════════════════════════════════════════════════════════════════

En PowerShell:

```bash
# 1. Asegúrate de que los cambios están en git
git add .
git commit -m "Add Google Gemini chat integration"

# 2. Push a GitHub
git push origin main

# 3. Netlify automáticamente:
# - Detecta el archivo en netlify/functions/chat.ts
# - Lo compila
# - Lo despliega
```

Netlify verá automáticamente:
✓ netlify/functions/chat.ts
✓ Las dependencias en package.json

El secret GOOGLE_AI_API_KEY se sincronizará desde Supabase.


═══════════════════════════════════════════════════════════════════════════════════
PASO 9: OBTENER HISTORIAL DE CHAT EN EL DASHBOARD
═══════════════════════════════════════════════════════════════════════════════════

Hook personalizado:
src/hooks/useChatHistory.ts

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient';

export const useChatHistory = (businessId?: string) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId) return;

    const fetchConversations = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('id, title, created_at, updated_at')
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false });

      if (!error) {
        setConversations(data || []);
      }
      setLoading(false);
    };

    fetchConversations();
  }, [businessId]);

  return { conversations, loading };
};
```

═══════════════════════════════════════════════════════════════════════════════════
FLUJO VISUAL FINAL
═══════════════════════════════════════════════════════════════════════════════════

┌─────────────────┐
│  Usuario (UI)   │
│  React Component│
└────────┬────────┘
         │ Escribe: "¿Cuál es el precio?"
         │
         ▼
┌──────────────────────────────┐
│ GeminiChatWidget Component   │
│ (src/components/)            │
│                              │
│ fetch('/.netlify/functions/chat', {
│   body: { message, conversationId }
│ })
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ NETLIFY FUNCTION (SERVIDOR)  │
│ netlify/functions/chat.ts    │
│                              │
│ 🔐 API KEY SEGURA EN SERVIDOR
│ (NUNCA en el navegador)
└────────┬─────────────────────┘
         │
         ├──────────────────────────────┐
         │                              │
         ▼                              ▼
    ┌──────────────────┐          ┌──────────────────┐
    │ Google Gemini    │          │ Supabase         │
    │ 1.5 Flash        │          │ Guardar          │
    │ (IA Generativa)  │          │ Historial (JSONB)│
    └────────┬─────────┘          └──────────────────┘
             │
             └──────────────────────────┐
                                        │
         ┌──────────────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Respuesta JSON               │
│ {                            │
│   aiResponse: "El corte...", │
│   conversationId: "uuid...", │
│   timestamp: "2026-05-27..."│
│ }
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ React muestra respuesta       │
│ en el chat UI                │
└──────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════════
CHECKIST FINAL
═══════════════════════════════════════════════════════════════════════════════════

☐ Google AI API Key obtenida (AIzaSy...)
☐ API Key en Supabase Secrets (GOOGLE_AI_API_KEY)
☐ Tabla chat_conversations creada en Supabase
☐ npm install @google/generative-ai
☐ netlify/functions/chat.ts creado
☐ GeminiChatWidget.tsx creado
☐ Integrado en AIAssistantPage
☐ Código pusheado a GitHub
☐ Netlify deployment completado
☐ GOOGLE_AI_API_KEY sincronizado en Netlify
☐ Test: Escribir mensaje en chat UI
☐ ✅ Respuesta de Gemini aparece


═══════════════════════════════════════════════════════════════════════════════════
COSTOS
═══════════════════════════════════════════════════════════════════════════════════

Google Gemini:      $0/mes (GRATIS, 1500 req/día)
Supabase:           $0/mes (free tier)
Netlify:            $0/mes (free tier)

TOTAL:              $0 🎉


═══════════════════════════════════════════════════════════════════════════════════
LIMITACIONES Y CÓMO EVITARLAS
═══════════════════════════════════════════════════════════════════════════════════

1. Rate Limiting: 15 req/min (suficiente para MVP)
   ✓ Mostrar "espera..." entre mensajes
   ✓ No enviar mensajes vacíos

2. Contexto limitado: Gemini recuerda últimos 32K tokens (~8000 palabras)
   ✓ Enviar solo historial reciente (últimos 10 mensajes)

3. Sin embeddings: No hay búsqueda semántica
   ✓ Para MVP, no necesitas (es simple chat)

4. Modelos gratuitos pueden ser menos precisos
   ✓ Para barbería: "¿Precio del corte?" funciona perfecto


═══════════════════════════════════════════════════════════════════════════════════
PRÓXIMOS PASOS DESPUÉS
═══════════════════════════════════════════════════════════════════════════════════

1. ✅ Chat básico funciona
   ↓
2. Agregar persistencia (cargar chats antiguos)
   ↓
3. Agregar búsqueda en historial
   ↓
4. Exportar conversación a PDF
   ↓
5. Integrar con WhatsApp (el webhook anterior)
   ↓
6. Análisis de sentimiento (feliz/triste/confundido)
   ↓
7. Sugerencias automáticas ("¿Reservar?", "Llamar?")


═══════════════════════════════════════════════════════════════════════════════════
