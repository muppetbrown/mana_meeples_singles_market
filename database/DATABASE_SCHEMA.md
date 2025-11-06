# Database Schema — `public`

**Generated:** 6/11/2025, 8:49:12 pm

**Tables:** 12

**Total Rows:** 3,666

---

## 📋 audit_log

**Row Count:** -1

### Columns

| Column | Type | Null | Default | Length/Precision |
|--------|------|------|---------|------------------|
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

---

## 📋 card_inventory

**Row Count:** 64

### Columns

| Column | Type | Null | Default | Length/Precision |
|--------|------|------|---------|------------------|
| `id` | `integer` | `NO` | `nextval('card_inventory_id_seq'::regclass)` | `32,0` |
| `card_id` | `integer` | `YES` | `` | `32,0` |
| `quality` | `character varying` | `NO` | `` | `50` |
| `stock_quantity` | `integer` | `NO` | `0` | `32,0` |
| `price` | `numeric` | `NO` | `` | `10,2` |
| `price_source` | `character varying` | `YES` | `` | `50` |
| `last_price_update` | `timestamp without time zone` | `YES` | `` | `` |
| `created_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |
| `updated_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |
| `language` | `character varying` | `YES` | `'English'::character varying` | `50` |
| `cost` | `numeric` | `YES` | `` | `10,2` |
| `markup_percentage` | `numeric` | `NO` | `0` | `5,2` |
| `auto_price_enabled` | `boolean` | `NO` | `false` | `` |
| `low_stock_threshold` | `integer` | `NO` | `3` | `32,0` |

### Constraints

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
- **PRIMARY KEY** `card_inventory_pkey`
```sql
PRIMARY KEY (id)
```
- **UNIQUE** `card_inventory_card_quality_language_key`
```sql
UNIQUE (card_id, quality, language)
```

### Foreign Keys

- `card_id` → `cards.id` (on update no action, on delete cascade)

### Indexes

- **PRIMARY** **UNIQUE** `card_inventory_pkey`
```sql
CREATE UNIQUE INDEX card_inventory_pkey ON public.card_inventory USING btree (id)
```

- **UNIQUE** `card_inventory_card_quality_language_key`
```sql
CREATE UNIQUE INDEX card_inventory_card_quality_language_key ON public.card_inventory USING btree (card_id, quality, language)
```

-  `idx_inventory_card`
```sql
CREATE INDEX idx_inventory_card ON public.card_inventory USING btree (card_id)
```

-  `idx_inventory_card_quality`
```sql
CREATE INDEX idx_inventory_card_quality ON public.card_inventory USING btree (card_id, quality)
```

-  `idx_inventory_filters`
```sql
CREATE INDEX idx_inventory_filters ON public.card_inventory USING btree (quality, language)
```

-  `idx_inventory_price`
```sql
CREATE INDEX idx_inventory_price ON public.card_inventory USING btree (price)
```

-  `idx_inventory_price_stock`
```sql
CREATE INDEX idx_inventory_price_stock ON public.card_inventory USING btree (price, stock_quantity) WHERE (stock_quantity > 0)
```

-  `idx_inventory_quality`
```sql
CREATE INDEX idx_inventory_quality ON public.card_inventory USING btree (quality)
```

-  `idx_inventory_search`
```sql
CREATE INDEX idx_inventory_search ON public.card_inventory USING btree (card_id, stock_quantity) WHERE (stock_quantity > 0)
```

-  `idx_inventory_stock`
```sql
CREATE INDEX idx_inventory_stock ON public.card_inventory USING btree (stock_quantity)
```

-  `idx_inventory_stock_price`
```sql
CREATE INDEX idx_inventory_stock_price ON public.card_inventory USING btree (stock_quantity, price) WHERE (stock_quantity > 0)
```

-  `idx_inventory_updated`
```sql
CREATE INDEX idx_inventory_updated ON public.card_inventory USING btree (updated_at DESC)
```

### Sample Rows

