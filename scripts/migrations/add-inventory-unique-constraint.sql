-- Migration: Add unique constraint for card inventory
-- Date: 2025-11-04
-- Purpose: Fix missing unique constraint that causes UPSERT operations to fail
--
-- CRITICAL FIX: The API code uses ON CONFLICT (card_id, quality, language)
-- but this constraint doesn't exist in the database, causing:
-- ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification
-- Code: 42P10

-- First, check if there are any duplicate entries that would violate the constraint
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT card_id, quality, language, COUNT(*) as cnt
    FROM card_inventory
    GROUP BY card_id, quality, language
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE NOTICE 'WARNING: Found % duplicate entries. These will need to be resolved before adding the constraint.', duplicate_count;

    -- Show the duplicates
    RAISE NOTICE 'Duplicate entries:';
    FOR r IN
      SELECT card_id, quality, language, COUNT(*) as cnt
      FROM card_inventory
      GROUP BY card_id, quality, language
      HAVING COUNT(*) > 1
    LOOP
      RAISE NOTICE 'card_id: %, quality: %, language: %, count: %', r.card_id, r.quality, r.language, r.cnt;
    END LOOP;
  ELSE
    RAISE NOTICE 'No duplicate entries found. Safe to add constraint.';
  END IF;
END $$;

-- Add the unique constraint
-- This ensures each combination of (card_id, quality, language) is unique
-- which enables the UPSERT operation in the API to work correctly
ALTER TABLE card_inventory
ADD CONSTRAINT card_inventory_card_quality_language_key
UNIQUE (card_id, quality, language);

-- Verify the constraint was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'card_inventory_card_quality_language_key'
  ) THEN
    RAISE NOTICE '✅ Unique constraint successfully added!';
  ELSE
    RAISE EXCEPTION '❌ Failed to add unique constraint';
  END IF;
END $$;
