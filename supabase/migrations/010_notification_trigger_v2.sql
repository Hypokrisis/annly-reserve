-- queue_appointment_notification_v2: encola notificaciones WhatsApp.
-- INSERT         → 'created'
-- UPDATE status='cancelled' (solo citas futuras) → 'cancelled' con fecha/hora OLD
-- UPDATE appointment_date o start_time (status='confirmed') → 'rescheduled' con old/new

CREATE OR REPLACE FUNCTION public.queue_appointment_notification_v2()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_event_type TEXT;
    v_payload    JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_event_type := 'created';
        v_payload := jsonb_build_object(
            'appointment_date', NEW.appointment_date,
            'start_time',       NEW.start_time
        );

    ELSIF TG_OP = 'UPDATE' THEN
        -- Cancelación: solo para citas futuras (en PR time)
        IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
            IF (OLD.appointment_date::TEXT || ' ' || OLD.start_time::TEXT)::TIMESTAMP
                AT TIME ZONE 'America/Puerto_Rico' > NOW() THEN
                v_event_type := 'cancelled';
                -- Congela la fecha/hora ANTERIOR (antes de cancelar)
                v_payload := jsonb_build_object(
                    'appointment_date', OLD.appointment_date,
                    'start_time',       OLD.start_time
                );
            ELSE
                RETURN NEW; -- cita pasada cancelada → sin notificación
            END IF;

        -- Reagendamiento: cambió fecha u hora, sigue confirmada
        ELSIF NEW.status = 'confirmed'
          AND (NEW.appointment_date IS DISTINCT FROM OLD.appointment_date
               OR NEW.start_time IS DISTINCT FROM OLD.start_time) THEN
            v_event_type := 'rescheduled';
            v_payload := jsonb_build_object(
                'appointment_date', NEW.appointment_date,
                'start_time',       NEW.start_time,
                'old_date',         OLD.appointment_date,
                'old_time',         OLD.start_time
            );

        ELSE
            RETURN NEW; -- otros updates (status=completed, etc.) → sin notificación
        END IF;
    ELSE
        RETURN NEW;
    END IF;

    INSERT INTO public.notification_jobs (appointment_id, event_type, payload, run_after)
    VALUES (NEW.id, v_event_type, v_payload, now() + INTERVAL '3 seconds')
    ON CONFLICT ON CONSTRAINT notification_jobs_unique_event
    DO UPDATE SET
        payload   = EXCLUDED.payload,
        run_after = EXCLUDED.run_after;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_appointment_notification_v2 ON public.appointments;

CREATE TRIGGER queue_appointment_notification_v2
    AFTER INSERT OR UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.queue_appointment_notification_v2();
