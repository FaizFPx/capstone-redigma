-- ============================================================
-- REDIGMA MAGANG CAPSTONE
-- Migration: 20261005025000_participants_rls_policies.sql
-- Description: Minimal & secure RLS policies for participants table
-- ============================================================

-- 1. Ensure RLS remains ENABLED on participants
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies on participants if any exist
DROP POLICY IF EXISTS "participants_select_hc" ON public.participants;
DROP POLICY IF EXISTS "participants_insert_hc" ON public.participants;
DROP POLICY IF EXISTS "participants_update_hc" ON public.participants;

-- 3. Policy for SELECT: only active authenticated HC staff/admin
CREATE POLICY "participants_select_hc"
ON public.participants
FOR SELECT
TO authenticated
USING (public.is_hc_user());

-- 4. Policy for INSERT: only active authenticated HC staff/admin
CREATE POLICY "participants_insert_hc"
ON public.participants
FOR INSERT
TO authenticated
WITH CHECK (public.is_hc_user());

-- 5. Policy for UPDATE: only active authenticated HC staff/admin
CREATE POLICY "participants_update_hc"
ON public.participants
FOR UPDATE
TO authenticated
USING (public.is_hc_user())
WITH CHECK (public.is_hc_user());
