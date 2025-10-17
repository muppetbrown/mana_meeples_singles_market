// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'Pool'.
const { Pool } = require('pg');
require('dotenv').config();

// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'pool'.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Retry helper for API calls
async function fetchWithRetry(url: any, headers: any, maxRetries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`   Attempt ${attempt}/${maxRetries}...`);
      
      const response = await fetch(url, { 
        headers,
        // @ts-expect-error TS(2769): No overload matches this call.
        timeout: 30000 // 30 second timeout
      });
      
      if (!response.ok) {
        if (response.status === 504 || response.status === 503 || response.status === 502) {
          if (attempt < maxRetries) {
            console.log(`   ⏳ Server error (${response.status}), waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
            continue;
          }
        }
        
        // For 404 on card queries, it might be a timing issue
        if (response.status === 404 && url.includes('/cards?')) {
          if (attempt < maxRetries) {
            console.log(`   ⏳ Cards not found (404), waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }
        }
        
        throw new Error(`Pokemon TCG API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      console.log(`   ⚠️  ${err.message}, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

// Validate set ID format
function validateSetId(setId: any) {
  const normalized = setId.toLowerCase().trim();
  
  // Common patterns including the weird Black Bolt/White Flare codes
  const validPattern = /^[a-z]{1,6}\d{1,3}[a-z0-9]*$/;
  
  if (!validPattern.test(normalized)) {
    console.log(`\n⚠️  Warning: "${setId}" doesn't match typical set ID patterns`);
    console.log('   Expected formats: sv3, swsh12, sm1, xy1, zsv10pt5, etc.');
    console.log('   Proceeding anyway...\n');
  }
  
  return normalized;
}

// Try multiple query formats for finding cards
async function fetchCardsMultipleFormats(setId: any, page: any, headers: any) {
  const queries = [
    // Standard query
    `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&page=${page}&pageSize=250`,
    // Try with quotes
    `https://api.pokemontcg.io/v2/cards?q=set.id:"${setId}"&page=${page}&pageSize=250`,
    // Try with uppercase
    `https://api.pokemontcg.io/v2/cards?q=set.id:${setId.toUpperCase()}&page=${page}&pageSize=250`,
  ];
  
  for (let i = 0; i < queries.length; i++) {
    try {
      console.log(`   🔍 Query format ${i + 1}/${queries.length}...`);
      const data = await fetchWithRetry(queries[i], headers, 2, 1000);
      if (data.data && data.data.length > 0) {
        console.log(`   ✅ Success with query format ${i + 1}`);
        return data;
      }
    } catch (err) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      console.log(`   ❌ Query format ${i + 1} failed: ${err.message}`);
      if (i === queries.length - 1) throw err;
    }
  }
  
  return { data: [], totalPages: 0 };
}

// Import Pokemon set from Pokemon TCG API
async function importPokemonSet(setId: any) {
  const normalizedSetId = validateSetId(setId);
  
  console.log(`\n🎴 Starting import for Pokemon set: ${normalizedSetId.toUpperCase()}`);
  console.log('━'.repeat(60));
  
  // First, verify the set exists
  console.log('🔍 Verifying set exists...');
  let setInfo;
  try {
    const setData = await fetchWithRetry(
      `https://api.pokemontcg.io/v2/sets/${normalizedSetId}`,
      {
        'X-Api-Key': process.env.POKEMON_TCG_API_KEY || ''
      }
    );
    
    if (setData.data) {
      setInfo = setData.data;
      console.log(`✅ Found set: ${setInfo.name}`);
      console.log(`   Release Date: ${setInfo.releaseDate}`);
      console.log(`   Total Cards: ${setInfo.total || 'Unknown'}`);
      console.log(`   Series: ${setInfo.series || 'Unknown'}`);
    }
  } catch (err) {
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    console.log(`❌ Could not verify set: ${err.message}`);
    console.log('\n💡 Suggestions:');
    console.log('   1. Check set ID at: https://pokemontcg.io/sets');
    console.log('   2. Ensure the set ID is correct (case-insensitive)');
    console.log('   3. Try again in a few minutes if API is down');
    console.log('   4. For very new sets, card data may not be available yet\n');
    throw err;
  }
  
  console.log('━'.repeat(60));
  
  // Special handling for new sets that might not have cards indexed yet
  if (setInfo && setInfo.releaseDate) {
    const releaseDate = new Date(setInfo.releaseDate);
    const now = new Date();
    // @ts-expect-error TS(2362): The left-hand side of an arithmetic operation must... Remove this comment to see the full error message
    const daysSinceRelease = Math.floor((now - releaseDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceRelease < 0) {
      console.log(`\n⚠️  WARNING: This set releases in ${Math.abs(daysSinceRelease)} days!`);
      console.log('   Card data may not be available yet.\n');
    } else if (daysSinceRelease < 7) {
      console.log(`\n⚠️  NOTE: This set was released ${daysSinceRelease} days ago.`);
      console.log('   Card data might still be getting indexed.\n');
    }
  }
  
  let allCards: any = [];
  let page = 1;
  let totalPages = 1;
  
  const headers = {
    'X-Api-Key': process.env.POKEMON_TCG_API_KEY || ''
  };
  
  // Fetch all pages from Pokemon TCG API
  while (page <= totalPages) {
    console.log(`\n📥 Fetching page ${page}...`);
    
    try {
      const data = await fetchCardsMultipleFormats(normalizedSetId, page, headers);
      
      if (!data.data || data.data.length === 0) {
        if (page === 1) {
          console.log('\n❌ No cards found for this set.');
          console.log('\n💡 Possible reasons:');
          console.log('   • Set is too new and cards aren\'t indexed yet');
          console.log('   • API is having issues with this specific set');
          console.log('   • Set exists but has no cards published');
          console.log('\n💡 Suggestions:');
          console.log('   • Try again in 24-48 hours');
          console.log('   • Check https://pokemontcg.io/cards for card availability');
          console.log('   • Contact Pokemon TCG API support if issue persists\n');
        }
        break;
      }
      
      allCards = allCards.concat(data.data);
      totalPages = data.totalPages || 1;
      console.log(`   ✅ Found ${data.data.length} cards on this page`);
      
      page++;
      
      // Rate limit: wait 1000ms between requests (very conservative)
      if (page <= totalPages) {
        console.log(`   ⏳ Waiting 1000ms before next request...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (err) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      console.log(`\n❌ Failed to fetch page ${page}: ${err.message}`);
      
      if (allCards.length > 0) {
        console.log(`\n⚠️  Partial import: Retrieved ${allCards.length} cards before error.`);
        console.log('Proceeding with available cards...\n');
        break;
      } else {
        throw err;
      }
    }
  }

  if (allCards.length === 0) {
    console.log('\n❌ No cards to import.');
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
            card.rules?.join(' ') || card.abilities?.map((a: any) => a.text).join(' ') || '',
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
            card.rules?.join(' ') || card.abilities?.map((a: any) => a.text).join(' ') || '',
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
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
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
  if (setInfo && setInfo.total) {
    console.log(`📋 Expected total:         ${setInfo.total}`);
    if (imported + updated < setInfo.total) {
      console.log(`⚠️  Missing cards:          ${setInfo.total - (imported + updated)}`);
      console.log(`   (May need to retry later if API is still indexing)`);
    }
  }
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
  console.error('   node scripts/import-pokemon-set.js sv9        (Journey Together)');
  console.error('   node scripts/import-pokemon-set.js zsv10pt5   (Black Bolt)');
  console.error('   node scripts/import-pokemon-set.js rsv10pt5   (White Flare)');
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