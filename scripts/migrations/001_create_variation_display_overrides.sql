-- Migration: Create variation_display_overrides table
-- Purpose: Allow admins to override auto-generated variation badge text
-- Date: 2025-11-06

CREATE TABLE IF NOT EXISTS variation_display_overrides (
  id SERIAL PRIMARY KEY,

  -- Optional: Scope to specific game (NULL = applies to all games)
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,

  -- Variation fields (all nullable to match any combination)
  -- These define what variation this override applies to
  treatment VARCHAR(100),
  finish VARCHAR(50),
  border_color VARCHAR(50),
  frame_effect VARCHAR(100),
  promo_type VARCHAR(100),

  -- Override display text
  display_text VARCHAR(200) NOT NULL,

  -- Metadata
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure unique combinations per game
  -- NULLS are considered distinct in Postgres UNIQUE constraints,
  -- so (game_id=1, treatment='X', finish=NULL) and (game_id=1, treatment='X', finish='foil') are both allowed
  UNIQUE NULLS NOT DISTINCT (game_id, treatment, finish, border_color, frame_effect, promo_type)
);

-- Indexes for efficient lookups
CREATE INDEX idx_variation_overrides_game ON variation_display_overrides(game_id);
CREATE INDEX idx_variation_overrides_treatment ON variation_display_overrides(treatment);
CREATE INDEX idx_variation_overrides_active ON variation_display_overrides(active);
CREATE INDEX idx_variation_overrides_lookup ON variation_display_overrides(game_id, treatment, finish) WHERE active = true;

-- Add comment for documentation
COMMENT ON TABLE variation_display_overrides IS 'Stores custom display text overrides for card variation badges';
COMMENT ON COLUMN variation_display_overrides.game_id IS 'Game this override applies to (NULL = all games)';
COMMENT ON COLUMN variation_display_overrides.display_text IS 'Custom text to display instead of auto-generated text';
COMMENT ON COLUMN variation_display_overrides.notes IS 'Admin notes about why this override was created';
