-- SAAS_REALIGNMENT_STEP1_CLEANUP.sql
-- Elimina el trigger que crea business automáticamente en signup
-- CRÍTICO: Ejecutar PRIMERO antes de cualquier otro cambio

-- 1. Eliminar trigger de auto-creación de business
DROP TRIGGER IF EXISTS trg_handle_new_user_setup ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_setup();

-- 2. Verificar que no existan otros triggers similares
-- (Revisar manualmente en Supabase Dashboard -> Database -> Triggers)

-- Confirmación
DO $$
BEGIN
    RAISE NOTICE 'Trigger de auto-creación de business eliminado correctamente';
    RAISE NOTICE 'IMPORTANTE: Los nuevos usuarios NO tendrán business automáticamente';
    RAISE NOTICE 'Deben crearlo manualmente desde el UI';
END $$;
