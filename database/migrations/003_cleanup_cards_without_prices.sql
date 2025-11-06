-- Migration: Identify and optionally remove cards without pricing data
-- This is useful for cleaning up cards that were imported before the price-checking logic

-- STEP 1: Check how many cards would be affected (READ-ONLY)
-- Run this first to see what would be deleted

SELECT
    'Cards without pricing' as category,
    COUNT(*) as count
FROM cards c
LEFT JOIN card_pricing cp ON c.id = cp.card_id
WHERE cp.id IS NULL;

-- STEP 2: See detailed breakdown by finish type (READ-ONLY)
SELECT
    c.finish,
    COUNT(*) as count,
    COUNT(DISTINCT c.set_id) as affected_sets
FROM cards c
LEFT JOIN card_pricing cp ON c.id = cp.card_id
WHERE cp.id IS NULL
GROUP BY c.finish
ORDER BY count DESC;

-- STEP 3: See specific cards that would be deleted (READ-ONLY)
-- Uncomment to see the actual cards:
/*
SELECT
    c.id,
    c.name,
    c.card_number,
    c.finish,
    c.promo_type,
    cs.name as set_name,
    cs.code as set_code
FROM cards c
LEFT JOIN card_pricing cp ON c.id = cp.card_id
LEFT JOIN card_sets cs ON c.set_id = cs.id
WHERE cp.id IS NULL
ORDER BY cs.name, c.name, c.finish
LIMIT 100;
*/

-- STEP 4: Delete cards without pricing (DESTRUCTIVE - USE WITH CAUTION)
-- Only uncomment and run this if you're sure you want to delete these cards
/*
DELETE FROM cards
WHERE id IN (
    SELECT c.id
    FROM cards c
    LEFT JOIN card_pricing cp ON c.id = cp.card_id
    WHERE cp.id IS NULL
);
*/

-- STEP 5: Alternative - Delete only nonfoil cards without pricing
-- This is safer if you want to keep foil variations
/*
DELETE FROM cards
WHERE id IN (
    SELECT c.id
    FROM cards c
    LEFT JOIN card_pricing cp ON c.id = cp.card_id
    WHERE cp.id IS NULL
      AND c.finish = 'nonfoil'
);
*/

-- STEP 6: Alternative - Delete only foil/special foil cards without pricing
-- This is safer if you want to keep regular variations
/*
DELETE FROM cards
WHERE id IN (
    SELECT c.id
    FROM cards c
    LEFT JOIN card_pricing cp ON c.id = cp.card_id
    WHERE cp.id IS NULL
      AND c.finish != 'nonfoil'
);
*/
