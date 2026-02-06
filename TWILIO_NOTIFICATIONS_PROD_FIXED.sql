-- TWILIO_NOTIFICATIONS_PROD_FIXED.sql
-- Ejecuta este script para CORREGIR el error de "column channel does not exist"

-- 1. ASEGURAR COLUMNAS EN NOTIFICATION_JOBS
-- Como la tabla ya existe, debemos agregar las columnas nuevas manualmente si faltan.

DO $$ 
BEGIN 
    -- Agregar appointment_id si falta
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notification_jobs' AND column_name='appointment_id') THEN
        ALTER TABLE public.notification_jobs ADD COLUMN appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE;
    END IF;

    -- Agregar channel
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notification_jobs' AND column_name='channel') THEN
        ALTER TABLE public.notification_jobs ADD COLUMN channel TEXT DEFAULT 'whatsapp';
    END IF;

    -- Agregar to_phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notification_jobs' AND column_name='to_phone') THEN
        ALTER TABLE public.notification_jobs ADD COLUMN to_phone TEXT;
    END IF;

    -- Agregar attempts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notification_jobs' AND column_name='attempts') THEN
        ALTER TABLE public.notification_jobs ADD COLUMN attempts INT DEFAULT 0;
    END IF;

    -- Agregar last_error
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notification_jobs' AND column_name='last_error') THEN
        ALTER TABLE public.notification_jobs ADD COLUMN last_error TEXT;
    END IF;

    -- Agregar run_after
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notification_jobs' AND column_name='run_after') THEN
        ALTER TABLE public.notification_jobs ADD COLUMN run_after TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;

     -- Agregar payload si falta (por si acaso)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notification_jobs' AND column_name='payload') THEN
        ALTER TABLE public.notification_jobs ADD COLUMN payload JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Asegurar phone en BARBERS también
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='phone') THEN
        ALTER TABLE public.barbers ADD COLUMN phone TEXT;
    END IF;
END $$;


-- 2. APLICAR CONSTRAINT DE IDEMPOTENCIA
-- Ahora que estamos seguros que las columnas existen, aplicamos el UNIQUE

ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;

-- Deny All Policy
DROP POLICY IF EXISTS "Deny all public access to jobs" ON public.notification_jobs;
CREATE POLICY "Deny all public access to jobs"
    ON public.notification_jobs
    USING (false)
    WITH CHECK (false);

-- Drop old constraints if any
ALTER TABLE public.notification_jobs 
    DROP CONSTRAINT IF EXISTS notification_jobs_unique_event;

-- Add correct constraint
ALTER TABLE public.notification_jobs
    ADD CONSTRAINT notification_jobs_unique_event 
    UNIQUE (appointment_id, event_type, channel);


-- 3. TRIGGER FUNCTION V2 (PRODUCTION READY)
CREATE OR REPLACE FUNCTION public.queue_appointment_notification_v2()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_business_id UUID;
    v_barber_id UUID;
    v_barber_phone TEXT;
    v_barber_name TEXT;
    v_service_name TEXT;
    v_event_type TEXT := NULL;
    v_old_date TEXT := NULL;
    v_old_time TEXT := NULL;
    v_payload JSONB;
    v_customer_phone TEXT;
BEGIN
    -- Validaciones Básicas
    IF NEW.business_id IS NULL THEN RETURN NEW; END IF;

    -- Determinar Evento
    IF (TG_OP = 'INSERT') THEN
        v_event_type := 'created';
        v_business_id := NEW.business_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_business_id := NEW.business_id;
        
        IF (OLD.status != 'cancelled' AND NEW.status = 'cancelled') THEN
            v_event_type := 'cancelled';
        ELSIF (OLD.appointment_date != NEW.appointment_date OR OLD.start_time != NEW.start_time) THEN
            v_event_type := 'rescheduled';
            v_old_date := OLD.appointment_date::TEXT;
            v_old_time := OLD.start_time::TEXT;
        END IF;
    END IF;

    -- Si no es evento relevante, salir
    IF v_event_type IS NULL THEN RETURN NEW; END IF;

    -- Obtener Datos Barbero
    SELECT name, phone 
    INTO v_barber_name, v_barber_phone
    FROM public.barbers 
    WHERE id = NEW.barber_id;

    -- Validación de teléfono de barbero
    -- Si no hay teléfono, no encolamos (o podrías encolar para dashboard notifications)
    IF v_barber_phone IS NULL OR length(v_barber_phone) < 8 THEN
        RETURN NEW;
    END IF;

    -- Obtener nombre de servicio
    SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;

    v_customer_phone := NEW.customer_phone;

    -- Payload
    v_payload := jsonb_build_object(
        'appointment_id', NEW.id,
        'business_id', NEW.business_id,
        'barber_name', COALESCE(v_barber_name, 'Barbero'),
        'customer_name', COALESCE(NEW.customer_name, 'Cliente'),
        'customer_phone', v_customer_phone,
        'service_name', COALESCE(v_service_name, 'Servicio'),
        'appointment_date', NEW.appointment_date,
        'start_time', NEW.start_time,
        'old_date', v_old_date,
        'old_time', v_old_time
    );

    -- UPSERT en la cola
    INSERT INTO public.notification_jobs (
        business_id, 
        appointment_id, 
        event_type, 
        channel, 
        to_phone, 
        payload, 
        status,
        attempts,
        run_after
    )
    VALUES (
        v_business_id, 
        NEW.id, 
        v_event_type, 
        'whatsapp', 
        v_barber_phone,
        v_payload, 
        'pending',
        0,
        now()
    )
    ON CONFLICT (appointment_id, event_type, channel) 
    DO UPDATE SET
        payload = EXCLUDED.payload,
        status = 'pending',
        run_after = now(),
        to_phone = EXCLUDED.to_phone,
        processed_at = NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 4. APLICAR TRIGGER
DROP TRIGGER IF EXISTS trg_notify_appointment_v2 ON public.appointments;
DROP TRIGGER IF EXISTS trg_notify_appointment ON public.appointments; -- Limpieza

CREATE TRIGGER trg_notify_appointment_v2
    AFTER INSERT OR UPDATE OF status, appointment_date, start_time
    ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.queue_appointment_notification_v2();


SELECT 'TWILIO PRODUCTION FIXED: Schema Updated & Trigger Applied' as status;
