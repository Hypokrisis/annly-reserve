-- FINAL_DB_SETUP.sql
-- Ejecuta este script para asegurar que la Base de Datos soporte la versión final
-- Incluye: Limpieza de triggers, Permisos de Configuración, y Permisos de Servicios

-- 1. ASEGURAR QUE NO SE CREEN BARBERÍAS AUTOMÁTICAS
-- Eliminamos cualquier rastro del trigger antiguo
DROP TRIGGER IF EXISTS trg_handle_new_user_setup ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_setup();

-- 2. PERMITIR A DUEÑOS EDITAR SU CONFIGURACIÓN (Tabla businesses)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Eliminamos políticas viejas para evitar conflictos
DROP POLICY IF EXISTS "Owners can update their business" ON public.businesses;
DROP POLICY IF EXISTS "businesses_update_owner" ON public.businesses;

-- Creamos la política correcta para UPDATE
CREATE POLICY "Owners can update their business"
    ON public.businesses FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Permitir lectura pública de negocios (para que los clientes vean la info)
DROP POLICY IF EXISTS "Public businesses are viewable by everyone" ON public.businesses;
CREATE POLICY "Public businesses are viewable by everyone"
    ON public.businesses FOR SELECT
    USING (true);

-- Permitir crear negocio (para la página CreateBusinessPage)
DROP POLICY IF EXISTS "Authenticated users can create business" ON public.businesses;
CREATE POLICY "Authenticated users can create business"
    ON public.businesses FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());


-- 3. ARREGLAR PERMISOS DE SERVICIOS, BARBEROS Y HORARIOS (Incluido en FIX anterior)
-- Services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Business members can create services" ON public.services;
DROP POLICY IF EXISTS "Business owners/admins can insert services" ON public.services;

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
    
-- Update Services
DROP POLICY IF EXISTS "Business owners/admins can update services" ON public.services;
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
    );

-- Delete Services
DROP POLICY IF EXISTS "Business owners/admins can delete services" ON public.services;
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

-- 4. CONFIRMAR TODO
SELECT 'SISTEMA LISTO: Trigger eliminado y permisos actualizados' as status;
