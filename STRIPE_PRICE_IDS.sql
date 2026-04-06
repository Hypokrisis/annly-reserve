-- ========================================================
-- STRIPE_PRICE_IDS.sql
-- Actualiza los Price IDs reales de Stripe en la DB
-- Abre Supabase Dashboard → SQL Editor → New Query
-- ========================================================

UPDATE public.subscription_tiers
SET stripe_price_id = 'price_1TJMA7RuSgurFcMawTgWgacC'
WHERE id = 'starter';

UPDATE public.subscription_tiers
SET stripe_price_id = 'price_1TJMAzRuSgurFcMa9OvzUYZA'
WHERE id = 'essential';

UPDATE public.subscription_tiers
SET stripe_price_id = 'price_1TJMCBRuSgurFcMaoXXmkwWL'
WHERE id = 'premium';

-- Verificar que todo está correcto:
SELECT id, name, stripe_price_id, price_monthly FROM public.subscription_tiers;
