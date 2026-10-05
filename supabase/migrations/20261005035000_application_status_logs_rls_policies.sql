-- ============================================================
-- REDIGMA MAGANG CAPSTONE
-- Migration: 20261005035000_application_status_logs_rls_policies.sql
-- Description: Minimal & secure RLS policies for application_status_logs
-- ============================================================

-- 1. Ensure RLS remains ENABLED on application_status_logs
ALTER TABLE public.application_status_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "application_status_logs_select_hc" ON public.application_status_logs;
DROP POLICY IF EXISTS "application_status_logs_insert_hc" ON public.application_status_logs;

-- 3. Policy for SELECT: only active authenticated HC staff/admin
CREATE POLICY "application_status_logs_select_hc"
ON public.application_status_logs
FOR SELECT
TO authenticated
USING (public.is_hc_user());

-- 4. Policy for INSERT: only active authenticated HC staff/admin (for system/action audit logging)
CREATE POLICY "application_status_logs_insert_hc"
ON public.application_status_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_hc_user());
