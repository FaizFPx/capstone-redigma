-- ============================================================
-- REDIGMA MAGANG CAPSTONE
-- Migration: 20261005041000_applications_delete_policy.sql
-- Description: Add DELETE policy on applications table for authenticated HC users
-- ============================================================

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_delete_hc" ON public.applications;

CREATE POLICY "applications_delete_hc"
ON public.applications
FOR DELETE
TO authenticated
USING (public.is_hc_user());
