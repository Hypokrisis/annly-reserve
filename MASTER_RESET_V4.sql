-- =========================================================
-- MASTER RESET V4 (DEFINITIVA)
-- Soluciona:
-- 1. Tabla 'schedules' faltante (Error ChatGPT).
-- 2. Error 400 'Infinite Recursion' en RLS (Fix Security Definer).
-- 3. Mantiene RPC y correcciones previas.
-- =========================================================

-- 0) EXTENSIONES
create extension if not exists pgcrypto;

-- 1) DROP (en orden por FKs)
drop table if exists public.appointments cascade;
drop table if exists public.schedules cascade; -- AGREGADO
drop table if exists public.barbers_services cascade;
drop table if exists public.barbers cascade;
drop table if exists public.services cascade;
drop table if exists public.users_businesses cascade;
drop table if exists public.businesses cascade;

drop function if exists public.is_business_member(uuid) cascade;
drop function if exists public.create_business_and_membership(text, text) cascade;
drop function if exists public.trg_add_owner_membership() cascade;

-- 2) TABLAS

-- Tabla Businesses
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  max_days_advance integer default 30 -- Restaurado del esquema original
);

create table public.users_businesses (
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','barber','member')),
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  duration_minutes int not null check (duration_minutes > 0 and duration_minutes <= 600),
  price numeric(10,2) null check (price is null or price >= 0),
  is_active boolean not null default true,
  display_order integer default 0,
  created_at timestamptz not null default now()
);

create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  email text,
  phone text,       -- Agregado
  bio text,         -- Agregado
  avatar_url text,  -- Agregado
  is_active boolean not null default true,
  display_order integer default 0,
  created_at timestamptz not null default now()
);

-- Tabla Barbers-Services
create table public.barbers_services (
  barber_id uuid references public.barbers(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  primary key (barber_id, service_id)
);

-- Tabla Schedules (AGREGADA - Faltaba en V3)
create table public.schedules (
    id uuid primary key default gen_random_uuid(),
    barber_id uuid references public.barbers(id) on delete cascade,
    day_of_week integer not null check (day_of_week between 0 and 6),
    start_time time not null,
    end_time time not null,
    is_active boolean default true,
    created_at timestamptz default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  barber_id uuid null references public.barbers(id) on delete set null,
  service_id uuid null references public.services(id) on delete set null,

  customer_name text not null,
  customer_phone text null,
  customer_email text null,
  customer_notes text null,

  appointment_date date not null,
  start_time time not null,         
  end_time time not null,

  status text not null default 'confirmed'
    check (status in ('confirmed','cancelled','completed','no_show')),

  created_at timestamptz not null default now()
);

-- Índices
create index on public.users_businesses (business_id);
create index on public.services (business_id);
create index on public.barbers (business_id);
create index on public.schedules (barber_id);
create index on public.appointments (business_id, appointment_date);

-- 3) HELPERS (FIXED: SECURITY DEFINER + DISABLE ROW SECURITY)
create or replace function public.is_business_member(bid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- CRÍTICO: Desactivar RLS explícitamente para evitar recursión
  perform set_config('row_security', 'off', true);

  return exists (
    select 1
    from public.users_businesses ub
    where ub.business_id = bid
      and ub.user_id = auth.uid()
  );
end;
$$;

-- Permisos de seguridad para la función
revoke all on function public.is_business_member(uuid) from public;
grant execute on function public.is_business_member(uuid) to authenticated;

-- 4) RLS ON
alter table public.businesses enable row level security;
alter table public.users_businesses enable row level security;
alter table public.services enable row level security;
alter table public.barbers enable row level security;
alter table public.barbers_services enable row level security;
alter table public.schedules enable row level security;
alter table public.appointments enable row level security;

-- 5) POLICIES

-- BUSINESSES
create policy "businesses_select_public_and_member" on public.businesses for select using (is_active = true OR (auth.role() = 'authenticated' AND public.is_business_member(id)));
create policy "businesses_insert_owner" on public.businesses for insert to authenticated with check (owner_id = auth.uid());
create policy "businesses_update_member" on public.businesses for update to authenticated using (public.is_business_member(id)) with check (public.is_business_member(id));
create policy "businesses_delete_owner" on public.businesses for delete to authenticated using (owner_id = auth.uid());

