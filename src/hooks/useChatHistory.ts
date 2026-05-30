import { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient';

// ═══════════════════════════════════════════════════════════════════════════════
// 🎣 CUSTOM HOOK: useChatHistory.ts
//
// PROPÓSITO: Cargar historial de conversaciones de Supabase
// - Obtiene todas las conversaciones del negocio
// - Obtiene mensajes de una conversación específica
// - Eliminar conversación
// ═══════════════════════════════════════════════════════════════════════════════

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: Array<{ sender: 'user' | 'ai'; text: string; timestamp: string }>;
}

export const useChatHistory = (businessId?: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────
  // CARGAR LISTA DE CONVERSACIONES
  // ─────────────────────────────────────────────────────────────────
  const fetchConversations = async () => {
    if (!businessId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('chat_conversations')
        .select('id, title, created_at, updated_at')
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;
      setConversations(data || []);
    } catch (err: any) {
      console.error('❌ Error fetching conversations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // CARGAR MENSAJES DE UNA CONVERSACIÓN ESPECÍFICA
  // ─────────────────────────────────────────────────────────────────
  const fetchConversation = async (conversationId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (fetchError) throw fetchError;
      return data as Conversation;
    } catch (err: any) {
      console.error('❌ Error fetching conversation:', err);
      throw err;
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // ELIMINAR CONVERSACIÓN
  // ─────────────────────────────────────────────────────────────────
  const deleteConversation = async (conversationId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId);

      if (deleteError) throw deleteError;

      // Actualizar lista localmente
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    } catch (err: any) {
      console.error('❌ Error deleting conversation:', err);
      throw err;
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // AUTO-FETCH AL CAMBIAR businessId
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchConversations();
  }, [businessId]);

  return {
    conversations,
    loading,
    error,
    fetchConversations,
    fetchConversation,
    deleteConversation,
  };
};
