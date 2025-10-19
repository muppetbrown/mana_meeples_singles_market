# Database Schema — schema `public`

Generated: 2025-10-18T23:36:26.523Z

## audit_log

Row estimate: `-1`

### Columns

| Column | Type | Null | Default | Length/Precision |
|---|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('audit_log_id_seq'::regclass)` | `32,0` |
| `user_id` | `integer` | `YES` | `` | `32,0` |
| `action` | `character varying` | `NO` | `` | `50` |
| `table_name` | `character varying` | `NO` | `` | `50` |
| `record_id` | `integer` | `YES` | `` | `32,0` |
| `old_value` | `jsonb` | `YES` | `` | `` |
| `new_value` | `jsonb` | `YES` | `` | `` |
| `created_at` | `timestamp without time zone` | `YES` | `now()` | `` |

### Constraints

- **PRIMARY KEY** `audit_log_pkey`
```sql
PRIMARY KEY (id)
```

### Foreign Keys

_None_

### Indexes

- **PRIMARY** **UNIQUE** `audit_log_pkey`
```sql
CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id)
```

## card_inventory

Row estimate: `0`

### Columns

| Column | Type | Null | Default | Length/Precision |
|---|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('card_inventory_id_seq'::regclass)` | `32,0` |
| `card_id` | `integer` | `YES` | `` | `32,0` |
| `variation_id` | `integer` | `YES` | `` | `32,0` |
| `quality` | `character varying` | `NO` | `` | `50` |
| `stock_quantity` | `integer` | `NO` | `0` | `32,0` |
| `price` | `numeric` | `NO` | `` | `10,2` |
| `price_source` | `character varying` | `YES` | `` | `50` |
| `last_price_update` | `timestamp without time zone` | `YES` | `` | `` |
| `sku` | `character varying` | `YES` | `` | `100` |
| `created_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |
| `updated_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |
| `foil_type` | `character varying` | `YES` | `'Regular'::character varying` | `50` |
| `language` | `character varying` | `YES` | `'English'::character varying` | `50` |
| `cost` | `numeric` | `YES` | `` | `10,2` |
| `markup_percentage` | `numeric` | `NO` | `0` | `5,2` |
| `auto_price_enabled` | `boolean` | `NO` | `false` | `` |
| `low_stock_threshold` | `integer` | `NO` | `3` | `32,0` |
| `tcgplayer_id` | `character varying` | `YES` | `` | `255` |

### Constraints

- **CHECK** `chk_foil_type_nonempty`
```sql
CHECK ((length((foil_type)::text) > 0))
```
- **CHECK** `chk_language_nonempty`
```sql
CHECK ((length((language)::text) > 0))
```
- **CHECK** `chk_price_nonneg`
```sql
CHECK ((price >= (0)::numeric))
```
- **CHECK** `chk_quality_nonempty`
```sql
CHECK ((length((quality)::text) > 0))
```
- **CHECK** `chk_stock_nonneg`
```sql
CHECK ((stock_quantity >= 0))
```
- **FOREIGN KEY** `card_inventory_card_id_fkey`
```sql
FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
```
- **FOREIGN KEY** `card_inventory_variation_id_fkey`
```sql
FOREIGN KEY (variation_id) REFERENCES card_variations(id) ON DELETE SET NULL
```
- **PRIMARY KEY** `card_inventory_pkey`
```sql
PRIMARY KEY (id)
```
- **UNIQUE** `card_inventory_card_id_variation_id_quality_key`
```sql
UNIQUE (card_id, variation_id, quality)
```
- **UNIQUE** `card_inventory_sku_key`
```sql
UNIQUE (sku)
```
- **UNIQUE** `card_inventory_unique_card_variation_quality_foil_lang`
```sql
UNIQUE (card_id, variation_id, quality, foil_type, language)
```

### Foreign Keys

- `card_id` → `cards.id` (on update no action, on delete cascade)
- `variation_id` → `card_variations.id` (on update no action, on delete set null)

### Indexes

- **PRIMARY** **UNIQUE** `card_inventory_pkey`
```sql
CREATE UNIQUE INDEX card_inventory_pkey ON public.card_inventory USING btree (id)
```

- **UNIQUE** `card_inventory_card_id_variation_id_quality_key`
```sql
CREATE UNIQUE INDEX card_inventory_card_id_variation_id_quality_key ON public.card_inventory USING btree (card_id, variation_id, quality)
```

- **UNIQUE** `card_inventory_sku_key`
```sql
CREATE UNIQUE INDEX card_inventory_sku_key ON public.card_inventory USING btree (sku)
```

