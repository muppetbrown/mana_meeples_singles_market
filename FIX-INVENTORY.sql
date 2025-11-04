-- =============================================================================
-- FIX: Add Missing Unique Constraint to card_inventory
-- =============================================================================
--
-- This fixes the error:
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- Code: 42P10
--
-- The API code uses UPSERT with ON CONFLICT (card_id, quality, language)
-- but this constraint doesn't exist in the database.
--
-- =============================================================================

-- Step 1: Check for existing constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'card_inventory_card_quality_language_key'
  ) THEN
    RAISE NOTICE '✅ Constraint already exists! No changes needed.';
  ELSE
    RAISE NOTICE '⚠️  Constraint not found. Will be created.';
  END IF;
END $$;

-- Step 2: Check for duplicate entries that would violate the constraint
SELECT
  card_id,
  quality,
  language,
  COUNT(*) as duplicate_count
FROM card_inventory
GROUP BY card_id, quality, language
HAVING COUNT(*) > 1;

-- If the above query returns rows, you have duplicates that need to be resolved first.
-- Otherwise, proceed with adding the constraint:

-- Step 3: Add the unique constraint
ALTER TABLE card_inventory
ADD CONSTRAINT card_inventory_card_quality_language_key
UNIQUE (card_id, quality, language);

-- Step 4: Verify the constraint was added
SELECT
  conname as constraint_name,
  contype as constraint_type,
  'Success!' as status
FROM pg_constraint
WHERE conname = 'card_inventory_card_quality_language_key';

-- You should see one row with the constraint name if successful.
