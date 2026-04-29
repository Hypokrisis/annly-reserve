-- ============================================================
-- MARKETING_SYSTEM_V1.sql
-- Implementación de Campañas de Marketing y Límites por Plan
-- ============================================================

-- 1. Actualizar Planes con Límites de Marketing
ALTER TABLE public.subscription_tiers 
ADD COLUMN IF NOT EXISTS max_marketing_messages INTEGER DEFAULT 0;

-- Configurar límites iniciales (20 para Starter como pidió el usuario)
UPDATE public.subscription_tiers SET max_marketing_messages = 20 WHERE id = 'starter';
UPDATE public.subscription_tiers SET max_marketing_messages = 500 WHERE id = 'essential';
UPDATE public.subscription_tiers SET max_marketing_messages = 10000 WHERE id = 'premium';

-- 2. Tabla de Campañas de Marketing
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL, -- El mensaje que se inyectará en el placeholder de Twilio
    audience_type TEXT NOT NULL DEFAULT 'inactive', -- 'all', 'inactive', 'selected'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed', 'cancelled'
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    sent_count INTEGER DEFAULT 0,
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Habilitar RLS para Campañas
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their campaigns" ON public.marketing_campaigns;
CREATE POLICY "Owners manage their campaigns"
    ON public.marketing_campaigns
    USING (EXISTS (
        SELECT 1 FROM public.businesses b 
        WHERE b.id = marketing_campaigns.business_id 
          AND b.owner_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.businesses b 
        WHERE b.id = marketing_campaigns.business_id 
          AND b.owner_id = auth.uid()
    ));

-- 3. Función para Procesar Campañas Programadas (Cron)
-- Esta función será llamada por pg_cron cada 10-15 minutos
CREATE OR REPLACE FUNCTION public.process_scheduled_campaigns()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    v_supabase_url TEXT;
    v_service_role_key TEXT;
BEGIN
    -- Obtener credenciales para llamar a la Edge Function
    -- En Supabase esto se puede configurar vía vault o settings, 
    -- pero para net.http_post usaremos el project ref si está disponible.
    
    FOR rec IN 
        SELECT id, business_id 
        FROM public.marketing_campaigns 
        WHERE status = 'pending' 
          AND scheduled_at <= now()
          AND scheduled_at > (now() - interval '24 hours') -- No procesar cosas muy viejas
    LOOP
        -- Marcar como procesando para evitar duplicados
        UPDATE public.marketing_campaigns SET status = 'processing' WHERE id = rec.id;

        -- Trigger Edge Function via pg_net
        -- NOTA: El URL definitivo se construye dinámicamente o se saca de config
        PERFORM net.http_post(
            url := (SELECT 'https://' || current_setting('app.supabase_project_ref') || '.supabase.co/functions/v1/send-reminders'),
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.service_role_key')
            ),
            body := jsonb_build_object(
                'campaignId', rec.id,
                'businessId', rec.business_id
            )
        );
    END LOOP;
END;
$$;

-- 4. Registro del Cron (Opcional si se hace manual en el dashboard)
-- SELECT cron.schedule('marketing-campaigns-worker', '*/15 * * * *', 'SELECT public.process_scheduled_campaigns()');

SELECT 'MARKETING_SYSTEM_V1 instalado correctamente ✅ (Límite Starter: 20)' AS status;
