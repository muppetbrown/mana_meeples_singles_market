-- Migration: Fix cards unique constraint to include treatment
-- The current constraint only checks (set_id, card_number, finish) but this
-- prevents having the same card with different treatments and the same finish.
-- For example: STANDARD + surgefoil and BORDERLESS + surgefoil would conflict.
--
-- This migration updates the constraint to (set_id, card_number, treatment, finish)
-- which properly identifies unique card variations.

BEGIN;

-- Drop the old constraint
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_set_id_card_number_finish_key;

-- Create the new constraint that includes treatment
ALTER TABLE cards ADD CONSTRAINT cards_set_id_card_number_treatment_finish_key
  UNIQUE (set_id, card_number, treatment, finish);

-- Verify the new constraint
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'cards'::regclass
  AND conname LIKE '%treatment%';

COMMIT;
