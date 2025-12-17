-- Create a unique index to prevent double bookings
-- Only applies to confirmed appointments to allow cancelled/completed slots to be reused if needed or kept for history without blocking.

create unique index if not exists uniq_appointment_slot
on public.appointments (barber_id, appointment_date, start_time)
where status = 'confirmed';
