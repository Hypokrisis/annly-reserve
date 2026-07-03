-- reschedule_my_appointment: reagendar por appointment_id para usuarios autenticados.
-- Complementa reschedule_appointment_by_token (que requiere cancel_token, que no siempre existe).
-- Valida ownership via auth.uid() = client_id — no necesita token.
-- SECURITY DEFINER para bypassear la política UPDATE de appointments (solo business members).

CREATE OR REPLACE FUNCTION public.reschedule_my_appointment(
    p_appointment_id UUID,
    p_new_date       DATE,
    p_new_start      TIME
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
    WHERE id        = p_appointment_id
      AND client_id = auth.uid()
      AND status    = 'confirmed';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'appointment_not_found');
    END IF;

    IF (v_apt.appointment_date::TEXT || ' ' || v_apt.start_time::TEXT)::TIMESTAMP
        AT TIME ZONE 'America/Puerto_Rico' <= NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'appointment_in_past');
    END IF;

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

GRANT EXECUTE ON FUNCTION public.reschedule_my_appointment(UUID, DATE, TIME) TO authenticated;
