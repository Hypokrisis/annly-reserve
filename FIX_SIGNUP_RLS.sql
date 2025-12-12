-- =================================================================
-- 🐣 FIX SIGNUP RLS (Permitir Crear Negocio)
-- =================================================================
-- El error "new row violates row-level security" ocurre porque 
-- la política anterior no era explícita para INSERTs nuevos.

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- 1. Asegurar politica explícita de INSERT
DROP POLICY IF EXISTS "Authenticated insert business" ON businesses;

CREATE POLICY "Authenticated insert business" ON businesses FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- 2. Asegurar politica explicita de UPDATE (por si acaso)
DROP POLICY IF EXISTS "Owner update business" ON businesses;
CREATE POLICY "Owner update business" ON businesses FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- 3. Asegurar politica explicita de DELETE
DROP POLICY IF EXISTS "Owner delete business" ON businesses;
CREATE POLICY "Owner delete business" ON businesses FOR DELETE
USING (auth.uid() = owner_id);

-- 4. Asegurar politica explicita de SELECT (Owner)
DROP POLICY IF EXISTS "Owner select business" ON businesses;
CREATE POLICY "Owner select business" ON businesses FOR SELECT
USING (auth.uid() = owner_id);

-- (Mantener la de Public View separada que ya teniamos en el master reset)
