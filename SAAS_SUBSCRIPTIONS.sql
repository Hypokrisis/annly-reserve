-- ============================================================
-- SPACEY RESERVE — SETUP COMPLETO (VERSIÓN SEGURA / IDEMPOTENTE)
-- Puedes correr este script múltiples veces sin errores.
-- Supabase Dashboard → SQL Editor → New Query → RUN
-- ============================================================

-- ── 1. TABLA DE PLANES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_monthly NUMERIC NOT NULL,
    stripe_price_id TEXT,
    max_barbers INTEGER DEFAULT 1,
    has_whatsapp_bot BOOLEAN DEFAULT false,
    has_stripe_deposits BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ── 2. TABLA DE SUSCRIPCIONES DE NEGOCIOS ───────────────────
CREATE TABLE IF NOT EXISTS public.business_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    tier_id TEXT NOT NULL REFERENCES public.subscription_tiers(id),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'trialing',
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE(business_id)
);

-- ── 3. DATOS DE LOS PLANES ───────────────────────────────────
INSERT INTO public.subscription_tiers (id, name, price_monthly, stripe_price_id, max_barbers, has_whatsapp_bot, has_stripe_deposits)
VALUES 
    ('starter',   'Spacey Starter',   19.99, 'price_1TJMA7RuSgurFcMawTgWgacC', 1,   false, false),
    ('essential', 'Spacey Essential', 39.99, 'price_1TJMAzRuSgurFcMa9OvzUYZA', 3,   true,  false),
    ('premium',   'Spacey Premium',   79.99, 'price_1TJMCBRuSgurFcMaoXXmkwWL', 999, true,  true)
ON CONFLICT (id) DO UPDATE SET
    stripe_price_id      = EXCLUDED.stripe_price_id,
    name                 = EXCLUDED.name,
    price_monthly        = EXCLUDED.price_monthly,
    max_barbers          = EXCLUDED.max_barbers,
    has_whatsapp_bot     = EXCLUDED.has_whatsapp_bot,
    has_stripe_deposits  = EXCLUDED.has_stripe_deposits;

-- ── 4. HABILITAR RLS ────────────────────────────────────────
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

-- ── 5. POLÍTICAS (DROP PRIMERO PARA EVITAR ERRORES) ─────────

-- subscription_tiers: todos pueden ver los planes
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.subscription_tiers;
CREATE POLICY "Public profiles are viewable by everyone."
ON public.subscription_tiers FOR SELECT USING (true);

-- business_subscriptions: solo el dueño ve su suscripción
DROP POLICY IF EXISTS "Dueños pueden ver su suscripción" ON public.business_subscriptions;
CREATE POLICY "Dueños pueden ver su suscripción"
ON public.business_subscriptions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users_businesses ub
        WHERE ub.business_id = business_subscriptions.business_id
          AND ub.user_id = auth.uid()
          AND ub.role IN ('owner', 'admin')
    )
);

-- business_subscriptions: el service role (webhooks de Stripe) puede hacer todo
DROP POLICY IF EXISTS "System can manage subscriptions" ON public.business_subscriptions;
CREATE POLICY "System can manage subscriptions"
ON public.business_subscriptions FOR ALL USING (true) WITH CHECK (true);

-- ── 6. VERIFICACIÓN FINAL ────────────────────────────────────
SELECT id, name, price_monthly, stripe_price_id FROM public.subscription_tiers;
