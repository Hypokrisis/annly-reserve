-- AUTO_REMINDERS_V2.sql (PRODUCTION SAFE)

-- 1. Añadir columnas de tracking a public.appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_30m_sent BOOLEAN DEFAULT false;

-- 2. Función Automática para escanear y enviar recordatorios
CREATE OR REPLACE FUNCTION public.process_automated_reminders()
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    rec RECORD;
    v_timestamp TIMESTAMP WITH TIME ZONE;
    v_business_active BOOLEAN;
    v_target_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Obtener la hora actual UTC
    v_timestamp := timezone('utc'::text, now());

    -- BUCLE PARA RECORDATORIOS (24H)
    FOR rec IN 
        SELECT a.id, a.business_id, a.barber_id, a.customer_email, a.customer_phone, a.customer_name, 
               b.name as barber_name, s.name as service_name, a.appointment_date, a.start_time
        FROM public.appointments a
        LEFT JOIN public.barbers b ON a.barber_id = b.id
        LEFT JOIN public.services s ON a.service_id = s.id
        WHERE a.status = 'booked' 
          AND a.reminder_24h_sent = false
    LOOP
        -- Validar si el negocio tiene el bot encendido
        SELECT is_active INTO v_business_active 
        FROM public.whatsapp_settings 
        WHERE business_id = rec.business_id;

        IF v_business_active THEN
            -- Calcular a qué hora es la cita (en UTC, asumiendo o forzando zona local luego)
            -- Como mínimo, si (Fecha Cita - Ahora) <= 24h
            -- Usaremos una lógica de strings que compara timestamp
            v_target_time := (rec.appointment_date || ' ' || rec.start_time)::timestamp;
            
            IF (v_target_time - interval '24 hours') <= v_timestamp AND v_target_time > v_timestamp THEN
                
                INSERT INTO public.notification_jobs (business_id, event_type, payload, appointment_id)
                VALUES (
                    rec.business_id, 
                    'reminder_24h', 
                    jsonb_build_object(
                        'appointment_id', rec.id,
                        'customer_phone', rec.customer_phone,
                        'customer_name', COALESCE(rec.customer_name, 'Cliente'),
                        'service_name', COALESCE(rec.service_name, 'Servicio'),
                        'appointment_date', rec.appointment_date,
                        'start_time', rec.start_time
                    ),
                    rec.id
                );

                UPDATE public.appointments SET reminder_24h_sent = true WHERE id = rec.id;
            END IF;
        END IF;
    END LOOP;

    -- BUCLE PARA RECORDATORIOS (30 MIN)
    FOR rec IN 
        SELECT a.id, a.business_id, a.barber_id, a.customer_phone, a.customer_name, 
               s.name as service_name, a.appointment_date, a.start_time
        FROM public.appointments a
        LEFT JOIN public.services s ON a.service_id = s.id
        WHERE a.status = 'booked' 
          AND a.reminder_30m_sent = false
    LOOP
        SELECT is_active INTO v_business_active FROM public.whatsapp_settings WHERE business_id = rec.business_id;

        IF v_business_active THEN
            v_target_time := (rec.appointment_date || ' ' || rec.start_time)::timestamp;
            
            IF (v_target_time - interval '30 minutes') <= v_timestamp AND v_target_time > v_timestamp THEN
                
                INSERT INTO public.notification_jobs (business_id, event_type, payload, appointment_id)
                VALUES (
                    rec.business_id, 
                    'reminder_30m', 
                    jsonb_build_object(
                        'appointment_id', rec.id,
                        'customer_phone', rec.customer_phone,
                        'customer_name', COALESCE(rec.customer_name, 'Cliente'),
                        'service_name', COALESCE(rec.service_name, 'Servicio'),
                        'appointment_date', rec.appointment_date,
                        'start_time', rec.start_time
                    ),
                    rec.id
                );

                UPDATE public.appointments SET reminder_30m_sent = true WHERE id = rec.id;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Función RPC (Remote Procedure Call) para enviar SMS Manualmente
CREATE OR REPLACE FUNCTION public.force_send_reminder(p_appointment_id UUID)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rec RECORD;
    v_business_active BOOLEAN;
BEGIN
    SELECT a.*, s.name as service_name 
    INTO v_rec 
    FROM public.appointments a
    LEFT JOIN public.services s ON a.service_id = s.id
    WHERE a.id = p_appointment_id;

    IF v_rec.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cita no encontrada');
    END IF;

    -- Solo forzamos si el status es booked
    IF v_rec.status != 'booked' THEN
        RETURN jsonb_build_object('success', false, 'error', 'La cita debe estar confirmada (booked)');
    END IF;

    -- Meter en la cola
    INSERT INTO public.notification_jobs (business_id, event_type, payload, appointment_id)
    VALUES (
        v_rec.business_id, 
        'reminder_manual', 
        jsonb_build_object(
            'appointment_id', v_rec.id,
            'customer_phone', v_rec.customer_phone,
            'customer_name', COALESCE(v_rec.customer_name, 'Cliente'),
            'service_name', COALESCE(v_rec.service_name, 'Servicio'),
            'appointment_date', v_rec.appointment_date,
            'start_time', v_rec.start_time
        ),
        v_rec.id
    );

    RETURN jsonb_build_object('success', true, 'message', 'Reminder queued successfully');
END;
$$ LANGUAGE plpgsql;

-- Para habilitar pg_cron (Debe hacerse como SU, o usar la extension pg_cron native si está instalada)
-- En Supabase la mejor forma es crear la extensión y luego usar cron.schedule.
-- Si hay error aquí, el usuario lo hará desde Console UI.
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('reminders_cron', '*/10 * * * *', 'SELECT public.process_automated_reminders()');

SELECT 'AUTO_REMINDERS_V2 instalada correctamente' as status;