```json
[
  {
    "id": 3832,
    "card_id": 1079,
    "quality": "Near Mint",
    "stock_quantity": 1,
    "price": "3.51",
    "price_source": "scryfall",
    "last_price_update": "2025-11-05T07:52:58.779Z",
    "created_at": "2025-11-05T07:52:58.779Z",
    "updated_at": "2025-11-05T07:57:35.642Z",
    "language": "English",
    "cost": null,
    "markup_percentage": "0.00",
    "auto_price_enabled": true,
    "low_stock_threshold": 3
  },
  {
    "id": 3819,
    "card_id": 1081,
    "quality": "Near Mint",
    "stock_quantity": 1,
    "price": "0.76",
    "price_source": "scryfall",
    "last_price_update": "2025-11-05T07:49:07.158Z",
    "created_at": "2025-11-05T07:49:07.158Z",
    "updated_at": "2025-11-05T07:57:36.087Z",
    "language": "English",
    "cost": null,
    "markup_percentage": "0.00",
    "auto_price_enabled": true,
    "low_stock_threshold": 3
  },
  {
    "id": 3835,
    "card_id": 1090,
    "quality": "Near Mint",
    "stock_quantity": 1,
    "price": "0.37",
    "price_source": "scryfall",
    "last_price_update": "2025-11-05T07:53:19.885Z",
    "created_at": "2025-11-05T07:53:19.885Z",
    "updated_at": "2025-11-05T07:57:36.534Z",
    "language": "English",
    "cost": null,
    "markup_percentage": "0.00",
    "auto_price_enabled": true,
    "low_stock_threshold": 3
  },
  {
    "id": 3813,
    "card_id": 1099,
    "quality": "Near Mint",
    "stock_quantity": 1,
    "price": "0.39",
    "price_source": "scryfall",
    "last_price_update": "2025-11-05T07:48:20.149Z",
    "created_at": "2025-11-05T07:48:20.149Z",
    "updated_at": "2025-11-05T07:57:36.972Z",
    "language": "English",
    "cost": null,
    "markup_percentage": "0.00",
    "auto_price_enabled": true,
    "low_stock_threshold": 3
  },
  {
    "id": 3848,
    "card_id": 1104,
    "quality": "Near Mint",
    "stock_quantity": 1,
    "price": "0.38",
    "price_source": "scryfall",
    "last_price_update": "2025-11-05T07:55:09.127Z",
    "created_at": "2025-11-05T07:55:09.127Z",
    "updated_at": "2025-11-05T07:57:37.408Z",
    "language": "English",
    "cost": null,
    "markup_percentage": "0.00",
    "auto_price_enabled": true,
    "low_stock_threshold": 3
  }
]
```

---

## 📋 card_pricing

**Row Count:** 1,801

### Columns

| Column | Type | Null | Default | Length/Precision |
|--------|------|------|---------|------------------|
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

-  `idx_card_pricing_card_id`
```sql
CREATE INDEX idx_card_pricing_card_id ON public.card_pricing USING btree (card_id)
```

-  `idx_card_pricing_source`
```sql
CREATE INDEX idx_card_pricing_source ON public.card_pricing USING btree (price_source)
```

-  `idx_card_pricing_updated`
```sql
CREATE INDEX idx_card_pricing_updated ON public.card_pricing USING btree (updated_at DESC)
```

### Sample Rows

```json
[
  {
    "id": 828,
    "card_id": 1045,
    "base_price": "0.00",
    "foil_price": "19.97",
    "price_source": "scryfall",
    "updated_at": "2025-10-31T08:30:33.222Z",
    "created_at": "2025-10-31T08:30:33.222Z"
  },
  {
    "id": 829,
    "card_id": 1043,
    "base_price": "0.00",
    "foil_price": "6.99",
    "price_source": "scryfall",
    "updated_at": "2025-10-31T08:30:33.526Z",
    "created_at": "2025-10-31T08:30:33.526Z"
  },
  {
    "id": 830,
    "card_id": 1042,
    "base_price": "4.78",
    "foil_price": "0.00",
    "price_source": "scryfall",
    "updated_at": "2025-10-31T08:30:33.846Z",
    "created_at": "2025-10-31T08:30:33.846Z"
  },
  {
    "id": 831,
    "card_id": 1044,
    "base_price": "10.59",
    "foil_price": "0.00",
    "price_source": "scryfall",
    "updated_at": "2025-10-31T08:30:34.139Z",
    "created_at": "2025-10-31T08:30:34.139Z"
  },
  {
    "id": 832,
    "card_id": 1049,
    "base_price": "0.00",
    "foil_price": "10.97",
    "price_source": "scryfall",
    "updated_at": "2025-10-31T08:30:34.436Z",
    "created_at": "2025-10-31T08:30:34.436Z"
  }
]
```

