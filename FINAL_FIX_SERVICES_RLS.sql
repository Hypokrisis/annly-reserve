-- FINAL_FIX_SERVICES_RLS.sql
-- Script definitivo para arreglar error 400 al crear Servicios
-- y arreglar error de schema cache en Configuración

-- 1. Arreglar Tabla BUSINESSES (Agregar columna faltante)
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Asegurar que USERS_BUSINESSES sea legible
ALTER TABLE public.users_businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own memberships" ON public.users_businesses;
-- Permitir ver sus propias membresías
CREATE POLICY "Users can view their own memberships"
    ON public.users_businesses FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- 3. Arreglar RLS para SERVICES (Versión Robusta)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Borrar TODAS las políticas viejas de escritura para evitar conflictos
DROP POLICY IF EXISTS "services_insert_policy" ON public.services;
DROP POLICY IF EXISTS "Business members can create services" ON public.services;
DROP POLICY IF EXISTS "Business owners/admins can insert services" ON public.services;
DROP POLICY IF EXISTS "services_update_policy" ON public.services;
DROP POLICY IF EXISTS "Business owners/admins can update services" ON public.services;
DROP POLICY IF EXISTS "services_delete_policy" ON public.services;
DROP POLICY IF EXISTS "Business owners/admins can delete services" ON public.services;

-- Política de INSERT (Crear Servicio)
CREATE POLICY "Enable insert for owners and admins"
    ON public.services FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_businesses ub
            WHERE ub.business_id = services.business_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'admin')
        )
    );

-- Política de UPDATE (Editar Servicio)
CREATE POLICY "Enable update for owners and admins"
    ON public.services FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users_businesses ub
            WHERE ub.business_id = services.business_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_businesses ub
            WHERE ub.business_id = services.business_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'admin')
        )
    );

-- Política de DELETE (Borrar Servicio)
CREATE POLICY "Enable delete for owners and admins"
    ON public.services FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users_businesses ub
            WHERE ub.business_id = services.business_id
            AND ub.user_id = auth.uid()
            AND ub.role IN ('owner', 'admin')
        )
    );

-- 4. Notificar éxito
SELECT 'EXITO: Permisos de Servicios arreglados y columna updated_at creada' as status;
