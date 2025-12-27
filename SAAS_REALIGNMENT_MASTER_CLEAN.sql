-- SAAS_REALIGNMENT_MASTER_CLEAN.sql
-- Script maestro SIN comandos psql (compatible con Supabase SQL Editor)
-- Ejecuta todos los pasos de la realineación SaaS

-- ============================================================
-- PASO 1: CLEANUP - Eliminar trigger de auto-creación
-- ============================================================

DROP TRIGGER IF EXISTS trg_handle_new_user_setup ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_setup();

-- ============================================================
-- PASO 2: PROFILES - Crear tabla de perfiles de usuario
-- ============================================================

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

-- ============================================================
-- PASO 3: APPOINTMENTS - Agregar customer_user_id
-- ============================================================

ALTER TABLE public.appointments 
    ADD COLUMN IF NOT EXISTS customer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.appointments.customer_user_id IS 
    'Usuario autenticado que creó la cita. NULL para citas antiguas.';

CREATE INDEX IF NOT EXISTS idx_appointments_customer_user 
    ON public.appointments(customer_user_id);

CREATE INDEX IF NOT EXISTS idx_appointments_user_date 
    ON public.appointments(customer_user_id, appointment_date);

-- ============================================================
-- PASO 4: MONETIZATION - Agregar columnas de plan
-- ============================================================

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

-- ============================================================
-- PASO 5: RLS - Actualizar políticas de appointments
-- ============================================================

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

-- ============================================================
-- RESUMEN FINAL
-- ============================================================

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
    RAISE NOTICE '========================================';
    RAISE NOTICE 'REALINEACION SAAS COMPLETADA';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Cambios aplicados:';
    RAISE NOTICE '✓ Trigger de auto-creacion eliminado';
    RAISE NOTICE '✓ Tabla profiles creada';
    RAISE NOTICE '✓ customer_user_id agregado a appointments';
    RAISE NOTICE '✓ Columnas de monetizacion agregadas';
    RAISE NOTICE '✓ Politicas RLS actualizadas';
    RAISE NOTICE '';
    RAISE NOTICE 'ESTADISTICAS:';
    RAISE NOTICE '- Usuarios totales: %', total_users;
    RAISE NOTICE '- Perfiles creados: %', total_profiles;
    RAISE NOTICE '- Barberias totales: %', total_businesses;
    RAISE NOTICE '- Citas totales: %', total_appointments;
    RAISE NOTICE '- Citas con usuario vinculado: %', appointments_with_user;
    RAISE NOTICE '';
    RAISE NOTICE 'Proximos pasos:';
    RAISE NOTICE '1. Probar signup de usuario normal';
    RAISE NOTICE '2. Verificar que NO se crea business automaticamente';
    RAISE NOTICE '3. Continuar con cambios de codigo frontend';
END $$;
