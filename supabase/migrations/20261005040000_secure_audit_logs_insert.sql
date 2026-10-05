-- ============================================================
-- REDIGMA MAGANG CAPSTONE
-- Migration: 20261005040000_secure_audit_logs_insert.sql
-- Description: Tighten INSERT policy on application_status_logs
--              to prevent spoofing changed_by_user_id or
--              fabricating arbitrary stage/decision transitions.
-- ============================================================

-- Ensure RLS is active
ALTER TABLE public.application_status_logs ENABLE ROW LEVEL SECURITY;

-- Replace existing permissive INSERT policy with hardened validation
DROP POLICY IF EXISTS "application_status_logs_insert_hc" ON public.application_status_logs;

CREATE POLICY "application_status_logs_insert_hc"
ON public.application_status_logs
FOR INSERT
TO authenticated
WITH CHECK (
    -- 1. Must be an active HC staff/admin
    public.is_hc_user()
    -- 2. Prevent user spoofing: changed_by_user_id must match authenticated session
    AND (
        changed_by_user_id IS NULL
        OR changed_by_user_id IN (
            SELECT id FROM public.users
            WHERE id = auth.uid() OR email = auth.email()
        )
    )
    -- 3. Prevent fake status fabrication: log's new stage/decision must match the actual application state
    AND EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id = application_id
          AND a.stage_id = new_stage_id
          AND a.decision_id = new_decision_id
    )
);
