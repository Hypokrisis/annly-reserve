-- SAAS_REALIGNMENT_STEP3_APPOINTMENTS.sql
-- Agrega customer_user_id a appointments para vincular citas con usuarios autenticados
-- Mantiene customer_name/email/phone como snapshot

-- 1. Agregar columna customer_user_id
ALTER TABLE public.appointments 
    ADD COLUMN IF NOT EXISTS customer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Comentario en la columna
COMMENT ON COLUMN public.appointments.customer_user_id IS 
    'Usuario autenticado que creó la cita. NULL para citas antiguas o creadas antes del cambio.';

-- 3. Índice para mejorar queries de "mis citas"
CREATE INDEX IF NOT EXISTS idx_appointments_customer_user 
    ON public.appointments(customer_user_id);

-- 4. Índice compuesto para queries comunes
CREATE INDEX IF NOT EXISTS idx_appointments_user_date 
    ON public.appointments(customer_user_id, appointment_date);

-- Confirmación
DO $$
DECLARE
    total_appointments integer;
    appointments_with_user integer;
BEGIN
    SELECT COUNT(*) INTO total_appointments FROM public.appointments;
    SELECT COUNT(*) INTO appointments_with_user FROM public.appointments WHERE customer_user_id IS NOT NULL;
    
    RAISE NOTICE 'Columna customer_user_id agregada correctamente';
    RAISE NOTICE 'Total de citas: %', total_appointments;
    RAISE NOTICE 'Citas con usuario vinculado: %', appointments_with_user;
    RAISE NOTICE 'Citas antiguas (sin usuario): %', total_appointments - appointments_with_user;
END $$;
