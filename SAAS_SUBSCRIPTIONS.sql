-- ========================================================
-- SISTEMA DE SUSCRIPCIONES SAAS (STRIPE)
-- Abre el Supabase Dashboard -> SQL Editor -> New Query
-- Pega este código y dale a "RUN"
-- ========================================================

-- 1. Tabla de Planes / Tiers
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
    id TEXT PRIMARY KEY, -- 'starter', 'essential', 'premium'
    name TEXT NOT NULL,
    price_monthly NUMERIC NOT NULL,
    stripe_price_id TEXT, -- ID del producto en Stripe
    max_barbers INTEGER DEFAULT 1,
    has_whatsapp_bot BOOLEAN DEFAULT false,
    has_stripe_deposits BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertar los planes base
INSERT INTO public.subscription_tiers (id, name, price_monthly, max_barbers, has_whatsapp_bot, has_stripe_deposits)
VALUES 
    ('starter', 'Spacey Starter', 19.99, 1, false, false),
    ('essential', 'Spacey Essential', 39.99, 3, true, false),
    ('premium', 'Spacey Premium', 79.99, 999, true, true)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, 
    price_monthly = EXCLUDED.price_monthly,
    max_barbers = EXCLUDED.max_barbers,
    has_whatsapp_bot = EXCLUDED.has_whatsapp_bot,
    has_stripe_deposits = EXCLUDED.has_stripe_deposits;

-- 2. Tabla de Suscripciones Activas de los Negocios
CREATE TABLE IF NOT EXISTS public.business_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    tier_id TEXT NOT NULL REFERENCES public.subscription_tiers(id),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'trialing', -- 'trialing', 'active', 'past_due', 'canceled', 'unpaid'
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(business_id) -- Un negocio solo puede tener una suscripción activa
);

-- Habilitar RLS
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de Tiers (Todos pueden ver los planes)
CREATE POLICY "Public profiles are viewable by everyone." 
ON public.subscription_tiers FOR SELECT USING (true);

-- Políticas de Suscripciones (Solo dueños pueden ver su propia suscripción)
CREATE POLICY "Dueños pueden ver su suscripción" 
ON public.business_subscriptions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users_businesses ub 
        WHERE ub.business_id = business_subscriptions.business_id 
        AND ub.user_id = auth.uid() 
        AND ub.role IN ('owner', 'admin')
    )
);

-- Solamente el Service Role (Webhooks de Stripe) puede insertar/actualizar
CREATE POLICY "System can manage subscriptions" 
ON public.business_subscriptions FOR ALL USING (true) WITH CHECK (true);

-- ========================================================
-- ¡LISTO!
-- ========================================================
