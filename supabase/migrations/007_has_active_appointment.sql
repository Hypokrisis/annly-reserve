-- has_active_appointment: dedup check before booking.
-- SECURITY DEFINER bypasses RLS on appointments (no SELECT policy for anon).
-- Returns true if the customer already has a confirmed/pending future appointment
-- at this business, matched by email OR phone.

CREATE OR REPLACE FUNCTION public.has_active_appointment(
    p_business_id UUID,
    p_phone       TEXT,
    p_email       TEXT,
    p_date        DATE
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.appointments
        WHERE business_id = p_business_id
          AND status IN ('confirmed', 'pending')
          AND appointment_date >= p_date
          AND (
              (p_email <> '' AND lower(customer_email) = lower(p_email))
              OR
              (p_phone <> '' AND customer_phone = p_phone)
          )
    );
$$;

GRANT EXECUTE ON FUNCTION public.has_active_appointment(UUID, TEXT, TEXT, DATE)
    TO anon, authenticated;
