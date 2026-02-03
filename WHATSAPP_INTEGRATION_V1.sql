-- WHATSAPP_INTEGRATION_V1.sql (PRODUCTION SAFE)

-- 0. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. CONFIGURACIÓN (Settings del Negocio)
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
    business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
    phone_number_id TEXT NOT NULL,
    access_token TEXT NOT NULL, 
    recipient_phone TEXT, -- Nuevo: Teléfono destino para MVP (Dueño/Admin)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- Solo el dueño ve/edita sus credenciales
DROP POLICY IF EXISTS "Owners can manage whatsapp settings" ON public.whatsapp_settings;
CREATE POLICY "Owners can manage whatsapp settings"
    ON public.whatsapp_settings
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = whatsapp_settings.business_id
            AND b.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = whatsapp_settings.business_id
            AND b.owner_id = auth.uid()
        )
    );

-- 2. COLA DE MENSAJERÍA (Outbox)
CREATE TABLE IF NOT EXISTS public.notification_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'created', 'cancelled', 'rescheduled'
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'skipped'
    payload JSONB NOT NULL,
    retry_count INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;

-- Deny All (Solo Edge Function con Service Role puede tocar esto)
DROP POLICY IF EXISTS "Deny all public access to jobs" ON public.notification_jobs;
CREATE POLICY "Deny all public access to jobs"
    ON public.notification_jobs
    USING (false)
    WITH CHECK (false);

-- 3. TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.queue_appointment_notification()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_business_id UUID;
    v_barber_name TEXT;
    v_service_name TEXT;
    v_event_type TEXT := NULL;
    v_old_date TEXT := NULL;
    v_old_time TEXT := NULL;
    v_payload JSONB;
BEGIN
    -- Validaciones Críticas
    IF NEW.business_id IS NULL THEN
        RETURN NEW; 
    END IF;

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
    IF v_event_type IS NULL THEN
        RETURN NEW;
    END IF;

    -- Verificar Configuración Activa
    IF NOT EXISTS (SELECT 1 FROM public.whatsapp_settings WHERE business_id = v_business_id AND is_active = true) THEN
        RETURN NEW;
    END IF;

    -- Obtener Nombres (Safe Query)
    IF NEW.barber_id IS NOT NULL THEN
        SELECT name INTO v_barber_name FROM public.barbers WHERE id = NEW.barber_id;
    END IF;
    
    IF NEW.service_id IS NOT NULL THEN
        SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;
    END IF;

    -- Payload Completo
    v_payload := jsonb_build_object(
        'appointment_id', NEW.id,
        'business_id', NEW.business_id,
        'barber_id', NEW.barber_id,
        'barber_name', COALESCE(v_barber_name, 'No Asignado'),
        'customer_email', NEW.customer_email,
        'customer_phone', NEW.customer_phone,
        'customer_name', COALESCE(NEW.customer_name, 'Cliente'),
        'service_name', COALESCE(v_service_name, 'Servicio'),
        'appointment_date', NEW.appointment_date,
        'start_time', NEW.start_time,
        'old_date', v_old_date,
        'old_time', v_old_time
    );

    -- Encolar Job
    INSERT INTO public.notification_jobs (business_id, event_type, payload)
    VALUES (v_business_id, v_event_type, v_payload);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. TRIGGER DEFINITIVO
DROP TRIGGER IF EXISTS trg_notify_appointment ON public.appointments;

CREATE TRIGGER trg_notify_appointment
    AFTER INSERT OR UPDATE OF status, appointment_date, start_time
    ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.queue_appointment_notification();

SELECT 'WhatsApp SQL Final (Production Safe) Ready' as status;