- **UNIQUE** `card_inventory_unique_card_variation_quality_foil_lang`
```sql
CREATE UNIQUE INDEX card_inventory_unique_card_variation_quality_foil_lang ON public.card_inventory USING btree (card_id, variation_id, quality, foil_type, language)
```

- `idx_inventory_card`
```sql
CREATE INDEX idx_inventory_card ON public.card_inventory USING btree (card_id)
```

- `idx_inventory_card_quality`
```sql
CREATE INDEX idx_inventory_card_quality ON public.card_inventory USING btree (card_id, quality)
```

- `idx_inventory_card_variation`
```sql
CREATE INDEX idx_inventory_card_variation ON public.card_inventory USING btree (card_id, variation_id)
```

- `idx_inventory_filters`
```sql
CREATE INDEX idx_inventory_filters ON public.card_inventory USING btree (quality, foil_type, language)
```

- `idx_inventory_price`
```sql
CREATE INDEX idx_inventory_price ON public.card_inventory USING btree (price)
```

- `idx_inventory_price_stock`
```sql
CREATE INDEX idx_inventory_price_stock ON public.card_inventory USING btree (price, stock_quantity) WHERE (stock_quantity > 0)
```

- `idx_inventory_quality`
```sql
CREATE INDEX idx_inventory_quality ON public.card_inventory USING btree (quality)
```

- `idx_inventory_search`
```sql
CREATE INDEX idx_inventory_search ON public.card_inventory USING btree (card_id, stock_quantity) WHERE (stock_quantity > 0)
```

- `idx_inventory_stock`
```sql
CREATE INDEX idx_inventory_stock ON public.card_inventory USING btree (stock_quantity)
```

- `idx_inventory_stock_price`
```sql
CREATE INDEX idx_inventory_stock_price ON public.card_inventory USING btree (stock_quantity, price) WHERE (stock_quantity > 0)
```

- `idx_inventory_updated`
```sql
CREATE INDEX idx_inventory_updated ON public.card_inventory USING btree (updated_at DESC)
```

## card_pricing

Row estimate: `0`

### Columns

| Column | Type | Null | Default | Length/Precision |
|---|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('card_pricing_id_seq'::regclass)` | `32,0` |
| `card_id` | `integer` | `NO` | `` | `32,0` |
| `base_price` | `numeric` | `NO` | `0` | `10,2` |
| `foil_price` | `numeric` | `NO` | `0` | `10,2` |
| `price_source` | `character varying` | `YES` | `'manual'::character varying` | `50` |
| `updated_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |
| `created_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |

### Constraints

- **FOREIGN KEY** `card_pricing_card_id_fkey`
```sql
FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
```
- **UNIQUE** `card_pricing_card_id_key`
```sql
UNIQUE (card_id)
```

### Foreign Keys

- `card_id` → `cards.id` (on update no action, on delete cascade)

### Indexes

- **UNIQUE** `card_pricing_card_id_key`
```sql
CREATE UNIQUE INDEX card_pricing_card_id_key ON public.card_pricing USING btree (card_id)
```

- `idx_card_pricing_card_id`
```sql
CREATE INDEX idx_card_pricing_card_id ON public.card_pricing USING btree (card_id)
```

- `idx_card_pricing_source`
```sql
CREATE INDEX idx_card_pricing_source ON public.card_pricing USING btree (price_source)
```

- `idx_card_pricing_updated`
```sql
CREATE INDEX idx_card_pricing_updated ON public.card_pricing USING btree (updated_at DESC)
```

## card_sets

Row estimate: `5`

### Columns

| Column | Type | Null | Default | Length/Precision |
|---|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('card_sets_id_seq'::regclass)` | `32,0` |
| `game_id` | `integer` | `YES` | `` | `32,0` |
| `name` | `character varying` | `NO` | `` | `255` |
| `code` | `character varying` | `NO` | `` | `50` |
| `release_date` | `date` | `YES` | `` | `` |
| `active` | `boolean` | `YES` | `true` | `` |
| `created_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |
| `updated_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |

### Constraints

- **FOREIGN KEY** `card_sets_game_id_fkey`
```sql
FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
```
- **PRIMARY KEY** `card_sets_pkey`
```sql
PRIMARY KEY (id)
```
- **UNIQUE** `card_sets_game_id_code_key`
```sql
UNIQUE (game_id, code)
```

### Foreign Keys

- `game_id` → `games.id` (on update no action, on delete cascade)

### Indexes

- **PRIMARY** **UNIQUE** `card_sets_pkey`
```sql
CREATE UNIQUE INDEX card_sets_pkey ON public.card_sets USING btree (id)
```

