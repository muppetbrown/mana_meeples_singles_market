/**
 * ENHANCED MTG IMPORT SCRIPT
 * 
 * Imports MTG sets with full variation tracking and analysis
 * Automatically detects and catalogs all variations in the set
 */

const { Pool } = require('pg');
const variationService = require('../services/variationAnalysis');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Import constants from spec
const { 
  IGNORE_FRAME_EFFECTS,
  VISUAL_TREATMENTS,
  SPECIAL_FOILS,
  BORDER_COLORS 
} = variationService;

/**
 * Calculate treatment code from Scryfall card data
 */
function calculateTreatment(card) {
  const borderColor = card.border_color || 'black';
  const frameEffects = card.frame_effects || [];
  const promoTypes = card.promo_types || [];
  
  // Filter frame effects
  const relevantFrameEffects = frameEffects.filter(e => 
    !IGNORE_FRAME_EFFECTS.includes(e)
  );
  
  // Find special foil type
  const specialFoilType = promoTypes.find(p => SPECIAL_FOILS.includes(p));
  
  // Helper function
  const has = (effect) => relevantFrameEffects.includes(effect);
  const isBorderless = borderColor === 'borderless';
  
  // PRIORITY ORDER
  
  // 1. Yellow border (winner cards)
  if (borderColor === 'yellow') {
    return specialFoilType ? 
      `WINNER_${specialFoilType.toUpperCase()}` : 
      'WINNER';
  }
  
  // 2. Special foil + white border
  if (specialFoilType && borderColor === 'white') {
    const base = getBaseTreatment(relevantFrameEffects, isBorderless);
    return base ? 
      `${base}_${specialFoilType.toUpperCase()}` : 
      `WHITE_BORDER_${specialFoilType.toUpperCase()}`;
  }
  
  // 3. Special foil + borderless
  if (specialFoilType && isBorderless) {
    const base = getBaseTreatment(relevantFrameEffects, isBorderless);
    return base ? 
      `${base}_${specialFoilType.toUpperCase()}` : 
      `BORDERLESS_${specialFoilType.toUpperCase()}`;
  }
  
  // 4. Special foil + standard
  if (specialFoilType) {
    const base = getBaseTreatment(relevantFrameEffects, isBorderless);
    return base ? 
      `${base}_${specialFoilType.toUpperCase()}` : 
      `STANDARD_${specialFoilType.toUpperCase()}`;
  }
  
  // 5. No special foil - just frame effects
  const base = getBaseTreatment(relevantFrameEffects, isBorderless);
  if (base) return base;
  
  // 6. Border-only treatments
  if (borderColor === 'white') return 'WHITE_BORDER';
  if (borderColor === 'borderless') return 'BORDERLESS';
  
  // 7. Standard
  return 'STANDARD';
}

/**
 * Helper: Get base treatment from frame effects
 */
function getBaseTreatment(frameEffects, isBorderless) {
  const has = (effect) => frameEffects.includes(effect);
  
  // Combinations (order matters!)
  if (has('showcase') && has('inverted') && isBorderless) 
    return 'SHOWCASE_INVERTED';
  if (has('showcase') && isBorderless) 
    return 'SHOWCASE';
  if (has('wanted') && has('inverted') && isBorderless) 
    return 'WANTED_INVERTED';
  if (has('wanted') && isBorderless) 
    return 'WANTED';
  if (has('tombstone') && has('inverted') && isBorderless) 
    return 'TOMBSTONE_INVERTED';
  if (has('tombstone') && isBorderless) 
    return 'TOMBSTONE';
  if (has('inverted') && isBorderless) 
    return 'BORDERLESS_INVERTED';
  if (has('fullart') && isBorderless) 
    return 'FULLART_BORDERLESS';
  
  // Single treatments
  if (has('fullart')) return 'FULLART';
  if (has('extendedart')) return 'EXTENDED';
  if (has('showcase')) return 'SHOWCASE_STANDARD';
  if (has('wanted')) return 'WANTED_STANDARD';
  if (has('tombstone')) return 'TOMBSTONE_STANDARD';
  if (has('inverted')) return 'INVERTED_STANDARD';
  
  return null;
}

