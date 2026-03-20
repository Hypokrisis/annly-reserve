-- FIX_WHATSAPP_TRIGGER.sql
-- Goal: Update the trigger to use the new whatsapp_bot_active flag from businesses table.

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
    v_bot_active BOOLEAN;
BEGIN
    -- Validaciones Críticas
    IF NEW.business_id IS NULL THEN
        RETURN NEW; 
    END IF;

    -- Verificar si el bot está activo para este negocio
    SELECT whatsapp_bot_active INTO v_bot_active FROM public.businesses WHERE id = NEW.business_id;
    IF v_bot_active IS NOT TRUE THEN
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

SELECT 'WhatsApp Trigger Updated to use businesses.whatsapp_bot_active' as status;