- **UNIQUE** `card_sets_game_id_code_key`
```sql
CREATE UNIQUE INDEX card_sets_game_id_code_key ON public.card_sets USING btree (game_id, code)
```

- `idx_card_sets_name_trgm`
```sql
CREATE INDEX idx_card_sets_name_trgm ON public.card_sets USING gin (name gin_trgm_ops)
```

### Sample Rows

```json
[
  {
    "id": 11,
    "game_id": 1,
    "name": "Final Fantasy",
    "code": "FIN",
    "release_date": "2025-06-12T12:00:00.000Z",
    "active": true,
    "created_at": "2025-10-13T19:01:32.046Z",
    "updated_at": "2025-10-13T19:01:32.046Z"
  }
]
```

## card_variations

Row estimate: `-1`

### Columns

| Column | Type | Null | Default | Length/Precision |
|---|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('card_variations_id_seq'::regclass)` | `32,0` |
| `card_id` | `integer` | `YES` | `` | `32,0` |
| `variation_name` | `character varying` | `NO` | `` | `255` |
| `variation_code` | `character varying` | `YES` | `` | `50` |
| `image_url` | `text` | `YES` | `` | `` |
| `created_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |

### Constraints

- **FOREIGN KEY** `card_variations_card_id_fkey`
```sql
FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
```
- **PRIMARY KEY** `card_variations_pkey`
```sql
PRIMARY KEY (id)
```

### Foreign Keys

- `card_id` → `cards.id` (on update no action, on delete cascade)

### Indexes

- **PRIMARY** **UNIQUE** `card_variations_pkey`
```sql
CREATE UNIQUE INDEX card_variations_pkey ON public.card_variations USING btree (id)
```

## cards

Row estimate: `1110`

### Columns

