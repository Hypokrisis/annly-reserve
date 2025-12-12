-- =================================================================
-- FIX: Permitir que CUALQUIERA vea los negocios activos
-- Problema actual: Solo el DUEÑO puede ver su negocio. 
-- El cliente (público) recibe "Negocio no encontrado".
-- =================================================================

-- 1. Eliminar política anterior si existe (para evitar duplicados)
DROP POLICY IF EXISTS "Public businesses are viewable by everyone" ON businesses;

-- 2. Crear la política que abre la puerta al público
CREATE POLICY "Public businesses are viewable by everyone" ON businesses
  FOR SELECT 
  USING (is_active = true);

-- Información para el usuario:
-- Ejecuta esto en el "SQL Editor" de tu panel de Supabase.
-- Una vez ejecutado, la página de reservas `/book/...` funcionará inmediatamente.
