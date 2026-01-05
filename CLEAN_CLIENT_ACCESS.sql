-- CLEAN_CLIENT_ACCESS.sql
-- 1. Arreglar la tabla appointments para el modelo SaaS
-- Asegurar que customer_user_id existe y es del tipo correcto
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES auth.users(id);

-- 2. Habilitar RLS en appointments (por si acaso no lo está)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 3. Política para que los usuarios AUTENTICADOS puedan reservar sus propias citas
DROP POLICY IF EXISTS "Public create appointments" ON public.appointments;
CREATE POLICY "Authenticated create appointments" 
    ON public.appointments FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = customer_user_id);

-- 4. Política para que los clientes VEAN sus propias citas
-- Usamos customer_user_id para identificar al dueño de la cita
DROP POLICY IF EXISTS "Clients can view their own appointments" ON public.appointments;
CREATE POLICY "Clients can view their own appointments"
    ON public.appointments FOR SELECT
    TO authenticated
    USING (customer_user_id = auth.uid());

-- 5. Política para que los clientes ACTUALICEN/CANCELEN sus propias citas
DROP POLICY IF EXISTS "Clients can cancel their own appointments" ON public.appointments;
CREATE POLICY "Clients can cancel their own appointments"
    ON public.appointments FOR UPDATE
    TO authenticated
    USING (customer_user_id = auth.uid())
    WITH CHECK (customer_user_id = auth.uid());

-- 6. Asegurar que las columnas del schema V2 sean consistentes
-- (No cambiamos nombres de columnas existentes para no romper datos, 
-- pero nos aseguramos que las políticas permitan el acceso)

SELECT 'SISTEMA DE CITAS PARA CLIENTES HABILITADO' as status;
