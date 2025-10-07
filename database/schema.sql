-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS games_id_seq;

-- Table Definition
CREATE TABLE "public"."games" (
    "id" int4 NOT NULL DEFAULT nextval('games_id_seq'::regclass),
    "name" varchar(255) NOT NULL,
    "code" varchar(50) NOT NULL,
    "active" bool DEFAULT true,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);


-- Indices
CREATE UNIQUE INDEX games_name_key ON public.games USING btree (name);
CREATE UNIQUE INDEX games_code_key ON public.games USING btree (code);

-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS card_sets_id_seq;

-- Table Definition
CREATE TABLE "public"."card_sets" (
    "id" int4 NOT NULL DEFAULT nextval('card_sets_id_seq'::regclass),
    "game_id" int4,
    "name" varchar(255) NOT NULL,
    "code" varchar(50) NOT NULL,
    "release_date" date,
    "active" bool DEFAULT true,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "card_sets_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE,
    PRIMARY KEY ("id")
);


-- Indices
CREATE UNIQUE INDEX card_sets_game_id_code_key ON public.card_sets USING btree (game_id, code);

-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS cards_id_seq;

-- Table Definition
CREATE TABLE "public"."cards" (
    "id" int4 NOT NULL DEFAULT nextval('cards_id_seq'::regclass),
    "game_id" int4,
    "set_id" int4,
    "name" varchar(255) NOT NULL,
    "card_number" varchar(50) NOT NULL,
    "rarity" varchar(100),
    "card_type" varchar(100),
    "description" text,
    "image_url" text,
    "scryfall_id" varchar(255),
    "tcgplayer_id" int4,
    "pokemontcg_id" varchar(255),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);


-- Indices
CREATE UNIQUE INDEX cards_set_id_card_number_key ON public.cards USING btree (set_id, card_number);
CREATE INDEX idx_cards_game_set ON public.cards USING btree (game_id, set_id);
CREATE INDEX idx_cards_name ON public.cards USING btree (name);

-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS card_variations_id_seq;

-- Table Definition
CREATE TABLE "public"."card_variations" (
    "id" int4 NOT NULL DEFAULT nextval('card_variations_id_seq'::regclass),
    "card_id" int4,
    "variation_name" varchar(255) NOT NULL,
    "variation_code" varchar(50),
    "image_url" text,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS card_inventory_id_seq;

-- Table Definition
CREATE TABLE "public"."card_inventory" (
    "id" int4 NOT NULL DEFAULT nextval('card_inventory_id_seq'::regclass),
    "card_id" int4,
    "variation_id" int4,
    "quality" varchar(50) NOT NULL,
    "stock_quantity" int4 NOT NULL DEFAULT 0,
    "price" numeric(10,2) NOT NULL,
    "price_source" varchar(50),
    "last_price_update" timestamp,
    "sku" varchar(100),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "foil_type" varchar(50) DEFAULT 'Regular'::character varying,
    "language" varchar(50) DEFAULT 'English'::character varying,
    "cost" numeric(10,2),
    "markup_percentage" numeric(5,2) NOT NULL DEFAULT 0,
    "auto_price_enabled" bool NOT NULL DEFAULT false,
    "low_stock_threshold" int4 NOT NULL DEFAULT 3
);


-- Indices
CREATE UNIQUE INDEX card_inventory_sku_key ON public.card_inventory USING btree (sku);
CREATE UNIQUE INDEX card_inventory_card_id_variation_id_quality_key ON public.card_inventory USING btree (card_id, variation_id, quality);
CREATE INDEX idx_inventory_card ON public.card_inventory USING btree (card_id);
CREATE INDEX idx_inventory_stock ON public.card_inventory USING btree (stock_quantity);
CREATE UNIQUE INDEX card_inventory_unique_card_variation_quality_foil_lang ON public.card_inventory USING btree (card_id, variation_id, quality, foil_type, language);
CREATE INDEX idx_inventory_card_variation ON public.card_inventory USING btree (card_id, variation_id);
CREATE INDEX idx_inventory_filters ON public.card_inventory USING btree (quality, foil_type, language);
CREATE INDEX idx_inventory_updated ON public.card_inventory USING btree (updated_at DESC);
CREATE INDEX idx_inventory_price ON public.card_inventory USING btree (price);

-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS price_history_id_seq;

-- Table Definition
CREATE TABLE "public"."price_history" (
    "id" int4 NOT NULL DEFAULT nextval('price_history_id_seq'::regclass),
    "inventory_id" int4,
    "price" numeric(10,2) NOT NULL,
    "source" varchar(50),
    "recorded_at" timestamp DEFAULT CURRENT_TIMESTAMP
);


-- Indices
CREATE INDEX idx_price_history_inventory ON public.price_history USING btree (inventory_id);
CREATE INDEX idx_price_history_recorded ON public.price_history USING btree (recorded_at DESC);

-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS orders_id_seq;

-- Table Definition
CREATE TABLE "public"."orders" (
    "id" int4 NOT NULL DEFAULT nextval('orders_id_seq'::regclass),
    "customer_email" varchar(255) NOT NULL,
    "customer_name" varchar(255),
    "subtotal" numeric(10,2) NOT NULL,
    "tax" numeric(10,2) DEFAULT 0,
    "shipping" numeric(10,2) DEFAULT 0,
    "total" numeric(10,2) NOT NULL,
    "status" varchar(50) DEFAULT 'pending'::character varying,
    "payment_intent_id" varchar(255),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);


-- Indices
CREATE INDEX idx_orders_status ON public.orders USING btree (status);
CREATE INDEX idx_orders_created ON public.orders USING btree (created_at);

-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS order_items_id_seq;

-- Table Definition
CREATE TABLE "public"."order_items" (
    "id" int4 NOT NULL DEFAULT nextval('order_items_id_seq'::regclass),
    "order_id" int4,
    "inventory_id" int4,
    "card_name" varchar(255) NOT NULL,
    "quality" varchar(50) NOT NULL,
    "quantity" int4 NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2) NOT NULL,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_items_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."card_inventory"("id"),
    CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE,
    PRIMARY KEY ("id")
);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$


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