-- ALLOW_CLIENT_CANCEL.sql
-- Habilitar a los clientes cancelar sus propias citas

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Esta política permite al dueño de la cita (cliente) actualizarla (para cancelar)
-- Se restringe a actualizar solo columnas seguras si fuera necesario, pero por ahora permitimos UPDATE general
-- siempre que sea SU cita.

DROP POLICY IF EXISTS "Clients can cancel their own appointments" ON public.appointments;

CREATE POLICY "Clients can cancel their own appointments"
    ON public.appointments FOR UPDATE
    TO authenticated
    USING (customer_user_id = auth.uid())
    WITH CHECK (customer_user_id = auth.uid());

-- Asegurar lectura también (ya debería estar, pero por si acaso)
DROP POLICY IF EXISTS "Clients can view their own appointments" ON public.appointments;
CREATE POLICY "Clients can view their own appointments"
    ON public.appointments FOR SELECT
    TO authenticated
    USING (customer_user_id = auth.uid());
