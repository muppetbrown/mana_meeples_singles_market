const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Retry helper for API calls
async function fetchWithRetry(url, headers, maxRetries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`   Attempt ${attempt}/${maxRetries}...`);
      
      const response = await fetch(url, { 
        headers,
        timeout: 30000 // 30 second timeout
      });
      
      if (!response.ok) {
        if (response.status === 504 || response.status === 503) {
          if (attempt < maxRetries) {
            console.log(`   ⏳ Server timeout, waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
            continue;
          }
        }
        throw new Error(`Pokemon TCG API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.log(`   ⚠️  ${err.message}, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

// Validate set ID format
function validateSetId(setId) {
  const normalized = setId.toLowerCase().trim();
  
  // Common patterns: sv3, swsh12, sm1, xy1, bw1, etc.
  const validPattern = /^[a-z]{1,6}\d{1,3}[a-z]?$/;
  
  if (!validPattern.test(normalized)) {
    console.log(`\n⚠️  Warning: "${setId}" doesn't match typical set ID patterns`);
    console.log('   Expected formats: sv3, swsh12, sm1, xy1, etc.');
    console.log('   Proceeding anyway...\n');
  }
  
  return normalized;
}

// Import Pokemon set from Pokemon TCG API
async function importPokemonSet(setId) {
  const normalizedSetId = validateSetId(setId);
  
  console.log(`\n🎴 Starting import for Pokemon set: ${normalizedSetId.toUpperCase()}`);
  console.log('━'.repeat(60));
  
  // First, verify the set exists
  console.log('🔍 Verifying set exists...');
  try {
    const setData = await fetchWithRetry(
      `https://api.pokemontcg.io/v2/sets/${normalizedSetId}`,
      {
        'X-Api-Key': process.env.POKEMON_TCG_API_KEY || ''
      }
    );
    
    if (setData.data) {
      console.log(`✅ Found set: ${setData.data.name}`);
      console.log(`   Release Date: ${setData.data.releaseDate}`);
      console.log(`   Total Cards: ${setData.data.total || 'Unknown'}`);
    }
  } catch (err) {
    console.log(`❌ Could not verify set: ${err.message}`);
    console.log('\n💡 Suggestions:');
    console.log('   1. Check set ID at: https://pokemontcg.io/sets');
    console.log('   2. Ensure the set ID is correct (case-insensitive)');
    console.log('   3. Try again in a few minutes if API is down\n');
    throw err;
  }
  
  console.log('━'.repeat(60));
  
  let allCards = [];
  let page = 1;
  let totalPages = 1;
  
  // Fetch all pages from Pokemon TCG API
  while (page <= totalPages) {
    console.log(`\n📥 Fetching page ${page}...`);
    
    const data = await fetchWithRetry(
      `https://api.pokemontcg.io/v2/cards?q=set.id:${normalizedSetId}&page=${page}&pageSize=250`,
      {
        'X-Api-Key': process.env.POKEMON_TCG_API_KEY || ''
      }
    );
    
    if (!data.data || data.data.length === 0) {
      console.log('⚠️  No cards found for this set ID');
      break;
    }
    
    allCards = allCards.concat(data.data);
    totalPages = data.totalPages || 1;
    console.log(`   ✅ Found ${data.data.length} cards on this page`);
    
    page++;
    
    // Rate limit: wait 500ms between requests (more conservative)
    if (page <= totalPages) {
      console.log(`   ⏳ Waiting 500ms before next request...`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  if (allCards.length === 0) {
    console.log('\n❌ No cards found. Check your set ID.');
    console.log('Find set IDs at: https://pokemontcg.io/sets');
    return;
  }

  console.log(`\n✅ Retrieved ${allCards.length} total cards`);
  console.log('━'.repeat(60));

  const gameId = 2; // Pokemon
  const firstCard = allCards[0];
  
  // Create or get the set
  console.log(`\n📦 Creating/updating set: ${firstCard.set.name} (${normalizedSetId.toUpperCase()})`);
  const setResult = await pool.query(
    `INSERT INTO card_sets (game_id, name, code, release_date, active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (game_id, code) 
     DO UPDATE SET name = EXCLUDED.name, release_date = EXCLUDED.release_date
     RETURNING id`,
    [gameId, firstCard.set.name, normalizedSetId.toUpperCase(), firstCard.set.releaseDate]
  );
  
  const setId_db = setResult.rows[0].id;
  console.log(`   Set ID: ${setId_db}`);
  console.log('━'.repeat(60));

  let imported = 0;
  let updated = 0;
  let errors = 0;

  console.log(`\n🔄 Processing cards...`);

  for (let idx = 0; idx < allCards.length; idx++) {
    const card = allCards[idx];
    
    try {
      // Get image URL
      const imageUrl = card.images?.large || card.images?.small || '';

      // Get card type/supertype
      const cardType = card.supertype || 'Pokemon';

      // Check if card already exists
      const existingCard = await pool.query(
        `SELECT id FROM cards WHERE set_id = $1 AND card_number = $2`,
        [setId_db, card.number]
      );

      let cardId;

      if (existingCard.rows.length > 0) {
        // Update existing card
        cardId = existingCard.rows[0].id;
        await pool.query(
          `UPDATE cards 
           SET name = $1, rarity = $2, card_type = $3, description = $4, 
               image_url = $5, updated_at = NOW()
           WHERE id = $6`,
          [
            card.name,
            card.rarity || 'Common',
            cardType,
            card.rules?.join(' ') || card.abilities?.map(a => a.text).join(' ') || '',
            imageUrl,
            cardId
          ]
        );
        updated++;
      } else {
        // Insert new card
        const cardResult = await pool.query(
          `INSERT INTO cards (game_id, set_id, name, card_number, rarity, card_type, description, image_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          [
            gameId,
            setId_db,
            card.name,
            card.number,
            card.rarity || 'Common',
            cardType,
            card.rules?.join(' ') || card.abilities?.map(a => a.text).join(' ') || '',
            imageUrl
          ]
        );
        cardId = cardResult.rows[0].id;
        imported++;
      }

      // Get price - try market price first, then fall back to others
      const basePrice = parseFloat(
        card.cardmarket?.prices?.averageSellPrice ||
        card.tcgplayer?.prices?.holofoil?.market ||
        card.tcgplayer?.prices?.reverseHolofoil?.market ||
        card.tcgplayer?.prices?.normal?.market ||
        card.tcgplayer?.prices?.['1stEditionHolofoil']?.market ||
        0
      );

      // Store base pricing information
      await pool.query(
        `INSERT INTO card_pricing (card_id, base_price, foil_price, price_source, updated_at)
         VALUES ($1, $2, $3, 'api_pokemon', NOW())
         ON CONFLICT (card_id)
         DO UPDATE SET
           base_price = CASE
             WHEN card_pricing.price_source = 'manual' THEN card_pricing.base_price
             ELSE EXCLUDED.base_price
           END,
           foil_price = CASE
             WHEN card_pricing.price_source = 'manual' THEN card_pricing.foil_price
             ELSE EXCLUDED.foil_price
           END,
           updated_at = NOW()`,
        [cardId, basePrice, basePrice * 1.5]
      );

      // Progress indicator
      if ((idx + 1) % 25 === 0 || idx === allCards.length - 1) {
        console.log(`   📊 Processed ${idx + 1}/${allCards.length} cards (${Math.round((idx + 1) / allCards.length * 100)}%)`);
      }

    } catch (err) {
      console.error(`   ⚠️  Error with ${card.name}: ${err.message}`);
      errors++;
    }
  }

  console.log('\n' + '━'.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('━'.repeat(60));
  console.log(`✅ New cards imported:     ${imported}`);
  console.log(`🔄 Existing cards updated: ${updated}`);
  console.log(`❌ Errors:                 ${errors}`);
  console.log(`📦 Total in database:      ${imported + updated}`);
  console.log('━'.repeat(60));
}

// Main execution
const setId = process.argv[2];

if (!setId) {
  console.error('\n❌ Error: No set ID provided');
  console.error('\n📖 Usage: node scripts/import-pokemon-set.js <SET_ID>');
  console.error('\n📝 Examples:');
  console.error('   node scripts/import-pokemon-set.js sv3        (Obsidian Flames)');
  console.error('   node scripts/import-pokemon-set.js sv4        (Paradox Rift)');
  console.error('   node scripts/import-pokemon-set.js sv5        (Temporal Forces)');
  console.error('   node scripts/import-pokemon-set.js swsh12     (Silver Tempest)');
  console.error('\n🔗 Find set IDs at: https://pokemontcg.io/sets\n');
  process.exit(1);
}

importPokemonSet(setId)
  .then(() => {
    console.log('\n✅ Import complete!\n');
    pool.end();
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Import failed:', err.message);
    console.error(err.stack);
    pool.end();
    process.exit(1);
  });