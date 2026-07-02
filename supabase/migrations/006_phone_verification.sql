-- ============================================================
-- 006_phone_verification.sql
-- Verificación de teléfono por SMS para clientes.
-- ============================================================

-- 1. Tabla de códigos de verificación
CREATE TABLE IF NOT EXISTS public.phone_verifications (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone       TEXT        NOT NULL,
    code        TEXT        NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN     DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo ve sus propios códigos
CREATE POLICY "Own verifications only"
    ON public.phone_verifications FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_phone_verif_user ON public.phone_verifications(user_id);

-- 2. Columna phone_verified en profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- 3. RPC: verificar código → marcar teléfono + linkar citas
CREATE OR REPLACE FUNCTION public.verify_phone_code(p_code TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_rec     public.phone_verifications%ROWTYPE;
BEGIN
    -- Buscar código válido para este usuario
    SELECT * INTO v_rec
    FROM   public.phone_verifications
    WHERE  user_id    = v_user_id
      AND  code       = p_code
      AND  used       = false
      AND  expires_at > now()
    ORDER  BY created_at DESC
    LIMIT  1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Código inválido o expirado.');
    END IF;

    -- Marcar código como usado
    UPDATE public.phone_verifications SET used = true WHERE id = v_rec.id;

    -- Marcar teléfono como verificado en el perfil
    UPDATE public.profiles
    SET    phone          = v_rec.phone,
           phone_verified = true
    WHERE  id = v_user_id;

    -- Linkar citas existentes con este teléfono al user_id
    -- (citas hechas por WhatsApp antes de crear la cuenta)
    UPDATE public.appointments
    SET    client_id = v_user_id
    WHERE  customer_phone = v_rec.phone
      AND  client_id IS NULL;

    RETURN jsonb_build_object('success', true, 'phone', v_rec.phone);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_phone_code(TEXT) TO authenticated;

SELECT 'phone_verifications: tabla + función verify_phone_code creadas' AS status;