---

## 📋 card_sets

**Row Count:** 5

### Columns

| Column | Type | Null | Default | Length/Precision |
|--------|------|------|---------|------------------|
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

-  `idx_card_sets_name_trgm`
```sql
CREATE INDEX idx_card_sets_name_trgm ON public.card_sets USING gin (name gin_trgm_ops)
```

### Sample Rows

```json
[
  {
    "id": 12,
    "game_id": 1,
    "name": "Final Fantasy: Through the Ages",
    "code": "FCA",
    "release_date": "2025-06-12T12:00:00.000Z",
    "active": true,
    "created_at": "2025-10-31T11:34:27.552Z",
    "updated_at": "2025-10-31T11:34:27.552Z"
  },
  {
    "id": 11,
    "game_id": 1,
    "name": "Final Fantasy",
    "code": "FIN",
    "release_date": "2025-06-12T12:00:00.000Z",
    "active": true,
    "created_at": "2025-10-13T19:01:32.046Z",
    "updated_at": "2025-11-05T16:04:16.730Z"
  },
  {
    "id": 13,
    "game_id": 1,
    "name": "Final Fantasy Commander",
    "code": "FIC",
    "release_date": "2025-12-04T11:00:00.000Z",
    "active": true,
    "created_at": "2025-11-05T14:11:28.804Z",
    "updated_at": "2025-11-05T16:10:05.788Z"
  }
]
```

---

## 📋 cards

**Row Count:** 1,801

### Columns

| Column | Type | Null | Default | Length/Precision |
|--------|------|------|---------|------------------|
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

-  `idx_cards_border_color`
```sql
CREATE INDEX idx_cards_border_color ON public.cards USING btree (border_color)
```

-  `idx_cards_card_type`
```sql
CREATE INDEX idx_cards_card_type ON public.cards USING btree (card_type)
```

-  `idx_cards_finish`
```sql
CREATE INDEX idx_cards_finish ON public.cards USING btree (finish)
```

-  `idx_cards_game_name`
```sql
CREATE INDEX idx_cards_game_name ON public.cards USING btree (game_id, name)
```

-  `idx_cards_game_set`
```sql
CREATE INDEX idx_cards_game_set ON public.cards USING btree (game_id, set_id)
```

-  `idx_cards_game_treatment`
```sql
CREATE INDEX idx_cards_game_treatment ON public.cards USING btree (game_id, treatment)
```

-  `idx_cards_name`
```sql
CREATE INDEX idx_cards_name ON public.cards USING btree (name)
```

-  `idx_cards_name_trgm`
```sql
CREATE INDEX idx_cards_name_trgm ON public.cards USING gin (name gin_trgm_ops)
```

-  `idx_cards_number_trgm`
```sql
CREATE INDEX idx_cards_number_trgm ON public.cards USING gin (card_number gin_trgm_ops)
```

-  `idx_cards_promo_type`
```sql
CREATE INDEX idx_cards_promo_type ON public.cards USING btree (promo_type)
```

-  `idx_cards_rarity`
```sql
CREATE INDEX idx_cards_rarity ON public.cards USING btree (rarity)
```

-  `idx_cards_search_tsv`
```sql
CREATE INDEX idx_cards_search_tsv ON public.cards USING gin (to_tsvector('english'::regconfig, (((((name)::text || ' '::text) || (COALESCE(card_type, ''::character varying))::text) || ' '::text) || COALESCE(description, ''::text))))
```

-  `idx_cards_search_tsv_column`
```sql
CREATE INDEX idx_cards_search_tsv_column ON public.cards USING gin (search_tsv)
```

-  `idx_cards_set_name`
```sql
CREATE INDEX idx_cards_set_name ON public.cards USING btree (set_id, name)
```

