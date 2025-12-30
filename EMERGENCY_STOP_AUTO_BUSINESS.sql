-- EMERGENCY_STOP_AUTO_BUSINESS.sql
-- ESTE SCRIPT ES CRÍTICO. EJECUTAR EN SUPABASE SQL EDITOR.

-- 1. Desactivar Triggers en la tabla auth.users
-- Estos son los que detectan "Nuevo Usuario" y lanzan la creación automática.
DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS trg_handle_new_user_setup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Eliminar las Funciones Automáticas
-- Estas son las funciones que ejecutaban la lógica de creación.
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user_setup();
DROP FUNCTION IF EXISTS public.create_business_for_new_user();

-- 3. Verificación
-- Si esto corre sin errores, YA NO EXISTE MECANISMO AUTOMÁTICO en la base de datos.
SELECT 'SISTEMA LIMPIO: Ya no existen triggers de creación automática.' as mensaje;
