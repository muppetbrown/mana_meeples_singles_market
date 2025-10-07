const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Import Pokemon set from Pokemon TCG API
async function importPokemonSet(setId) {
  console.log(`\n🎴 Starting import for Pokemon set: ${setId.toUpperCase()}`);
  console.log('━'.repeat(60));
  
  let allCards = [];
  let page = 1;
  let totalPages = 1;
  
  // Fetch all pages from Pokemon TCG API
  while (page <= totalPages) {
    console.log(`📥 Fetching page ${page}...`);
    
    const response = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&page=${page}&pageSize=250`,
      {
        headers: {
          'X-Api-Key': process.env.POKEMON_TCG_API_KEY || ''
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Pokemon TCG API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      console.log('⚠️  No cards found for this set ID');
      break;
    }
    
    allCards = allCards.concat(data.data);
    totalPages = data.totalPages || 1;
    console.log(`   Found ${data.data.length} cards on this page`);
    
    page++;
    
    // Rate limit: wait 100ms between requests
    if (page <= totalPages) {
      await new Promise(resolve => setTimeout(resolve, 100));
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
  console.log(`\n📦 Creating/updating set: ${firstCard.set.name} (${setId.toUpperCase()})`);
  const setResult = await pool.query(
    `INSERT INTO card_sets (game_id, name, code, release_date, active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (game_id, code) 
     DO UPDATE SET name = EXCLUDED.name, release_date = EXCLUDED.release_date
     RETURNING id`,
    [gameId, firstCard.set.name, setId.toUpperCase(), firstCard.set.releaseDate]
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

      // Add/update inventory for each quality level
      const qualities = [
        { name: 'Near Mint', discount: 0 },
        { name: 'Lightly Played', discount: 0.1 },
        { name: 'Moderately Played', discount: 0.2 },
        { name: 'Heavily Played', discount: 0.3 },
        { name: 'Damaged', discount: 0.5 }
      ];
      
      // Get price - try market price first, then fall back to others
      const basePrice = parseFloat(
        card.cardmarket?.prices?.averageSellPrice ||
        card.tcgplayer?.prices?.holofoil?.market ||
        card.tcgplayer?.prices?.reverseHolofoil?.market ||
        card.tcgplayer?.prices?.normal?.market ||
        card.tcgplayer?.prices?.['1stEditionHolofoil']?.market ||
        0
      );

      for (const quality of qualities) {
        const adjustedPrice = Math.max(0.25, basePrice * (1 - quality.discount));
        
        await pool.query(
          `INSERT INTO card_inventory (card_id, quality, stock_quantity, price, price_source)
           VALUES ($1, $2, 0, $3, 'api_pokemon')
           ON CONFLICT (card_id, variation_id, quality) 
           DO UPDATE SET 
             price = CASE 
               WHEN card_inventory.price_source = 'manual' THEN card_inventory.price
               ELSE EXCLUDED.price
             END,
             updated_at = NOW()`,
          [cardId, quality.name, adjustedPrice]
        );
      }

      // Progress indicator
      if ((idx + 1) % 50 === 0) {
        console.log(`   Processed ${idx + 1}/${allCards.length} cards...`);
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