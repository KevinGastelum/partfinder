-- Migration: Populate Vehicles Catalog from Listings
-- This inserts all unique Year/Make/Model combinations

-- First, add a unique constraint if it doesn't exist
-- (Required for ON CONFLICT to work)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_year_make_model_unique'
    ) THEN
        ALTER TABLE vehicles ADD CONSTRAINT vehicles_year_make_model_unique UNIQUE (year, make, model);
    END IF;
END $$;

-- Now insert distinct vehicles from listings
INSERT INTO vehicles (year, make, model)
SELECT DISTINCT 
    year::integer, 
    UPPER(TRIM(make)), 
    UPPER(TRIM(model))
FROM listings
WHERE year IS NOT NULL 
  AND make IS NOT NULL 
  AND model IS NOT NULL
  AND year::integer BETWEEN 1990 AND 2026
ON CONFLICT (year, make, model) DO NOTHING;
