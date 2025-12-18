-- SQL for Dashboard Deletion Actions (Owner Only)

-- Enable DELETE for appointments
DROP POLICY IF EXISTS "owners_delete_appointments" ON public.appointments;
CREATE POLICY "owners_delete_appointments" ON public.appointments
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = appointments.business_id
    AND b.owner_id = auth.uid()
  )
);

-- Enable DELETE for barbers
DROP POLICY IF EXISTS "owners_delete_barbers" ON public.barbers;
CREATE POLICY "owners_delete_barbers" ON public.barbers
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = barbers.business_id
    AND b.owner_id = auth.uid()
  )
);

-- Enable DELETE for services
DROP POLICY IF EXISTS "owners_delete_services" ON public.services;
CREATE POLICY "owners_delete_services" ON public.services
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = services.business_id
    AND b.owner_id = auth.uid()
  )
);

-- Enable DELETE for barbers_services junction table
DROP POLICY IF EXISTS "owners_delete_barbers_services" ON public.barbers_services;
CREATE POLICY "owners_delete_barbers_services" ON public.barbers_services
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.barbers b
    JOIN public.businesses biz ON b.business_id = biz.id
    WHERE b.id = barbers_services.barber_id
    AND biz.owner_id = auth.uid()
  )
);
