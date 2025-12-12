-- =================================================================
-- 🚀 FINAL UNBLOCK (VERSIÓN PERMISIVA)
-- =================================================================

-- 1. BORRAR USUARIO FANTASMA (Para evitar "User already registered")
DELETE FROM auth.users 
WHERE email = 'loann.santiago@gmail.com';

-- 2. ARREGLAR ERROR ROJO (RLS) - MODO PERMISIVO
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Borrar politicas que puedan estar molestando
DROP POLICY IF EXISTS "Authenticated insert business" ON businesses;
DROP POLICY IF EXISTS "Owner manage businesses" ON businesses;
DROP POLICY IF EXISTS "Owner select business" ON businesses;
DROP POLICY IF EXISTS "Owner update business" ON businesses;
DROP POLICY IF EXISTS "Owner delete business" ON businesses;
DROP POLICY IF EXISTS "Public view businesses" ON businesses;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON businesses;

-- PERMISO DE INSERCIÓN TOTAL PARA USUARIOS LOGUEADOS
-- USAMOS 'true' PARA EVITAR PROBLEMAS DE SETUP DE SESIÓN
CREATE POLICY "Enable insert for authenticated users only" ON businesses 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- Permisos de Owner (Resto de operaciones)
CREATE POLICY "Owner select business" ON businesses FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Owner update business" ON businesses FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Owner delete business" ON businesses FOR DELETE
USING (auth.uid() = owner_id);

-- Permiso Público (Ver activos)
CREATE POLICY "Public view businesses" ON businesses FOR SELECT 
USING (is_active = true);
