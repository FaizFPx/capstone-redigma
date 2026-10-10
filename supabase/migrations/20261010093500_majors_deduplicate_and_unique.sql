-- ============================================================
-- REDIGMA MAGANG CAPSTONE
-- Migration: 20261010093500_majors_deduplicate_and_unique.sql
-- Description:
-- 1. Merges duplicate majors by relinking foreign keys to primary major ID
-- 2. Deletes duplicate major records
-- 3. Adds case-insensitive unique constraint/index on LOWER(TRIM(name))
-- ============================================================

-- 1a. Relink application_details pointing to duplicate majors
WITH ranked_majors AS (
    SELECT 
        id,
        LOWER(TRIM(name)) AS normalized_name,
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(name)) 
            ORDER BY created_at ASC, id ASC
        ) as rn,
        FIRST_VALUE(id) OVER (
            PARTITION BY LOWER(TRIM(name)) 
            ORDER BY created_at ASC, id ASC
        ) as primary_id
    FROM public.majors
)
UPDATE public.application_details ad
SET major_id = r.primary_id
FROM ranked_majors r
WHERE ad.major_id = r.id
  AND r.rn > 1;

-- 1b. Relink participants pointing to duplicate majors
WITH ranked_majors AS (
    SELECT 
        id,
        LOWER(TRIM(name)) AS normalized_name,
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(name)) 
            ORDER BY created_at ASC, id ASC
        ) as rn,
        FIRST_VALUE(id) OVER (
            PARTITION BY LOWER(TRIM(name)) 
            ORDER BY created_at ASC, id ASC
        ) as primary_id
    FROM public.majors
)
UPDATE public.participants p
SET major_id = r.primary_id
FROM ranked_majors r
WHERE p.major_id = r.id
  AND r.rn > 1;

-- 2. Delete duplicate majors that are not the primary record
WITH ranked_majors AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(name)) 
            ORDER BY created_at ASC, id ASC
        ) as rn
    FROM public.majors
)
DELETE FROM public.majors
WHERE id IN (
    SELECT id FROM ranked_majors WHERE rn > 1
);

-- 3. Create case-insensitive UNIQUE index on trimmed major name
CREATE UNIQUE INDEX IF NOT EXISTS idx_majors_name_lower 
ON public.majors (LOWER(TRIM(name)));
