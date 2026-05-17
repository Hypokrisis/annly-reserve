-- =============================================================================
-- SPACEY RESERVE — SAAS UPGRADES & ANTIAVUSE LIMITS (V2)
-- Corre este script en Supabase Dashboard → SQL Editor → RUN
-- =============================================================================

-- ── 1. AGREGAR COLUMNAS DE PLAN A LA TABLA DE PLANES ─────────────────────────
ALTER TABLE public.subscription_tiers 
ADD COLUMN IF NOT EXISTS max_monthly_appointments INTEGER DEFAULT 150,
ADD COLUMN IF NOT EXISTS max_whatsapp_messages INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_inventory BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_advanced_reports BOOLEAN DEFAULT false;

-- ── 2. AGREGAR COLUMNAS DE USO A LA TABLA DE SUSCRIPCIONES ───────────────────────
ALTER TABLE public.business_subscriptions 
ADD COLUMN IF NOT EXISTS whatsapp_messages_sent INTEGER DEFAULT 0;

-- ── 2.5. AGREGAR COLUMNAS A LA TABLA DE NEGOCIOS ──────────────────────────────
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS whatsapp_bot_personality TEXT DEFAULT 'quick';

-- ── 3. ACTUALIZAR DETALLES DE LOS PLANES SEGÚN NUEVAS ESPECIFICACIONES ───────────
-- Starter ($19, 3 Barberos, 150 citas, 0 WA, Stripe deposits)
-- Essential ($39, 6 Barberos, 500 citas, 400 WA, Stripe deposits, stats)
-- Premium ($79, 20 Barberos, Citas ilimitadas [999999], 1200 WA, Stripe deposits, inventory, advanced reports)
INSERT INTO public.subscription_tiers (
    id, name, price_monthly, stripe_price_id, max_barbers, 
    max_monthly_appointments, max_whatsapp_messages, has_whatsapp_bot, 
    has_stripe_deposits, has_inventory, has_advanced_reports
)
VALUES 
    ('starter',   'Spacey Starter',   19.00, 'price_1TJMA7RuSgurFcMawTgWgacC', 3,   150,    0,    false, true,  false, false),
    ('essential', 'Spacey Essential', 39.00, 'price_1TJMAzRuSgurFcMa9OvzUYZA', 6,   500,    400,  true,  true,  false, false),
    ('premium',   'Spacey Premium',   79.00, 'price_1TJMCBRuSgurFcMaoXXmkwWL', 20,  999999, 1200, true,  true,  true,  true)
ON CONFLICT (id) DO UPDATE SET
    name                     = EXCLUDED.name,
    price_monthly            = EXCLUDED.price_monthly,
    stripe_price_id          = EXCLUDED.stripe_price_id,
    max_barbers              = EXCLUDED.max_barbers,
    max_monthly_appointments = EXCLUDED.max_monthly_appointments,
    max_whatsapp_messages    = EXCLUDED.max_whatsapp_messages,
    has_whatsapp_bot         = EXCLUDED.has_whatsapp_bot,
    has_stripe_deposits      = EXCLUDED.has_stripe_deposits,
    has_inventory            = EXCLUDED.has_inventory,
    has_advanced_reports     = EXCLUDED.has_advanced_reports;

-- ── 4. PREVENCIÓN DE ABUSO: TRIGGER PARA LIMITAR MIEMBROS DE EQUIPO (ANTI ACCOUNT SHARING)
CREATE OR REPLACE FUNCTION public.check_membership_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_barbers INTEGER;
  v_current_members INTEGER;
