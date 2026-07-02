-- ============================================================
-- 005_get_busy_slots.sql
-- Función pública para calcular disponibilidad de slots.
-- SECURITY DEFINER bypasea RLS → lee todas las citas confirmed.
-- Retorna SOLO start_time + end_time — sin PII.
-- Permite que usuarios anon (BookingPage pública) vean qué
-- horarios están ocupados sin exponer datos del cliente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_busy_slots(
    p_barber_id UUID,
    p_date      DATE
)
RETURNS TABLE(start_time TIME, end_time TIME)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
    SELECT start_time, end_time
    FROM   public.appointments
    WHERE  barber_id        = p_barber_id
      AND  appointment_date = p_date
      AND  status           = 'confirmed';
$$;

GRANT EXECUTE ON FUNCTION public.get_busy_slots(UUID, DATE) TO anon, authenticated;

SELECT 'get_busy_slots: función creada, RLS bypaseado, sin PII' AS status;
