import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 COMPONENTE: GeminiChatWidget.tsx
//
// PROPÓSITO: UI del chat que se comunica con Netlify Function
// - Envía mensajes del usuario
// - Recibe respuestas de Gemini AI
// - Guarda historial en Supabase (via Netlify)
// - Auto-scroll a últimos mensajes
// ═══════════════════════════════════════════════════════════════════════════════

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface GeminiChatWidgetProps {
  conversationId?: string;
  onConversationChange?: (id: string) => void;
}

export default function GeminiChatWidget({
  conversationId: initialConversationId,
  onConversationChange,
}: GeminiChatWidgetProps) {
  // ═══════════════════════════════════════════════════════════════
  // ESTADO
  // ═══════════════════════════════════════════════════════════════
  const { user } = useAuth();
  const { business } = useBusiness();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ═══════════════════════════════════════════════════════════════
  // AUTO-SCROLL A ÚLTIMO MENSAJE
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ═══════════════════════════════════════════════════════════════
  // CUANDO CAMBIA EL ID DE CONVERSACIÓN INICIAL
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (initialConversationId && initialConversationId !== conversationId) {
      setConversationId(initialConversationId);
      // Cargar historial de esa conversación (TODO: implementar)
    }
  }, [initialConversationId]);

  // ═══════════════════════════════════════════════════════════════
  // ENVIAR MENSAJE AL BACKEND
  // ═══════════════════════════════════════════════════════════════
  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!input.trim()) return;
    if (!user || !business) {
      setError('Usuario o negocio no encontrado');
      return;
    }

    // ──────────────────────────────────────────────────────────────
    // 1️⃣  AGREGAR MENSAJE DEL USUARIO LOCALMENTE
    // ──────────────────────────────────────────────────────────────
    const userMessage: Message = {
      sender: 'user',
      text: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      // ──────────────────────────────────────────────────────────────
      // 2️⃣  LLAMAR A NETLIFY FUNCTION (BACKEND SEGURO)
      // ──────────────────────────────────────────────────────────────
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          conversationId,
          businessId: business.id,
          userId: user.id,
        }),
      });

      const data = await response.json();

      // ──────────────────────────────────────────────────────────────
      // 3️⃣  MANEJAR ERROR DE RESPUESTA
      // ──────────────────────────────────────────────────────────────
      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }

      // ──────────────────────────────────────────────────────────────
      // 4️⃣  GUARDAR ID DE CONVERSACIÓN SI ES NUEVA
      // ──────────────────────────────────────────────────────────────
      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
        if (onConversationChange) {
          onConversationChange(data.conversationId);
        }
      }

      // ──────────────────────────────────────────────────────────────
      // 5️⃣  AGREGAR RESPUESTA DE LA IA
      // ──────────────────────────────────────────────────────────────
      const aiMessage: Message = {
        sender: 'ai',
        text: data.aiResponse,
        timestamp: data.timestamp,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('❌ Chat error:', err);

      // Mostrar mensaje de error
      const errorMsg: Message = {
        sender: 'ai',
        text: `⚠️ Error: ${err.message}. Intenta nuevamente.`,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMsg]);
      setError(err.message);
    } finally {
      setLoading(false);
      // Focus en input para continuar escribiendo
      inputRef.current?.focus();
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full bg-space-card rounded-lg shadow-card border border-space-border overflow-hidden">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-space-primary to-space-primary-dark text-white p-4">
        <h3 className="font-semibold flex items-center gap-2">
          <span className="text-lg">🤖</span>
          Gemini AI Chat
        </h3>
        <p className="text-sm opacity-90 mt-1">Conectado a Google Gemini 1.5 Flash (GRATIS)</p>
      </div>

      {/* MENSAJES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-space-card2">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-space-text font-medium">¿En qué puedo ayudarte?</p>
            <p className="text-space-muted text-sm mt-2">
              Pregunta sobre servicios, precios, horarios o reserva una cita
            </p>
          </div>
        )}

        {/* MOSTRAR MENSAJES */}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex animate-fade-in ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-space-primary text-white rounded-br-none'
                  : 'bg-space-card text-space-text border border-space-border rounded-bl-none'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
              <p
                className={`text-xs mt-1 ${
                  msg.sender === 'user' ? 'opacity-70 text-space-card2' : 'opacity-60 text-space-muted'
                }`}
              >
                {new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {/* INDICADOR DE CARGA */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-space-card border border-space-border text-space-text px-4 py-2 rounded-lg rounded-bl-none flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm">Pensando...</span>
            </div>
          </div>
        )}

        {/* REF PARA SCROLL */}
        <div ref={messagesEndRef} />
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* INPUT */}
      <form onSubmit={sendMessage} className="border-t border-space-border bg-space-card p-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta..."
            disabled={loading}
            className="flex-1 px-4 py-2 border border-space-border rounded-lg focus:outline-none focus:ring-2 focus:ring-space-primary focus:border-transparent disabled:bg-space-card2 disabled:cursor-not-allowed transition text-sm"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Enviar</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* FOOTER INFO */}
      <div className="bg-space-card2 border-t border-space-border px-4 py-2 text-center text-xs text-space-muted">
        💡 Powered by Google Gemini 1.5 Flash | Límite: 15 req/min
      </div>
    </div>
  );
}
