// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'Pool'.
const { Pool } = require('pg');
require('dotenv').config();

// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'pool'.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateCardPricing() {
  console.log('\n🔄 Starting card pricing migration...');
  console.log('━'.repeat(60));

  try {
    // Create the card_pricing table
    console.log('📋 Creating card_pricing table...');

    await pool.query(`
      -- Create sequence for card_pricing table
      CREATE SEQUENCE IF NOT EXISTS card_pricing_id_seq;
    `);

    await pool.query(`
      -- Create card_pricing table to store base pricing information
      CREATE TABLE IF NOT EXISTS "public"."card_pricing" (
          "id" int4 NOT NULL DEFAULT nextval('card_pricing_id_seq'::regclass),
          "card_id" int4 NOT NULL,
          "base_price" numeric(10,2) NOT NULL DEFAULT 0,
          "foil_price" numeric(10,2) NOT NULL DEFAULT 0,
          "price_source" varchar(50) DEFAULT 'manual'::character varying,
          "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
          "created_at" timestamp DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create constraints and indices
    console.log('🔧 Creating constraints and indices...');

    try {
      await pool.query(`
        ALTER TABLE "public"."card_pricing" ADD CONSTRAINT "card_pricing_card_id_key" UNIQUE ("card_id");
      `);
    } catch (e) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (!e.message.includes('already exists')) {
        throw e;
      }
    }

    try {
      await pool.query(`
        ALTER TABLE "public"."card_pricing" ADD CONSTRAINT "card_pricing_card_id_fkey"
        FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE CASCADE;
      `);
    } catch (e) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (!e.message.includes('already exists')) {
        throw e;
      }
    }

    // Create indices
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "idx_card_pricing_card_id" ON "public"."card_pricing" USING btree ("card_id");
      CREATE INDEX IF NOT EXISTS "idx_card_pricing_updated" ON "public"."card_pricing" USING btree ("updated_at" DESC);
      CREATE INDEX IF NOT EXISTS "idx_card_pricing_source" ON "public"."card_pricing" USING btree ("price_source");
    `);

    // Migrate existing zero-quantity inventory pricing to card_pricing table
    console.log('📦 Migrating existing pricing data...');

    const migrationResult = await pool.query(`
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
      ON CONFLICT (card_id) DO NOTHING
      RETURNING *;
    `);

    console.log(`   Migrated ${migrationResult.rowCount} pricing records`);

    // Clean up: Remove all zero-quantity inventory entries
    console.log('🧹 Removing zero-quantity inventory entries...');

    const cleanupResult = await pool.query(`
      DELETE FROM card_inventory WHERE stock_quantity = 0;
    `);

    console.log(`   Removed ${cleanupResult.rowCount} zero-quantity entries`);

    console.log('\n' + '━'.repeat(60));
    console.log('✅ MIGRATION COMPLETE');
    console.log('━'.repeat(60));
    console.log(`📋 Card pricing table created`);
    console.log(`📦 ${migrationResult.rowCount} pricing records migrated`);
    console.log(`🧹 ${cleanupResult.rowCount} zero-quantity entries removed`);
    console.log('━'.repeat(60));

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
migrateCardPricing()
  .then(() => {
    console.log('\n✅ Migration completed successfully!\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  });