-  `idx_cards_set_treatment`
```sql
CREATE INDEX idx_cards_set_treatment ON public.cards USING btree (set_id, treatment)
```

-  `idx_cards_sku`
```sql
CREATE INDEX idx_cards_sku ON public.cards USING btree (sku)
```

-  `idx_cards_treatment`
```sql
CREATE INDEX idx_cards_treatment ON public.cards USING btree (treatment)
```

### Sample Rows

```json
[
  {
    "id": 1204,
    "game_id": 1,
    "set_id": 11,
    "name": "Cid, Timeless Artificer",
    "card_number": "418",
    "rarity": "uncommon",
    "card_type": "Legendary Creature — Human Artificer",
    "description": "Artifact creatures and Heroes you control get +1/+1 for each Artificer you control and each Artificer card in your graveyard.\nA deck can have any number of cards named Cid, Timeless Artificer.\nCycling {W}{U} ({W}{U}, Discard this card: Draw a card.)",
    "image_url": "https://cards.scryfall.io/large/front/0/1/0148fa7c-b6d6-458c-8cdd-a6c4e6dd4e59.jpg?1748707417",
    "scryfall_id": "0148fa7c-b6d6-458c-8cdd-a6c4e6dd4e59",
    "tcgplayer_id": null,
    "pokemontcg_id": null,
    "created_at": "2025-10-13T19:02:20.433Z",
    "updated_at": "2025-11-05T16:05:04.440Z",
    "search_tsv": "'+1':15,16 '418':52 'artifact':8 'artific':3,7,19,24,40 'card':25,36,48,51 'cid':1,38 'control':13,21 'creatur':5,9 'cycl':41 'deck':30 'discard':46 'draw':49 'get':14 'graveyard':28 'hero':11 'human':6 'legendari':4 'name':37 'number':34 'timeless':2,39 'u':43,45 'w':42,44",
    "border_color": "black",
    "finish": "foil",
    "frame_effect": null,
    "promo_type": null,
    "treatment": "STANDARD",
    "sku": "FIN-418-STANDARD-FOIL"
  },
  {
    "id": 3306,
    "game_id": 1,
    "set_id": 11,
    "name": "The Wandering Minstrel",
    "card_number": "548",
    "rarity": "rare",
    "card_type": "Legendary Creature — Human Bard",
    "description": "Lands you control enter untapped.\nThe Minstrel's Ballad — At the beginning of combat on your turn, if you control five or more Towns, create a 2/2 Elemental creature token that's all colors.\n{3}{W}{U}{B}{R}{G}: Other creatures you control get +X/+X until end of turn, where X is the number of Towns you control.",
    "image_url": "https://cards.scryfall.io/large/front/f/e/fe9cd860-1b4e-48ec-be30-e0ec4ca75e26.jpg?1748707595",
    "scryfall_id": "fe9cd860-1b4e-48ec-be30-e0ec4ca75e26",
    "tcgplayer_id": null,
    "pokemontcg_id": null,
    "created_at": "2025-11-05T15:53:52.762Z",
    "updated_at": "2025-11-05T16:08:49.456Z",
    "search_tsv": "'2/2':34 '3':42 '548':68 'b':45 'ballad':16 'bard':7 'begin':19 'color':41 'combat':21 'control':10,27,51,67 'creat':32 'creatur':5,36,49 'element':35 'end':56 'enter':11 'five':28 'g':47 'get':52 'human':6 'land':8 'legendari':4 'minstrel':3,14 'number':63 'r':46 'token':37 'town':31,65 'turn':24,58 'u':44 'untap':12 'w':43 'wander':2 'x':53,54,60",
    "border_color": "borderless",
    "finish": "surgefoil",
    "frame_effect": "inverted",
    "promo_type": "surgefoil",
    "treatment": "BORDERLESS_INVERTED_SURGEFOIL",
    "sku": "FIN-548-BORDERLESS_INVERTED_SURGEFOIL-SURGEFOIL"
  },
  {
    "id": 2286,
    "game_id": 1,
    "set_id": 13,
    "name": "Aerith, Last Ancient",
    "card_number": "76",
    "rarity": "rare",
    "card_type": "Legendary Creature — Human Cleric Druid",
    "description": "Lifelink\nRaise — At the beginning of your end step, if you gained life this turn, return target creature card from your graveyard to your hand. If you gained 7 or more life this turn, return that card to the battlefield instead.",
    "image_url": "https://cards.scryfall.io/large/front/d/0/d041a51c-9a28-4b32-9da3-0f06807959f1.jpg?1748704472",
    "scryfall_id": "d041a51c-9a28-4b32-9da3-0f06807959f1",
    "tcgplayer_id": null,
    "pokemontcg_id": null,
    "created_at": "2025-11-05T14:11:29.586Z",
    "updated_at": "2025-11-05T16:10:06.090Z",
    "search_tsv": "'7':37 '76':50 'aerith':1 'ancient':3 'battlefield':48 'begin':13 'card':27,45 'cleric':7 'creatur':5,26 'druid':8 'end':16 'gain':20,36 'graveyard':30 'hand':33 'human':6 'instead':49 'last':2 'legendari':4 'life':21,40 'lifelink':9 'rais':10 'return':24,43 'step':17 'target':25 'turn':23,42",
    "border_color": "black",
    "finish": "nonfoil",
    "frame_effect": null,
    "promo_type": "surgefoil",
    "treatment": "STANDARD_SURGEFOIL",
    "sku": "FIC-76-STANDARD_SURGEFOIL-NONFOIL"
  },
  {
    "id": 2288,
    "game_id": 1,
    "set_id": 13,
    "name": "Aerith, Last Ancient",
    "card_number": "163",
    "rarity": "rare",
    "card_type": "Legendary Creature — Human Cleric Druid",
    "description": "Lifelink\nRaise — At the beginning of your end step, if you gained life this turn, return target creature card from your graveyard to your hand. If you gained 7 or more life this turn, return that card to the battlefield instead.",
    "image_url": "https://cards.scryfall.io/large/front/8/2/82518d3f-9557-416b-9b4d-dfe3ffa57f88.jpg?1748704790",
    "scryfall_id": "82518d3f-9557-416b-9b4d-dfe3ffa57f88",
    "tcgplayer_id": null,
    "pokemontcg_id": null,
    "created_at": "2025-11-05T14:11:30.170Z",
    "updated_at": "2025-11-05T16:10:06.404Z",
    "search_tsv": "'163':50 '7':37 'aerith':1 'ancient':3 'battlefield':48 'begin':13 'card':27,45 'cleric':7 'creatur':5,26 'druid':8 'end':16 'gain':20,36 'graveyard':30 'hand':33 'human':6 'instead':49 'last':2 'legendari':4 'life':21,40 'lifelink':9 'rais':10 'return':24,43 'step':17 'target':25 'turn':23,42",
    "border_color": "black",
    "finish": "nonfoil",
    "frame_effect": "extendedart",
    "promo_type": null,
    "treatment": "EXTENDED",
    "sku": "FIC-163-EXTENDED-NONFOIL"
  },
  {
    "id": 2289,
    "game_id": 1,
    "set_id": 13,
    "name": "Aerith, Last Ancient",
    "card_number": "163",
    "rarity": "rare",
    "card_type": "Legendary Creature — Human Cleric Druid",
    "description": "Lifelink\nRaise — At the beginning of your end step, if you gained life this turn, return target creature card from your graveyard to your hand. If you gained 7 or more life this turn, return that card to the battlefield instead.",
    "image_url": "https://cards.scryfall.io/large/front/8/2/82518d3f-9557-416b-9b4d-dfe3ffa57f88.jpg?1748704790",
    "scryfall_id": "82518d3f-9557-416b-9b4d-dfe3ffa57f88",
    "tcgplayer_id": null,
    "pokemontcg_id": null,
    "created_at": "2025-11-05T14:11:30.500Z",
    "updated_at": "2025-11-05T16:10:06.696Z",
    "search_tsv": "'163':50 '7':37 'aerith':1 'ancient':3 'battlefield':48 'begin':13 'card':27,45 'cleric':7 'creatur':5,26 'druid':8 'end':16 'gain':20,36 'graveyard':30 'hand':33 'human':6 'instead':49 'last':2 'legendari':4 'life':21,40 'lifelink':9 'rais':10 'return':24,43 'step':17 'target':25 'turn':23,42",
    "border_color": "black",
    "finish": "foil",
    "frame_effect": "extendedart",
    "promo_type": null,
    "treatment": "EXTENDED",
    "sku": "FIC-163-EXTENDED-FOIL"
  }
]
```

