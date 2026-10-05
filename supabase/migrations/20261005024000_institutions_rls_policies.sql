-- ============================================================
-- REDIGMA MAGANG CAPSTONE
-- Migration: 20261005024000_institutions_rls_policies.sql
-- Description: Minimal & secure RLS policies for institutions table
-- ============================================================

-- 1. Helper function to check if current authenticated user is active HC staff or admin
CREATE OR REPLACE FUNCTION public.is_hc_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE (users.id = auth.uid() OR users.email = auth.email())
          AND users.is_active = TRUE
          AND users.role IN ('hc_admin', 'hc_staff')
    );
$$;

-- 2. Verify RLS remains ENABLED on institutions
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies on institutions if any exist to ensure clean state
DROP POLICY IF EXISTS "institutions_insert_hc" ON public.institutions;
DROP POLICY IF EXISTS "institutions_select_hc" ON public.institutions;

-- 4. Minimal and secure INSERT policy: only active authenticated HC users
CREATE POLICY "institutions_insert_hc"
ON public.institutions
FOR INSERT
TO authenticated
WITH CHECK (public.is_hc_user());

-- 5. Minimal and secure SELECT policy: only active authenticated HC users
CREATE POLICY "institutions_select_hc"
ON public.institutions
FOR SELECT
TO authenticated
USING (public.is_hc_user());
