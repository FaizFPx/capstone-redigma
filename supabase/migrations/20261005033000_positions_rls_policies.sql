-- ============================================================
-- REDIGMA MAGANG CAPSTONE
-- Migration: 20261005033000_positions_rls_policies.sql
-- Description: Minimal & secure RLS policies for positions table
-- ============================================================

-- 1. Ensure RLS remains ENABLED on positions
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies on positions if any exist
DROP POLICY IF EXISTS "positions_select_hc" ON public.positions;
DROP POLICY IF EXISTS "positions_insert_hc" ON public.positions;
DROP POLICY IF EXISTS "positions_update_hc" ON public.positions;
DROP POLICY IF EXISTS "positions_delete_hc" ON public.positions;

-- 3. Policy for SELECT: only active authenticated HC staff/admin
CREATE POLICY "positions_select_hc"
ON public.positions
FOR SELECT
TO authenticated
USING (public.is_hc_user());

-- 4. Policy for INSERT: only active authenticated HC staff/admin
CREATE POLICY "positions_insert_hc"
ON public.positions
FOR INSERT
TO authenticated
WITH CHECK (public.is_hc_user());

-- 5. Policy for UPDATE: only active authenticated HC staff/admin
CREATE POLICY "positions_update_hc"
ON public.positions
FOR UPDATE
TO authenticated
USING (public.is_hc_user())
WITH CHECK (public.is_hc_user());

-- 6. Policy for DELETE: only active authenticated HC staff/admin
CREATE POLICY "positions_delete_hc"
ON public.positions
FOR DELETE
TO authenticated
USING (public.is_hc_user());
