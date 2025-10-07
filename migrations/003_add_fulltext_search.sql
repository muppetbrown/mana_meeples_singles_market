-- Migration 003: Add full-text search capabilities to cards table
-- Created: 2025-10-07
-- Description: Adds PostgreSQL full-text search with pg_trgm fuzzy matching for improved search performance

-- 1. Enable pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add tsvector column for better full-text search performance (optional but recommended)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS search_tsv tsvector;

-- 3. Create GIN indexes for optimal search performance
-- Index for fuzzy matching on card names
CREATE INDEX IF NOT EXISTS idx_cards_name_trgm ON cards USING gin (name gin_trgm_ops);

-- Index for fuzzy matching on card numbers
CREATE INDEX IF NOT EXISTS idx_cards_number_trgm ON cards USING gin (card_number gin_trgm_ops);

-- Index for full-text search vector
CREATE INDEX IF NOT EXISTS idx_cards_search_tsv ON cards USING gin (to_tsvector('english', name || ' ' || COALESCE(card_type, '') || ' ' || COALESCE(description, '')));

-- Index on the tsvector column if we're using it
CREATE INDEX IF NOT EXISTS idx_cards_search_tsv_column ON cards USING gin (search_tsv);

-- 4. Create function to keep tsvector updated automatically (optional performance optimization)
CREATE OR REPLACE FUNCTION cards_search_tsv_update() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv := to_tsvector('english', NEW.name || ' ' || COALESCE(NEW.card_type, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to automatically update tsvector on INSERT/UPDATE
DROP TRIGGER IF EXISTS tsvector_update ON cards;
CREATE TRIGGER tsvector_update BEFORE INSERT OR UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION cards_search_tsv_update();

-- 6. Populate existing rows with tsvector data
UPDATE cards SET search_tsv = to_tsvector('english', name || ' ' || COALESCE(card_type, '') || ' ' || COALESCE(description, ''));

-- 7. Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_cards_game_set ON cards(game_id, set_id);
CREATE INDEX IF NOT EXISTS idx_inventory_card_quality ON card_inventory(card_id, quality);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_price ON card_inventory(stock_quantity, price) WHERE stock_quantity > 0;

-- 8. Add index on frequently filtered columns
CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);
CREATE INDEX IF NOT EXISTS idx_cards_card_type ON cards(card_type);
CREATE INDEX IF NOT EXISTS idx_inventory_quality ON card_inventory(quality);

-- Performance analysis query (uncomment to run manually for testing)
-- EXPLAIN ANALYZE SELECT c.name, c.card_number
-- FROM cards c
-- WHERE similarity(c.name, 'lightning bolt') > 0.3
-- OR to_tsvector('english', c.name) @@ plainto_tsquery('english', 'lightning bolt')
-- ORDER BY GREATEST(
--   ts_rank(to_tsvector('english', c.name), plainto_tsquery('english', 'lightning bolt')),
--   similarity(c.name, 'lightning bolt') * 0.8
-- ) DESC;

-- Migration complete
-- Note: This migration is safe to run multiple times (uses IF NOT EXISTS)
-- The indexes will significantly improve search performance for:
-- - Fuzzy name matching with pg_trgm
-- - Full-text search with PostgreSQL's built-in capabilities
-- - Common filter combinations
-- - Inventory queries with stock and price filtering