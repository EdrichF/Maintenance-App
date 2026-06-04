-- ============================================================
-- ConnexServ Migration 002 — Extended signup trigger
-- Run this in Supabase SQL Editor (https://app.supabase.com)
-- ============================================================

-- Update the trigger function to capture all profile fields from
-- signup metadata. This ensures branch_code and other fields are
-- saved even when email confirmation is enabled (no session yet).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, address, company_name, sub_store, branch_code)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address',
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'sub_store',
    UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'branch_code', '')))
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name    = EXCLUDED.full_name,
    phone        = EXCLUDED.phone,
    address      = EXCLUDED.address,
    company_name = EXCLUDED.company_name,
    sub_store    = EXCLUDED.sub_store,
    branch_code  = CASE
                     WHEN UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'branch_code', ''))) = ''
                     THEN public.profiles.branch_code
                     ELSE UPPER(TRIM(NEW.raw_user_meta_data->>'branch_code'))
                   END;
  RETURN NEW;
END;
$$;
