-- SAAS_REALIGNMENT_STEP5_RLS.sql
-- Actualiza políticas RLS de appointments para el nuevo flujo SaaS
-- Permite que clientes vean sus propias citas

-- 1. Eliminar políticas existentes de appointments
DROP POLICY IF EXISTS "appointments_insert_public" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_member" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_member" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view relevant appointments" ON public.appointments;
DROP POLICY IF EXISTS "Business members can update appointments" ON public.appointments;

-- 2. NUEVA POLÍTICA: INSERT - Solo usuarios autenticados
CREATE POLICY "Authenticated users can create own appointments"
    ON public.appointments FOR INSERT
    TO authenticated
    WITH CHECK (customer_user_id = auth.uid());

-- 3. NUEVA POLÍTICA: SELECT - Tres niveles de acceso
CREATE POLICY "Users can view relevant appointments"
    ON public.appointments FOR SELECT
    TO authenticated
    USING (
        -- Nivel 1: Owner/Admin del negocio ve TODAS las citas
        public.is_business_member(business_id)
        OR
        -- Nivel 2: Cliente ve SOLO sus propias citas
        customer_user_id = auth.uid()
        OR
        -- Nivel 3: Staff (barbero) ve SOLO sus citas asignadas
        (barber_id IN (
            SELECT id FROM public.barbers 
            WHERE user_id = auth.uid()
        ))
    );

-- 4. NUEVA POLÍTICA: UPDATE - Solo owner/admin del negocio
CREATE POLICY "Business members can update appointments"
    ON public.appointments FOR UPDATE
    TO authenticated
    USING (public.is_business_member(business_id))
    WITH CHECK (public.is_business_member(business_id));

-- 5. NUEVA POLÍTICA: DELETE - Solo owner/admin del negocio
DROP POLICY IF EXISTS "Business members can delete appointments" ON public.appointments;
CREATE POLICY "Business members can delete appointments"
    ON public.appointments FOR DELETE
    TO authenticated
    USING (public.is_business_member(business_id));

-- Confirmación
DO $$
BEGIN
    RAISE NOTICE 'Políticas RLS de appointments actualizadas correctamente';
    RAISE NOTICE '';
    RAISE NOTICE 'Niveles de acceso:';
    RAISE NOTICE '1. Owner/Admin: Ve TODAS las citas del negocio';
    RAISE NOTICE '2. Cliente: Ve SOLO sus propias citas (customer_user_id)';
    RAISE NOTICE '3. Staff/Barbero: Ve SOLO citas asignadas a él';
    RAISE NOTICE '';
    RAISE NOTICE 'INSERT: Solo usuarios autenticados con customer_user_id = auth.uid()';
    RAISE NOTICE 'UPDATE/DELETE: Solo owner/admin del negocio';
END $$;
