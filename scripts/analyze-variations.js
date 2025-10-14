/**
 * Manually trigger variation analysis for a set
 * 
 * Usage:
 *   node scripts/analyze-variations.js FIN
 *   node scripts/analyze-variations.js BLB
 */

const pool = require('../config/database');
const variationService = require('../services/variationAnalysis');

async function analyzeSet(setCode) {
  try {
    console.log(`\n🔍 Analyzing variations for set: ${setCode}`);
    console.log('━'.repeat(60));
    
    // Get the set
    const setResult = await pool.query(
      'SELECT id, game_id, name FROM card_sets WHERE code = $1',
      [setCode.toUpperCase()]
    );
    
    if (setResult.rows.length === 0) {
      console.error(`❌ Set '${setCode}' not found`);
      process.exit(1);
    }
    
    const { id: setId, game_id: gameId, name: setName } = setResult.rows[0];
    
    console.log(`✅ Found set: ${setName} (ID: ${setId})`);
    console.log(`   Game ID: ${gameId}`);
    
    // Count cards
    const cardCount = await pool.query(
      'SELECT COUNT(*) as count FROM cards WHERE set_id = $1',
      [setId]
    );
    console.log(`   Cards: ${cardCount.rows[0].count}`);
    console.log();
    
    // Analyze set variations
    console.log('🔍 Analyzing set variations...');
    const setMetadata = await variationService.analyzeSetVariations(setId, gameId);
    
    if (setMetadata) {
      console.log('✅ Set variations analyzed:');
      console.log(`   Treatment codes: ${setMetadata.treatmentCodes.length}`);
      console.log(`   Border colors: ${setMetadata.borderColors.length}`);
      console.log(`   Special foils: ${setMetadata.specialFoils.length}`);
      console.log(`   Frame effects: ${setMetadata.frameEffects.length}`);
    }
    console.log();
    
    // Analyze game variations
    console.log('🔍 Analyzing game-wide variations...');
    const gameMetadata = await variationService.analyzeGameVariations(gameId);
    
    if (gameMetadata) {
      console.log('✅ Game variations analyzed:');
      console.log(`   Total sets: ${gameMetadata.totalSets}`);
      console.log(`   Total cards: ${gameMetadata.totalCards}`);
      console.log(`   Treatment codes: ${gameMetadata.treatmentCodes.length}`);
    }
    console.log();
    
    // Refresh materialized view
    console.log('🔄 Refreshing materialized view...');
    await variationService.refreshVariationFilters();
    console.log('✅ Materialized view refreshed');
    
    console.log();
    console.log('━'.repeat(60));
    console.log('🎉 Analysis complete!');
    console.log('━'.repeat(60));
    console.log();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Main execution
const setCode = process.argv[2];

if (!setCode) {
  console.error('\n❌ Error: No set code provided');
  console.error('\n📖 Usage: node scripts/analyze-variations.js <SET_CODE>');
  console.error('\n📝 Examples:');
  console.error('   node scripts/analyze-variations.js FIN');
  console.error('   node scripts/analyze-variations.js BLB');
  console.error('   node scripts/analyze-variations.js MH3\n');
  process.exit(1);
}

analyzeSet(setCode);