-- NUCLEAR RLS FIX
-- Objetivo: Separar tajantemente permisos Públicos (Lectura) vs Owner (Escritura)
-- Evita errores 'PGRST116' y '401 Unauthorized' para siempre.

-- 1. BUSINESSES
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active businesses" ON businesses;
CREATE POLICY "Public can view active businesses"
ON businesses FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Owner can select businesses" ON businesses;
CREATE POLICY "Owner can select businesses"
ON businesses FOR SELECT
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owner can insert businesses" ON businesses;
CREATE POLICY "Owner can insert businesses"
ON businesses FOR INSERT
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owner can update businesses" ON businesses;
CREATE POLICY "Owner can update businesses"
ON businesses FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owner can delete businesses" ON businesses;
CREATE POLICY "Owner can delete businesses"
ON businesses FOR DELETE
USING (auth.uid() = owner_id);


-- 2. SERVICES
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view services" ON services;
CREATE POLICY "Public view services" ON services 
FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Owner manage services" ON services;
CREATE POLICY "Owner manage services" ON services 
FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));


-- 3. BARBERS
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view barbers" ON barbers;
CREATE POLICY "Public view barbers" ON barbers 
FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Owner manage barbers" ON barbers;
CREATE POLICY "Owner manage barbers" ON barbers 
FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- 4. BARBERS_SERVICES (Esta fallaba a veces)
ALTER TABLE barbers_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view barber_services" ON barbers_services;
CREATE POLICY "Public view barber_services" ON barbers_services 
FOR SELECT USING (true); -- Es solo una tabla de relación, seguro leerla

DROP POLICY IF EXISTS "Owner manage barber_services" ON barbers_services;
CREATE POLICY "Owner manage barber_services" ON barbers_services 
FOR ALL USING (barber_id IN (SELECT id FROM barbers WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())));
