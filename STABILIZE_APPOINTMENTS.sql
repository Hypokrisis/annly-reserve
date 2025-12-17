-- 1. Add user_id to barbers if not exists
alter table public.barbers
add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists barbers_user_id_idx on public.barbers(user_id);

-- 2. Update RLS for Appointments

-- Enable RLS just in case
alter table public.appointments enable row level security;

-- Owner/Admin sees all
drop policy if exists appointments_select_owner_admin on public.appointments;
create policy appointments_select_owner_admin
on public.appointments
for select
to authenticated
using (
  public.is_business_member(business_id)
  and exists (
    select 1
    from public.users_businesses ub
    where ub.business_id = appointments.business_id
      and ub.user_id = auth.uid()
      and ub.role in ('owner','admin')
  )
);

-- Staff sees only their own
drop policy if exists appointments_select_staff_own on public.appointments;
create policy appointments_select_staff_own
on public.appointments
for select
to authenticated
using (
  public.is_business_member(business_id)
  and exists (
    select 1
    from public.barbers b
    where b.id = appointments.barber_id
      and b.user_id = auth.uid()
  )
);
