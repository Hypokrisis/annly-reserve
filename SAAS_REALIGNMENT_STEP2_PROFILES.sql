-- SAAS_REALIGNMENT_STEP2_PROFILES.sql
-- Crea tabla profiles para usuarios normales (clientes)
-- Permite almacenar nombre y teléfono para autocompletar en booking

-- 1. Crear tabla profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    phone text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 3. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_profiles_updated_at();

-- 4. Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Confirmación
DO $$
BEGIN
    RAISE NOTICE 'Tabla profiles creada correctamente';
    RAISE NOTICE 'RLS habilitado: usuarios solo pueden ver/editar su propio perfil';
END $$;
