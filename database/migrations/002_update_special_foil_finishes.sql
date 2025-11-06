-- Migration: Update existing cards with special foil promo_types to use specific finish types
-- This updates cards where finish='foil' but promo_type indicates a special foil type

-- Update cards with surgefoil promo_type
UPDATE cards
SET finish = 'surgefoil',
    updated_at = NOW()
WHERE finish = 'foil'
  AND promo_type = 'surgefoil';

-- Update cards with galaxyfoil promo_type
UPDATE cards
SET finish = 'galaxyfoil',
    updated_at = NOW()
WHERE finish = 'foil'
  AND promo_type = 'galaxyfoil';

-- Update cards with fracturefoil promo_type
UPDATE cards
SET finish = 'fracturefoil',
    updated_at = NOW()
WHERE finish = 'foil'
  AND promo_type = 'fracturefoil';

-- Update cards with singularityfoil promo_type
UPDATE cards
SET finish = 'singularityfoil',
    updated_at = NOW()
WHERE finish = 'foil'
  AND promo_type = 'singularityfoil';

-- Update cards with chocobotrackfoil promo_type
UPDATE cards
SET finish = 'chocobotrackfoil',
    updated_at = NOW()
WHERE finish = 'foil'
  AND promo_type = 'chocobotrackfoil';

-- Update cards with cosmicfoil promo_type
UPDATE cards
SET finish = 'cosmicfoil',
    updated_at = NOW()
WHERE finish = 'foil'
  AND promo_type = 'cosmicfoil';

-- Update cards with halofoil promo_type
UPDATE cards
SET finish = 'halofoil',
    updated_at = NOW()
WHERE finish = 'foil'
  AND promo_type = 'halofoil';

-- Update cards with textured promo_type
UPDATE cards
SET finish = 'textured',
    updated_at = NOW()
WHERE finish = 'foil'
  AND promo_type = 'textured';

-- Update cards with firstplacefoil promo_type
UPDATE cards
SET finish = 'firstplacefoil',
    updated_at = NOW()
WHERE finish = 'foil'
  AND promo_type = 'firstplacefoil';

-- Update cards with rainbowfoil promo_type
UPDATE cards
SET finish = 'rainbowfoil',
    updated_at = NOW()
WHERE finish = 'foil'
  AND promo_type = 'rainbowfoil';

-- Update cards with dragonscalefoil promo_type
UPDATE cards
SET finish = 'dragonscalefoil',
    updated_at = NOW()
WHERE finish = 'foil'
  AND promo_type = 'dragonscalefoil';

-- Update cards with raisedfoil promo_type
UPDATE cards
SET finish = 'raisedfoil',
    updated_at = NOW()
WHERE finish = 'foil'
  AND promo_type = 'raisedfoil';

-- Update cards with neonink promo_type
UPDATE cards
SET finish = 'neonink',
    updated_at = NOW()
WHERE finish = 'foil'
  AND promo_type = 'neonink';

-- Show summary of changes
SELECT
    promo_type,
    finish,
    COUNT(*) as card_count
FROM cards
WHERE promo_type IN (
    'surgefoil', 'galaxyfoil', 'fracturefoil', 'singularityfoil',
    'chocobotrackfoil', 'cosmicfoil', 'halofoil', 'textured',
    'firstplacefoil', 'rainbowfoil', 'dragonscalefoil', 'raisedfoil',
    'neonink'
)
GROUP BY promo_type, finish
ORDER BY promo_type, finish;
