-- ============================================================
-- 012_security_rls_fixes.sql
-- Cierra las 2 vulnerabilidades de seguridad identificadas en auditoría:
-- 1. appointments: "Anyone can view confirmed appointments" expone PII pública
-- 2. profiles: tabla sin RLS (teléfonos y nombres expuestos)
-- ============================================================

-- ── 1. APPOINTMENTS: quitar policy que expone PII pública ─────────────────────

DROP POLICY IF EXISTS "Anyone can view confirmed appointments" ON public.appointments;

-- Clientes autenticados pueden ver SUS PROPIAS citas (por client_id o email)
CREATE POLICY "Clients can view own appointments" ON public.appointments
FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND status = 'confirmed'
    AND (
        client_id = auth.uid()
        OR lower(customer_email) = lower(auth.email())
    )
);

-- RPC SECURITY DEFINER para páginas públicas de cancelación (cancel_token como auth)
-- Devuelve solo los campos necesarios para la UI — sin exponer todos los registros.
CREATE OR REPLACE FUNCTION public.get_appointment_by_cancel_token(p_token TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_row RECORD;
BEGIN
    SELECT
        a.id,
        a.customer_name,
        a.appointment_date,
        a.start_time,
        a.status,
        a.business_id,
        a.barber_id,
        a.service_id,
        a.cancel_token,
        s.name  AS service_name,
        b.name  AS barber_name,
        biz.name AS business_name,
        biz.slug AS business_slug
    INTO v_row
    FROM public.appointments a
    LEFT JOIN public.services  s   ON s.id   = a.service_id
    LEFT JOIN public.barbers   b   ON b.id   = a.barber_id
    LEFT JOIN public.businesses biz ON biz.id = a.business_id
    WHERE a.cancel_token = p_token;

    IF NOT FOUND THEN RETURN NULL; END IF;

    RETURN jsonb_build_object(
        'id',               v_row.id,
        'customer_name',    v_row.customer_name,
        'appointment_date', v_row.appointment_date,
        'start_time',       v_row.start_time,
        'status',           v_row.status,
        'business_id',      v_row.business_id,
        'barber_id',        v_row.barber_id,
        'service_id',       v_row.service_id,
        'cancel_token',     v_row.cancel_token,
        'services',         jsonb_build_object('name', v_row.service_name),
        'barbers',          jsonb_build_object('name', v_row.barber_name),
        'businesses',       jsonb_build_object('name', v_row.business_name, 'slug', v_row.business_slug)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_appointment_by_cancel_token(TEXT) TO anon, authenticated;

-- ── 2. PROFILES: habilitar RLS ────────────────────────────────────────────────
-- La tabla profiles guarda full_name, phone, phone_verified de cada usuario.
-- Sin RLS estaba accesible públicamente con la anon key.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo ve y edita su propio perfil
CREATE POLICY "Users read own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Users insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- El service role (barberbot, edge functions) bypasea RLS automáticamente.
