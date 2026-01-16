-- Migration: Add Indexes for Performance
-- This will dramatically speed up queries on the listings table

-- Index on year for filtering
CREATE INDEX IF NOT EXISTS idx_listings_year ON listings(year);

-- Composite index for YMM lookups
CREATE INDEX IF NOT EXISTS idx_listings_ymm ON listings(year, make, model);

-- Index on vehicles table for dropdown queries
CREATE INDEX IF NOT EXISTS idx_vehicles_year ON vehicles(year);
CREATE INDEX IF NOT EXISTS idx_vehicles_ymm ON vehicles(year, make, model);
