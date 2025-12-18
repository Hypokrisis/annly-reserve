-- FIX_BUSINESS_COLUMNS.sql
-- Adds missing columns to the businesses table to support the directory UX.

alter table public.businesses
  add column if not exists description text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists logo_url text,
  add column if not exists banner_url text,
  add column if not exists booking_buffer_minutes integer default 0;
