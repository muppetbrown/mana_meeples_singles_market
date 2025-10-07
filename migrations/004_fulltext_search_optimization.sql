-- =============================================
-- Migration: Full-text Search Optimization
-- Version: 004
-- Description: Adds PostgreSQL full-text search capabilities with pg_trgm fuzzy matching
-- =============================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Create search vector column for better performance
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS search_tsv tsvector;

-- 3. Create GIN indexes for optimal search performance
CREATE INDEX IF NOT EXISTS idx_cards_name_trgm
ON cards USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cards_number_trgm
ON cards USING gin (card_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cards_search_tsv
ON cards USING gin (search_tsv);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_cards_game_set
ON cards(game_id, set_id);

CREATE INDEX IF NOT EXISTS idx_inventory_card_quality
ON card_inventory(card_id, quality);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_price
ON card_inventory(stock_quantity, price) WHERE stock_quantity > 0;

-- 4. Create function to maintain search vectors
CREATE OR REPLACE FUNCTION update_card_search_tsv() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv := to_tsvector('english',
    COALESCE(NEW.name, '') || ' ' ||
    COALESCE(NEW.card_type, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.card_number, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to automatically update search vectors
DROP TRIGGER IF EXISTS tsvector_update_trigger ON cards;
CREATE TRIGGER tsvector_update_trigger
  BEFORE INSERT OR UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_card_search_tsv();

-- 6. Populate search vectors for existing rows
UPDATE cards SET search_tsv = to_tsvector('english',
  COALESCE(name, '') || ' ' ||
  COALESCE(card_type, '') || ' ' ||
  COALESCE(description, '') || ' ' ||
  COALESCE(card_number, '')
) WHERE search_tsv IS NULL;

-- 7. Create enhanced search suggestions function
CREATE OR REPLACE FUNCTION get_search_suggestions(
  search_term TEXT,
  max_results INTEGER DEFAULT 10
) RETURNS TABLE (
  name TEXT,
  set_name TEXT,
  image_url TEXT,
  match_type TEXT,
  relevance NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.name::TEXT,
    cs.name::TEXT as set_name,
    c.image_url::TEXT,
    'card'::TEXT as match_type,
    GREATEST(
      ts_rank(c.search_tsv, plainto_tsquery('english', search_term)),
      similarity(c.name, search_term) * 0.8,
      similarity(c.card_number, search_term) * 0.6
    )::NUMERIC as relevance
  FROM cards c
  JOIN card_sets cs ON c.set_id = cs.id
  JOIN card_inventory ci ON ci.card_id = c.id
  WHERE
    ci.stock_quantity > 0
    AND (
      c.search_tsv @@ plainto_tsquery('english', search_term)
      OR similarity(c.name, search_term) > 0.3
      OR similarity(c.card_number, search_term) > 0.4
    )
  ORDER BY relevance DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function for advanced search with filters
CREATE OR REPLACE FUNCTION search_cards_advanced(
  search_term TEXT DEFAULT NULL,
  game_id_param INTEGER DEFAULT NULL,
  set_id_param INTEGER DEFAULT NULL,
  rarity_param TEXT DEFAULT NULL,
  quality_param TEXT DEFAULT NULL,
  foil_type_param TEXT DEFAULT NULL,
  min_price_param DECIMAL DEFAULT NULL,
  max_price_param DECIMAL DEFAULT NULL,
  language_param TEXT DEFAULT 'English',
  sort_by_param TEXT DEFAULT 'relevance',
  page_param INTEGER DEFAULT 1,
  limit_param INTEGER DEFAULT 20
) RETURNS TABLE (
  card_id INTEGER,
  card_name TEXT,
  card_number TEXT,
  rarity TEXT,
  card_type TEXT,
  image_url TEXT,
  game_name TEXT,
  set_name TEXT,
  quality TEXT,
  price DECIMAL,
  stock_quantity INTEGER,
  foil_type TEXT,
  relevance_score DECIMAL
) AS $$
DECLARE
  offset_val INTEGER;
BEGIN
  offset_val := (page_param - 1) * limit_param;

  RETURN QUERY
  SELECT
    c.id::INTEGER,
    c.name::TEXT,
    c.card_number::TEXT,
    c.rarity::TEXT,
    c.card_type::TEXT,
    c.image_url::TEXT,
    g.name::TEXT as game_name,
    cs.name::TEXT as set_name,
    ci.quality::TEXT,
    ci.price::DECIMAL,
    ci.stock_quantity::INTEGER,
    ci.foil_type::TEXT,
    CASE
      WHEN search_term IS NOT NULL THEN
        GREATEST(
          ts_rank(c.search_tsv, plainto_tsquery('english', search_term)),
          similarity(c.name, search_term) * 0.8,
          similarity(c.card_number, search_term) * 0.6
        )
      ELSE 1.0
    END::DECIMAL as relevance_score
  FROM cards c
  JOIN games g ON c.game_id = g.id
  JOIN card_sets cs ON c.set_id = cs.id
  JOIN card_inventory ci ON ci.card_id = c.id
  WHERE
    ci.stock_quantity > 0
    AND (game_id_param IS NULL OR c.game_id = game_id_param)
    AND (set_id_param IS NULL OR c.set_id = set_id_param)
    AND (rarity_param IS NULL OR c.rarity = rarity_param)
    AND (quality_param IS NULL OR ci.quality = quality_param)
    AND (foil_type_param IS NULL OR ci.foil_type = foil_type_param)
    AND (min_price_param IS NULL OR ci.price >= min_price_param)
    AND (max_price_param IS NULL OR ci.price <= max_price_param)
    AND (language_param IS NULL OR ci.language = language_param)
    AND (
      search_term IS NULL OR (
        c.search_tsv @@ plainto_tsquery('english', search_term)
        OR similarity(c.name, search_term) > 0.3
        OR similarity(c.card_number, search_term) > 0.4
      )
    )
  ORDER BY
    CASE
      WHEN sort_by_param = 'relevance' AND search_term IS NOT NULL THEN relevance_score
      ELSE NULL
    END DESC,
    CASE WHEN sort_by_param = 'name' THEN c.name END ASC,
    CASE WHEN sort_by_param = 'price' THEN ci.price END ASC,
    CASE WHEN sort_by_param = 'stock' THEN ci.stock_quantity END DESC,
    c.name ASC
  LIMIT limit_param OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function for filter counts (used by frontend)
CREATE OR REPLACE FUNCTION get_filter_counts(
  game_id_param INTEGER DEFAULT NULL,
  search_term TEXT DEFAULT NULL
) RETURNS TABLE (
  filter_type TEXT,
  filter_value TEXT,
  count_value BIGINT
) AS $$
BEGIN
  RETURN QUERY
  -- Rarity counts
  SELECT
    'rarity'::TEXT as filter_type,
    c.rarity::TEXT as filter_value,
    COUNT(DISTINCT c.id)::BIGINT as count_value
  FROM cards c
  JOIN card_inventory ci ON ci.card_id = c.id
  WHERE
    ci.stock_quantity > 0
    AND (game_id_param IS NULL OR c.game_id = game_id_param)
    AND (
      search_term IS NULL OR (
        c.search_tsv @@ plainto_tsquery('english', search_term)
        OR similarity(c.name, search_term) > 0.3
      )
    )
    AND c.rarity IS NOT NULL
  GROUP BY c.rarity

  UNION ALL

  -- Quality counts
  SELECT
    'quality'::TEXT as filter_type,
    ci.quality::TEXT as filter_value,
    COUNT(DISTINCT c.id)::BIGINT as count_value
  FROM cards c
  JOIN card_inventory ci ON ci.card_id = c.id
  WHERE
    ci.stock_quantity > 0
    AND (game_id_param IS NULL OR c.game_id = game_id_param)
    AND (
      search_term IS NULL OR (
        c.search_tsv @@ plainto_tsquery('english', search_term)
        OR similarity(c.name, search_term) > 0.3
      )
    )
    AND ci.quality IS NOT NULL
  GROUP BY ci.quality

  UNION ALL

  -- Foil type counts
  SELECT
    'foil_type'::TEXT as filter_type,
    ci.foil_type::TEXT as filter_value,
    COUNT(DISTINCT c.id)::BIGINT as count_value
  FROM cards c
  JOIN card_inventory ci ON ci.card_id = c.id
  WHERE
    ci.stock_quantity > 0
    AND (game_id_param IS NULL OR c.game_id = game_id_param)
    AND (
      search_term IS NULL OR (
        c.search_tsv @@ plainto_tsquery('english', search_term)
        OR similarity(c.name, search_term) > 0.3
      )
    )
    AND ci.foil_type IS NOT NULL
  GROUP BY ci.foil_type;
END;
$$ LANGUAGE plpgsql;

-- 10. Analyze tables for better query planning
ANALYZE cards;
ANALYZE card_inventory;
ANALYZE card_sets;
ANALYZE games;

-- 11. Create audit log table for tracking changes
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER DEFAULT NULL,
  user_name TEXT DEFAULT NULL,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  record_id INTEGER DEFAULT NULL,
  old_value JSONB DEFAULT NULL,
  new_value JSONB DEFAULT NULL,
  ip_address INET DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX (created_at),
  INDEX (user_id),
  INDEX (table_name),
  INDEX (action)
);

-- 12. Create function for audit logging
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id INTEGER,
  p_user_name TEXT,
  p_action TEXT,
  p_table_name TEXT,
  p_record_id INTEGER,
  p_old_value JSONB,
  p_new_value JSONB,
  p_ip_address INET,
  p_user_agent TEXT
) RETURNS INTEGER AS $$
DECLARE
  audit_id INTEGER;
BEGIN
  INSERT INTO audit_log (
    user_id, user_name, action, table_name, record_id,
    old_value, new_value, ip_address, user_agent
  ) VALUES (
    p_user_id, p_user_name, p_action, p_table_name, p_record_id,
    p_old_value, p_new_value, p_ip_address, p_user_agent
  ) RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- 13. Set up automatic cleanup of old audit logs (optional)
-- Keep only 1 year of audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs() RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_log
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 year';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 14. Grant necessary permissions (adjust for your database user)
-- GRANT USAGE ON SCHEMA public TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 004 completed successfully!';
  RAISE NOTICE 'Full-text search optimization with pg_trgm fuzzy matching is now active.';
  RAISE NOTICE 'Search performance should be significantly improved.';
END
$$;