/**
 * Generate SKU from card data
 */
function generateSKU(card, treatment, finish) {
  return [
    card.set.toUpperCase(),
    card.collector_number,
    treatment,
    finish.toUpperCase()
  ].join('-');
}

/**
 * Import MTG set with full variation tracking
 */
async function importMTGSet(setCode) {
  console.log(`\n🎴 Starting enhanced import for MTG set: ${setCode.toUpperCase()}`);
  console.log('━'.repeat(60));
  
  let allCards = [];
  let nextPage = `https://api.scryfall.com/cards/search?q=set:${setCode}&unique=prints&order=name`;
  let pageNum = 1;
  
  // Fetch all pages from Scryfall API
  while (nextPage) {
    console.log(`📥 Fetching page ${pageNum}...`);
    const response = await fetch(nextPage);
    
    if (!response.ok) {
      throw new Error(`Scryfall API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      console.log('⚠️  No cards found for this set code');
      break;
    }
    
    allCards = allCards.concat(data.data);
    console.log(`   Found ${data.data.length} cards on this page`);
    
    nextPage = data.has_more ? data.next_page : null;
    pageNum++;
    
    if (nextPage) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  if (allCards.length === 0) {
    console.log('\n❌ No cards found. Check your set code.');
    return;
  }

  console.log(`\n📊 Found ${allCards.length} total cards to import`);
  console.log('━'.repeat(60));

  // Get MTG game ID
  const gameResult = await pool.query(
    `SELECT id FROM games WHERE code = 'mtg'`
  );
  
  if (gameResult.rows.length === 0) {
    throw new Error('MTG game not found in database');
  }
  
  const gameId = gameResult.rows[0].id;

  // Create or get set
  const setInfo = allCards[0].set_name;
  const releaseDate = allCards[0].released_at;

  const setResult = await pool.query(
    `INSERT INTO card_sets (game_id, name, code, release_date)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (game_id, code) DO UPDATE
     SET name = EXCLUDED.name, release_date = EXCLUDED.release_date, updated_at = NOW()
     RETURNING id`,
    [gameId, setInfo, setCode.toUpperCase(), releaseDate]
  );

  const setId = setResult.rows[0].id;
  console.log(`✅ Set: ${setInfo} (ID: ${setId})`);

  // Statistics
  let imported = 0;
  let updated = 0;
  let variations = 0;
  let skipped = 0;
  
  const variationStats = {
    treatments: new Set(),
    borderColors: new Set(),
    specialFoils: new Set(),
    frameEffects: new Set()
  };

  console.log('\n🔄 Processing cards...\n');

  for (const card of allCards) {
    try {
      // Get image URL
      let imageUrl = card.image_uris?.large || card.image_uris?.normal;
      if (!imageUrl && card.card_faces?.[0]?.image_uris) {
        imageUrl = card.card_faces[0].image_uris.large || 
                   card.card_faces[0].image_uris.normal;
      }

      // Get oracle text
      let oracleText = card.oracle_text || '';
      if (!oracleText && card.card_faces) {
        oracleText = card.card_faces
          .map(face => face.oracle_text || '')
          .filter(text => text)
          .join(' // ');
      }

      // Calculate treatment
      const treatment = calculateTreatment(card);
      
      // Get finishes
      const finishes = card.finishes || ['nonfoil'];
      
      // Track variation statistics
      variationStats.treatments.add(treatment);
      if (card.border_color) variationStats.borderColors.add(card.border_color);
      
      const specialFoil = card.promo_types?.find(p => SPECIAL_FOILS.includes(p));
      if (specialFoil) variationStats.specialFoils.add(specialFoil);
      
      const relevantFrames = card.frame_effects?.filter(e => 
        !IGNORE_FRAME_EFFECTS.includes(e)
      ) || [];
      relevantFrames.forEach(f => variationStats.frameEffects.add(f));

      // Process each finish as a separate card entry
      for (const finish of finishes) {
        const sku = generateSKU(card, treatment, finish);
        
        // Check if card already exists
        const existingCard = await pool.query(
          `SELECT id FROM cards WHERE sku = $1`,
          [sku]
        );

        if (existingCard.rows.length > 0) {
          // Update existing
          await pool.query(
            `UPDATE cards 
             SET name = $1, rarity = $2, card_type = $3, description = $4, 
                 image_url = $5, scryfall_id = $6, 
                 border_color = $7, finish = $8, frame_effect = $9, 
                 promo_type = $10, treatment = $11, updated_at = NOW()
             WHERE sku = $12`,
            [
              card.name,
              card.rarity,
              card.type_line || '',
              oracleText,
              imageUrl,
              card.id,
              card.border_color,
              finish,
              relevantFrames.join(',') || null,
              specialFoil || null,
              treatment,
              sku
            ]
          );
          updated++;
        } else {
          // Insert new
          await pool.query(
            `INSERT INTO cards (
              game_id, set_id, name, card_number, rarity, card_type, 
              description, image_url, scryfall_id,
              border_color, finish, frame_effect, promo_type, treatment, sku
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
              gameId,
              setId,
              card.name,
              card.collector_number,
              card.rarity,
              card.type_line || '',
              oracleText,
              imageUrl,
              card.id,
              card.border_color,
              finish,
              relevantFrames.join(',') || null,
              specialFoil || null,
              treatment,
              sku
            ]
          );
          imported++;
        }
        
        variations++;
      }

    } catch (error) {
      console.error(`❌ Error processing ${card.name}: ${error.message}`);
      skipped++;
    }
  }

  console.log('\n━'.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('━'.repeat(60));
  console.log(`✅ New cards imported:    ${imported}`);
  console.log(`🔄 Cards updated:         ${updated}`);
  console.log(`📦 Total variations:      ${variations}`);
  console.log(`⏭️  Cards skipped:         ${skipped}`);
  console.log('━'.repeat(60));
  
  console.log('\n🎨 VARIATION ANALYSIS');
  console.log('━'.repeat(60));
  console.log(`Treatment codes:    ${variationStats.treatments.size}`);
  console.log(`Border colors:      ${variationStats.borderColors.size}`);
  console.log(`Special foils:      ${variationStats.specialFoils.size}`);
  console.log(`Frame effects:      ${variationStats.frameEffects.size}`);
  console.log('━'.repeat(60));
  
  if (variationStats.treatments.size > 0) {
    console.log('\n📋 Treatments found:');
    Array.from(variationStats.treatments).sort().forEach(t => {
      console.log(`   • ${t}`);
    });
  }
  
  if (variationStats.specialFoils.size > 0) {
    console.log('\n✨ Special foils found:');
    Array.from(variationStats.specialFoils).sort().forEach(f => {
      console.log(`   • ${f}`);
    });
  }

  // Analyze and store variation metadata
  console.log('\n🔍 Analyzing set variations...');
  await variationService.analyzeSetVariations(setId, gameId);
  
  console.log('🔍 Updating game-wide variations...');
  await variationService.analyzeGameVariations(gameId);
  
  console.log('🔄 Refreshing variation filters...');
  await variationService.refreshVariationFilters();
  
  console.log('\n✅ Import complete!\n');
}

// Main execution
const setCode = process.argv[2];

if (!setCode) {
  console.error('\n❌ Error: No set code provided');
  console.error('\n📖 Usage: node scripts/import-mtg-set-enhanced.js <SET_CODE>');
  console.error('\n📝 Examples:');
  console.error('   node scripts/import-mtg-set-enhanced.js BLB');
  console.error('   node scripts/import-mtg-set-enhanced.js FDN');
  console.error('   node scripts/import-mtg-set-enhanced.js DSK');
  console.error('\n🔗 Find set codes at: https://scryfall.com/sets\n');
  process.exit(1);
}

importMTGSet(setCode)
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Import failed:', err.message);
    console.error(err.stack);
    pool.end();
    process.exit(1);
  });