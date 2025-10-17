// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'Pool'.
const { Pool } = require('pg');
require('dotenv').config();

// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'pool'.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/**
 * Bulk create foil versions for all cards in a set or game
 * Usage: node scripts/create-bulk-foils.js <set_code> [foil_type] [price_multiplier]
 */
async function createBulkFoils(setCode: any, foilType = 'Foil', priceMultiplier = 2.5) {
  console.log(`\n🌟 Creating foil versions for set: ${setCode.toUpperCase()}`);
  console.log(`   Foil Type: ${foilType}`);
  console.log(`   Price Multiplier: ${priceMultiplier}x`);
  console.log('━'.repeat(60));

  try {
    // Get all cards in the set
    const cardsResult = await pool.query(`
      SELECT c.id, c.name, cs.name as set_name, cs.code
      FROM cards c
      JOIN card_sets cs ON c.set_id = cs.id
      WHERE cs.code = $1
    `, [setCode.toUpperCase()]);

    if (cardsResult.rows.length === 0) {
      console.log(`❌ No cards found for set code: ${setCode}`);
      return;
    }

    console.log(`📦 Found ${cardsResult.rows.length} cards in ${cardsResult.rows[0].set_name}`);
    console.log('━'.repeat(60));

    const qualities = ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'];

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const card of cardsResult.rows) {
      try {
        // Get existing regular versions for this card
        const regularVersions = await pool.query(`
          SELECT quality, price, language
          FROM card_inventory
          WHERE card_id = $1 AND foil_type = 'Regular'
        `, [card.id]);

        if (regularVersions.rows.length === 0) {
          console.log(`⚠️  No regular versions found for: ${card.name}`);
          skipped++;
          continue;
        }

        for (const regular of regularVersions.rows) {
          // Check if foil version already exists
          const existingFoil = await pool.query(`
            SELECT id FROM card_inventory
            WHERE card_id = $1 AND quality = $2 AND foil_type = $3 AND language = $4
          `, [card.id, regular.quality, foilType, regular.language]);

          if (existingFoil.rows.length > 0) {
            continue; // Skip if already exists
          }

          // Create foil version
          const foilPrice = regular.price * priceMultiplier;

          await pool.query(`
            INSERT INTO card_inventory (card_id, quality, foil_type, language, stock_quantity, price, price_source, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 0, $5, 'bulk_foil_script', NOW(), NOW())
          `, [card.id, regular.quality, foilType, regular.language, foilPrice]);

          created++;
        }

        if (created % 50 === 0) {
          console.log(`   Created ${created} foil versions...`);
        }

      } catch (error) {
        // @ts-expect-error TS(2571): Object is of type 'unknown'.
        console.error(`   ❌ Error with ${card.name}: ${error.message}`);
        errors++;
      }
    }

    console.log('\n' + '━'.repeat(60));
    console.log('📊 FOIL CREATION SUMMARY');
    console.log('━'.repeat(60));
    console.log(`✅ Foil versions created: ${created}`);
    console.log(`⏭️  Items skipped:         ${skipped}`);
    console.log(`❌ Errors:               ${errors}`);
    console.log('━'.repeat(60));

  } catch (error) {
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    console.error('❌ Script failed:', error.message);
    throw error;
  }
}

// Main execution
// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'setCode'.
const setCode = process.argv[2];
const foilType = process.argv[3] || 'Foil';
// @ts-expect-error TS(2345): Argument of type 'string | undefined' is not assig... Remove this comment to see the full error message
const priceMultiplier = parseFloat(process.argv[4]) || 2.5;

if (!setCode) {
  console.error('\n❌ Error: No set code provided');
  console.error('\n📖 Usage: node scripts/create-bulk-foils.js <SET_CODE> [foil_type] [price_multiplier]');
  console.error('\n📝 Examples:');
  console.error('   node scripts/create-bulk-foils.js BLB');
  console.error('   node scripts/create-bulk-foils.js MH3 Foil 3.0');
  console.error('   node scripts/create-bulk-foils.js OTJ Etched 2.8');
  console.error('\n💡 Available foil types: Foil, Etched, Showcase, Extended Art');
  console.error('🔗 Find set codes at: https://scryfall.com/sets\n');
  process.exit(1);
}

createBulkFoils(setCode, foilType, priceMultiplier)
  .then(() => {
    console.log('\n✅ Bulk foil creation complete!\n');
    pool.end();
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Bulk foil creation failed:', err.message);
    console.error(err.stack);
    pool.end();
    process.exit(1);
  });