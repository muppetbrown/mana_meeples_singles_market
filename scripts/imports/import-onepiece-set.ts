import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// One Piece TCG card rarities mapping
const RARITY_MAPPING: Record<string, string> = {
  'C': 'Common',
  'UC': 'Uncommon',
  'R': 'Rare',
  'SR': 'Super Rare',
  'SEC': 'Secret Rare',
  'L': 'Leader',
  'P': 'Promo'
};

// One Piece TCG card types
const CARD_TYPES: Record<string, string> = {
  'Leader': 'Leader',
  'Character': 'Character',
  'Event': 'Event',
  'Stage': 'Stage',
  'DON!!': 'Don Card'
};

// Mock API for One Piece TCG cards (since there's no official API like Scryfall)
// This would be replaced with actual API calls or file parsing
async function fetchOnePieceCards(setCode: string) {
  // This is a placeholder for the actual One Piece card data
  // In a real implementation, this would:
  // 1. Read from a JSON file provided by the user
  // 2. Connect to a One Piece TCG database/API
  // 3. Parse CSV/Excel files with card data

  console.log(`📋 Note: Using mock data for One Piece set ${setCode}`);
  console.log('    In production, this would fetch from:');
  console.log('    • Official One Piece TCG card database');
  console.log('    • User-provided JSON/CSV files');
  console.log('    • Community-maintained card databases');

  // Mock data structure based on typical One Piece TCG card format
  return [
    {
      id: `OP01-001`,
      name: "Monkey.D.Luffy",
      set: {
        id: setCode.toUpperCase(),
        name: `One Piece Card Game ${setCode.toUpperCase()}`,
        releaseDate: "2022-07-22"
      },
      number: "001",
      rarity: "L",
      type: "Leader",
      color: "Red",
      cost: 0,
      power: 5000,
      attribute: "Slash",
      effect: "[DON!! x1] [When Attacking] Give up to 1 of your Leader or Character cards +1000 power during this turn.",
      images: {
        large: `https://onepiece-cardgame.com/images/cardlist/card_images/OP01-001.png`,
        small: `https://onepiece-cardgame.com/images/cardlist/card_images/OP01-001_s.png`
      },
      prices: {
        market: 15.99,
        low: 12.00,
        high: 25.00
      }
    }
    // More cards would be added here
  ];
}

