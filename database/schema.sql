CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE card_sets (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  release_date DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(game_id, code)
);

CREATE TABLE cards (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  set_id INTEGER REFERENCES card_sets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  card_number VARCHAR(50) NOT NULL,
  rarity VARCHAR(100),
  card_type VARCHAR(100),
  description TEXT,
  image_url TEXT,
  scryfall_id VARCHAR(255), -- For MTG API integration
  tcgplayer_id INTEGER, -- For price API integration
  pokemontcg_id VARCHAR(255), -- For Pokemon API integration
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(set_id, card_number)
);

CREATE TABLE card_variations (
  id SERIAL PRIMARY KEY,
  card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
  variation_name VARCHAR(255) NOT NULL, -- Borderless, Full Art, etc.
  variation_code VARCHAR(50),
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE card_inventory (
  id SERIAL PRIMARY KEY,
  card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
  variation_id INTEGER REFERENCES card_variations(id) ON DELETE SET NULL,
  quality VARCHAR(50) NOT NULL, -- Near Mint, Lightly Played, etc.
  foil_type VARCHAR(50) DEFAULT 'Regular', -- Regular, Foil, Etched, Cold Foil
  language VARCHAR(50) DEFAULT 'English',
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2), -- Cost basis for profit tracking
  price_source VARCHAR(50), -- manual, api_tcgplayer, api_cardmarket
  markup_percentage DECIMAL(5, 2) DEFAULT 0, -- Markup over cost
  auto_price_enabled BOOLEAN DEFAULT false,
  low_stock_threshold INTEGER DEFAULT 3,
  last_price_update TIMESTAMP,
  sku VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(card_id, variation_id, quality, foil_type, language)
);

CREATE TABLE price_history (
  id SERIAL PRIMARY KEY,
  inventory_id INTEGER REFERENCES card_inventory(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  source VARCHAR(50),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0,
  shipping DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, paid, shipped, completed, cancelled
  payment_intent_id VARCHAR(255), -- Stripe payment ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  inventory_id INTEGER REFERENCES card_inventory(id),
  card_name VARCHAR(255) NOT NULL,
  quality VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing constraints and checks
ALTER TABLE card_inventory
  ADD CONSTRAINT chk_price_nonneg CHECK (price >= 0),
  ADD CONSTRAINT chk_stock_nonneg CHECK (stock_quantity >= 0),
  ADD CONSTRAINT chk_language_nonempty CHECK (length(language) > 0),
  ADD CONSTRAINT chk_quality_nonempty CHECK (length(quality) > 0),
  ADD CONSTRAINT chk_foil_type_nonempty CHECK (length(foil_type) > 0);

ALTER TABLE orders
  ADD CONSTRAINT chk_subtotal_nonneg CHECK (subtotal >= 0),
  ADD CONSTRAINT chk_tax_nonneg CHECK (tax >= 0),
  ADD CONSTRAINT chk_shipping_nonneg CHECK (shipping >= 0),
  ADD CONSTRAINT chk_total_nonneg CHECK (total >= 0);

ALTER TABLE order_items
  ADD CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT chk_unit_price_nonneg CHECK (unit_price >= 0),
  ADD CONSTRAINT chk_total_price_nonneg CHECK (total_price >= 0);

-- Comprehensive indexing strategy
CREATE INDEX idx_cards_game_set ON cards(game_id, set_id);
CREATE INDEX idx_cards_name ON cards(name);
CREATE INDEX idx_inventory_card ON card_inventory(card_id);
CREATE INDEX idx_inventory_stock ON card_inventory(stock_quantity);
CREATE INDEX idx_inventory_card_variation ON card_inventory(card_id, variation_id);
CREATE INDEX idx_inventory_filters ON card_inventory(quality, foil_type, language);
CREATE INDEX idx_inventory_updated ON card_inventory(updated_at DESC);
CREATE INDEX idx_inventory_price ON card_inventory(price);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_price_history_inventory ON price_history(inventory_id);
CREATE INDEX idx_price_history_recorded ON price_history(recorded_at DESC);

-- Add triggers for automatic updated_at maintenance
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_card_sets_updated_at BEFORE UPDATE ON card_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_card_inventory_updated_at BEFORE UPDATE ON card_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();






