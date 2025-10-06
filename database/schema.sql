// ============================================
// BACKEND API STRUCTURE FOR TCG SINGLES PLATFORM
// ============================================

// Database Schema (PostgreSQL recommended)
// ============================================


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
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL,
  price_source VARCHAR(50), -- manual, api_tcgplayer, api_cardmarket
  last_price_update TIMESTAMP,
  sku VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(card_id, variation_id, quality)
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

-- Indexes for performance
CREATE INDEX idx_cards_game_set ON cards(game_id, set_id);
CREATE INDEX idx_cards_name ON cards(name);
CREATE INDEX idx_inventory_card ON card_inventory(card_id);
CREATE INDEX idx_inventory_stock ON card_inventory(stock_quantity);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);