| Column | Type | Null | Default | Length/Precision |
|---|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('cards_id_seq'::regclass)` | `32,0` |
| `game_id` | `integer` | `YES` | `` | `32,0` |
| `set_id` | `integer` | `YES` | `` | `32,0` |
| `name` | `character varying` | `NO` | `` | `255` |
| `card_number` | `character varying` | `NO` | `` | `50` |
| `rarity` | `character varying` | `YES` | `` | `100` |
| `card_type` | `character varying` | `YES` | `` | `100` |
| `description` | `text` | `YES` | `` | `` |
| `image_url` | `text` | `YES` | `` | `` |
| `scryfall_id` | `character varying` | `YES` | `` | `255` |
| `tcgplayer_id` | `integer` | `YES` | `` | `32,0` |
| `pokemontcg_id` | `character varying` | `YES` | `` | `255` |
| `created_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |
| `updated_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |
| `search_tsv` | `tsvector` | `YES` | `` | `` |
| `border_color` | `character varying` | `YES` | `` | `20` |
| `finish` | `character varying` | `YES` | `` | `20` |
| `frame_effect` | `character varying` | `YES` | `` | `100` |
| `promo_type` | `character varying` | `YES` | `` | `50` |
| `treatment` | `character varying` | `YES` | `` | `100` |
| `sku` | `character varying` | `YES` | `` | `100` |

### Constraints

- **FOREIGN KEY** `cards_game_id_fkey`
```sql
FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
```
- **FOREIGN KEY** `cards_set_id_fkey`
```sql
FOREIGN KEY (set_id) REFERENCES card_sets(id) ON DELETE CASCADE
```
- **PRIMARY KEY** `cards_pkey`
```sql
PRIMARY KEY (id)
```
- **UNIQUE** `cards_set_id_card_number_finish_key`
```sql
UNIQUE (set_id, card_number, finish)
```
- **UNIQUE** `cards_sku_key`
```sql
UNIQUE (sku)
```

### Foreign Keys

- `game_id` → `games.id` (on update no action, on delete cascade)
- `set_id` → `card_sets.id` (on update no action, on delete cascade)

### Indexes

- **PRIMARY** **UNIQUE** `cards_pkey`
```sql
CREATE UNIQUE INDEX cards_pkey ON public.cards USING btree (id)
```

- **UNIQUE** `cards_set_id_card_number_finish_key`
```sql
CREATE UNIQUE INDEX cards_set_id_card_number_finish_key ON public.cards USING btree (set_id, card_number, finish)
```

- **UNIQUE** `cards_sku_key`
```sql
CREATE UNIQUE INDEX cards_sku_key ON public.cards USING btree (sku)
```

- `idx_cards_border_color`
```sql
CREATE INDEX idx_cards_border_color ON public.cards USING btree (border_color)
```

- `idx_cards_card_type`
```sql
CREATE INDEX idx_cards_card_type ON public.cards USING btree (card_type)
```

- `idx_cards_finish`
```sql
CREATE INDEX idx_cards_finish ON public.cards USING btree (finish)
```

- `idx_cards_game_name`
```sql
CREATE INDEX idx_cards_game_name ON public.cards USING btree (game_id, name)
```

- `idx_cards_game_set`
```sql
CREATE INDEX idx_cards_game_set ON public.cards USING btree (game_id, set_id)
```

- `idx_cards_game_treatment`
```sql
CREATE INDEX idx_cards_game_treatment ON public.cards USING btree (game_id, treatment)
```

- `idx_cards_name`
```sql
CREATE INDEX idx_cards_name ON public.cards USING btree (name)
```

- `idx_cards_name_trgm`
```sql
CREATE INDEX idx_cards_name_trgm ON public.cards USING gin (name gin_trgm_ops)
```

- `idx_cards_number_trgm`
```sql
CREATE INDEX idx_cards_number_trgm ON public.cards USING gin (card_number gin_trgm_ops)
```

- `idx_cards_promo_type`
```sql
CREATE INDEX idx_cards_promo_type ON public.cards USING btree (promo_type)
```

- `idx_cards_rarity`
```sql
CREATE INDEX idx_cards_rarity ON public.cards USING btree (rarity)
```

- `idx_cards_search_tsv`
```sql
CREATE INDEX idx_cards_search_tsv ON public.cards USING gin (to_tsvector('english'::regconfig, (((((name)::text || ' '::text) || (COALESCE(card_type, ''::character varying))::text) || ' '::text) || COALESCE(description, ''::text))))
```

- `idx_cards_search_tsv_column`
```sql
CREATE INDEX idx_cards_search_tsv_column ON public.cards USING gin (search_tsv)
```

- `idx_cards_set_name`
```sql
CREATE INDEX idx_cards_set_name ON public.cards USING btree (set_id, name)
```

- `idx_cards_set_treatment`
```sql
CREATE INDEX idx_cards_set_treatment ON public.cards USING btree (set_id, treatment)
```

- `idx_cards_sku`
```sql
CREATE INDEX idx_cards_sku ON public.cards USING btree (sku)
```

- `idx_cards_treatment`
```sql
CREATE INDEX idx_cards_treatment ON public.cards USING btree (treatment)
```

### Sample Rows

```json
[
  {
    "id": 1042,
    "game_id": 1,
    "set_id": 11,
    "name": "Absolute Virtue",
    "card_number": "212",
    "rarity": "mythic",
    "card_type": "Legendary Creature — Avatar Warrior",
    "description": "This spell can't be countered.\nFlying\nYou have protection from each of your opponents. (You can't be dealt damage, enchanted, or targeted by anything controlled by your opponents.)",
    "image_url": "https://cards.scryfall.io/large/front/a/a/aa192912-c9ee-403f-8a46-a338c9edb4b9.jpg?1748706551",
    "scryfall_id": "aa192912-c9ee-403f-8a46-a338c9edb4b9",
    "tcgplayer_id": null,
    "pokemontcg_id": null,
    "created_at": "2025-10-13T19:01:32.357Z",
    "updated_at": "2025-10-13T19:01:32.357Z",
    "search_tsv": "'212':37 'absolut':1 'anyth':32 'avatar':5 'control':33 'counter':12 'creatur':4 'damag':27 'dealt':26 'enchant':28 'fli':13 'legendari':3 'oppon':21,36 'protect':16 'spell':8 'target':30 'virtu':2 'warrior':6",
    "border_color": "black",
    "finish": "nonfoil",
    "frame_effect": null,
    "promo_type": null,
    "treatment": "STANDARD",
    "sku": "FIN-212-STANDARD-NONFOIL"
  },
  {
    "id": 1043,
    "game_id": 1,
    "set_id": 11,
    "name": "Absolute Virtue",
    "card_number": "212",
    "rarity": "mythic",
    "card_type": "Legendary Creature — Avatar Warrior",
    "description": "This spell can't be countered.\nFlying\nYou have protection from each of your opponents. (You can't be dealt damage, enchanted, or targeted by anything controlled by your opponents.)",
    "image_url": "https://cards.scryfall.io/large/front/a/a/aa192912-c9ee-403f-8a46-a338c9edb4b9.jpg?1748706551",
    "scryfall_id": "aa192912-c9ee-403f-8a46-a338c9edb4b9",
    "tcgplayer_id": null,
    "pokemontcg_id": null,
    "created_at": "2025-10-13T19:01:32.653Z",
    "updated_at": "2025-10-13T19:01:32.653Z",
    "search_tsv": "'212':37 'absolut':1 'anyth':32 'avatar':5 'control':33 'counter':12 'creatur':4 'damag':27 'dealt':26 'enchant':28 'fli':13 'legendari':3 'oppon':21,36 'protect':16 'spell':8 'target':30 'virtu':2 'warrior':6",
    "border_color": "black",
    "finish": "foil",
    "frame_effect": null,
    "promo_type": null,
    "treatment": "STANDARD",
    "sku": "FIN-212-STANDARD-FOIL"
  },
  {
    "id": 1044,
    "game_id": 1,
    "set_id": 11,
    "name": "Absolute Virtue",
    "card_number": "476",
    "rarity": "mythic",
    "card_type": "Legendary Creature — Avatar Warrior",
    "description": "This spell can't be countered.\nFlying\nYou have protection from each of your opponents. (You can't be dealt damage, enchanted, or targeted by anything controlled by your opponents.)",
    "image_url": "https://cards.scryfall.io/large/front/5/0/50716867-4370-4c2f-aae5-9d791a5d5a2e.jpg?1748707531",
    "scryfall_id": "50716867-4370-4c2f-aae5-9d791a5d5a2e",
    "tcgplayer_id": null,
    "pokemontcg_id": null,
    "created_at": "2025-10-13T19:01:32.942Z",
    "updated_at": "2025-10-13T19:01:32.942Z",
    "search_tsv": "'476':37 'absolut':1 'anyth':32 'avatar':5 'control':33 'counter':12 'creatur':4 'damag':27 'dealt':26 'enchant':28 'fli':13 'legendari':3 'oppon':21,36 'protect':16 'spell':8 'target':30 'virtu':2 'warrior':6",
    "border_color": "black",
    "finish": "nonfoil",
    "frame_effect": "extendedart",
    "promo_type": null,
    "treatment": "EXTENDED",
    "sku": "FIN-476-EXTENDED-NONFOIL"
  },
  {
    "id": 1045,
    "game_id": 1,
    "set_id": 11,
    "name": "Absolute Virtue",
    "card_number": "476",
    "rarity": "mythic",
    "card_type": "Legendary Creature — Avatar Warrior",
    "description": "This spell can't be countered.\nFlying\nYou have protection from each of your opponents. (You can't be dealt damage, enchanted, or targeted by anything controlled by your opponents.)",
    "image_url": "https://cards.scryfall.io/large/front/5/0/50716867-4370-4c2f-aae5-9d791a5d5a2e.jpg?1748707531",
    "scryfall_id": "50716867-4370-4c2f-aae5-9d791a5d5a2e",
    "tcgplayer_id": null,
    "pokemontcg_id": null,
    "created_at": "2025-10-13T19:01:33.230Z",
    "updated_at": "2025-10-13T19:01:33.230Z",
    "search_tsv": "'476':37 'absolut':1 'anyth':32 'avatar':5 'control':33 'counter':12 'creatur':4 'damag':27 'dealt':26 'enchant':28 'fli':13 'legendari':3 'oppon':21,36 'protect':16 'spell':8 'target':30 'virtu':2 'warrior':6",
    "border_color": "black",
    "finish": "foil",
    "frame_effect": "extendedart",
    "promo_type": null,
    "treatment": "EXTENDED",
    "sku": "FIN-476-EXTENDED-FOIL"
  },
  {
    "id": 1046,
    "game_id": 1,
    "set_id": 11,
    "name": "Adelbert Steiner",
    "card_number": "3",
    "rarity": "uncommon",
    "card_type": "Legendary Creature — Human Knight",
    "description": "Lifelink\nAdelbert Steiner gets +1/+1 for each Equipment you control.",
    "image_url": "https://cards.scryfall.io/large/front/1/a/1a67a991-1e52-4676-a2e3-2bc7aa943ab3.jpg?1748705765",
    "scryfall_id": "1a67a991-1e52-4676-a2e3-2bc7aa943ab3",
    "tcgplayer_id": null,
    "pokemontcg_id": null,
    "created_at": "2025-10-13T19:01:33.521Z",
    "updated_at": "2025-10-13T19:01:33.521Z",
    "search_tsv": "'+1':11,12 '3':18 'adelbert':1,8 'control':17 'creatur':4 'equip':15 'get':10 'human':5 'knight':6 'legendari':3 'lifelink':7 'steiner':2,9",
    "border_color": "black",
    "finish": "nonfoil",
    "frame_effect": null,
    "promo_type": null,
    "treatment": "STANDARD",
    "sku": "FIN-3-STANDARD-NONFOIL"
  }
]
```

## game_variations_metadata

Row estimate: `-1`

### Columns

| Column | Type | Null | Default | Length/Precision |
|---|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('game_variations_metadata_id_seq'::regclass)` | `32,0` |
| `game_id` | `integer` | `NO` | `` | `32,0` |
| `visual_treatments` | `jsonb` | `YES` | `'[]'::jsonb` | `` |
| `special_foils` | `jsonb` | `YES` | `'[]'::jsonb` | `` |
| `border_colors` | `jsonb` | `YES` | `'[]'::jsonb` | `` |
| `frame_effects` | `jsonb` | `YES` | `'[]'::jsonb` | `` |
| `treatment_codes` | `jsonb` | `YES` | `'[]'::jsonb` | `` |
| `total_sets` | `integer` | `YES` | `0` | `32,0` |
| `total_cards` | `integer` | `YES` | `0` | `32,0` |
| `total_variations` | `integer` | `YES` | `0` | `32,0` |
| `last_analyzed` | `timestamp without time zone` | `YES` | `now()` | `` |
| `created_at` | `timestamp without time zone` | `YES` | `now()` | `` |
| `updated_at` | `timestamp without time zone` | `YES` | `now()` | `` |

