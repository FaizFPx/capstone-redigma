-- ============================================================
-- REDIGMA MAGANG CAPSTONE
-- Migration: 20261005032000_application_details_rls_policies.sql
-- Description: Minimal & secure RLS policies for application_details table
-- ============================================================

ALTER TABLE public.application_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "application_details_select_hc" ON public.application_details;
DROP POLICY IF EXISTS "application_details_insert_hc" ON public.application_details;
DROP POLICY IF EXISTS "application_details_update_hc" ON public.application_details;
DROP POLICY IF EXISTS "application_details_delete_hc" ON public.application_details;

-- 1. SELECT policy: only active authenticated HC staff/admin
CREATE POLICY "application_details_select_hc"
ON public.application_details
FOR SELECT
TO authenticated
USING (public.is_hc_user());

-- 2. INSERT policy: only active authenticated HC staff/admin
CREATE POLICY "application_details_insert_hc"
ON public.application_details
FOR INSERT
TO authenticated
WITH CHECK (public.is_hc_user());

-- 3. UPDATE policy: only active authenticated HC staff/admin
CREATE POLICY "application_details_update_hc"
ON public.application_details
FOR UPDATE
TO authenticated
USING (public.is_hc_user())
WITH CHECK (public.is_hc_user());

-- 4. DELETE policy: only active authenticated HC staff/admin
CREATE POLICY "application_details_delete_hc"
ON public.application_details
FOR DELETE
TO authenticated
USING (public.is_hc_user());
