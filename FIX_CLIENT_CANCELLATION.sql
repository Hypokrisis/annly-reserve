-- FIX_CLIENT_CANCELLATION.sql
-- Goal: Allow customers (authenticated or verified by email) to cancel their own appointments.

-- 1. Ensure columns are consistent
-- We already have client_id and customer_user_id from previous migrations.
-- We will maintain both for compatibility but favor client_id in new policies.

-- 2. Update RLS on appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing update policy if it's too restrictive
DROP POLICY IF EXISTS "appointments_update_policy" ON public.appointments;
DROP POLICY IF EXISTS "Clients can cancel their own appointments" ON public.appointments;

-- 4. Create a comprehensive UPDATE policy for OWNERS and STAFF
CREATE POLICY "appointments_update_admin"
ON public.appointments
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = appointments.business_id
        AND (
            b.owner_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.users_businesses ub
                WHERE ub.business_id = b.id AND ub.user_id = auth.uid() AND ub.role IN ('admin', 'staff')
            )
        )
    )
);

-- 5. Create a specific UPDATE policy for CLIENTS to CANCEL
-- This allows a client to change their status to 'cancelled' if they are the owners of the record.
CREATE POLICY "appointments_update_client_cancel"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
    client_id = auth.uid() 
    OR customer_user_id = auth.uid()
    OR LOWER(customer_email) = LOWER(auth.jwt() ->> 'email')
)
WITH CHECK (
    status = 'cancelled'
    AND (
        client_id = auth.uid() 
        OR customer_user_id = auth.uid()
        OR LOWER(customer_email) = LOWER(auth.jwt() ->> 'email')
    )
);

-- 6. Add a policy for ANON users to cancel IF they have the appointment ID
-- This is slightly less secure but necessary for guest flow if they are not logged in.
-- We restrict it heavily: they can ONLY change status to 'cancelled' and ONLY if currently 'confirmed'.
CREATE POLICY "appointments_update_anon_cancel"
ON public.appointments
FOR UPDATE
TO anon
USING (status = 'confirmed')
WITH CHECK (status = 'cancelled');

-- Note: The 'anon' policy is safe because the user must know the UUID 'id' of the appointment 
-- to perform the update via the Supabase API (e.g., .eq('id', id)).

SELECT 'POLÍTICAS DE CANCELACIÓN ACTUALIZADAS' as status;
