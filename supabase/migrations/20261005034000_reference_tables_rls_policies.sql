-- ============================================================
-- REDIGMA MAGANG CAPSTONE
-- Migration: 20261005034000_reference_tables_rls_policies.sql
-- Description: Minimal & secure RLS SELECT policies for reference tables
-- ============================================================

-- 1. Ensure RLS remains ENABLED on reference tables
ALTER TABLE public.application_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internship_statuses ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "application_stages_select_hc" ON public.application_stages;
DROP POLICY IF EXISTS "application_decisions_select_hc" ON public.application_decisions;
DROP POLICY IF EXISTS "internship_statuses_select_hc" ON public.internship_statuses;

-- 3. Policy for SELECT: only active authenticated HC staff/admin
CREATE POLICY "application_stages_select_hc"
ON public.application_stages
FOR SELECT
TO authenticated
USING (public.is_hc_user());

CREATE POLICY "application_decisions_select_hc"
ON public.application_decisions
FOR SELECT
TO authenticated
USING (public.is_hc_user());

CREATE POLICY "internship_statuses_select_hc"
ON public.internship_statuses
FOR SELECT
TO authenticated
USING (public.is_hc_user());
