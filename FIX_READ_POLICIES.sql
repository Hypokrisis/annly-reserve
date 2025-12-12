-- =================================================================
-- 🛠️ SOLUCIÓN FINAL A ERROR 400 (LECTURA BLOQUEADA)
-- =================================================================

-- 1. Arreglar Políticas de Lectura (Services y Barbers)
-- Cambiamos la lógica para usar 'users_businesses' que es más seguro y previene errores 400.

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner select services" ON services;

CREATE POLICY "Owner select services" ON services FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users_businesses ub
        WHERE ub.business_id = services.business_id
        AND ub.user_id = auth.uid()
    )
);

ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner select barbers" ON barbers;

CREATE POLICY "Owner select barbers" ON barbers FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users_businesses ub
        WHERE ub.business_id = barbers.business_id
        AND ub.user_id = auth.uid()
    )
);

-- 2. Asegurar que users_businesses se pueda leer
ALTER TABLE users_businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own relations" ON users_businesses;
CREATE POLICY "Users view own relations" ON users_businesses 
FOR SELECT USING (user_id = auth.uid());


-- =================================================================
-- 🚑 RESCATE DE USUARIO ORIGINAL (IMPORTANTE)
-- =================================================================
-- Si tu usuario original sigue roto ("Negocio N/A"), corre esto para
-- crearle el negocio que le falta, ya que la UI no tiene botón para eso.

DO $$
DECLARE
    new_biz_id UUID;
    v_user_id UUID := auth.uid();
    v_count INTEGER;
BEGIN
    -- Verificar si el usuario ya tiene negocio
    SELECT count(*) INTO v_count FROM users_businesses WHERE user_id = v_user_id;
    
    IF v_count = 0 THEN
        -- Crear negocio nuevo
        INSERT INTO businesses (owner_id, name, slug, is_active)
        VALUES (v_user_id, 'Mi Barbería (Restaurada)', 'barberia-' || substr(md5(random()::text), 1, 6), true)
        RETURNING id INTO new_biz_id;
        
        -- Vincular usuario
        INSERT INTO users_businesses (user_id, business_id, role)
        VALUES (v_user_id, new_biz_id, 'owner');
    END IF;
END $$;
