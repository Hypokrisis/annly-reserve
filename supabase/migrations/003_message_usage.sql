-- Per-business monthly message usage counter (measurement only — no plan limits yet).
-- Answers "how many messages did this barbershop use this month?" with a simple query:
--   SELECT inbound_count + outbound_count FROM message_usage
--   WHERE business_id = $1 AND period_month = date_trunc('month', now())::date;

CREATE TABLE IF NOT EXISTS public.message_usage (
    business_id    uuid    NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    period_month   date    NOT NULL,                 -- first day of the month
    inbound_count  integer NOT NULL DEFAULT 0,       -- mensajes entrantes procesados
    outbound_count integer NOT NULL DEFAULT 0,       -- respuestas/notificaciones enviadas
    updated_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (business_id, period_month)
);

ALTER TABLE public.message_usage ENABLE ROW LEVEL SECURITY;

-- Owners/admins can READ their own usage. No write policy → only the service
-- role (barberbot / send-twilio) writes, bypassing RLS. Clients cannot write.
DROP POLICY IF EXISTS owners_read_message_usage ON public.message_usage;
CREATE POLICY owners_read_message_usage ON public.message_usage
    FOR SELECT
    USING (
        business_id IN (
            SELECT business_id FROM public.users_businesses
            WHERE user_id = auth.uid() AND role = ANY (ARRAY['owner','admin'])
        )
    );

-- Atomic monthly upsert+increment. SECURITY DEFINER; only service_role may call.
CREATE OR REPLACE FUNCTION public.increment_message_usage(
    p_business_id uuid,
    p_direction   text,            -- 'inbound' | 'outbound'
    p_count       integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF p_business_id IS NULL THEN RETURN; END IF;

    INSERT INTO public.message_usage (business_id, period_month, inbound_count, outbound_count, updated_at)
    VALUES (
        p_business_id,
        date_trunc('month', now())::date,
        CASE WHEN p_direction = 'inbound'  THEN p_count ELSE 0 END,
        CASE WHEN p_direction = 'outbound' THEN p_count ELSE 0 END,
        now()
    )
    ON CONFLICT (business_id, period_month) DO UPDATE SET
        inbound_count  = public.message_usage.inbound_count  + (CASE WHEN p_direction = 'inbound'  THEN p_count ELSE 0 END),
        outbound_count = public.message_usage.outbound_count + (CASE WHEN p_direction = 'outbound' THEN p_count ELSE 0 END),
        updated_at     = now();
END;
$$;

REVOKE ALL ON FUNCTION public.increment_message_usage(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_message_usage(uuid, text, integer) TO service_role;
