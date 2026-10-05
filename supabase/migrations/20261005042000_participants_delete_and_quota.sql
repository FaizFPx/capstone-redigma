-- ============================================================
-- REDIGMA MAGANG CAPSTONE
-- Migration: 20261005042000_participants_delete_and_quota.sql
-- Description: 
--   1. Add DELETE policy on participants table for authenticated HC users
--   2. Add trigger to enforce participant quota on application_details with row lock
-- ============================================================

-- 1. Ensure RLS remains ENABLED on participants
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing DELETE policy if any exists
DROP POLICY IF EXISTS "participants_delete_hc" ON public.participants;

-- 3. Policy for DELETE: only active authenticated HC staff/admin
CREATE POLICY "participants_delete_hc"
ON public.participants
FOR DELETE
TO authenticated
USING (public.is_hc_user());

-- 4. Quota enforcement function with row locking to serialize concurrent requests
CREATE OR REPLACE FUNCTION public.check_participant_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approved_quota integer;
  v_major_id uuid;
  v_current_count integer;
  v_major_name text := 'Rincian Pengajuan';
  v_major_code text;
  v_detail_label text;
BEGIN
  -- If application_detail_id is not set, quota check does not apply
  IF NEW.application_detail_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- For UPDATE: if application_detail_id did not change, quota slot is already held by this participant
  IF TG_OP = 'UPDATE' AND OLD.application_detail_id IS NOT DISTINCT FROM NEW.application_detail_id THEN
    RETURN NEW;
  END IF;

  -- Row lock on application_details to serialize concurrent inserts/updates on the same detail
  SELECT 
    ad.approved_quota,
    ad.major_id
  INTO 
    v_approved_quota,
    v_major_id
  FROM public.application_details ad
  WHERE ad.id = NEW.application_detail_id
  FOR UPDATE;

  -- If approved_quota is null (not set), no quota limit is enforced
  IF v_approved_quota IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get major information for user-friendly error message
  IF v_major_id IS NOT NULL THEN
    SELECT COALESCE(name, 'Rincian Pengajuan'), code
    INTO v_major_name, v_major_code
    FROM public.majors
    WHERE id = v_major_id;
  END IF;

  -- Count current participants assigned to this application_detail
  -- Exclude current participant id if updating
  SELECT count(*)
  INTO v_current_count
  FROM public.participants
  WHERE application_detail_id = NEW.application_detail_id
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF v_current_count >= v_approved_quota THEN
    IF v_major_code IS NOT NULL AND v_major_code <> '' THEN
      v_detail_label := v_major_name || ' (' || v_major_code || ')';
    ELSE
      v_detail_label := v_major_name;
    END IF;

    RAISE EXCEPTION 'Kuota peserta untuk rincian % sudah penuh (%/%). Peserta tidak dapat ditambahkan.',
      v_detail_label, v_approved_quota, v_approved_quota;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Attach trigger to participants table
DROP TRIGGER IF EXISTS trg_check_participant_quota ON public.participants;

CREATE TRIGGER trg_check_participant_quota
BEFORE INSERT OR UPDATE OF application_detail_id
ON public.participants
FOR EACH ROW
EXECUTE FUNCTION public.check_participant_quota();
