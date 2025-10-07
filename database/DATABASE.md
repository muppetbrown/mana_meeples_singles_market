| schemaname | tablename       | size       | row_count |
|------------|-----------------|------------|-----------|
| public     | card_inventory  | 1304 kB    |      3148 |
| public     | cards           | 856 kB     |       596 |
| public     | card_sets       | 56 kB      |         5 |
| public     | games           | 56 kB      |        -1 |
| public     | orders          | 32 kB      |        -1 |
| public     | price_history   | 24 kB      |        -1 |
| public     | card_variations | 16 kB      |        -1 |
| public     | audit_log       | 16 kB      |        -1 |
| public     | order_items     | 8192 bytes |        -1 |

| table_name      | column_name         | data_type                   | character_maximum_length | is_nullable | column_default                              | key_type    |
|-----------------|---------------------|-----------------------------|--------------------------|-------------|---------------------------------------------|-------------|
| audit_log       | id                  | integer                     |                          | NO          | nextval('audit_log_id_seq'::regclass)       | PRIMARY KEY |
| audit_log       | user_id             | integer                     |                          | YES         |                                             |             |
| audit_log       | action              | character varying           |                       50 | NO          |                                             |             |
| audit_log       | table_name          | character varying           |                       50 | NO          |                                             |             |
| audit_log       | record_id           | integer                     |                          | YES         |                                             |             |
| audit_log       | old_value           | jsonb                       |                          | YES         |                                             |             |
| audit_log       | new_value           | jsonb                       |                          | YES         |                                             |             |
| audit_log       | created_at          | timestamp without time zone |                          | YES         | now()                                       |             |
| card_inventory  | id                  | integer                     |                          | NO          | nextval('card_inventory_id_seq'::regclass)  | PRIMARY KEY |
| card_inventory  | card_id             | integer                     |                          | YES         |                                             | FOREIGN KEY |
| card_inventory  | variation_id        | integer                     |                          | YES         |                                             | FOREIGN KEY |
| card_inventory  | quality             | character varying           |                       50 | NO          |                                             |             |
| card_inventory  | stock_quantity      | integer                     |                          | NO          | 0                                           |             |
| card_inventory  | price               | numeric                     |                          | NO          |                                             |             |
| card_inventory  | price_source        | character varying           |                       50 | YES         |                                             |             |
| card_inventory  | last_price_update   | timestamp without time zone |                          | YES         |                                             |             |
| card_inventory  | sku                 | character varying           |                      100 | YES         |                                             |             |
| card_inventory  | created_at          | timestamp without time zone |                          | YES         | CURRENT_TIMESTAMP                           |             |
| card_inventory  | updated_at          | timestamp without time zone |                          | YES         | CURRENT_TIMESTAMP                           |             |
| card_inventory  | foil_type           | character varying           |                       50 | YES         | 'Regular'::character varying                |             |
| card_inventory  | language            | character varying           |                       50 | YES         | 'English'::character varying                |             |
| card_inventory  | cost                | numeric                     |                          | YES         |                                             |             |
| card_inventory  | markup_percentage   | numeric                     |                          | NO          | 0                                           |             |
| card_inventory  | auto_price_enabled  | boolean                     |                          | NO          | false                                       |             |
| card_inventory  | low_stock_threshold | integer                     |                          | NO          | 3                                           |             |
| card_inventory  | tcgplayer_id        | character varying           |                      255 | YES         |                                             |             |
| card_sets       | id                  | integer                     |                          | NO          | nextval('card_sets_id_seq'::regclass)       | PRIMARY KEY |
| card_sets       | game_id             | integer                     |                          | YES         |                                             | FOREIGN KEY |
| card_sets       | name                | character varying           |                      255 | NO          |                                             |             |
| card_sets       | code                | character varying           |                       50 | NO          |                                             |             |
| card_sets       | release_date        | date                        |                          | YES         |                                             |             |
| card_sets       | active              | boolean                     |                          | YES         | true                                        |             |
| card_sets       | created_at          | timestamp without time zone |                          | YES         | CURRENT_TIMESTAMP                           |             |
| card_sets       | updated_at          | timestamp without time zone |                          | YES         | CURRENT_TIMESTAMP                           |             |
| card_variations | id                  | integer                     |                          | NO          | nextval('card_variations_id_seq'::regclass) | PRIMARY KEY |
| card_variations | card_id             | integer                     |                          | YES         |                                             | FOREIGN KEY |
| card_variations | variation_name      | character varying           |                      255 | NO          |                                             |             |
| card_variations | variation_code      | character varying           |                       50 | YES         |                                             |             |
| card_variations | image_url           | text                        |                          | YES         |                                             |             |
| card_variations | created_at          | timestamp without time zone |                          | YES         | CURRENT_TIMESTAMP                           |             |
| cards           | id                  | integer                     |                          | NO          | nextval('cards_id_seq'::regclass)           | PRIMARY KEY |
| cards           | game_id             | integer                     |                          | YES         |                                             | FOREIGN KEY |
| cards           | set_id              | integer                     |                          | YES         |                                             | FOREIGN KEY |
| cards           | name                | character varying           |                      255 | NO          |                                             |             |
| cards           | card_number         | character varying           |                       50 | NO          |                                             |             |
| cards           | rarity              | character varying           |                      100 | YES         |                                             |             |
| cards           | card_type           | character varying           |                      100 | YES         |                                             |             |
| cards           | description         | text                        |                          | YES         |                                             |             |
| cards           | image_url           | text                        |                          | YES         |                                             |             |
| cards           | scryfall_id         | character varying           |                      255 | YES         |                                             |             |
| cards           | tcgplayer_id        | integer                     |                          | YES         |                                             |             |
| cards           | pokemontcg_id       | character varying           |                      255 | YES         |                                             |             |
| cards           | created_at          | timestamp without time zone |                          | YES         | CURRENT_TIMESTAMP                           |             |
| cards           | updated_at          | timestamp without time zone |                          | YES         | CURRENT_TIMESTAMP                           |             |
| games           | id                  | integer                     |                          | NO          | nextval('games_id_seq'::regclass)           | PRIMARY KEY |
| games           | name                | character varying           |                      255 | NO          |                                             |             |
| games           | code                | character varying           |                       50 | NO          |                                             |             |
| games           | active              | boolean                     |                          | YES         | true                                        |             |
| games           | created_at          | timestamp without time zone |                          | YES         | CURRENT_TIMESTAMP                           |             |
| games           | updated_at          | timestamp without time zone |                          | YES         | CURRENT_TIMESTAMP                           |             |
| order_items     | id                  | integer                     |                          | NO          | nextval('order_items_id_seq'::regclass)     | PRIMARY KEY |
| order_items     | order_id            | integer                     |                          | YES         |                                             | FOREIGN KEY |
| order_items     | inventory_id        | integer                     |                          | YES         |                                             | FOREIGN KEY |
| order_items     | card_name           | character varying           |                      255 | NO          |                                             |             |
| order_items     | quality             | character varying           |                       50 | NO          |                                             |             |
| order_items     | quantity            | integer                     |                          | NO          |                                             |             |
| order_items     | unit_price          | numeric                     |                          | NO          |                                             |             |
| order_items     | total_price         | numeric                     |                          | NO          |                                             |             |
| order_items     | created_at          | timestamp without time zone |                          | YES         | CURRENT_TIMESTAMP                           |             |
| orders          | id                  | integer                     |                          | NO          | nextval('orders_id_seq'::regclass)          | PRIMARY KEY |
| orders          | customer_email      | character varying           |                      255 | NO          |                                             |             |
| orders          | customer_name       | character varying           |                      255 | YES         |                                             |             |
| orders          | subtotal            | numeric                     |                          | NO          |                                             |             |
| orders          | tax                 | numeric                     |                          | YES         | 0                                           |             |
| orders          | shipping            | numeric                     |                          | YES         | 0                                           |             |
| orders          | total               | numeric                     |                          | NO          |                                             |             |
| orders          | status              | character varying           |                       50 | YES         | 'pending'::character varying                |             |
| orders          | payment_intent_id   | character varying           |                      255 | YES         |                                             |             |
| orders          | created_at          | timestamp without time zone |                          | YES         | CURRENT_TIMESTAMP                           |             |
| orders          | updated_at          | timestamp without time zone |                          | YES         | CURRENT_TIMESTAMP                           |             |
| price_history   | id                  | integer                     |                          | NO          | nextval('price_history_id_seq'::regclass)   | PRIMARY KEY |
| price_history   | inventory_id        | integer                     |                          | YES         |                                             | FOREIGN KEY |
| price_history   | price               | numeric                     |                          | NO          |                                             |             |
| price_history   | source              | character varying           |                       50 | YES         |                                             |             |
| price_history   | recorded_at         | timestamp without time zone |                          | YES         | CURRENT_TIMESTAMP                           |             |