-- USERS_BUSINESSES
create policy "users_businesses_select_member" on public.users_businesses for select to authenticated using (user_id = auth.uid() OR public.is_business_member(business_id));
create policy "users_businesses_no_update" on public.users_businesses for update to authenticated using (false);
create policy "users_businesses_no_delete" on public.users_businesses for delete to authenticated using (false);

-- SERVICES
create policy "services_select" on public.services for select using ((is_active = true) OR (auth.role() = 'authenticated' AND public.is_business_member(business_id)));
create policy "services_insert_member" on public.services for insert to authenticated with check (public.is_business_member(business_id));
create policy "services_update_member" on public.services for update to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "services_delete_member" on public.services for delete to authenticated using (public.is_business_member(business_id));

-- BARBERS
create policy "barbers_select" on public.barbers for select using ((is_active = true) OR (auth.role() = 'authenticated' AND public.is_business_member(business_id)));
create policy "barbers_insert_member" on public.barbers for insert to authenticated with check (public.is_business_member(business_id));
create policy "barbers_update_member" on public.barbers for update to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "barbers_delete_member" on public.barbers for delete to authenticated using (public.is_business_member(business_id));

-- BARBERS_SERVICES
create policy "bs_select" on public.barbers_services for select using (true);
create policy "bs_insert" on public.barbers_services for insert to authenticated with check (exists (select 1 from public.barbers b join public.users_businesses ub on b.business_id = ub.business_id where b.id = barbers_services.barber_id and ub.user_id = auth.uid()));
create policy "bs_delete" on public.barbers_services for delete to authenticated using (exists (select 1 from public.barbers b join public.users_businesses ub on b.business_id = ub.business_id where b.id = barbers_services.barber_id and ub.user_id = auth.uid()));

-- SCHEDULES (AGREGADO)
create policy "schedules_select" on public.schedules for select using ((is_active = true) OR (auth.role() = 'authenticated' AND exists (select 1 from public.barbers b where b.id = schedules.barber_id and public.is_business_member(b.business_id))));
create policy "schedules_insert_member" on public.schedules for insert to authenticated with check (exists (select 1 from public.barbers b where b.id = schedules.barber_id and public.is_business_member(b.business_id)));
create policy "schedules_update_member" on public.schedules for update to authenticated using (exists (select 1 from public.barbers b where b.id = schedules.barber_id and public.is_business_member(b.business_id)));
create policy "schedules_delete_member" on public.schedules for delete to authenticated using (exists (select 1 from public.barbers b where b.id = schedules.barber_id and public.is_business_member(b.business_id)));


-- APPOINTMENTS
create policy "appointments_insert_public" on public.appointments for insert with check (true);
create policy "appointments_select_member" on public.appointments for select to authenticated using (public.is_business_member(business_id));
create policy "appointments_update_member" on public.appointments for update to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));


-- 6) TRIGGER
create or replace function public.trg_add_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);
  insert into public.users_businesses (user_id, business_id, role)
  values (new.owner_id, new.id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists add_owner_membership on public.businesses;
create trigger add_owner_membership
after insert on public.businesses
for each row execute function public.trg_add_owner_membership();

-- 7) RPC
create or replace function public.create_business_and_membership(business_name text, business_slug text)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.businesses;
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated (auth.uid() is null).';
  end if;

  insert into public.businesses (owner_id, name, slug, is_active)
  values (uid, business_name, business_slug, true)
  returning * into b;

  perform set_config('row_security', 'off', true);
  insert into public.users_businesses (user_id, business_id, role)
  values (uid, b.id, 'owner')
  on conflict do nothing;

  return b;
end;
$$;

revoke all on function public.create_business_and_membership(text, text) from public;
grant execute on function public.create_business_and_membership(text, text) to authenticated;
