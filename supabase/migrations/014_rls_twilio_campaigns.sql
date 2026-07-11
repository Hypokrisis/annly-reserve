-- ============================================================
-- 014_rls_twilio_campaigns.sql
-- Habilita RLS en twilio_settings y marketing_campaigns.
-- Antes estaban desactivadas (cualquiera con anon key podía leer/escribir).
-- ============================================================

-- ── 1. TWILIO_SETTINGS ────────────────────────────────────────────────────────
-- Solo el dueño del negocio (owner/admin) debe poder leer/escribir sus credenciales.

ALTER TABLE public.twilio_settings ENABLE ROW LEVEL SECURITY;

-- Lectura: solo usuarios autenticados que sean miembros del negocio
CREATE POLICY "Business members can read twilio_settings" ON public.twilio_settings
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = twilio_settings.business_id
              AND bm.user_id = auth.uid()
              AND bm.is_active = true
        )
    );

-- Escritura: solo owners/admins del negocio
CREATE POLICY "Owners can manage twilio_settings" ON public.twilio_settings
    FOR ALL USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = twilio_settings.business_id
              AND bm.user_id = auth.uid()
              AND bm.role IN ('owner', 'admin')
              AND bm.is_active = true
        )
    );


-- ── 2. MARKETING_CAMPAIGNS ────────────────────────────────────────────────────
-- Solo los miembros del negocio deben ver sus campañas.

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Lectura: miembros activos del negocio
CREATE POLICY "Business members can read campaigns" ON public.marketing_campaigns
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = marketing_campaigns.business_id
              AND bm.user_id = auth.uid()
              AND bm.is_active = true
        )
    );

-- Escritura: solo owners/admins
CREATE POLICY "Owners can manage campaigns" ON public.marketing_campaigns
    FOR ALL USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = marketing_campaigns.business_id
              AND bm.user_id = auth.uid()
              AND bm.role IN ('owner', 'admin')
              AND bm.is_active = true
        )
    );

-- El service role (barberbot, edge functions) bypasea RLS automáticamente.
-- Las edge functions usan SUPABASE_SERVICE_ROLE_KEY, no se ven afectadas.