### Constraints

- **FOREIGN KEY** `game_variations_metadata_game_id_fkey`
```sql
FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
```
- **PRIMARY KEY** `game_variations_metadata_pkey`
```sql
PRIMARY KEY (id)
```
- **UNIQUE** `game_variations_metadata_game_id_key`
```sql
UNIQUE (game_id)
```

### Foreign Keys

- `game_id` → `games.id` (on update no action, on delete cascade)

### Indexes

- **PRIMARY** **UNIQUE** `game_variations_metadata_pkey`
```sql
CREATE UNIQUE INDEX game_variations_metadata_pkey ON public.game_variations_metadata USING btree (id)
```

- **UNIQUE** `game_variations_metadata_game_id_key`
```sql
CREATE UNIQUE INDEX game_variations_metadata_game_id_key ON public.game_variations_metadata USING btree (game_id)
```

- `idx_game_variations_game`
```sql
CREATE INDEX idx_game_variations_game ON public.game_variations_metadata USING btree (game_id)
```

- `idx_game_variations_treatments`
```sql
CREATE INDEX idx_game_variations_treatments ON public.game_variations_metadata USING gin (treatment_codes)
```

### Sample Rows

```json
[
  {
    "id": 1,
    "game_id": 1,
    "visual_treatments": [
      "extendedart",
      "inverted"
    ],
    "special_foils": [
      "surgefoil",
      "chocobotrackfoil",
      "neonink"
    ],
    "border_colors": [
      "black",
      "borderless"
    ],
    "frame_effects": [
      "extendedart",
      "inverted"
    ],
    "treatment_codes": [
      "STANDARD",
      "EXTENDED",
      "STANDARD_SURGEFOIL",
      "BORDERLESS_INVERTED",
      "BORDERLESS_INVERTED_SURGEFOIL",
      "BORDERLESS_INVERTED_CHOCOBOTRACKFOIL",
      "BORDERLESS",
      "BORDERLESS_NEONINK"
    ],
    "total_sets": 1,
    "total_cards": 1114,
    "total_variations": 1114,
    "last_analyzed": "2025-10-13T19:13:13.244Z",
    "created_at": "2025-10-13T19:13:13.244Z",
    "updated_at": "2025-10-13T19:13:13.244Z"
  }
]
```

