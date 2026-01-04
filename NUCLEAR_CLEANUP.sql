-- NUCLEAR_CLEANUP.sql
-- Script de diagnóstico y limpieza total
-- EJECUTAR EN SUPABASE SQL EDITOR

-- ============================================
-- PARTE 1: DIAGNÓSTICO (Ver qué existe)
-- ============================================

-- Ver TODOS los triggers en auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
  AND event_object_schema = 'auth';

-- Ver TODAS las funciones que mencionan 'business'
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%business%' 
    OR routine_name LIKE '%user%'
  );

-- ============================================
-- PARTE 2: ELIMINACIÓN NUCLEAR
-- ============================================

-- Eliminar TODOS los triggers en auth.users
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'users' 
          AND event_object_schema = 'auth'
    ) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users CASCADE', r.trigger_name);
        RAISE NOTICE 'Eliminado trigger: %', r.trigger_name;
    END LOOP;
END $$;

-- Eliminar funciones específicas conocidas
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_setup() CASCADE;
DROP FUNCTION IF EXISTS public.create_business_for_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_business() CASCADE;
DROP FUNCTION IF EXISTS public.auto_create_business() CASCADE;

-- ============================================
-- PARTE 3: VERIFICACIÓN FINAL
-- ============================================

-- Confirmar que no quedan triggers
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO HAY TRIGGERS EN auth.users'
        ELSE '❌ AÚN HAY ' || COUNT(*) || ' TRIGGERS'
    END as resultado
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
  AND event_object_schema = 'auth';

-- Confirmar que no quedan funciones problemáticas
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO HAY FUNCIONES AUTO-BUSINESS'
        ELSE '❌ AÚN HAY ' || COUNT(*) || ' FUNCIONES'
    END as resultado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'handle_new_user',
    'handle_new_user_setup', 
    'create_business_for_new_user',
    'handle_new_user_business',
    'auto_create_business'
  );
