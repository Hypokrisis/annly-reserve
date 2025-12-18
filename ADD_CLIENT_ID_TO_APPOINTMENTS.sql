-- Migration: Add client_id to appointments table
-- This allows linking appointments to an authenticated user (customer)

-- 1. Add column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'client_id') THEN
        ALTER TABLE public.appointments ADD COLUMN client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);

-- 3. Update RLS (optional but recommended if using client_id)
-- Ensure appointments can be read by the client themselves
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'appointments' AND policyname = 'Clients can view their own appointments'
    ) THEN
        CREATE POLICY "Clients can view their own appointments"
        ON public.appointments
        FOR SELECT
        USING (auth.uid() = client_id);
    END IF;
END $$;
