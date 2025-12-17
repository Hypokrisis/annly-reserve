-- =================================================================
-- 🧔 FIX BARBERS TABLE (Agregar columnas faltantes)
-- =================================================================
-- Agrega phone, bio y avatar_url para que coincida con el Frontend.

alter table public.barbers
  add column if not exists phone text,
  add column if not exists bio text,
  add column if not exists avatar_url text;
