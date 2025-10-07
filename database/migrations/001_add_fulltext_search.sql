-- Add PostgreSQL full-text search capabilities
-- This migration adds pg_trgm extension and GIN indexes for advanced search functionality

-- Enable pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes for full-text search on cards table
CREATE INDEX IF NOT EXISTS idx_cards_name_trgm ON cards USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cards_search_tsv ON cards USING gin (
  to_tsvector('english', name || ' ' || COALESCE(card_type, '') || ' ' || COALESCE(description, ''))
);

-- Create GIN index for set names (used in autocomplete)
CREATE INDEX IF NOT EXISTS idx_card_sets_name_trgm ON card_sets USING gin (name gin_trgm_ops);

-- Create composite index for common search patterns
CREATE INDEX IF NOT EXISTS idx_cards_game_name ON cards(game_id, name);
CREATE INDEX IF NOT EXISTS idx_cards_set_name ON cards(set_id, name);

-- Add index for card_number fuzzy matching
CREATE INDEX IF NOT EXISTS idx_cards_number_trgm ON cards USING gin (card_number gin_trgm_ops);

-- Composite indexes for advanced filtering queries
CREATE INDEX IF NOT EXISTS idx_inventory_search ON card_inventory(card_id, stock_quantity) WHERE stock_quantity > 0;
CREATE INDEX IF NOT EXISTS idx_inventory_price_stock ON card_inventory(price, stock_quantity) WHERE stock_quantity > 0;

-- Full-text search function for ranking
CREATE OR REPLACE FUNCTION search_cards_ranked(search_query text, game_filter integer DEFAULT NULL)
RETURNS TABLE(
  card_id integer,
  name text,
  set_name text,
  card_number text,
  rank_score real
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    cs.name,
    c.card_number,
    GREATEST(
      ts_rank(to_tsvector('english', c.name || ' ' || COALESCE(c.card_type, '') || ' ' || COALESCE(c.description, '')), plainto_tsquery('english', search_query)),
      similarity(c.name, search_query) * 0.8,
      similarity(c.card_number, search_query) * 0.6
    ) as rank_score
  FROM cards c
  JOIN card_sets cs ON c.set_id = cs.id
  WHERE (
    to_tsvector('english', c.name || ' ' || COALESCE(c.card_type, '') || ' ' || COALESCE(c.description, '')) @@ plainto_tsquery('english', search_query)
    OR similarity(c.name, search_query) > 0.3
    OR similarity(c.card_number, search_query) > 0.4
  )
  AND (game_filter IS NULL OR c.game_id = game_filter)
  ORDER BY rank_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Autocomplete function for fast suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(query_text text, result_limit integer DEFAULT 10)
RETURNS TABLE(
  name text,
  set_name text,
  image_url text,
  match_type text
) AS $$
BEGIN
  RETURN QUERY
  -- Card name matches
  SELECT
    c.name,
    cs.name as set_name,
    c.image_url,
    'card' as match_type
  FROM cards c
  JOIN card_sets cs ON c.set_id = cs.id
  WHERE similarity(c.name, query_text) > 0.3

  UNION ALL

  -- Set name matches
  SELECT
    cs.name as name,
    '' as set_name,
    '' as image_url,
    'set' as match_type
  FROM card_sets cs
  WHERE similarity(cs.name, query_text) > 0.3

  ORDER BY name
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;