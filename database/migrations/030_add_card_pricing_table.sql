-- Migration: Add card_pricing table to store base pricing without inventory entries
-- This replaces the zero-quantity inventory entries created during import

-- Create sequence for card_pricing table
CREATE SEQUENCE IF NOT EXISTS card_pricing_id_seq;

-- Create card_pricing table to store base pricing information
CREATE TABLE "public"."card_pricing" (
    "id" int4 NOT NULL DEFAULT nextval('card_pricing_id_seq'::regclass),
    "card_id" int4 NOT NULL,
    "base_price" numeric(10,2) NOT NULL DEFAULT 0,
    "foil_price" numeric(10,2) NOT NULL DEFAULT 0,
    "price_source" varchar(50) DEFAULT 'manual'::character varying,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Create unique constraint on card_id (one pricing entry per card)
ALTER TABLE "public"."card_pricing" ADD CONSTRAINT "card_pricing_card_id_key" UNIQUE ("card_id");

-- Create foreign key constraint
ALTER TABLE "public"."card_pricing" ADD CONSTRAINT "card_pricing_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE CASCADE;

-- Create indices for performance
CREATE INDEX "idx_card_pricing_card_id" ON "public"."card_pricing" USING btree ("card_id");
CREATE INDEX "idx_card_pricing_updated" ON "public"."card_pricing" USING btree ("updated_at" DESC);
CREATE INDEX "idx_card_pricing_source" ON "public"."card_pricing" USING btree ("price_source");

-- Create trigger to auto-update updated_at
CREATE TRIGGER "update_card_pricing_updated_at"
  BEFORE UPDATE ON "public"."card_pricing"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Migrate existing zero-quantity inventory pricing to card_pricing table
-- This preserves the pricing data while removing the zero-stock entries
INSERT INTO card_pricing (card_id, base_price, foil_price, price_source, updated_at)
SELECT
  ci.card_id,
  -- Get base price from Regular/Non-foil Near Mint entry
  (SELECT price FROM card_inventory ci_base
   WHERE ci_base.card_id = ci.card_id
   AND ci_base.quality = 'Near Mint'
   AND (ci_base.foil_type = 'Regular' OR ci_base.foil_type = 'Non-foil')
   LIMIT 1) as base_price,
  -- Get foil price from Foil Near Mint entry, fallback to base price * 2.5
  COALESCE(
    (SELECT price FROM card_inventory ci_foil
     WHERE ci_foil.card_id = ci.card_id
     AND ci_foil.quality = 'Near Mint'
     AND ci_foil.foil_type = 'Foil'
     LIMIT 1),
    (SELECT price * 2.5 FROM card_inventory ci_base
     WHERE ci_base.card_id = ci.card_id
     AND ci_base.quality = 'Near Mint'
     AND (ci_base.foil_type = 'Regular' OR ci_base.foil_type = 'Non-foil')
     LIMIT 1)
  ) as foil_price,
  ci.price_source,
  NOW()
FROM card_inventory ci
WHERE ci.stock_quantity = 0
  AND ci.quality = 'Near Mint'
  AND (ci.foil_type = 'Regular' OR ci.foil_type = 'Non-foil')
GROUP BY ci.card_id, ci.price_source
ON CONFLICT (card_id) DO NOTHING;

-- Clean up: Remove all zero-quantity inventory entries
-- These are now replaced by the card_pricing table
DELETE FROM card_inventory WHERE stock_quantity = 0;

COMMIT;