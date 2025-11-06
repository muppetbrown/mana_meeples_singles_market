/**
 * Migration Script: Update Special Foil Finishes
 *
 * This script updates existing cards in the database where:
 * - finish = 'foil'
 * - promo_type is a special foil type (surgefoil, galaxyfoil, etc.)
 *
 * It sets the finish column to match the specific promo_type.
 *
 * Usage:
 *   npx tsx scripts/migrations/update-special-foil-finishes.ts [--dry-run]
 */

import { db } from '../../apps/api/src/lib/db.js';

const SPECIAL_FOILS = [
  'surgefoil',
  'galaxyfoil',
  'fracturefoil',
  'singularityfoil',
  'chocobotrackfoil',
  'cosmicfoil',
  'halofoil',
  'textured',
  'firstplacefoil',
  'rainbowfoil',
  'dragonscalefoil',
  'raisedfoil',
  'neonink'
];

async function updateSpecialFoilFinishes(dryRun = false) {
  console.log('🔍 Checking for cards with special foil promo_types...\n');

  // Check what would be updated
  const cardsToUpdate = await db.query(`
    SELECT
      promo_type,
      COUNT(*) as count
    FROM cards
    WHERE finish = 'foil'
      AND promo_type = ANY($1)
    GROUP BY promo_type
    ORDER BY promo_type
  `, [SPECIAL_FOILS]);

  if (cardsToUpdate.length === 0) {
    console.log('✅ No cards need updating. All special foils already have correct finish types.');
    return;
  }

  console.log('📊 Cards to update:\n');
  let totalCards = 0;
  for (const row of cardsToUpdate) {
    console.log(`   ${row.promo_type}: ${row.count} cards`);
    totalCards += parseInt(row.count);
  }
  console.log(`\n   TOTAL: ${totalCards} cards\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('   Run without --dry-run to apply changes\n');

    // Show sample cards that would be updated
    const sampleCards = await db.query(`
      SELECT
        c.id,
        c.name,
        c.card_number,
        c.finish,
        c.promo_type,
        cs.name as set_name,
        cs.code as set_code
      FROM cards c
      LEFT JOIN card_sets cs ON c.set_id = cs.id
      WHERE c.finish = 'foil'
        AND c.promo_type = ANY($1)
      LIMIT 10
    `, [SPECIAL_FOILS]);

    console.log('📋 Sample cards that would be updated:');
    for (const card of sampleCards) {
      console.log(`   ${card.name} (${card.set_code} #${card.card_number})`);
      console.log(`      finish: ${card.finish} → ${card.promo_type}`);
    }

    return;
  }

  console.log('⚠️  WARNING: This will update the finish column for these cards.');
  console.log('   Press Ctrl+C within 5 seconds to cancel...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('🔄 Updating cards...\n');

  let updatedCount = 0;

  for (const specialFoil of SPECIAL_FOILS) {
    const result = await db.query(`
      UPDATE cards
      SET finish = $1,
          updated_at = NOW()
      WHERE finish = 'foil'
        AND promo_type = $1
      RETURNING id
    `, [specialFoil]);

    if (result.length > 0) {
      console.log(`   ✅ Updated ${result.length} ${specialFoil} cards`);
      updatedCount += result.length;
    }
  }

  console.log(`\n✅ Migration complete! Updated ${updatedCount} cards.\n`);

  // Show final state
  const finalState = await db.query(`
    SELECT
      promo_type,
      finish,
      COUNT(*) as count
    FROM cards
    WHERE promo_type = ANY($1)
    GROUP BY promo_type, finish
    ORDER BY promo_type, finish
  `, [SPECIAL_FOILS]);

  console.log('📊 Final state of special foil cards:\n');
  for (const row of finalState) {
    console.log(`   ${row.promo_type} (finish: ${row.finish}): ${row.count} cards`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (dryRun) {
  console.log('🔍 Running in DRY RUN mode\n');
}

updateSpecialFoilFinishes(dryRun)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
