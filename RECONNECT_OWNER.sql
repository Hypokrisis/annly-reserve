-- =================================================================
-- 🚑 SCRIPT DE RECONEXIÓN (LINKING SCRIPT)
-- =================================================================
-- Ejecuta esto para conectar tu Usuario con tu Barbería existente.

INSERT INTO users_businesses (user_id, business_id, role)
SELECT owner_id, id, 'owner'
FROM businesses
WHERE owner_id = auth.uid()
ON CONFLICT (user_id, business_id) DO NOTHING;

-- Verificación: Después de correr esto, debería salir "1 row inserted" 
-- (o 0 si ya estabas conectado, pero creo que saldrá 1).
