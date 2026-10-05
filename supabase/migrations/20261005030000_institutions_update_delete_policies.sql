-- ============================================================
-- REDIGMA MAGANG CAPSTONE
-- Migration: 20261005030000_institutions_update_delete_policies.sql
-- Description: Add UPDATE and DELETE policies for institutions table
-- ============================================================

-- 1. Verify RLS remains ENABLED on institutions
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "institutions_update_hc" ON public.institutions;
DROP POLICY IF EXISTS "institutions_delete_hc" ON public.institutions;

-- 3. UPDATE policy: only active authenticated HC staff/admin
CREATE POLICY "institutions_update_hc"
ON public.institutions
FOR UPDATE
TO authenticated
USING (public.is_hc_user())
WITH CHECK (public.is_hc_user());

-- 4. DELETE policy: only active authenticated HC staff/admin
CREATE POLICY "institutions_delete_hc"
ON public.institutions
FOR DELETE
TO authenticated
USING (public.is_hc_user());
