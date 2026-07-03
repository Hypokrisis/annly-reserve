-- Eliminar todos los triggers duplicados de notificación.
-- Había 4 triggers disparando al mismo INSERT en appointments,
-- causando duplicate key en notification_jobs_pending_unique.

DROP TRIGGER IF EXISTS trg_notify_appointment                ON public.appointments;
DROP TRIGGER IF EXISTS trg_notify_appointment_v2             ON public.appointments;
DROP TRIGGER IF EXISTS trg_queue_appointment_notification_v2 ON public.appointments;
DROP TRIGGER IF EXISTS queue_appointment_notification_v2     ON public.appointments;

-- Recrear solo el trigger correcto (función con SECURITY DEFINER + ON CONFLICT).
CREATE TRIGGER queue_appointment_notification_v2
    AFTER INSERT OR UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.queue_appointment_notification_v2();
