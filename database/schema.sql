-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS audit_log_id_seq;

-- Table Definition
CREATE TABLE "public"."audit_log" (
    "id" int4 NOT NULL DEFAULT nextval('audit_log_id_seq'::regclass),
    "user_id" int4,
    "action" varchar(50) NOT NULL,
    "table_name" varchar(50) NOT NULL,
    "record_id" int4,
    "old_value" jsonb,
    "new_value" jsonb,
    "created_at" timestamp DEFAULT now()
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
    "low_stock_threshold" int4 NOT NULL DEFAULT 3,
    "tcgplayer_id" varchar(255)
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
CREATE INDEX idx_inventory_search ON public.card_inventory USING btree (card_id, stock_quantity) WHERE (stock_quantity > 0);
CREATE INDEX idx_inventory_price_stock ON public.card_inventory USING btree (price, stock_quantity) WHERE (stock_quantity > 0);
CREATE INDEX idx_inventory_card_quality ON public.card_inventory USING btree (card_id, quality);
CREATE INDEX idx_inventory_stock_price ON public.card_inventory USING btree (stock_quantity, price) WHERE (stock_quantity > 0);
CREATE INDEX idx_inventory_quality ON public.card_inventory USING btree (quality);

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
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);


-- Indices
CREATE UNIQUE INDEX card_sets_game_id_code_key ON public.card_sets USING btree (game_id, code);
CREATE INDEX idx_card_sets_name_trgm ON public.card_sets USING gin (name gin_trgm_ops);

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
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "search_tsv" tsvector
);


-- Indices
CREATE UNIQUE INDEX cards_set_id_card_number_key ON public.cards USING btree (set_id, card_number);
CREATE INDEX idx_cards_game_set ON public.cards USING btree (game_id, set_id);
CREATE INDEX idx_cards_name ON public.cards USING btree (name);
CREATE INDEX idx_cards_name_trgm ON public.cards USING gin (name gin_trgm_ops);
CREATE INDEX idx_cards_search_tsv ON public.cards USING gin (to_tsvector('english'::regconfig, (((((name)::text || ' '::text) || (COALESCE(card_type, ''::character varying))::text) || ' '::text) || COALESCE(description, ''::text))));
CREATE INDEX idx_cards_game_name ON public.cards USING btree (game_id, name);
CREATE INDEX idx_cards_set_name ON public.cards USING btree (set_id, name);
CREATE INDEX idx_cards_number_trgm ON public.cards USING gin (card_number gin_trgm_ops);
CREATE INDEX idx_cards_search_tsv_column ON public.cards USING gin (search_tsv);
CREATE INDEX idx_cards_rarity ON public.cards USING btree (rarity);
CREATE INDEX idx_cards_card_type ON public.cards USING btree (card_type);

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
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

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
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);


-- Indices
CREATE INDEX idx_orders_status ON public.orders USING btree (status);
CREATE INDEX idx_orders_created ON public.orders USING btree (created_at);

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

CREATE OR REPLACE FUNCTION public.cards_search_tsv_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_tsv := to_tsvector('english', NEW.name || ' ' || COALESCE(NEW.card_type, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_log
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 year';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$

CREATE OR REPLACE FUNCTION public.get_filter_counts(game_id_param integer DEFAULT NULL::integer, search_term text DEFAULT NULL::text)
 RETURNS TABLE(filter_type text, filter_value text, count_value bigint)
 LANGUAGE plpgsql
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.get_search_suggestions(search_term text, max_results integer DEFAULT 10)
 RETURNS TABLE(name text, set_name text, image_url text, match_type text, relevance numeric)
 LANGUAGE plpgsql
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.update_card_search_tsv()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_tsv := to_tsvector('english',
    COALESCE(NEW.name, '') || ' ' ||
    COALESCE(NEW.card_type, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.card_number, '')
  );
  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.search_cards_advanced(search_term text DEFAULT NULL::text, game_id_param integer DEFAULT NULL::integer, set_id_param integer DEFAULT NULL::integer, rarity_param text DEFAULT NULL::text, quality_param text DEFAULT NULL::text, foil_type_param text DEFAULT NULL::text, min_price_param numeric DEFAULT NULL::numeric, max_price_param numeric DEFAULT NULL::numeric, language_param text DEFAULT 'English'::text, sort_by_param text DEFAULT 'relevance'::text, page_param integer DEFAULT 1, limit_param integer DEFAULT 20)
 RETURNS TABLE(card_id integer, card_name text, card_number text, rarity text, card_type text, image_url text, game_name text, set_name text, quality text, price numeric, stock_quantity integer, foil_type text, relevance_score numeric)
 LANGUAGE plpgsql
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.search_cards_ranked(search_query text, game_filter integer DEFAULT NULL::integer)
 RETURNS TABLE(card_id integer, name text, set_name text, card_number text, rank_score real)
 LANGUAGE plpgsql
AS $function$
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
$function$
