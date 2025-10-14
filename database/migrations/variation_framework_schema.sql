-- ============================================
-- DYNAMIC VARIATION FRAMEWORK - DATABASE SCHEMA
-- ============================================

-- 1. SET METADATA TABLE
-- Tracks which variations exist in each set
CREATE TABLE IF NOT EXISTS set_variations_metadata (
  id SERIAL PRIMARY KEY,
  set_id INTEGER NOT NULL REFERENCES card_sets(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  
  -- Visual Treatments (JSON array of unique treatments found)
  visual_treatments JSONB DEFAULT '[]'::jsonb,
  
  -- Special Foil Types (JSON array of special foils found)
  special_foils JSONB DEFAULT '[]'::jsonb,
  
  -- Border Colors (JSON array of border colors found)
  border_colors JSONB DEFAULT '[]'::jsonb,
  
  -- Frame Effects (JSON array of frame effects found, filtered)
  frame_effects JSONB DEFAULT '[]'::jsonb,
  
  -- Treatment Codes (JSON array of all treatment codes in set)
  treatment_codes JSONB DEFAULT '[]'::jsonb,
  
  -- Statistics
  total_cards INTEGER DEFAULT 0,
  total_variations INTEGER DEFAULT 0,
  
  -- Tracking
  last_analyzed TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(set_id, game_id)
);

-- Indices for fast filtering
CREATE INDEX idx_set_variations_set ON set_variations_metadata(set_id);
CREATE INDEX idx_set_variations_game ON set_variations_metadata(game_id);
CREATE INDEX idx_set_variations_treatments ON set_variations_metadata USING GIN (treatment_codes);
CREATE INDEX idx_set_variations_visual ON set_variations_metadata USING GIN (visual_treatments);
CREATE INDEX idx_set_variations_foils ON set_variations_metadata USING GIN (special_foils);


-- 2. GAME METADATA TABLE
-- Tracks which variations exist across entire game
CREATE TABLE IF NOT EXISTS game_variations_metadata (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  
  -- All variations found across all sets
  visual_treatments JSONB DEFAULT '[]'::jsonb,
  special_foils JSONB DEFAULT '[]'::jsonb,
  border_colors JSONB DEFAULT '[]'::jsonb,
  frame_effects JSONB DEFAULT '[]'::jsonb,
  treatment_codes JSONB DEFAULT '[]'::jsonb,
  
  -- Statistics
  total_sets INTEGER DEFAULT 0,
  total_cards INTEGER DEFAULT 0,
  total_variations INTEGER DEFAULT 0,
  
  -- Tracking
  last_analyzed TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(game_id)
);

-- Indices
CREATE INDEX idx_game_variations_game ON game_variations_metadata(game_id);
CREATE INDEX idx_game_variations_treatments ON game_variations_metadata USING GIN (treatment_codes);


-- 3. EXTEND CARDS TABLE
-- Add variation metadata columns to cards table
ALTER TABLE cards 
  ADD COLUMN IF NOT EXISTS border_color VARCHAR(20),
  ADD COLUMN IF NOT EXISTS finish VARCHAR(20),
  ADD COLUMN IF NOT EXISTS frame_effect VARCHAR(100),
  ADD COLUMN IF NOT EXISTS promo_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS treatment VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sku VARCHAR(100) UNIQUE;

-- Add indices for variation filtering
CREATE INDEX IF NOT EXISTS idx_cards_border_color ON cards(border_color);
CREATE INDEX IF NOT EXISTS idx_cards_finish ON cards(finish);
CREATE INDEX IF NOT EXISTS idx_cards_treatment ON cards(treatment);
CREATE INDEX IF NOT EXISTS idx_cards_promo_type ON cards(promo_type);
CREATE INDEX IF NOT EXISTS idx_cards_sku ON cards(sku);

-- Composite indices for common queries
CREATE INDEX IF NOT EXISTS idx_cards_set_treatment ON cards(set_id, treatment);
CREATE INDEX IF NOT EXISTS idx_cards_game_treatment ON cards(game_id, treatment);


-- 4. MATERIALIZED VIEW FOR FAST FILTERING
-- Pre-computed view of available variations per set
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_set_variation_filters AS
SELECT 
  cs.id as set_id,
  cs.code as set_code,
  cs.name as set_name,
  g.id as game_id,
  g.name as game_name,
  
  -- Aggregate unique values
  ARRAY_AGG(DISTINCT c.treatment) FILTER (WHERE c.treatment IS NOT NULL) as treatments,
  ARRAY_AGG(DISTINCT c.border_color) FILTER (WHERE c.border_color IS NOT NULL) as border_colors,
  ARRAY_AGG(DISTINCT c.finish) FILTER (WHERE c.finish IS NOT NULL) as finishes,
  ARRAY_AGG(DISTINCT c.promo_type) FILTER (WHERE c.promo_type IS NOT NULL) as promo_types,
  ARRAY_AGG(DISTINCT c.frame_effect) FILTER (WHERE c.frame_effect IS NOT NULL) as frame_effects,
  
  COUNT(DISTINCT c.id) as card_count,
  COUNT(c.id) as variation_count
FROM card_sets cs
JOIN games g ON g.id = cs.game_id
LEFT JOIN cards c ON c.set_id = cs.id
WHERE cs.active = true
GROUP BY cs.id, cs.code, cs.name, g.id, g.name;

-- Index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_set_variation_filters_set 
  ON mv_set_variation_filters(set_id);
CREATE INDEX IF NOT EXISTS idx_mv_set_variation_filters_game 
  ON mv_set_variation_filters(game_id);


-- 5. REFRESH FUNCTION
-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_variation_filters()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_set_variation_filters;
END;
$$ LANGUAGE plpgsql;


-- 6. AUTO-UPDATE TRIGGER
-- Trigger to refresh metadata when cards are imported
CREATE OR REPLACE FUNCTION update_variation_metadata()
RETURNS TRIGGER AS $$
DECLARE
  v_set_id INTEGER;
  v_game_id INTEGER;
BEGIN
  -- Get set and game IDs
  IF TG_OP = 'DELETE' THEN
    v_set_id := OLD.set_id;
    v_game_id := OLD.game_id;
  ELSE
    v_set_id := NEW.set_id;
    v_game_id := NEW.game_id;
  END IF;
  
  -- Update set metadata
  INSERT INTO set_variations_metadata (set_id, game_id)
  VALUES (v_set_id, v_game_id)
  ON CONFLICT (set_id, game_id) DO NOTHING;
  
  -- Schedule async refresh (use pg_notify for worker to pick up)
  PERFORM pg_notify('variation_metadata_update', 
    json_build_object(
      'set_id', v_set_id,
      'game_id', v_game_id
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to cards table
DROP TRIGGER IF EXISTS cards_variation_metadata_trigger ON cards;
CREATE TRIGGER cards_variation_metadata_trigger
  AFTER INSERT OR UPDATE OR DELETE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION update_variation_metadata();


-- 7. HELPER VIEWS
-- View for easy querying of variations by set
CREATE OR REPLACE VIEW v_set_variations AS
SELECT 
  cs.id as set_id,
  cs.code as set_code,
  cs.name as set_name,
  g.id as game_id,
  g.code as game_code,
  c.treatment,
  c.border_color,
  c.finish,
  c.promo_type,
  c.frame_effect,
  COUNT(*) as count
FROM card_sets cs
JOIN games g ON g.id = cs.game_id
JOIN cards c ON c.set_id = cs.id
WHERE cs.active = true
GROUP BY cs.id, cs.code, cs.name, g.id, g.code, 
         c.treatment, c.border_color, c.finish, c.promo_type, c.frame_effect;

-- View for game-wide variations
CREATE OR REPLACE VIEW v_game_variations AS
SELECT 
  g.id as game_id,
  g.code as game_code,
  g.name as game_name,
  c.treatment,
  c.border_color,
  c.finish,
  c.promo_type,
  c.frame_effect,
  COUNT(DISTINCT c.set_id) as set_count,
  COUNT(*) as count
FROM games g
JOIN cards c ON c.game_id = g.id
GROUP BY g.id, g.code, g.name, 
         c.treatment, c.border_color, c.finish, c.promo_type, c.frame_effect;


-- 8. STATISTICS FUNCTIONS
-- Get variation statistics for a set
CREATE OR REPLACE FUNCTION get_set_variation_stats(p_set_id INTEGER)
RETURNS TABLE (
  treatment_code VARCHAR,
  count BIGINT,
  percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.treatment,
    COUNT(*)::BIGINT,
    ROUND((COUNT(*)::DECIMAL / NULLIF((SELECT COUNT(*) FROM cards WHERE set_id = p_set_id), 0)) * 100, 2)
  FROM cards c
  WHERE c.set_id = p_set_id
  GROUP BY c.treatment
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- Get variation statistics for a game
CREATE OR REPLACE FUNCTION get_game_variation_stats(p_game_id INTEGER)
RETURNS TABLE (
  treatment_code VARCHAR,
  count BIGINT,
  percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.treatment,
    COUNT(*)::BIGINT,
    ROUND((COUNT(*)::DECIMAL / NULLIF((SELECT COUNT(*) FROM cards WHERE game_id = p_game_id), 0)) * 100, 2)
  FROM cards c
  WHERE c.game_id = p_game_id
  GROUP BY c.treatment
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;