-- TWILIO_NOTIFICATIONS_PROD.sql
-- Ejecuta este script en el SQL Editor de Supabase para habilitar la cola de notificaciones robusta (Producción)

-- 1. ACTUALIZAR ESQUEMA DE NOTIFICATION_JOBS
-- Agregamos columnas necesarias para el Worker y la Idempotencia

-- Si la tabla no existe, la crea desde cero
CREATE TABLE IF NOT EXISTS public.notification_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'created', 'cancelled', 'rescheduled'
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'skipped'
    
    -- Campos nuevos para Twilio/Worker
    channel TEXT DEFAULT 'whatsapp', -- 'whatsapp' | 'sms'
    to_phone TEXT, -- E.164 destination
    payload JSONB NOT NULL,
    
    -- Retry & Scheduling
    attempts INT DEFAULT 0,
    last_error TEXT,
    run_after TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()), -- Para backoff o delay
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;

-- Política de seguridad: Solo el sistema (Service Role) puede tocar esto, o admins para debug
DROP POLICY IF EXISTS "Deny all public access to jobs" ON public.notification_jobs;
CREATE POLICY "Deny all public access to jobs"
    ON public.notification_jobs
    USING (false)
    WITH CHECK (false);

-- IDEMPOTENCIA: Evitar duplicados para el mismo evento y cita.
-- Si intentamos insertar un trabajo idéntico que aún no se procesó, lo actualizamos o ignoramos.
ALTER TABLE public.notification_jobs 
    DROP CONSTRAINT IF EXISTS notification_jobs_unique_event;

ALTER TABLE public.notification_jobs
    ADD CONSTRAINT notification_jobs_unique_event 
    UNIQUE (appointment_id, event_type, channel);


-- 2. TRIGGER FUNCTION V2 (PRODUCTION READY)
CREATE OR REPLACE FUNCTION public.queue_appointment_notification_v2()
RETURNS TRIGGER 
SECURITY DEFINER -- Necesario para leer barbers si el usuario final no tiene acceso
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

    -- OBTENER DATOS DEL BARBERO (TELEFONO)
    -- Asumimos que el teléfono del barbero está en public.barbers (columna phone_e164 o similar)
    -- Si no existe, intentamos buscar en profiles si tenemos user_id.
    -- Para este script asumiremos que existe 'phone' en 'barbers' o usaremos un fallback.
    
    SELECT name, phone 
    INTO v_barber_name, v_barber_phone
    FROM public.barbers 
    WHERE id = NEW.barber_id;

    -- Si el barbero no tiene teléfono configurado, no podemos notificarle por WhatsApp.
    -- OJO: Aquí podrías decidir notificar al Dueño del negocio como fallback.
    IF v_barber_phone IS NULL OR length(v_barber_phone) < 8 THEN
        -- Log o ignorar. Por ahora ignoramos para no llenar basura.
        RETURN NEW;
    END IF;

    -- Obtener nombre de servicio
    SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;

    -- Normalizar teléfono del cliente (intento básico)
    v_customer_phone := NEW.customer_phone;

    -- Construir Payload para Twilio Worker
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

    -- ENCOLAR TRABAJO (UPSERT / IDEMPOTENCIA)
    -- Usamos ON CONFLICT para actualizar si ya existía un job pendiente para este evento.
    -- Esto evita spam si el cliente edita la cita 5 veces en 1 minuto.
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
        v_barber_phone, -- Enviamos AL BARBERO
        v_payload, 
        'pending',
        0,
        now() -- Ejecutar ya (o podrías poner + '1 minute' para debounce extra)
    )
    ON CONFLICT (appointment_id, event_type, channel) 
    DO UPDATE SET
        payload = EXCLUDED.payload,      -- Actualizamos con la info más reciente
        status = 'pending',              -- Reseteamos a pending si estaba failed o processing antiguo
        run_after = now(),
        to_phone = EXCLUDED.to_phone,
        processed_at = NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 3. APLICAR TRIGGER
DROP TRIGGER IF EXISTS trg_notify_appointment_v2 ON public.appointments;

-- Borramos triggers viejos si existen para evitar conflictos
DROP TRIGGER IF EXISTS trg_notify_appointment ON public.appointments;

CREATE TRIGGER trg_notify_appointment_v2
    AFTER INSERT OR UPDATE OF status, appointment_date, start_time
    ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.queue_appointment_notification_v2();


-- 4. VALIDACIÓN DE COLUMNA PHONE EN BARBERS
-- Aseguramos que exista la columna para guardar el teléfono del barbero
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='phone') THEN
        ALTER TABLE public.barbers ADD COLUMN phone TEXT;
    END IF;
END $$;

SELECT 'TWILIO NOTIFICATIONS PROD READY (Queue + Trigger V2 + Idempotency)' as status;
