-- ============================================================
-- 013_phone_verification_security.sql
-- Protección anti-fuerza bruta en verificación de teléfono:
-- 1. Columna attempts en phone_verifications para contar fallos
-- 2. verify_phone_code: bloquear tras 5 intentos fallidos
-- ============================================================

ALTER TABLE public.phone_verifications
    ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;

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
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No autorizado.');
    END IF;

    -- Buscar código pendiente más reciente para este usuario
    SELECT * INTO v_rec
    FROM   public.phone_verifications
    WHERE  user_id    = v_user_id
      AND  used       = false
      AND  expires_at > now()
    ORDER  BY created_at DESC
    LIMIT  1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Código inválido o expirado.');
    END IF;

    -- Bloquear tras 5 intentos fallidos
    IF v_rec.attempts >= 5 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Demasiados intentos. Solicita un nuevo código.');
    END IF;

    -- Código incorrecto: incrementar contador
    IF v_rec.code != p_code THEN
        UPDATE public.phone_verifications
        SET    attempts = attempts + 1
        WHERE  id = v_rec.id;
        RETURN jsonb_build_object('success', false, 'error', 'Código incorrecto.');
    END IF;

    -- Código correcto: marcar usado
    UPDATE public.phone_verifications SET used = true WHERE id = v_rec.id;

    -- Actualizar perfil: teléfono verificado
    UPDATE public.profiles
    SET    phone          = v_rec.phone,
           phone_verified = true
    WHERE  id = v_user_id;

    -- Linkear citas del bot con este teléfono al client_id
    UPDATE public.appointments
    SET    client_id = v_user_id
    WHERE  customer_phone = v_rec.phone
      AND  client_id IS NULL;

    RETURN jsonb_build_object('success', true, 'phone', v_rec.phone);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_phone_code(TEXT) TO authenticated;
