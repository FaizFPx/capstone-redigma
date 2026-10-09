-- Migration: Deduplicate institutions and add case-insensitive unique constraint
-- Description:
-- 1. Merges duplicate institutions by relinking applications to the primary institution ID
-- 2. Deletes duplicate institution rows
-- 3. Adds unique index on LOWER(TRIM(name)) to permanently prevent future duplicates

-- 1. Relink applications pointing to duplicate institutions to the oldest/primary institution ID
WITH ranked_institutions AS (
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
    FROM public.institutions
)
UPDATE public.applications a
SET institution_id = r.primary_id
FROM ranked_institutions r
WHERE a.institution_id = r.id
  AND r.rn > 1;

-- 2. Delete duplicate institutions that are not the primary record
WITH ranked_institutions AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(name)) 
            ORDER BY created_at ASC, id ASC
        ) as rn
    FROM public.institutions
)
DELETE FROM public.institutions
WHERE id IN (
    SELECT id FROM ranked_institutions WHERE rn > 1
);

-- 3. Create case-insensitive UNIQUE index on trimmed institution name
CREATE UNIQUE INDEX IF NOT EXISTS idx_institutions_name_lower 
ON public.institutions (LOWER(TRIM(name)));