## games

Row estimate: `2`

### Columns

| Column | Type | Null | Default | Length/Precision |
|---|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('games_id_seq'::regclass)` | `32,0` |
| `name` | `character varying` | `NO` | `` | `255` |
| `code` | `character varying` | `NO` | `` | `50` |
| `active` | `boolean` | `YES` | `true` | `` |
| `created_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |
| `updated_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |

### Constraints

- **PRIMARY KEY** `games_pkey`
```sql
PRIMARY KEY (id)
```
- **UNIQUE** `games_code_key`
```sql
UNIQUE (code)
```
- **UNIQUE** `games_name_key`
```sql
UNIQUE (name)
```

### Foreign Keys

_None_

### Indexes

- **PRIMARY** **UNIQUE** `games_pkey`
```sql
CREATE UNIQUE INDEX games_pkey ON public.games USING btree (id)
```

- **UNIQUE** `games_code_key`
```sql
CREATE UNIQUE INDEX games_code_key ON public.games USING btree (code)
```

- **UNIQUE** `games_name_key`
```sql
CREATE UNIQUE INDEX games_name_key ON public.games USING btree (name)
```

### Sample Rows

```json
[
  {
    "id": 1,
    "name": "Magic: The Gathering",
    "code": "mtg",
    "active": true,
    "created_at": "2025-10-06T08:49:41.071Z",
    "updated_at": "2025-10-06T08:49:41.071Z"
  },
  {
    "id": 2,
    "name": "Pokemon",
    "code": "pokemon",
    "active": true,
    "created_at": "2025-10-06T08:49:41.071Z",
    "updated_at": "2025-10-06T08:49:41.071Z"
  }
]
```

## order_items

Row estimate: `-1`

### Columns

| Column | Type | Null | Default | Length/Precision |
|---|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('order_items_id_seq'::regclass)` | `32,0` |
| `order_id` | `integer` | `YES` | `` | `32,0` |
| `inventory_id` | `integer` | `YES` | `` | `32,0` |
| `card_name` | `character varying` | `NO` | `` | `255` |
| `quality` | `character varying` | `NO` | `` | `50` |
| `quantity` | `integer` | `NO` | `` | `32,0` |
| `unit_price` | `numeric` | `NO` | `` | `10,2` |
| `total_price` | `numeric` | `NO` | `` | `10,2` |
| `created_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |

### Constraints

- **CHECK** `chk_quantity_positive`
```sql
CHECK ((quantity > 0))
```
- **CHECK** `chk_total_price_nonneg`
```sql
CHECK ((total_price >= (0)::numeric))
```
- **CHECK** `chk_unit_price_nonneg`
```sql
CHECK ((unit_price >= (0)::numeric))
```
- **FOREIGN KEY** `order_items_inventory_id_fkey`
```sql
FOREIGN KEY (inventory_id) REFERENCES card_inventory(id)
```
- **FOREIGN KEY** `order_items_order_id_fkey`
```sql
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
```
- **PRIMARY KEY** `order_items_pkey`
```sql
PRIMARY KEY (id)
```

### Foreign Keys

- `inventory_id` → `card_inventory.id` (on update no action, on delete no action)
- `order_id` → `orders.id` (on update no action, on delete cascade)

### Indexes

- **PRIMARY** **UNIQUE** `order_items_pkey`
```sql
CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id)
```

## orders

Row estimate: `-1`

### Columns

| Column | Type | Null | Default | Length/Precision |
|---|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('orders_id_seq'::regclass)` | `32,0` |
| `customer_email` | `character varying` | `NO` | `` | `255` |
| `customer_name` | `character varying` | `YES` | `` | `255` |
| `subtotal` | `numeric` | `NO` | `` | `10,2` |
| `tax` | `numeric` | `YES` | `0` | `10,2` |
| `shipping` | `numeric` | `YES` | `0` | `10,2` |
| `total` | `numeric` | `NO` | `` | `10,2` |
| `status` | `character varying` | `YES` | `'pending'::character varying` | `50` |
| `payment_intent_id` | `character varying` | `YES` | `` | `255` |
| `created_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |
| `updated_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |

