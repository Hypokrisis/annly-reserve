-- SAAS_REALIGNMENT_MASTER.sql
-- Script maestro que ejecuta todos los pasos de la realineación SaaS
-- IMPORTANTE: Ejecutar en Supabase SQL Editor en el orden indicado

-- ============================================================
-- PASO 1: CLEANUP - Eliminar trigger de auto-creación
-- ============================================================
\echo '========================================';
\echo 'PASO 1: Eliminando trigger de auto-creación de business';
\echo '========================================';

DROP TRIGGER IF EXISTS trg_handle_new_user_setup ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_setup();

\echo 'PASO 1: ✓ Completado';
\echo '';

-- ============================================================
-- PASO 2: PROFILES - Crear tabla de perfiles de usuario
-- ============================================================
\echo '========================================';
\echo 'PASO 2: Creando tabla profiles';
\echo '========================================';

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    phone text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_profiles_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

\echo 'PASO 2: ✓ Completado';
\echo '';

-- ============================================================
-- PASO 3: APPOINTMENTS - Agregar customer_user_id
-- ============================================================
\echo '========================================';
\echo 'PASO 3: Agregando customer_user_id a appointments';
\echo '========================================';

ALTER TABLE public.appointments 
    ADD COLUMN IF NOT EXISTS customer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.appointments.customer_user_id IS 
    'Usuario autenticado que creó la cita. NULL para citas antiguas.';

CREATE INDEX IF NOT EXISTS idx_appointments_customer_user 
    ON public.appointments(customer_user_id);

CREATE INDEX IF NOT EXISTS idx_appointments_user_date 
    ON public.appointments(customer_user_id, appointment_date);

\echo 'PASO 3: ✓ Completado';
\echo '';

-- ============================================================
-- PASO 4: MONETIZATION - Agregar columnas de plan
-- ============================================================
\echo '========================================';
\echo 'PASO 4: Agregando columnas de monetización';
\echo '========================================';

ALTER TABLE public.businesses 
    ADD COLUMN IF NOT EXISTS plan_status text DEFAULT 'trial' 
        CHECK (plan_status IN ('trial', 'active', 'inactive', 'cancelled')),
    ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz,
    ADD COLUMN IF NOT EXISTS stripe_customer_id text,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

COMMENT ON COLUMN public.businesses.plan_status IS 
    'Estado del plan: trial, active, inactive, cancelled';

CREATE INDEX IF NOT EXISTS idx_businesses_plan_status 
    ON public.businesses(plan_status);

CREATE INDEX IF NOT EXISTS idx_businesses_subscription_ends 
    ON public.businesses(subscription_ends_at) 
    WHERE subscription_ends_at IS NOT NULL;

UPDATE public.businesses 
SET plan_status = 'trial' 
WHERE plan_status IS NULL;

\echo 'PASO 4: ✓ Completado';
\echo '';

-- ============================================================
-- PASO 5: RLS - Actualizar políticas de appointments
-- ============================================================
\echo '========================================';
\echo 'PASO 5: Actualizando políticas RLS';
\echo '========================================';

DROP POLICY IF EXISTS "appointments_insert_public" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_member" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_member" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view relevant appointments" ON public.appointments;
DROP POLICY IF EXISTS "Business members can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Business members can delete appointments" ON public.appointments;

CREATE POLICY "Authenticated users can create own appointments"
    ON public.appointments FOR INSERT
    TO authenticated
    WITH CHECK (customer_user_id = auth.uid());

CREATE POLICY "Users can view relevant appointments"
    ON public.appointments FOR SELECT
    TO authenticated
    USING (
        public.is_business_member(business_id)
        OR
        customer_user_id = auth.uid()
        OR
        (barber_id IN (
            SELECT id FROM public.barbers 
            WHERE user_id = auth.uid()
        ))
    );

CREATE POLICY "Business members can update appointments"
    ON public.appointments FOR UPDATE
    TO authenticated
    USING (public.is_business_member(business_id))
    WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Business members can delete appointments"
    ON public.appointments FOR DELETE
    TO authenticated
    USING (public.is_business_member(business_id));

\echo 'PASO 5: ✓ Completado';
\echo '';

-- ============================================================
-- RESUMEN FINAL
-- ============================================================
\echo '========================================';
\echo 'REALINEACIÓN SAAS COMPLETADA';
\echo '========================================';
\echo '';
\echo 'Cambios aplicados:';
\echo '✓ Trigger de auto-creación eliminado';
\echo '✓ Tabla profiles creada';
\echo '✓ customer_user_id agregado a appointments';
\echo '✓ Columnas de monetización agregadas';
\echo '✓ Políticas RLS actualizadas';
\echo '';
\echo 'Próximos pasos:';
\echo '1. Actualizar código frontend (auth.service.ts, SignupPage, etc.)';
\echo '2. Probar signup de usuario normal';
\echo '3. Probar booking con login requerido';
\echo '4. Probar creación de barbería';
\echo '';

-- Estadísticas finales
DO $$
DECLARE
    total_users integer;
    total_profiles integer;
    total_businesses integer;
    total_appointments integer;
    appointments_with_user integer;
BEGIN
    SELECT COUNT(*) INTO total_users FROM auth.users;
    SELECT COUNT(*) INTO total_profiles FROM public.profiles;
    SELECT COUNT(*) INTO total_businesses FROM public.businesses;
    SELECT COUNT(*) INTO total_appointments FROM public.appointments;
    SELECT COUNT(*) INTO appointments_with_user FROM public.appointments WHERE customer_user_id IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE 'ESTADÍSTICAS:';
    RAISE NOTICE '- Usuarios totales: %', total_users;
    RAISE NOTICE '- Perfiles creados: %', total_profiles;
    RAISE NOTICE '- Barberías totales: %', total_businesses;
    RAISE NOTICE '- Citas totales: %', total_appointments;
    RAISE NOTICE '- Citas con usuario vinculado: %', appointments_with_user;
END $$;
