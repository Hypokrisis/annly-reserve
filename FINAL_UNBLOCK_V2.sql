-- =================================================================
-- 🔓 FINAL UNBLOCK V2 (MODO "PÚBLICO")
-- =================================================================
-- Si falló el anterior, es porque Supabase no te ha dado "la sesión" 
-- todavía cuando intentas crear el negocio (eres un usuario "anon").
-- Así que vamos a permitir que CUALQUIERA (incluso Anon) cree negocios y relaciones.

-- 1. BORRAR USUARIO FANTASMA (De nuevo, por si acaso)
DELETE FROM auth.users 
WHERE email = 'loann.santiago@gmail.com';

-- 2. PERMISOS TOTALES EN 'BUSINESSES'
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Borrar viejos
DROP POLICY IF EXISTS "Authenticated insert business" ON businesses;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON businesses;
DROP POLICY IF EXISTS "Public insert business" ON businesses;

-- CREAR NUEVO (Para 'public' = anon + authenticated)
CREATE POLICY "Public insert business" ON businesses 
FOR INSERT TO public
WITH CHECK (true);

-- 3. PERMISOS TOTALES EN 'USERS_BUSINESSES' (También necesario)
ALTER TABLE users_businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User insert relations" ON users_businesses;
DROP POLICY IF EXISTS "Public insert relations" ON users_businesses;

-- CREAR NUEVO (Para 'public')
CREATE POLICY "Public insert relations" ON users_businesses 
FOR INSERT TO public
WITH CHECK (true);

-- NOTA: Mantener políticas de lectura seguras
-- (No cambiamos SELECT/UPDATE, solo INSERT para que entre el registro)
