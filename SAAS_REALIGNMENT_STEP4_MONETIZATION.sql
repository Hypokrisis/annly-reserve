-- SAAS_REALIGNMENT_STEP4_MONETIZATION.sql
-- Agrega columnas para control de suscripción y planes
-- Base para futura monetización (Stripe, etc.)

-- 1. Agregar columnas de plan a businesses
ALTER TABLE public.businesses 
    ADD COLUMN IF NOT EXISTS plan_status text DEFAULT 'trial' 
        CHECK (plan_status IN ('trial', 'active', 'inactive', 'cancelled')),
    ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz,
    ADD COLUMN IF NOT EXISTS stripe_customer_id text,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- 2. Comentarios en las columnas
COMMENT ON COLUMN public.businesses.plan_status IS 
    'Estado del plan: trial (prueba), active (pagando), inactive (suspendido), cancelled (cancelado)';
COMMENT ON COLUMN public.businesses.subscription_ends_at IS 
    'Fecha de fin de suscripción. NULL = sin límite o trial';
COMMENT ON COLUMN public.businesses.stripe_customer_id IS 
    'ID del cliente en Stripe (para futura integración)';
COMMENT ON COLUMN public.businesses.stripe_subscription_id IS 
    'ID de la suscripción en Stripe (para futura integración)';

-- 3. Índice para queries de estado
CREATE INDEX IF NOT EXISTS idx_businesses_plan_status 
    ON public.businesses(plan_status);

-- 4. Índice para suscripciones próximas a vencer
CREATE INDEX IF NOT EXISTS idx_businesses_subscription_ends 
    ON public.businesses(subscription_ends_at) 
    WHERE subscription_ends_at IS NOT NULL;

-- 5. Actualizar businesses existentes a 'trial'
UPDATE public.businesses 
SET plan_status = 'trial' 
WHERE plan_status IS NULL;

-- Confirmación
DO $$
DECLARE
    total_businesses integer;
    trial_count integer;
    active_count integer;
BEGIN
    SELECT COUNT(*) INTO total_businesses FROM public.businesses;
    SELECT COUNT(*) INTO trial_count FROM public.businesses WHERE plan_status = 'trial';
    SELECT COUNT(*) INTO active_count FROM public.businesses WHERE plan_status = 'active';
    
    RAISE NOTICE 'Columnas de monetización agregadas correctamente';
    RAISE NOTICE 'Total de barberías: %', total_businesses;
    RAISE NOTICE 'En trial: %', trial_count;
    RAISE NOTICE 'Activas: %', active_count;
    RAISE NOTICE 'NOTA: Todos los negocios existentes están en trial por defecto';
END $$;
