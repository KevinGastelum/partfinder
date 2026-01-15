
-- Add brand column if it doesn't exist
ALTER TABLE listings ADD COLUMN IF NOT EXISTS brand text;