BEGIN
  -- Obtener el límite de barberos para el negocio según su plan activo
  SELECT COALESCE(t.max_barbers, 3) INTO v_max_barbers
  FROM public.business_subscriptions bs
  JOIN public.subscription_tiers t ON bs.tier_id = t.id
  WHERE bs.business_id = NEW.business_id;

  -- Si no hay registro de suscripción, asumir el límite de Starter (3)
  IF v_max_barbers IS NULL THEN
    v_max_barbers := 3;
  END IF;

  -- Contar miembros actuales de la organización
  SELECT COUNT(*) INTO v_current_members
  FROM public.users_businesses
  WHERE business_id = NEW.business_id;

  -- Si excede el límite de miembros del plan, rechazar inserción
  IF v_current_members >= v_max_barbers THEN
    RAISE EXCEPTION 'Límite de miembros del equipo alcanzado para tu plan actual (% de %). Sube de plan para agregar más miembros y evitar compartir cuentas.', v_current_members, v_max_barbers;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_membership_limit ON public.users_businesses;
CREATE TRIGGER check_membership_limit
BEFORE INSERT ON public.users_businesses
FOR EACH ROW EXECUTE FUNCTION public.check_membership_limit();


-- ── 5. CONTROL DE LÍMITES: TRIGGER PARA ENFORZAR CITAS MENSUALES COMPLETADAS/CONFIRMADAS
CREATE OR REPLACE FUNCTION public.check_appointment_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_appointments INTEGER;
  v_current_appointments INTEGER;
  v_start_of_month DATE;
BEGIN
  -- Obtener el límite de citas de la suscripción activa
  SELECT COALESCE(t.max_monthly_appointments, 150) INTO v_max_appointments
  FROM public.business_subscriptions bs
  JOIN public.subscription_tiers t ON bs.tier_id = t.id
  WHERE bs.business_id = NEW.business_id;

  -- Si no hay registro de suscripción, asumir el de Starter (150)
  IF v_max_appointments IS NULL THEN
    v_max_appointments := 150;
  END IF;

  -- Obtener el primer día del mes actual en base a la fecha de la cita o fecha actual
  v_start_of_month := date_trunc('month', NEW.appointment_date)::date;

  -- Contar citas de este negocio en el mes de la reserva
  SELECT COUNT(*) INTO v_current_appointments
  FROM public.appointments
  WHERE business_id = NEW.business_id
    AND appointment_date >= v_start_of_month
    AND status IN ('confirmed', 'completed');

  -- Si supera el límite de citas del plan, denegar inserción
  IF v_current_appointments >= v_max_appointments THEN
    RAISE EXCEPTION 'Este negocio ha alcanzado el límite de citas para el mes de la reserva (% de % citas). Sube de plan para seguir recibiendo citas.', v_current_appointments, v_max_appointments;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_appointment_limit ON public.appointments;
CREATE TRIGGER check_appointment_limit
BEFORE INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.check_appointment_limit();


-- ── 6. CREAR EL TRIGGER DE SUSCRIPCIÓN AUTOMÁTICA (TRIAL DE 14 DÍAS) ───────────
CREATE OR REPLACE FUNCTION public.trg_create_default_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Desactivar RLS temporalmente en la ejecución para evitar fallos de permisos
  PERFORM set_config('row_security', 'off', TRUE);
  
  -- Insertar una suscripción trialing de 14 días en el plan Starter
  INSERT INTO public.business_subscriptions (business_id, tier_id, status, current_period_end)
  VALUES (NEW.id, 'starter', 'trialing', timezone('utc', now() + interval '14 days'))
  ON CONFLICT (business_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_default_subscription ON public.businesses;
CREATE TRIGGER create_default_subscription
AFTER INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.trg_create_default_subscription();


-- ── 7. BACKFILL: APLICAR EL TRIAL DE 14 DÍAS A LOS NEGOCIOS EXISTENTES QUE NO TIENEN ──
INSERT INTO public.business_subscriptions (business_id, tier_id, status, current_period_end)
SELECT id, 'starter', 'trialing', timezone('utc', now() + interval '14 days')
FROM public.businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM public.business_subscriptions bs 
    WHERE bs.business_id = b.id
)
ON CONFLICT (business_id) DO NOTHING;
