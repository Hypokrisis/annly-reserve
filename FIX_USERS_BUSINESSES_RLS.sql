-- FIX_USERS_BUSINESSES_RLS.sql
-- Enables users to insert their own membership during signup.

ALTER TABLE public.users_businesses ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own membership
-- This is critical for the automatic business creation flow in auth.service.ts
DROP POLICY IF EXISTS "Users can insert their own memberships" ON public.users_businesses;
CREATE POLICY "Users can insert their own memberships"
  ON public.users_businesses
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Ensure users can select their own memberships
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.users_businesses;
CREATE POLICY "Users can view their own memberships"
  ON public.users_businesses
  FOR SELECT
  USING (user_id = auth.uid());
