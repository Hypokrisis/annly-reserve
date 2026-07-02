-- ============================================================
-- 004_fix_reminders_timezone.sql
-- Bug: process_automated_reminders trataba start_time como UTC.
-- Una cita a las 2:00 PM PR (start_time='14:00:00') se calculaba
-- como 14:00 UTC = 10:00 AM PR → recordatorio 4 horas antes.
-- Fix: interpretar la cadena fecha+hora como hora local PR
-- (America/Puerto_Rico = UTC-4 sin DST) antes de comparar.
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_automated_reminders()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    rec          RECORD;
    v_now        TIMESTAMP WITH TIME ZONE := now();
    v_appt_time  TIMESTAMP WITH TIME ZONE;
    v_is_active  BOOLEAN;
BEGIN
    -- ── Recordatorio 24 horas ─────────────────────────────────
    FOR rec IN
        SELECT a.id, a.business_id, a.appointment_date, a.start_time
        FROM   public.appointments a
        WHERE  a.status = 'confirmed'
          AND  a.reminder_24h_sent = false
          AND  a.appointment_date >= CURRENT_DATE
    LOOP
        -- Interpreta fecha+hora como hora LOCAL de Puerto Rico (UTC-4),
        -- no como UTC. AT TIME ZONE convierte a timestamptz correctamente.
        v_appt_time := (rec.appointment_date::TEXT || ' ' || rec.start_time::TEXT)::TIMESTAMP
                       AT TIME ZONE 'America/Puerto_Rico';

        IF v_appt_time - v_now BETWEEN interval '23 hours 45 minutes' AND interval '24 hours 15 minutes' THEN
            SELECT is_active INTO v_is_active
            FROM   public.whatsapp_settings
            WHERE  business_id = rec.business_id;

            IF COALESCE(v_is_active, false) THEN
                INSERT INTO public.notification_jobs (business_id, appointment_id, event_type, payload)
                VALUES (rec.business_id, rec.id, 'reminder_24h', '{}'::jsonb)
                ON CONFLICT (appointment_id, event_type, channel) DO NOTHING;

                UPDATE public.appointments
                SET    reminder_24h_sent = true
                WHERE  id = rec.id;
            END IF;
        END IF;
    END LOOP;

    -- ── Recordatorio 30 minutos ───────────────────────────────
    FOR rec IN
        SELECT a.id, a.business_id, a.appointment_date, a.start_time
        FROM   public.appointments a
        WHERE  a.status = 'confirmed'
          AND  a.reminder_30m_sent = false
          AND  a.appointment_date >= CURRENT_DATE
    LOOP
        v_appt_time := (rec.appointment_date::TEXT || ' ' || rec.start_time::TEXT)::TIMESTAMP
                       AT TIME ZONE 'America/Puerto_Rico';

        IF v_appt_time - v_now BETWEEN interval '25 minutes' AND interval '35 minutes' THEN
            SELECT is_active INTO v_is_active
            FROM   public.whatsapp_settings
            WHERE  business_id = rec.business_id;

            IF COALESCE(v_is_active, false) THEN
                INSERT INTO public.notification_jobs (business_id, appointment_id, event_type, payload)
                VALUES (rec.business_id, rec.id, 'reminder_30m', '{}'::jsonb)
                ON CONFLICT (appointment_id, event_type, channel) DO NOTHING;

                UPDATE public.appointments
                SET    reminder_30m_sent = true
                WHERE  id = rec.id;
            END IF;
        END IF;
    END LOOP;
END;
$$;

SELECT 'Timezone fix applied: reminders now use America/Puerto_Rico' AS status;