---

## 📋 game_variations_metadata

**Row Count:** -1

### Columns

| Column | Type | Null | Default | Length/Precision |
|--------|------|------|---------|------------------|
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

-  `idx_game_variations_game`
```sql
CREATE INDEX idx_game_variations_game ON public.game_variations_metadata USING btree (game_id)
```

-  `idx_game_variations_treatments`
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
      "inverted",
      "extendedart"
    ],
    "special_foils": [
      "surgefoil",
      "neonink"
    ],
    "border_colors": [
      "black",
      "borderless"
    ],
    "frame_effects": [
      "inverted",
      "extendedart"
    ],
    "treatment_codes": [
      "STANDARD",
      "BORDERLESS_INVERTED_SURGEFOIL",
      "STANDARD_SURGEFOIL",
      "EXTENDED",
      "BORDERLESS_INVERTED",
      "BORDERLESS_NEONINK",
      "BORDERLESS"
    ],
    "total_sets": 3,
    "total_cards": 1866,
    "total_variations": 1866,
    "last_analyzed": "2025-11-05T16:12:58.990Z",
    "created_at": "2025-10-13T19:13:13.244Z",
    "updated_at": "2025-11-05T16:12:58.990Z"
  }
]
```

---

## 📋 games

**Row Count:** 2

### Columns

| Column | Type | Null | Default | Length/Precision |
|--------|------|------|---------|------------------|
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

---

## 📋 order_items

**Row Count:** -1

### Columns

| Column | Type | Null | Default | Length/Precision |
|--------|------|------|---------|------------------|
| `id` | `integer` | `NO` | `nextval('order_items_id_seq'::regclass)` | `32,0` |
| `order_id` | `integer` | `YES` | `` | `32,0` |
| `inventory_id` | `integer` | `YES` | `` | `32,0` |
| `card_name` | `character varying` | `NO` | `` | `255` |
| `quality` | `character varying` | `NO` | `` | `50` |
| `quantity` | `integer` | `NO` | `` | `32,0` |
| `unit_price` | `numeric` | `NO` | `` | `10,2` |
| `total_price` | `numeric` | `NO` | `` | `10,2` |
| `created_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |
| `card_id` | `integer` | `YES` | `` | `32,0` |

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
- **FOREIGN KEY** `order_items_card_id_fkey`
```sql
FOREIGN KEY (card_id) REFERENCES cards(id)
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

- `card_id` → `cards.id` (on update no action, on delete no action)
- `inventory_id` → `card_inventory.id` (on update no action, on delete no action)
- `order_id` → `orders.id` (on update no action, on delete cascade)

### Indexes

- **PRIMARY** **UNIQUE** `order_items_pkey`
```sql
CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id)
```

-  `idx_order_items_card_id`
```sql
CREATE INDEX idx_order_items_card_id ON public.order_items USING btree (card_id)
```

---

## 📋 orders

**Row Count:** -1

### Columns

| Column | Type | Null | Default | Length/Precision |
|--------|------|------|---------|------------------|
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

-  `idx_orders_created`
```sql
CREATE INDEX idx_orders_created ON public.orders USING btree (created_at)
```

-  `idx_orders_customer_email`
```sql
CREATE INDEX idx_orders_customer_email ON public.orders USING btree (customer_email)
```

-  `idx_orders_status`
```sql
CREATE INDEX idx_orders_status ON public.orders USING btree (status)
```

-  `idx_orders_updated_at`
```sql
CREATE INDEX idx_orders_updated_at ON public.orders USING btree (updated_at DESC)
```

---

## 📋 price_history

**Row Count:** -1

### Columns

| Column | Type | Null | Default | Length/Precision |
|--------|------|------|---------|------------------|
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

-  `idx_price_history_inventory`
```sql
CREATE INDEX idx_price_history_inventory ON public.price_history USING btree (inventory_id)
```

-  `idx_price_history_recorded`
```sql
CREATE INDEX idx_price_history_recorded ON public.price_history USING btree (recorded_at DESC)
```

---

## 📋 set_variations_metadata

**Row Count:** -1

### Columns

| Column | Type | Null | Default | Length/Precision |
|--------|------|------|---------|------------------|
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

-  `idx_set_variations_foils`
```sql
CREATE INDEX idx_set_variations_foils ON public.set_variations_metadata USING gin (special_foils)
```

-  `idx_set_variations_game`
```sql
CREATE INDEX idx_set_variations_game ON public.set_variations_metadata USING btree (game_id)
```

-  `idx_set_variations_set`
```sql
CREATE INDEX idx_set_variations_set ON public.set_variations_metadata USING btree (set_id)
```

-  `idx_set_variations_treatments`
```sql
CREATE INDEX idx_set_variations_treatments ON public.set_variations_metadata USING gin (treatment_codes)
```

-  `idx_set_variations_visual`
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
    "id": 3679,
    "set_id": 12,
    "game_id": 1,
    "visual_treatments": [
      "inverted"
    ],
    "special_foils": [],
    "border_colors": [
      "borderless"
    ],
    "frame_effects": [
      "inverted"
    ],
    "treatment_codes": [
      "BORDERLESS_INVERTED"
    ],
    "total_cards": 129,
    "total_variations": 129,
    "last_analyzed": "2025-10-31T11:35:11.271Z",
    "created_at": "2025-10-31T11:34:27.863Z",
    "updated_at": "2025-10-31T11:35:11.271Z"
  },
  {
    "id": 2564,
    "set_id": 11,
    "game_id": 1,
    "visual_treatments": [
      "inverted",
      "extendedart"
    ],
    "special_foils": [
      "surgefoil",
      "neonink"
    ],
    "border_colors": [
      "borderless",
      "black"
    ],
    "frame_effects": [
      "inverted",
      "extendedart"
    ],
    "treatment_codes": [
      "BORDERLESS_INVERTED_SURGEFOIL",
      "STANDARD",
      "EXTENDED",
      "BORDERLESS_NEONINK",
      "STANDARD_SURGEFOIL",
      "BORDERLESS_INVERTED",
      "BORDERLESS"
    ],
    "total_cards": 1147,
    "total_variations": 1147,
    "last_analyzed": "2025-11-05T16:09:44.396Z",
    "created_at": "2025-10-13T19:01:32.357Z",
    "updated_at": "2025-11-05T16:09:44.396Z"
  },
  {
    "id": 3809,
    "set_id": 13,
    "game_id": 1,
    "visual_treatments": [
      "extendedart",
      "inverted"
    ],
    "special_foils": [
      "surgefoil"
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
      "STANDARD_SURGEFOIL",
      "EXTENDED",
      "BORDERLESS_INVERTED",
      "BORDERLESS_INVERTED_SURGEFOIL",
      "STANDARD"
    ],
    "total_cards": 591,
    "total_variations": 591,
    "last_analyzed": "2025-11-05T16:12:58.254Z",
    "created_at": "2025-11-05T14:11:29.104Z",
    "updated_at": "2025-11-05T16:12:58.254Z"
  }
]
```

