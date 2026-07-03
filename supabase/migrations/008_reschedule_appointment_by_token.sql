-- reschedule_appointment_by_token: permite al cliente reagendar su propia cita
-- usando el cancel_token como identificador (sin requerir auth.uid).
-- SECURITY DEFINER bypasses RLS (no UPDATE policy para clientes regulares).
-- El trigger queue_appointment_notification_v2 dispara 'rescheduled' automáticamente
-- al detectar cambio en appointment_date o start_time.

CREATE OR REPLACE FUNCTION public.reschedule_appointment_by_token(
    p_token     TEXT,
    p_new_date  DATE,
    p_new_start TIME
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_apt appointments%ROWTYPE;
    v_dur INT;
    v_end TIME;
BEGIN
    SELECT * INTO v_apt
    FROM public.appointments
    WHERE cancel_token = p_token AND status = 'confirmed';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'appointment_not_found');
    END IF;

    -- Solo se puede reagendar una cita futura
    IF (v_apt.appointment_date::TEXT || ' ' || v_apt.start_time::TEXT)::TIMESTAMP
       AT TIME ZONE 'America/Puerto_Rico' <= NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'appointment_in_past');
    END IF;

    -- Calcular end_time desde la duración del servicio
    SELECT duration_minutes INTO v_dur FROM public.services WHERE id = v_apt.service_id;
    v_end := p_new_start + (v_dur || ' minutes')::INTERVAL;

    UPDATE public.appointments
    SET appointment_date = p_new_date,
        start_time       = p_new_start,
        end_time         = v_end
    WHERE id = v_apt.id;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reschedule_appointment_by_token(TEXT, DATE, TIME)
    TO anon, authenticated;