| schemaname | tablename       | indexname                                              | indexdef                                                                                                                                                                                                                                 |
|------------|-----------------|--------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| public     | audit_log       | audit_log_pkey                                         | CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id)                                                                                                                                                                  |
| public     | card_inventory  | card_inventory_card_id_variation_id_quality_key        | CREATE UNIQUE INDEX card_inventory_card_id_variation_id_quality_key ON public.card_inventory USING btree (card_id, variation_id, quality)                                                                                                |
| public     | card_inventory  | card_inventory_pkey                                    | CREATE UNIQUE INDEX card_inventory_pkey ON public.card_inventory USING btree (id)                                                                                                                                                        |
| public     | card_inventory  | card_inventory_sku_key                                 | CREATE UNIQUE INDEX card_inventory_sku_key ON public.card_inventory USING btree (sku)                                                                                                                                                    |
| public     | card_inventory  | card_inventory_unique_card_variation_quality_foil_lang | CREATE UNIQUE INDEX card_inventory_unique_card_variation_quality_foil_lang ON public.card_inventory USING btree (card_id, variation_id, quality, foil_type, language)                                                                    |
| public     | card_inventory  | idx_inventory_card                                     | CREATE INDEX idx_inventory_card ON public.card_inventory USING btree (card_id)                                                                                                                                                           |
| public     | card_inventory  | idx_inventory_card_variation                           | CREATE INDEX idx_inventory_card_variation ON public.card_inventory USING btree (card_id, variation_id)                                                                                                                                   |
| public     | card_inventory  | idx_inventory_filters                                  | CREATE INDEX idx_inventory_filters ON public.card_inventory USING btree (quality, foil_type, language)                                                                                                                                   |
| public     | card_inventory  | idx_inventory_price                                    | CREATE INDEX idx_inventory_price ON public.card_inventory USING btree (price)                                                                                                                                                            |
| public     | card_inventory  | idx_inventory_price_stock                              | CREATE INDEX idx_inventory_price_stock ON public.card_inventory USING btree (price, stock_quantity) WHERE (stock_quantity > 0)                                                                                                           |
| public     | card_inventory  | idx_inventory_search                                   | CREATE INDEX idx_inventory_search ON public.card_inventory USING btree (card_id, stock_quantity) WHERE (stock_quantity > 0)                                                                                                              |
| public     | card_inventory  | idx_inventory_stock                                    | CREATE INDEX idx_inventory_stock ON public.card_inventory USING btree (stock_quantity)                                                                                                                                                   |
| public     | card_inventory  | idx_inventory_updated                                  | CREATE INDEX idx_inventory_updated ON public.card_inventory USING btree (updated_at DESC)                                                                                                                                                |
| public     | card_sets       | card_sets_game_id_code_key                             | CREATE UNIQUE INDEX card_sets_game_id_code_key ON public.card_sets USING btree (game_id, code)                                                                                                                                           |
| public     | card_sets       | card_sets_pkey                                         | CREATE UNIQUE INDEX card_sets_pkey ON public.card_sets USING btree (id)                                                                                                                                                                  |
| public     | card_sets       | idx_card_sets_name_trgm                                | CREATE INDEX idx_card_sets_name_trgm ON public.card_sets USING gin (name gin_trgm_ops)                                                                                                                                                   |
| public     | card_variations | card_variations_pkey                                   | CREATE UNIQUE INDEX card_variations_pkey ON public.card_variations USING btree (id)                                                                                                                                                      |
| public     | cards           | cards_pkey                                             | CREATE UNIQUE INDEX cards_pkey ON public.cards USING btree (id)                                                                                                                                                                          |
| public     | cards           | cards_set_id_card_number_key                           | CREATE UNIQUE INDEX cards_set_id_card_number_key ON public.cards USING btree (set_id, card_number)                                                                                                                                       |
| public     | cards           | idx_cards_game_name                                    | CREATE INDEX idx_cards_game_name ON public.cards USING btree (game_id, name)                                                                                                                                                             |
| public     | cards           | idx_cards_game_set                                     | CREATE INDEX idx_cards_game_set ON public.cards USING btree (game_id, set_id)                                                                                                                                                            |
| public     | cards           | idx_cards_name                                         | CREATE INDEX idx_cards_name ON public.cards USING btree (name)                                                                                                                                                                           |
| public     | cards           | idx_cards_name_trgm                                    | CREATE INDEX idx_cards_name_trgm ON public.cards USING gin (name gin_trgm_ops)                                                                                                                                                           |
| public     | cards           | idx_cards_number_trgm                                  | CREATE INDEX idx_cards_number_trgm ON public.cards USING gin (card_number gin_trgm_ops)                                                                                                                                                  |
| public     | cards           | idx_cards_search_tsv                                   | CREATE INDEX idx_cards_search_tsv ON public.cards USING gin (to_tsvector('english'::regconfig, (((((name)::text \|\| ' '::text) \|\| (COALESCE(card_type, ''::character varying))::text) \|\| ' '::text) \|\| COALESCE(description, ''::text)))) |
| public     | cards           | idx_cards_set_name                                     | CREATE INDEX idx_cards_set_name ON public.cards USING btree (set_id, name)                                                                                                                                                               |
| public     | games           | games_code_key                                         | CREATE UNIQUE INDEX games_code_key ON public.games USING btree (code)                                                                                                                                                                    |
| public     | games           | games_name_key                                         | CREATE UNIQUE INDEX games_name_key ON public.games USING btree (name)                                                                                                                                                                    |
| public     | games           | games_pkey                                             | CREATE UNIQUE INDEX games_pkey ON public.games USING btree (id)                                                                                                                                                                          |
| public     | order_items     | order_items_pkey                                       | CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id)                                                                                                                                                              |
| public     | orders          | idx_orders_created                                     | CREATE INDEX idx_orders_created ON public.orders USING btree (created_at)                                                                                                                                                                |
| public     | orders          | idx_orders_status                                      | CREATE INDEX idx_orders_status ON public.orders USING btree (status)                                                                                                                                                                     |
| public     | orders          | orders_pkey                                            | CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id)                                                                                                                                                                        |
| public     | price_history   | idx_price_history_inventory                            | CREATE INDEX idx_price_history_inventory ON public.price_history USING btree (inventory_id)                                                                                                                                              |
| public     | price_history   | idx_price_history_recorded                             | CREATE INDEX idx_price_history_recorded ON public.price_history USING btree (recorded_at DESC)                                                                                                                                           |
| public     | price_history   | price_history_pkey                                     | CREATE UNIQUE INDEX price_history_pkey ON public.price_history USING btree (id)                                                                                                                                                          |

| from_table      | from_column  | to_table        | to_column | constraint_name                  |
|-----------------|--------------|-----------------|-----------|----------------------------------|
| card_inventory  | card_id      | cards           | id        | card_inventory_card_id_fkey      |
| card_inventory  | variation_id | card_variations | id        | card_inventory_variation_id_fkey |
| card_sets       | game_id      | games           | id        | card_sets_game_id_fkey           |
| card_variations | card_id      | cards           | id        | card_variations_card_id_fkey     |
| cards           | game_id      | games           | id        | cards_game_id_fkey               |
| cards           | set_id       | card_sets       | id        | cards_set_id_fkey                |
| order_items     | inventory_id | card_inventory  | id        | order_items_inventory_id_fkey    |
| order_items     | order_id     | orders          | id        | order_items_order_id_fkey        |
| price_history   | inventory_id | card_inventory  | id        | price_history_inventory_id_fkey  |