### Constraints

- **CHECK** `chk_shipping_nonneg`
```sql
CHECK ((shipping >= (0)::numeric))
```
- **CHECK** `chk_subtotal_nonneg`
```sql
CHECK ((subtotal >= (0)::numeric))
```
- **CHECK** `chk_tax_nonneg`
```sql
CHECK ((tax >= (0)::numeric))
```
- **CHECK** `chk_total_nonneg`
```sql
CHECK ((total >= (0)::numeric))
```
- **PRIMARY KEY** `orders_pkey`
```sql
PRIMARY KEY (id)
```

### Foreign Keys

_None_

### Indexes

- **PRIMARY** **UNIQUE** `orders_pkey`
```sql
CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id)
```

- `idx_orders_created`
```sql
CREATE INDEX idx_orders_created ON public.orders USING btree (created_at)
```

- `idx_orders_status`
```sql
CREATE INDEX idx_orders_status ON public.orders USING btree (status)
```

## price_history

Row estimate: `-1`

### Columns

| Column | Type | Null | Default | Length/Precision |
|---|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('price_history_id_seq'::regclass)` | `32,0` |
| `inventory_id` | `integer` | `YES` | `` | `32,0` |
| `price` | `numeric` | `NO` | `` | `10,2` |
| `source` | `character varying` | `YES` | `` | `50` |
| `recorded_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |

### Constraints

- **FOREIGN KEY** `price_history_inventory_id_fkey`
```sql
FOREIGN KEY (inventory_id) REFERENCES card_inventory(id) ON DELETE CASCADE
```
- **PRIMARY KEY** `price_history_pkey`
```sql
PRIMARY KEY (id)
```

### Foreign Keys

- `inventory_id` → `card_inventory.id` (on update no action, on delete cascade)

### Indexes

- **PRIMARY** **UNIQUE** `price_history_pkey`
```sql
CREATE UNIQUE INDEX price_history_pkey ON public.price_history USING btree (id)
```

