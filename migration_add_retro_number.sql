-- Migration: Add retro_number to boxes table
-- Date: 2026-01-15
-- Purpose: Track retro cycle numbers per team for history feature

BEGIN;

-- Add retro_number column (nullable initially for backfill)
ALTER TABLE boxes 
ADD COLUMN IF NOT EXISTS retro_number INTEGER;

-- Backfill existing retros with sequential numbers per team
WITH numbered_boxes AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY created_at ASC) as num
  FROM boxes
)
UPDATE boxes
SET retro_number = numbered_boxes.num
FROM numbered_boxes
WHERE boxes.id = numbered_boxes.id
  AND boxes.retro_number IS NULL;

-- Now make it NOT NULL
ALTER TABLE boxes 
ALTER COLUMN retro_number SET NOT NULL;

-- Add unique constraint to prevent duplicate retro numbers per team
ALTER TABLE boxes
ADD CONSTRAINT boxes_team_retro_number_unique 
UNIQUE (team_id, retro_number);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_boxes_team_retro_number 
ON boxes(team_id, retro_number);

COMMIT;
