-- ============================================================
-- REDIGMA MAGANG CAPSTONE
-- Migration: 20261005036000_users_select_policy.sql
-- Description: Minimal & secure RLS SELECT policy on public.users for HC users
-- ============================================================

-- 1. Ensure RLS remains ENABLED on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policy if any
DROP POLICY IF EXISTS "users_select_hc" ON public.users;

-- 3. Policy for SELECT: only active authenticated HC staff/admin
CREATE POLICY "users_select_hc"
ON public.users
FOR SELECT
TO authenticated
USING (public.is_hc_user());
