import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const extractText = (response: any) => {
  const candidate = response?.candidates?.[0];
  if (!candidate) return '';

  const content = candidate.output?.[0]?.content ?? candidate.content ?? [];
  if (Array.isArray(content)) {
    const textBlock = content.find((block: any) => typeof block.text === 'string' && block.text.length > 0);
    if (textBlock) return textBlock.text;
  }

  return candidate.text || candidate.output?.[0]?.text || '';
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🤖 NETLIFY FUNCTION: chat.ts
// 
// PROPÓSITO: Backend seguro que maneja:
// 1. API KEY de Google (oculta en servidor)
// 2. Llamadas a Google Generative Language API
// 3. Guardar historial en Supabase
//
// ARQUITECTURA:
// Frontend (React) → Netlify Function (Backend) → Google AI + Supabase
// ═══════════════════════════════════════════════════════════════════════════════

const handler: Handler = async (event) => {
  // Permitir solo POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Headers CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: 'OK',
    };
  }

  try {
    // ═══════════════════════════════════════════════════════════════
    // 1️⃣  PARSEAR REQUEST DEL FRONTEND
    // ═══════════════════════════════════════════════════════════════
    const { message, conversationId, businessId, userId } = JSON.parse(event.body || '{}');

    if (!message || !message.trim()) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Message is required' }),
      };
    }

    if (!businessId || !userId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'businessId and userId are required' }),
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // 2️⃣  INICIALIZAR GOOGLE GEMINI
    // ═══════════════════════════════════════════════════════════════
    const googleApiKey = process.env.GOOGLE_AI_API_KEY;
    if (!googleApiKey) {
      console.error('❌ GOOGLE_AI_API_KEY not configured in Netlify secrets');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'AI API not configured. Please add GOOGLE_AI_API_KEY to Netlify secrets.' 
        }),
      };
    }

    const genAI = new GoogleGenerativeAI(googleApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // ═══════════════════════════════════════════════════════════════
    // 3️⃣  INICIALIZAR SUPABASE
    // ═══════════════════════════════════════════════════════════════
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials not found');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Database credentials not configured' }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ═══════════════════════════════════════════════════════════════
    // 4️⃣  CARGAR HISTORIAL DE LA CONVERSACIÓN
    // ═══════════════════════════════════════════════════════════════
    let conversationMessages: Array<{
      sender: 'user' | 'ai';
      text: string;
      timestamp: string;
    }> = [];
    let newConversationId = conversationId;

    if (conversationId) {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('messages')
        .eq('id', conversationId)
        .single();

      if (error) {
        console.warn(`⚠️  Could not fetch conversation ${conversationId}:`, error);
        // No fallar si no existe, solo crear nueva
      } else if (data?.messages && Array.isArray(data.messages)) {
        conversationMessages = data.messages;
      }
    }

    const systemPrompt = `Eres un asistente de barbería muy servicial y amigable.

INSTRUCCIONES:
1. Responde SIEMPRE en español
2. Sé conciso y directo (máx 2-3 párrafos)
3. Si preguntan por servicios o precios, ofrece reservar
4. Usa emojis ocasionalmente (✂️, 💈, ✨)
5. NUNCA inventes información
6. Si no sabes, ofrece el enlace de reserva

OBJETIVO: Convertir preguntas en reservas de citas.`;

    const chatPrompt = `${systemPrompt}\n\nCliente dice: "${message}"`;
    const googleModel = process.env.GOOGLE_AI_MODEL || 'text-bison-001';
    const aiEndpoint = `https://generativelanguage.googleapis.com/v1beta2/models/${encodeURIComponent(
      googleModel,
    )}:generate`;

    const response = await fetch(aiEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${googleApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: {
          text: chatPrompt,
        },
        temperature: 0.7,
        maxOutputTokens: 500,
        topP: 0.95,
      }),
    });

    const aiPayload = await response.json();
    if (!response.ok) {
      console.error('❌ Google AI response error:', aiPayload);
      throw new Error(aiPayload.error?.message || 'Google AI failed to generate a response');
    }

    const aiResponse = extractText(aiPayload) || 'Lo siento, no pude generar una respuesta en este momento.';

    if (!aiResponse) {
      throw new Error('No response from AI model');
    }

    // ═══════════════════════════════════════════════════════════════
    // 9️⃣  GUARDAR MENSAJES EN SUPABASE
    // ═══════════════════════════════════════════════════════════════
    const timestamp = new Date().toISOString();

    const updatedMessages = [
      ...conversationMessages,
      { sender: 'user' as const, text: message, timestamp },
      { sender: 'ai' as const, text: aiResponse, timestamp },
    ];

    if (newConversationId) {
      // ACTUALIZAR conversación existente
      const { error: updateError } = await supabase
        .from('chat_conversations')
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', newConversationId);

      if (updateError) {
        console.error('❌ Error updating conversation:', updateError);
        // Continuar de todos modos, solo avisar en logs
      }
    } else {
      // CREAR nueva conversación
      const { data, error: insertError } = await supabase
        .from('chat_conversations')
        .insert({
          business_id: businessId,
          user_id: userId,
          messages: updatedMessages,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('❌ Error creating conversation:', insertError);
        // Continuar de todos modos
      } else if (data) {
        newConversationId = data.id;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔟 RETORNAR RESPUESTA AL FRONTEND
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
    console.error('💥 Fatal error in chat function:', error);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }),
    };
  }
};

export { handler };
