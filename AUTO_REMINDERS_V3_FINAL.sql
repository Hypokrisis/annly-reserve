-- ============================================================
-- AUTO_REMINDERS_V3_FINAL.sql — PRODUCTION SAFE
-- Ejecuta ESTE archivo (no los anteriores). Corrige todos los
-- bugs de schema y lógica encontrados en el audit.
-- ============================================================

-- 0. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. TABLA: whatsapp_settings (idempotente)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
    business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
    is_active   BOOLEAN DEFAULT false,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage whatsapp settings" ON public.whatsapp_settings;
CREATE POLICY "Owners manage whatsapp settings"
    ON public.whatsapp_settings
    USING  (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = whatsapp_settings.business_id AND b.owner_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = whatsapp_settings.business_id AND b.owner_id = auth.uid()));

-- ============================================================
-- 2. TABLA: notification_jobs — columnas completas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_jobs (
    id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id    UUID    REFERENCES public.businesses(id) ON DELETE CASCADE,
    appointment_id UUID    REFERENCES public.appointments(id) ON DELETE CASCADE,
    event_type     TEXT    NOT NULL,
    status         TEXT    DEFAULT 'pending',
    payload        JSONB   NOT NULL DEFAULT '{}'::jsonb,
    attempts       INT     DEFAULT 0,
    last_error     TEXT,
    run_after      TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    processed_at   TIMESTAMP WITH TIME ZONE
);

-- Añadir columnas que pueden faltar si la tabla ya existe
ALTER TABLE public.notification_jobs ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE;
ALTER TABLE public.notification_jobs ADD COLUMN IF NOT EXISTS attempts      INT  DEFAULT 0;
ALTER TABLE public.notification_jobs ADD COLUMN IF NOT EXISTS last_error    TEXT;
ALTER TABLE public.notification_jobs ADD COLUMN IF NOT EXISTS run_after     TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Índice para que el worker sea rápido
CREATE INDEX IF NOT EXISTS idx_notif_jobs_pending ON public.notification_jobs (status, run_after)
    WHERE status = 'pending';

ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny all public access to jobs" ON public.notification_jobs;
CREATE POLICY "Deny all public access to jobs"
    ON public.notification_jobs USING (false) WITH CHECK (false);

-- ============================================================
-- 3. TABLA: appointments — columnas de tracking de recordatorios
-- ============================================================
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS reminder_30m_sent BOOLEAN DEFAULT false;

-- ============================================================
-- 4. TRIGGER: queue_appointment_notification (confirmado = 'confirmed')
-- ============================================================
CREATE OR REPLACE FUNCTION public.queue_appointment_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_event_type TEXT := NULL;
    v_old_date   TEXT := NULL;
    v_old_time   TEXT := NULL;
    v_is_active  BOOLEAN;
