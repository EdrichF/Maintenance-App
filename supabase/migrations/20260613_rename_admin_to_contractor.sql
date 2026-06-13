-- ============================================================
-- ConnexServ — Rename role 'admin' → 'contractor'
-- Run this in the Supabase SQL editor.
--
-- ⚠ DEPLOY IN LOCKSTEP with the code release that renames /admin → /contractor
-- and switches the role checks to 'contractor'. Until BOTH the code and this
-- migration are live, contractor users lose access (RLS + middleware gate on
-- the role value). Apply this migration at the same time you deploy the code.
--
-- The contractor's foreign-key columns (quotes.admin_id, completions.admin_id)
-- keep their names — they are internal and not user-facing.
-- ============================================================

-- 1. Migrate existing rows, then tighten the role constraint -----------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

UPDATE public.profiles SET role = 'contractor' WHERE role = 'admin';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('client', 'contractor', 'store_manager', 'regional_manager'));

-- 2. Recreate every RLS policy that gated on the old 'admin' role -------------
--    get_my_role() is unchanged — it simply returns the current role value.

-- profiles
DROP POLICY IF EXISTS "Admins can view all profiles"       ON public.profiles;
DROP POLICY IF EXISTS "Contractors can view all profiles"  ON public.profiles;
CREATE POLICY "Contractors can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'contractor');

-- tickets
DROP POLICY IF EXISTS "Admins can view all tickets"         ON public.tickets;
DROP POLICY IF EXISTS "Admins can update all tickets"       ON public.tickets;
DROP POLICY IF EXISTS "Contractors can view all tickets"    ON public.tickets;
DROP POLICY IF EXISTS "Contractors can update all tickets"  ON public.tickets;
CREATE POLICY "Contractors can view all tickets"
  ON public.tickets FOR SELECT
  USING (public.get_my_role() = 'contractor');
CREATE POLICY "Contractors can update all tickets"
  ON public.tickets FOR UPDATE
  USING (public.get_my_role() = 'contractor');

-- quotes
DROP POLICY IF EXISTS "Admins can view all quotes"        ON public.quotes;
DROP POLICY IF EXISTS "Admins can insert quotes"          ON public.quotes;
DROP POLICY IF EXISTS "Admins can update quotes"          ON public.quotes;
DROP POLICY IF EXISTS "Contractors can view all quotes"   ON public.quotes;
DROP POLICY IF EXISTS "Contractors can insert quotes"     ON public.quotes;
DROP POLICY IF EXISTS "Contractors can update quotes"     ON public.quotes;
CREATE POLICY "Contractors can view all quotes"
  ON public.quotes FOR SELECT
  USING (public.get_my_role() = 'contractor');
CREATE POLICY "Contractors can insert quotes"
  ON public.quotes FOR INSERT
  WITH CHECK (public.get_my_role() = 'contractor');
CREATE POLICY "Contractors can update quotes"
  ON public.quotes FOR UPDATE
  USING (public.get_my_role() = 'contractor');

-- completions
DROP POLICY IF EXISTS "Admins can manage completions"       ON public.completions;
DROP POLICY IF EXISTS "Contractors can manage completions"  ON public.completions;
CREATE POLICY "Contractors can manage completions"
  ON public.completions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'contractor')
  );
