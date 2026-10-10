-- ============================================================
-- REDIGMA MAGANG CAPSTONE
-- Migration: 20261010094000_positions_deduplicate_and_unique.sql
-- Description:
-- 1. Merges duplicate positions by relinking foreign keys to primary position ID
-- 2. Deletes duplicate position records
-- 3. Adds case-insensitive unique constraint/index on LOWER(TRIM(name))
-- ============================================================

-- 1a. Relink application_details pointing to duplicate positions
WITH ranked_positions AS (
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
    FROM public.positions
)
UPDATE public.application_details ad
SET requested_position_id = r.primary_id
FROM ranked_positions r
WHERE ad.requested_position_id = r.id
  AND r.rn > 1;

-- 1b. Relink participants (positioning_by_request_id) pointing to duplicate positions
WITH ranked_positions AS (
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
    FROM public.positions
)
UPDATE public.participants p
SET positioning_by_request_id = r.primary_id
FROM ranked_positions r
WHERE p.positioning_by_request_id = r.id
  AND r.rn > 1;

-- 1c. Relink participants (positioning_by_hc_id) pointing to duplicate positions
WITH ranked_positions AS (
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
    FROM public.positions
)
UPDATE public.participants p
SET positioning_by_hc_id = r.primary_id
FROM ranked_positions r
WHERE p.positioning_by_hc_id = r.id
  AND r.rn > 1;

-- 2. Delete duplicate positions that are not the primary record
WITH ranked_positions AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(name)) 
            ORDER BY created_at ASC, id ASC
        ) as rn
    FROM public.positions
)
DELETE FROM public.positions
WHERE id IN (
    SELECT id FROM ranked_positions WHERE rn > 1
);

-- 3. Create case-insensitive UNIQUE index on trimmed position name
CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_name_lower 
ON public.positions (LOWER(TRIM(name)));