BEGIN
    IF NEW.business_id IS NULL THEN RETURN NEW; END IF;

    -- Determinar tipo de evento
    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
        v_event_type := 'created';
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
            v_event_type := 'cancelled';
        ELSIF ( OLD.appointment_date::TEXT IS DISTINCT FROM NEW.appointment_date::TEXT
             OR OLD.start_time::TEXT      IS DISTINCT FROM NEW.start_time::TEXT )
              AND NEW.status = 'confirmed' THEN
            v_event_type := 'rescheduled';
            v_old_date   := OLD.appointment_date::TEXT;
            v_old_time   := OLD.start_time::TEXT;
        END IF;
    END IF;

    IF v_event_type IS NULL THEN RETURN NEW; END IF;

    -- Verificar bot activo
    SELECT is_active INTO v_is_active
    FROM public.whatsapp_settings
    WHERE business_id = NEW.business_id;

    IF NOT COALESCE(v_is_active, false) THEN RETURN NEW; END IF;

    INSERT INTO public.notification_jobs (business_id, appointment_id, event_type, payload)
    VALUES (
        NEW.business_id,
        NEW.id,
        v_event_type,
        jsonb_build_object(
            'old_date', v_old_date,
            'old_time', v_old_time
        )
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_appointment ON public.appointments;
CREATE TRIGGER trg_notify_appointment
    AFTER INSERT OR UPDATE OF status, appointment_date, start_time
    ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.queue_appointment_notification();

-- ============================================================
-- 5. FUNCIÓN: process_automated_reminders (cron cada 10 min)
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_automated_reminders()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    rec          RECORD;
    v_now        TIMESTAMP WITH TIME ZONE := now() AT TIME ZONE 'UTC';
    v_appt_time  TIMESTAMP WITH TIME ZONE;
    v_is_active  BOOLEAN;
BEGIN
    -- Ventana: la cita ocurre entre 24h y 25h en el futuro
    FOR rec IN
        SELECT a.id, a.business_id, a.appointment_date, a.start_time
        FROM   public.appointments a
        WHERE  a.status = 'confirmed'
          AND  a.reminder_24h_sent = false
          AND  a.appointment_date >= CURRENT_DATE  -- solo futuras
    LOOP
        -- Calcular timestamp UTC de la cita (sin timezone en DB = asumimos UTC)
        v_appt_time := (rec.appointment_date::TEXT || 'T' || rec.start_time::TEXT || 'Z')::TIMESTAMP WITH TIME ZONE;

        IF v_appt_time - v_now BETWEEN interval '23 hours 45 minutes' AND interval '24 hours 15 minutes' THEN
            SELECT is_active INTO v_is_active FROM public.whatsapp_settings WHERE business_id = rec.business_id;
            IF COALESCE(v_is_active, false) THEN
                INSERT INTO public.notification_jobs (business_id, appointment_id, event_type, payload)
                VALUES (rec.business_id, rec.id, 'reminder_24h', '{}'::jsonb);
                UPDATE public.appointments SET reminder_24h_sent = true WHERE id = rec.id;
            END IF;
        END IF;
    END LOOP;

    -- Ventana: la cita ocurre entre 25 y 35 minutos en el futuro
    FOR rec IN
        SELECT a.id, a.business_id, a.appointment_date, a.start_time
        FROM   public.appointments a
        WHERE  a.status = 'confirmed'
          AND  a.reminder_30m_sent = false
          AND  a.appointment_date >= CURRENT_DATE
    LOOP
        v_appt_time := (rec.appointment_date::TEXT || 'T' || rec.start_time::TEXT || 'Z')::TIMESTAMP WITH TIME ZONE;

        IF v_appt_time - v_now BETWEEN interval '25 minutes' AND interval '35 minutes' THEN
            SELECT is_active INTO v_is_active FROM public.whatsapp_settings WHERE business_id = rec.business_id;
            IF COALESCE(v_is_active, false) THEN
                INSERT INTO public.notification_jobs (business_id, appointment_id, event_type, payload)
                VALUES (rec.business_id, rec.id, 'reminder_30m', '{}'::jsonb);
                UPDATE public.appointments SET reminder_30m_sent = true WHERE id = rec.id;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- ============================================================
-- 6. RPC: force_send_reminder (botón manual del dashboard)
-- ============================================================
CREATE OR REPLACE FUNCTION public.force_send_reminder(p_appointment_id UUID)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_rec RECORD;
BEGIN
    SELECT * INTO v_rec FROM public.appointments WHERE id = p_appointment_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cita no encontrada');
    END IF;

    -- Se puede forzar en cualquier cita confirmada
    IF v_rec.status != 'confirmed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Solo se puede enviar recordatorio a citas confirmadas');
    END IF;

    IF v_rec.customer_phone IS NULL OR v_rec.customer_phone = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'El cliente no tiene teléfono registrado');
    END IF;

    INSERT INTO public.notification_jobs (business_id, appointment_id, event_type, payload)
    VALUES (v_rec.business_id, v_rec.id, 'reminder_manual', '{}'::jsonb);

    RETURN jsonb_build_object('success', true, 'message', 'Recordatorio enviado a la cola correctamente');
END;
$$;

-- ============================================================
-- 7. CRON (Habilitar en Supabase Dashboard → Database → Extensions)
-- Luego correr esto en SQL Editor:
-- SELECT cron.schedule('spacey-reminders', '*/10 * * * *', 'SELECT public.process_automated_reminders()');
-- ============================================================

SELECT 'AUTO_REMINDERS_V3_FINAL — instalado correctamente ✅' AS status;
