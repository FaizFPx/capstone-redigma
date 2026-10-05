-- ============================================================
-- REDIGMA MAGANG CAPSTONE
-- Migration: 20261005031000_majors_rls_policies.sql
-- Description: Minimal & secure RLS policies for majors table
-- ============================================================

-- 1. Verify RLS remains ENABLED on majors
ALTER TABLE public.majors ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "majors_select_hc" ON public.majors;
DROP POLICY IF EXISTS "majors_insert_hc" ON public.majors;
DROP POLICY IF EXISTS "majors_update_hc" ON public.majors;
DROP POLICY IF EXISTS "majors_delete_hc" ON public.majors;

-- 3. SELECT policy: only active authenticated HC staff/admin
CREATE POLICY "majors_select_hc"
ON public.majors
FOR SELECT
TO authenticated
USING (public.is_hc_user());

-- 4. INSERT policy: only active authenticated HC staff/admin
CREATE POLICY "majors_insert_hc"
ON public.majors
FOR INSERT
TO authenticated
WITH CHECK (public.is_hc_user());

-- 5. UPDATE policy: only active authenticated HC staff/admin
CREATE POLICY "majors_update_hc"
ON public.majors
FOR UPDATE
TO authenticated
USING (public.is_hc_user())
WITH CHECK (public.is_hc_user());

-- 6. DELETE policy: only active authenticated HC staff/admin
CREATE POLICY "majors_delete_hc"
ON public.majors
FOR DELETE
TO authenticated
USING (public.is_hc_user());