- `idx_price_history_inventory`
```sql
CREATE INDEX idx_price_history_inventory ON public.price_history USING btree (inventory_id)
```

- `idx_price_history_recorded`
```sql
CREATE INDEX idx_price_history_recorded ON public.price_history USING btree (recorded_at DESC)
```

## set_variations_metadata

Row estimate: `-1`

### Columns

| Column | Type | Null | Default | Length/Precision |
|---|---|---|---|---|
| `id` | `integer` | `NO` | `nextval('set_variations_metadata_id_seq'::regclass)` | `32,0` |
| `set_id` | `integer` | `NO` | `` | `32,0` |
| `game_id` | `integer` | `NO` | `` | `32,0` |
| `visual_treatments` | `jsonb` | `YES` | `'[]'::jsonb` | `` |
| `special_foils` | `jsonb` | `YES` | `'[]'::jsonb` | `` |
| `border_colors` | `jsonb` | `YES` | `'[]'::jsonb` | `` |
| `frame_effects` | `jsonb` | `YES` | `'[]'::jsonb` | `` |
| `treatment_codes` | `jsonb` | `YES` | `'[]'::jsonb` | `` |
| `total_cards` | `integer` | `YES` | `0` | `32,0` |
| `total_variations` | `integer` | `YES` | `0` | `32,0` |
| `last_analyzed` | `timestamp without time zone` | `YES` | `now()` | `` |
| `created_at` | `timestamp without time zone` | `YES` | `now()` | `` |
| `updated_at` | `timestamp without time zone` | `YES` | `now()` | `` |

### Constraints

- **FOREIGN KEY** `set_variations_metadata_game_id_fkey`
```sql
FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
```
- **FOREIGN KEY** `set_variations_metadata_set_id_fkey`
```sql
FOREIGN KEY (set_id) REFERENCES card_sets(id) ON DELETE CASCADE
```
- **PRIMARY KEY** `set_variations_metadata_pkey`
```sql
PRIMARY KEY (id)
```
- **UNIQUE** `set_variations_metadata_set_id_game_id_key`
```sql
UNIQUE (set_id, game_id)
```

### Foreign Keys

- `game_id` → `games.id` (on update no action, on delete cascade)
- `set_id` → `card_sets.id` (on update no action, on delete cascade)

### Indexes

- **PRIMARY** **UNIQUE** `set_variations_metadata_pkey`
```sql
CREATE UNIQUE INDEX set_variations_metadata_pkey ON public.set_variations_metadata USING btree (id)
```

- `idx_set_variations_foils`
```sql
CREATE INDEX idx_set_variations_foils ON public.set_variations_metadata USING gin (special_foils)
```

- `idx_set_variations_game`
```sql
CREATE INDEX idx_set_variations_game ON public.set_variations_metadata USING btree (game_id)
```

- `idx_set_variations_set`
```sql
CREATE INDEX idx_set_variations_set ON public.set_variations_metadata USING btree (set_id)
```

- `idx_set_variations_treatments`
```sql
CREATE INDEX idx_set_variations_treatments ON public.set_variations_metadata USING gin (treatment_codes)
```

- `idx_set_variations_visual`
```sql
CREATE INDEX idx_set_variations_visual ON public.set_variations_metadata USING gin (visual_treatments)
```

- **UNIQUE** `set_variations_metadata_set_id_game_id_key`
```sql
CREATE UNIQUE INDEX set_variations_metadata_set_id_game_id_key ON public.set_variations_metadata USING btree (set_id, game_id)
```

### Sample Rows

```json
[
  {
    "id": 2564,
    "set_id": 11,
    "game_id": 1,
    "visual_treatments": [
      "extendedart",
      "inverted"
    ],
    "special_foils": [
      "surgefoil",
      "chocobotrackfoil",
      "neonink"
    ],
    "border_colors": [
      "black",
      "borderless"
    ],
    "frame_effects": [
      "extendedart",
      "inverted"
    ],
    "treatment_codes": [
      "STANDARD",
      "EXTENDED",
      "STANDARD_SURGEFOIL",
      "BORDERLESS_INVERTED",
      "BORDERLESS_INVERTED_SURGEFOIL",
      "BORDERLESS_INVERTED_CHOCOBOTRACKFOIL",
      "BORDERLESS",
      "BORDERLESS_NEONINK"
    ],
    "total_cards": 1114,
    "total_variations": 1114,
    "last_analyzed": "2025-10-13T19:13:12.383Z",
    "created_at": "2025-10-13T19:01:32.357Z",
    "updated_at": "2025-10-13T19:13:12.383Z"
  }
]
```

