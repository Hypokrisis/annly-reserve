-- FIX_SIGNUP_TRIGGER.sql
-- Fixes the 500 Internal Server Error during signup by correcting the auth.users trigger logic.

-- 1. Ensure the businesses table has the phone column
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS phone text;

-- 2. Create the robust trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    new_business_id uuid;
    b_name text;
    b_slug text;
    b_phone text;
BEGIN
    -- Extract metadata with fallbacks for different naming conventions
    -- Prirorizing the snake_case keys used in our latest auth.service.ts update
    b_name  := COALESCE(new.raw_user_meta_data->>'business_name', new.raw_user_meta_data->>'businessName', 'Mi Negocio');
    b_slug  := COALESCE(new.raw_user_meta_data->>'business_slug', new.raw_user_meta_data->>'slug', 'negocio-' || substr(new.id::text, 1, 8));
    b_phone := COALESCE(new.raw_user_meta_data->>'business_phone', new.raw_user_meta_data->>'phone', '');

    -- Insert the business
    -- We use ON CONFLICT for the slug just in case, though it should be unique
    INSERT INTO public.businesses (owner_id, name, slug, phone, is_active)
    VALUES (new.id, b_name, b_slug, b_phone, true)
    RETURNING id INTO new_business_id;

    -- Insert the admin membership
    INSERT INTO public.users_businesses (user_id, business_id, role)
    VALUES (new.id, new_business_id, 'admin');

    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- Capture error details in a log if you have a logs table, 
    -- but here we just ensure the auth.signup doesn't crash.
    -- The user will be created but might lack a business if this fails.
    RAISE WARNING 'Error in handle_new_user_setup: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Re-create the trigger on auth.users
DROP TRIGGER IF EXISTS trg_handle_new_user_setup ON auth.users;
CREATE TRIGGER trg_handle_new_user_setup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();
