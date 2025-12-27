-- FIX_SERVICES_RLS.sql
-- Arregla los problemas de permisos para crear Servicios y Barberos
-- Ejecutar en Supabase SQL Editor

-- 1. Arreglar RLS para SERVICES
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select_policy" ON public.services;
DROP POLICY IF EXISTS "services_insert_policy" ON public.services;
DROP POLICY IF EXISTS "services_update_policy" ON public.services;
DROP POLICY IF EXISTS "services_delete_policy" ON public.services;
DROP POLICY IF EXISTS "Public read access" ON public.services;
DROP POLICY IF EXISTS "Business members can create services" ON public.services;

-- Lectura pública (para que el BookingPage funcione)
CREATE POLICY "Public read access"
    ON public.services FOR SELECT
    USING (true);

-- Escritura (Insert/Update/Delete): Solo miembros del negocio con rol owner/admin
CREATE POLICY "Business owners/admins can insert services"
    ON public.services FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_businesses ub
            WHERE ub.business_id = business_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Business owners/admins can update services"
    ON public.services FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users_businesses ub
            WHERE ub.business_id = business_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_businesses ub
            WHERE ub.business_id = business_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Business owners/admins can delete services"
    ON public.services FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users_businesses ub
            WHERE ub.business_id = business_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'admin')
        )
    );

-- 2. Arreglar RLS para BARBERS (Por si acaso)
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "barbers_read_public" ON public.barbers;
DROP POLICY IF EXISTS "barbers_write_members" ON public.barbers;
DROP POLICY IF EXISTS "Public read access" ON public.barbers;

-- Lectura pública
CREATE POLICY "Public read access"
    ON public.barbers FOR SELECT
    USING (true);

-- Escritura
CREATE POLICY "Business owners/admins can manage barbers"
    ON public.barbers FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users_businesses ub
            WHERE ub.business_id = business_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_businesses ub
            WHERE ub.business_id = business_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'admin')
        )
    );

-- 3. Arreglar RLS para SCHEDULES
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedules_read_public" ON public.schedules;
DROP POLICY IF EXISTS "schedules_write_members" ON public.schedules;

CREATE POLICY "Public read access"
    ON public.schedules FOR SELECT
    USING (true);

CREATE POLICY "Business owners/admins can manage schedules"
    ON public.schedules FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users_businesses ub
            WHERE ub.business_id = business_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'admin')
        )
    );