// Import One Piece set
async function importOnePieceSet(setCode: string) {
  console.log(`\n🏴‍☠️ Starting import for One Piece set: ${setCode.toUpperCase()}`);
  console.log('━'.repeat(60));

  let allCards;
  try {
    allCards = await fetchOnePieceCards(setCode);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ Failed to fetch One Piece cards:', message);
    throw err;
  }

  if (allCards.length === 0) {
    console.log('\n❌ No cards found. Check your set code or data source.');
    return;
  }

  console.log(`\n✅ Retrieved ${allCards.length} total cards`);
  console.log('━'.repeat(60));

  // Ensure One Piece game exists in database
  const gameResult = await pool.query(
    `INSERT INTO games (name, code, active)
     VALUES ('One Piece', 'onepiece', true)
     ON CONFLICT (code) DO UPDATE SET active = true
     RETURNING id`
  );

  const gameId = gameResult.rows[0].id;
  console.log(`🎮 One Piece game ID: ${gameId}`);

  const firstCard = allCards[0];

  // Create or get the set
  // @ts-expect-error TS(2532): Object is possibly 'undefined'.
  console.log(`\n📦 Creating/updating set: ${firstCard.set.name} (${setCode.toUpperCase()})`);
  const setResult = await pool.query(
    `INSERT INTO card_sets (game_id, name, code, release_date, active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (game_id, code)
     DO UPDATE SET name = EXCLUDED.name, release_date = EXCLUDED.release_date
     RETURNING id`,
    // @ts-expect-error TS(2532): Object is possibly 'undefined'.
    [gameId, firstCard.set.name, setCode.toUpperCase(), firstCard.set.releaseDate]
  );

  const setId = setResult.rows[0].id;
  console.log(`   Set ID: ${setId}`);
  console.log('━'.repeat(60));

  let imported = 0;
  let updated = 0;
  let errors = 0;

  console.log(`\n🔄 Processing cards...`);

  for (let idx = 0; idx < allCards.length; idx++) {
    const card = allCards[idx];

    try {
      // Get image URL
      // @ts-expect-error TS(2532): Object is possibly 'undefined'.
      const imageUrl = card.images?.large || card.images?.small || '';

      // Map rarity
      const mappedRarity = RARITY_MAPPING[card.rarity] || card.rarity || 'Common';

      // Map card type
      const mappedType = CARD_TYPES[card.type] || card.type || 'Character';

      // Build description from card properties
      const descriptionParts = [];
      // @ts-expect-error TS(2532): Object is possibly 'undefined'.
      if (card.color) descriptionParts.push(`Color: ${card.color}`);
      // @ts-expect-error TS(2532): Object is possibly 'undefined'.
      if (card.cost !== undefined) descriptionParts.push(`Cost: ${card.cost}`);
      // @ts-expect-error TS(2532): Object is possibly 'undefined'.
      if (card.power !== undefined) descriptionParts.push(`Power: ${card.power}`);
      // @ts-expect-error TS(2532): Object is possibly 'undefined'.
      if (card.attribute) descriptionParts.push(`Attribute: ${card.attribute}`);
      // @ts-expect-error TS(2532): Object is possibly 'undefined'.
      if (card.effect) descriptionParts.push(`Effect: ${card.effect}`);

      const description = descriptionParts.join(' | ');

      // Check if card already exists
      const existingCard = await pool.query(
        `SELECT id FROM cards WHERE set_id = $1 AND card_number = $2`,
        // @ts-expect-error TS(2532): Object is possibly 'undefined'.
        [setId, card.number]
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
            // @ts-expect-error TS(2532): Object is possibly 'undefined'.
            card.name,
            mappedRarity,
            mappedType,
            description,
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
            setId,
            // @ts-expect-error TS(2532): Object is possibly 'undefined'.
            card.name,
            // @ts-expect-error TS(2532): Object is possibly 'undefined'.
            card.number,
            mappedRarity,
            mappedType,
            description,
            imageUrl
          ]
        );
        cardId = cardResult.rows[0].id;
        imported++;
      }

      // Store price data for reference
      // @ts-expect-error TS(2532): Object is possibly 'undefined'.
      const basePrice = parseFloat(card.prices?.market || card.prices?.low || 0);
      // @ts-expect-error TS(2532): Object is possibly 'undefined'.
      const foilPrice = parseFloat(card.prices?.high || basePrice * 3.0); // One Piece foils typically cost more

      await pool.query(
        `INSERT INTO card_pricing (card_id, base_price, foil_price, price_source, updated_at)
         VALUES ($1, $2, $3, 'api_onepiece', NOW())
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
        [cardId, basePrice, foilPrice]
      );

      // Create common card variations for One Piece TCG
      // Standard variations: Regular and Alternative Art (if applicable)
      const variations = [
        { name: 'Regular', code: null },
      ];

      // Add alternative art variation for certain rarities
      if (['Super Rare', 'Secret Rare'].includes(mappedRarity)) {
        // @ts-expect-error TS(2322): Type 'string' is not assignable to type 'null'.
        variations.push({ name: 'Alternative Art', code: 'AA' });
      }

      for (const variation of variations) {
        // Insert variation if it doesn't exist
        const variationResult = await pool.query(
          `INSERT INTO card_variations (card_id, variation_name, variation_code, image_url)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [cardId, variation.name, variation.code, imageUrl]
        );

        if (variationResult.rows.length > 0) {
          const variationId = variationResult.rows[0].id;

          // Create inventory entries for different qualities (but with 0 stock initially)
          const qualities = [
            { name: 'Near Mint', discount: 0 },
            { name: 'Lightly Played', discount: 0.15 },
            { name: 'Moderately Played', discount: 0.30 },
            { name: 'Heavily Played', discount: 0.45 },
            { name: 'Damaged', discount: 0.65 }
          ];

          for (const quality of qualities) {
            const regularPrice = basePrice * (1 - quality.discount);
            const foilVariationPrice = foilPrice * (1 - quality.discount);

            // Regular version
            await pool.query(
              `INSERT INTO card_inventory (
                card_id, variation_id, quality, foil_type, language,
                stock_quantity, price, price_source, created_at, updated_at
              ) VALUES ($1, $2, $3, 'Regular', 'English', 0, $4, 'api_onepiece', NOW(), NOW())
              ON CONFLICT (card_id, variation_id, quality, foil_type, language) DO NOTHING`,
              [cardId, variationId, quality.name, regularPrice]
            );

            // Foil version (One Piece typically has special/premium foils)
            await pool.query(
              `INSERT INTO card_inventory (
                card_id, variation_id, quality, foil_type, language,
                stock_quantity, price, price_source, created_at, updated_at
              ) VALUES ($1, $2, $3, 'Foil', 'English', 0, $4, 'api_onepiece', NOW(), NOW())
              ON CONFLICT (card_id, variation_id, quality, foil_type, language) DO NOTHING`,
              [cardId, variationId, quality.name, foilVariationPrice]
            );
          }
        }
      }

      // Progress indicator
      if ((idx + 1) % 10 === 0 || idx === allCards.length - 1) {
        console.log(`   📊 Processed ${idx + 1}/${allCards.length} cards (${Math.round((idx + 1) / allCards.length * 100)}%)`);
      }

    } catch (err) {
      // @ts-expect-error TS(2532): Object is possibly 'undefined'.
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
  console.log('\n💡 Next Steps:');
  console.log('   1. Update inventory quantities for cards you have in stock');
  console.log('   2. Adjust prices based on your local market conditions');
  console.log('   3. Add more card variations as needed');
  console.log('   4. Import additional One Piece sets');
}

// Main execution
// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'setCode'.
const setCode = process.argv[2];

if (!setCode) {
  console.error('\n❌ Error: No set code provided');
  console.error('\n📖 Usage: node scripts/import-onepiece-set.js <SET_CODE>');
  console.error('\n📝 Examples:');
  console.error('   node scripts/import-onepiece-set.js OP01    (Romance Dawn)');
  console.error('   node scripts/import-onepiece-set.js OP02    (Paramount War)');
  console.error('   node scripts/import-onepiece-set.js OP03    (Pillars of Strength)');
  console.error('   node scripts/import-onepiece-set.js ST01    (Straw Hat Crew Starter Deck)');
  console.error('\n🔗 Find set codes at One Piece TCG official database\n');
  console.error('📝 Note: This script uses sample data. For production use:');
  console.error('   • Provide JSON files with actual card data');
  console.error('   • Connect to One Piece TCG card database API');
  console.error('   • Import from CSV/Excel files with card listings\n');
  process.exit(1);
}

importOnePieceSet(setCode)
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