---

## 📋 variation_display_overrides

**Row Count:** -1

### Columns

| Column | Type | Null | Default | Length/Precision |
|--------|------|------|---------|------------------|
| `id` | `integer` | `NO` | `nextval('variation_display_overrides_id_seq'::regclass)` | `32,0` |
| `game_id` | `integer` | `YES` | `` | `32,0` |
| `treatment` | `character varying` | `YES` | `` | `100` |
| `finish` | `character varying` | `YES` | `` | `50` |
| `border_color` | `character varying` | `YES` | `` | `50` |
| `frame_effect` | `character varying` | `YES` | `` | `100` |
| `promo_type` | `character varying` | `YES` | `` | `100` |
| `display_text` | `character varying` | `NO` | `` | `200` |
| `notes` | `text` | `YES` | `` | `` |
| `active` | `boolean` | `YES` | `true` | `` |
| `created_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |
| `updated_at` | `timestamp without time zone` | `YES` | `CURRENT_TIMESTAMP` | `` |

### Constraints

- **FOREIGN KEY** `variation_display_overrides_game_id_fkey`
```sql
FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
```
- **PRIMARY KEY** `variation_display_overrides_pkey`
```sql
PRIMARY KEY (id)
```
- **UNIQUE** `variation_display_overrides_game_id_treatment_finish_border_key`
```sql
UNIQUE NULLS NOT DISTINCT (game_id, treatment, finish, border_color, frame_effect, promo_type)
```

### Foreign Keys

- `game_id` → `games.id` (on update no action, on delete cascade)

### Indexes

- **PRIMARY** **UNIQUE** `variation_display_overrides_pkey`
```sql
CREATE UNIQUE INDEX variation_display_overrides_pkey ON public.variation_display_overrides USING btree (id)
```

-  `idx_variation_overrides_active`
```sql
CREATE INDEX idx_variation_overrides_active ON public.variation_display_overrides USING btree (active)
```

-  `idx_variation_overrides_game`
```sql
CREATE INDEX idx_variation_overrides_game ON public.variation_display_overrides USING btree (game_id)
```

-  `idx_variation_overrides_lookup`
```sql
CREATE INDEX idx_variation_overrides_lookup ON public.variation_display_overrides USING btree (game_id, treatment, finish) WHERE (active = true)
```

-  `idx_variation_overrides_treatment`
```sql
CREATE INDEX idx_variation_overrides_treatment ON public.variation_display_overrides USING btree (treatment)
```

- **UNIQUE** `variation_display_overrides_game_id_treatment_finish_border_key`
```sql
CREATE UNIQUE INDEX variation_display_overrides_game_id_treatment_finish_border_key ON public.variation_display_overrides USING btree (game_id, treatment, finish, border_color, frame_effect, promo_type) NULLS NOT DISTINCT
```

### Sample Rows

```json
[
  {
    "id": 1,
    "game_id": null,
    "treatment": "STANDARD",
    "finish": "nonfoil",
    "border_color": "black",
    "frame_effect": null,
    "promo_type": null,
    "display_text": "Standard",
    "notes": null,
    "active": true,
    "created_at": "2025-11-05T15:27:54.297Z",
    "updated_at": "2025-11-05T15:27:54.297Z"
  },
  {
    "id": 3,
    "game_id": null,
    "treatment": "STANDARD_SURGEFOIL",
    "finish": "nonfoil",
    "border_color": "black",
    "frame_effect": null,
    "promo_type": "surgefoil",
    "display_text": "Standard",
    "notes": null,
    "active": true,
    "created_at": "2025-11-05T15:28:28.245Z",
    "updated_at": "2025-11-05T15:28:28.245Z"
  },
  {
    "id": 4,
    "game_id": null,
    "treatment": "BORDERLESS_INVERTED",
    "finish": "nonfoil",
    "border_color": "borderless",
    "frame_effect": "inverted",
    "promo_type": null,
    "display_text": "Borderless",
    "notes": null,
    "active": true,
    "created_at": "2025-11-05T15:28:36.108Z",
    "updated_at": "2025-11-05T15:28:36.108Z"
  },
  {
    "id": 5,
    "game_id": null,
    "treatment": "BORDERLESS_INVERTED",
    "finish": "foil",
    "border_color": "borderless",
    "frame_effect": "inverted",
    "promo_type": null,
    "display_text": "Borderless Foil",
    "notes": null,
    "active": true,
    "created_at": "2025-11-05T15:28:44.203Z",
    "updated_at": "2025-11-05T15:28:44.203Z"
  },
  {
    "id": 6,
    "game_id": null,
    "treatment": "EXTENDED",
    "finish": "nonfoil",
    "border_color": "black",
    "frame_effect": "extendedart",
    "promo_type": null,
    "display_text": "Extended Art",
    "notes": null,
    "active": true,
    "created_at": "2025-11-05T15:28:48.862Z",
    "updated_at": "2025-11-05T15:28:48.862Z"
  }
]
```

---

