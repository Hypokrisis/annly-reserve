-- FIX_APPOINTMENT_CREATION.sql
-- Ejecuta este script una sola vez en el SQL Editor de Supabase
-- Objetivo: Calcular end_time automático y asegurar RLS para citas

-- 1. Trigger para calcular end_time automáticamente
CREATE OR REPLACE FUNCTION public.set_appointment_end_time()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_duration int;
BEGIN
  -- Si ya viene calculado, lo respetamos (aunque idealmente debería ser autocalculado siempre)
  IF NEW.end_time IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener duración del servicio
  SELECT s.duration_minutes
    INTO v_duration
  FROM public.services s
  WHERE s.id = NEW.service_id;

  IF v_duration IS NULL THEN
    RAISE EXCEPTION 'Service duration not found for service_id=%', NEW.service_id;
  END IF;

  -- Calcular end_time tomando start_time + duration
  NEW.end_time := (NEW.start_time + make_interval(mins => v_duration));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_appointment_end_time ON public.appointments;

CREATE TRIGGER trg_set_appointment_end_time
    BEFORE INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_appointment_end_time();

-- 2. RLS: Solo autenticados pueden insertar
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_insert_authenticated" ON public.appointments;

CREATE POLICY "appointments_insert_authenticated"
    ON public.appointments
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- 3. (Recomendado) SELECT para autenticados (dueños/staff/cliente dueño de la cita)
-- Nota: Mantenemos las políticas existentes de lectura si ya funcionan, 
-- pero añadimos esta genérica de "authenticated" si faltaba acceso básico.
-- Si ya tienes políticas complejas de "Business members" y "Own appointments", 
-- esta podría ser redundante o conflictiva. 
-- Por seguridad, aplicamos SOLO la de INSERT solicitada explícitamente y dejamos SELECT 
-- a las políticas existentes (SAAS_REALIGNMENT_MASTER_CLEAN ya manejaba SELECTs complejos).

SELECT 'FIX APPOINTMENT CREATION: Trigger and Insert Policy Applied' as status;
