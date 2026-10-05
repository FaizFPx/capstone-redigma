-- ============================================================
-- REDIGMA MAGANG CAPSTONE
-- Migration: 20261005024500_applications_rls_policies.sql
-- Description: Minimal & secure RLS policies for applications table
-- ============================================================

-- 1. Ensure RLS remains ENABLED on applications
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies on applications if any exist
DROP POLICY IF EXISTS "applications_select_hc" ON public.applications;
DROP POLICY IF EXISTS "applications_insert_hc" ON public.applications;
DROP POLICY IF EXISTS "applications_update_hc" ON public.applications;

-- 3. Policy for SELECT: only active authenticated HC staff/admin
CREATE POLICY "applications_select_hc"
ON public.applications
FOR SELECT
TO authenticated
USING (public.is_hc_user());

-- 4. Policy for INSERT: only active authenticated HC staff/admin
CREATE POLICY "applications_insert_hc"
ON public.applications
FOR INSERT
TO authenticated
WITH CHECK (public.is_hc_user());

-- 5. Policy for UPDATE: only active authenticated HC staff/admin
CREATE POLICY "applications_update_hc"
ON public.applications
FOR UPDATE
TO authenticated
USING (public.is_hc_user())
WITH CHECK (public.is_hc_user());
