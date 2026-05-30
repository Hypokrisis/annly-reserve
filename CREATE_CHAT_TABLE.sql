-- ═══════════════════════════════════════════════════════════════════════════════
-- 🗄️  SQL: CREAR TABLA PARA HISTORIAL DE CHAT
-- 
-- PROPÓSITO: Almacenar conversaciones y mensajes en Supabase
-- - Cada conversación tiene un ID único
-- - Los mensajes se guardan como JSONB (estructura flexible)
-- - Auto-timestamps para created_at y updated_at
-- ═══════════════════════════════════════════════════════════════════════════════

-- Crear tabla
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relaciones
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Datos
  title VARCHAR(255) DEFAULT 'Nueva conversación',
  
  -- JSONB para guardar el historial de mensajes
  -- Estructura:
  -- [
  --   {
  --     "sender": "user",
  --     "text": "¿Cuál es el precio?",
  --     "timestamp": "2026-05-27T14:30:00Z"
  --   },
  --   {
  --     "sender": "ai",
  --     "text": "El corte cuesta $20...",
  --     "timestamp": "2026-05-27T14:30:05Z"
  --   }
  -- ]
  messages JSONB DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────────────────
-- ÍNDICES para búsquedas rápidas
-- ───────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS chat_conversations_business_id_idx 
  ON chat_conversations(business_id);

CREATE INDEX IF NOT EXISTS chat_conversations_user_id_idx 
  ON chat_conversations(user_id);

CREATE INDEX IF NOT EXISTS chat_conversations_updated_at_idx 
  ON chat_conversations(updated_at DESC);

-- ───────────────────────────────────────────────────────────────────────────────
-- RLS (Row Level Security) - Opcional pero recomendado
-- ───────────────────────────────────────────────────────────────────────────────
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo ven sus propias conversaciones
CREATE POLICY "Users can see their own conversations"
  ON chat_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios solo pueden crear conversaciones propias
CREATE POLICY "Users can create their own conversations"
  ON chat_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios solo pueden actualizar sus propias conversaciones
CREATE POLICY "Users can update their own conversations"
  ON chat_conversations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Los usuarios solo pueden eliminar sus propias conversaciones
CREATE POLICY "Users can delete their own conversations"
  ON chat_conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INSTRUCCIONES:
-- 
-- 1. Ve a: Supabase Console → SQL Editor
-- 2. Click: "New Query"
-- 3. Copia TODO este contenido
-- 4. Pega en el SQL Editor
-- 5. Click: "Run" (botón verde)
-- 6. Verifica que aparezca: "Success. No rows returned"
-- 
-- 7. Verificar:
--    - Ve a: Table Editor (menú izquierdo)
--    - Deberías ver la tabla: chat_conversations
-- ═══════════════════════════════════════════════════════════════════════════════
