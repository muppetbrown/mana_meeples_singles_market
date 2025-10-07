const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Import MTG set from Scryfall with full pagination and duplicate protection
async function importMTGSet(setCode) {
  console.log(`\n🎴 Starting import for MTG set: ${setCode.toUpperCase()}`);
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
    
    // Respect Scryfall rate limit (10 requests per second)
    if (nextPage) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  if (allCards.length === 0) {
    console.log('\n❌ No cards found. Check your set code.');
    return;
  }

  console.log(`\n✅ Retrieved ${allCards.length} total cards`);
  console.log('━'.repeat(60));

  const gameId = 1; // Magic: The Gathering
  const firstCard = allCards[0];
  
  // Create or get the set
  console.log(`\n📦 Creating/updating set: ${firstCard.set_name} (${setCode.toUpperCase()})`);
  const setResult = await pool.query(
    `INSERT INTO card_sets (game_id, name, code, release_date, active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (game_id, code) 
     DO UPDATE SET name = EXCLUDED.name, release_date = EXCLUDED.release_date
     RETURNING id`,
    [gameId, firstCard.set_name, setCode.toUpperCase(), firstCard.released_at]
  );
  
  const setId = setResult.rows[0].id;
  console.log(`   Set ID: ${setId}`);
  console.log('━'.repeat(60));

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`\n🔄 Processing cards...`);

  for (let idx = 0; idx < allCards.length; idx++) {
    const card = allCards[idx];
    
    try {
      // Skip tokens, art cards, emblems, and other non-playable cards
      if (['token', 'art_series', 'emblem', 'double_faced_token'].includes(card.layout)) {
        skipped++;
        continue;
      }

      // Get image URL - handle different card layouts
      let imageUrl = '';
      if (card.image_uris?.large) {
        imageUrl = card.image_uris.large;
      } else if (card.image_uris?.normal) {
        imageUrl = card.image_uris.normal;
      } else if (card.card_faces && card.card_faces[0]?.image_uris?.large) {
        // Double-faced cards
        imageUrl = card.card_faces[0].image_uris.large;
      } else if (card.card_faces && card.card_faces[0]?.image_uris?.normal) {
        imageUrl = card.card_faces[0].image_uris.normal;
      }

      // Get oracle text - handle double-faced and split cards
      let oracleText = card.oracle_text || '';
      if (!oracleText && card.card_faces) {
        oracleText = card.card_faces.map(face => 
          face.oracle_text || ''
        ).filter(text => text).join(' // ');
      }

      // Check if card already exists
      const existingCard = await pool.query(
        `SELECT id FROM cards WHERE set_id = $1 AND card_number = $2`,
        [setId, card.collector_number]
      );

      let cardId;

      if (existingCard.rows.length > 0) {
        // Update existing card
        cardId = existingCard.rows[0].id;
        await pool.query(
          `UPDATE cards 
           SET name = $1, rarity = $2, card_type = $3, description = $4, 
               image_url = $5, scryfall_id = $6, updated_at = NOW()
           WHERE id = $7`,
          [
            card.name,
            card.rarity,
            card.type_line || '',
            oracleText,
            imageUrl,
            card.id,
            cardId
          ]
        );
        updated++;
      } else {
        // Insert new card
        const cardResult = await pool.query(
          `INSERT INTO cards (game_id, set_id, name, card_number, rarity, card_type, description, image_url, scryfall_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            gameId,
            setId,
            card.name,
            card.collector_number,
            card.rarity,
            card.type_line || '',
            oracleText,
            imageUrl,
            card.id
          ]
        );
        cardId = cardResult.rows[0].id;
        imported++;
      }

      // Add/update inventory for each quality level and foil type
      const qualities = [
        { name: 'Near Mint', discount: 0 },
        { name: 'Lightly Played', discount: 0.1 },
        { name: 'Moderately Played', discount: 0.2 },
        { name: 'Heavily Played', discount: 0.3 },
        { name: 'Damaged', discount: 0.5 }
      ];

      const foilTypes = [
        { type: 'Regular', multiplier: 1.0 },
        { type: 'Foil', multiplier: 2.5 } // Foil cards typically cost 2.5x more
      ];

      const basePrice = parseFloat(card.prices?.usd || 0);
      const foilPrice = parseFloat(card.prices?.usd_foil || basePrice * 2.5);

      for (const quality of qualities) {
        // Regular version
        const regularPrice = Math.max(0.25, basePrice * (1 - quality.discount));

        await pool.query(
          `INSERT INTO card_inventory (card_id, quality, foil_type, stock_quantity, price, price_source)
           VALUES ($1, $2, 'Regular', 0, $3, 'api_scryfall')
           ON CONFLICT (card_id, variation_id, quality, foil_type, language)
           DO UPDATE SET
             price = CASE
               WHEN card_inventory.price_source = 'manual' THEN card_inventory.price
               ELSE EXCLUDED.price
             END,
             updated_at = NOW()`,
          [cardId, quality.name, regularPrice]
        );

        // Foil version (only create if foil price exists or is significantly different)
        if (foilPrice > 0 && foilPrice !== basePrice) {
          const adjustedFoilPrice = Math.max(0.50, foilPrice * (1 - quality.discount));

          await pool.query(
            `INSERT INTO card_inventory (card_id, quality, foil_type, stock_quantity, price, price_source)
             VALUES ($1, $2, 'Foil', 0, $3, 'api_scryfall')
             ON CONFLICT (card_id, variation_id, quality, foil_type, language)
             DO UPDATE SET
               price = CASE
                 WHEN card_inventory.price_source = 'manual' THEN card_inventory.price
                 ELSE EXCLUDED.price
               END,
               updated_at = NOW()`,
            [cardId, quality.name, adjustedFoilPrice]
          );
        }
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
  console.log(`⏭️  Cards skipped (tokens): ${skipped}`);
  console.log(`❌ Errors:                 ${errors}`);
  console.log(`📦 Total in database:      ${imported + updated}`);
  console.log('━'.repeat(60));
}

// Main execution
const setCode = process.argv[2];

if (!setCode) {
  console.error('\n❌ Error: No set code provided');
  console.error('\n📖 Usage: node scripts/import-set.js <SET_CODE>');
  console.error('\n📝 Examples:');
  console.error('   node scripts/import-set.js BLB    (Bloomburrow)');
  console.error('   node scripts/import-set.js MH3    (Modern Horizons 3)');
  console.error('   node scripts/import-set.js OTJ    (Outlaws of Thunder Junction)');
  console.error('\n🔗 Find set codes at: https://scryfall.com/sets\n');
  process.exit(1);
}

importMTGSet(setCode)
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