// ============================================
// PRICE API INTEGRATION SERVICE
// ============================================

const { Pool } = require('pg');

// Initialize database pool if not already available globally
let db = global.db;
if (!db) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  db = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect()
  };
}

class PriceService {
  // TCGPlayer API integration
  static async updatePricesFromTCGPlayer(cardIds) {
    try {
      // Fetch prices from TCGPlayer API
      const response = await fetch('https://api.tcgplayer.com/pricing/product/' + cardIds.join(','), {
        headers: {
          'Authorization': `Bearer ${process.env.TCGPLAYER_API_KEY}`
        }
      });

      const priceData = await response.json();

      // Update database with new prices
      for (const card of priceData.results) {
        await db.query(
          `UPDATE card_inventory 
           SET price = $1, price_source = 'api_tcgplayer', last_price_update = NOW()
           WHERE tcgplayer_id = $2`,
          [card.marketPrice, card.productId]
        );

        // Log price history only if price changed
        await db.query(
          `INSERT INTO price_history (inventory_id, price, source, recorded_at)
           SELECT id, $1, 'api_tcgplayer', NOW()
           FROM card_inventory
           WHERE tcgplayer_id = $2
             AND (price IS DISTINCT FROM $1)`,
          [card.marketPrice, card.productId]
        );
      }

      return { success: true, updated: priceData.results.length };
    } catch (error) {
      console.error('TCGPlayer price update failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Scryfall API integration for MTG
  static async syncMTGCardsFromScryfall(setCode) {
    try {
      const response = await fetch(`https://api.scryfall.com/cards/search?q=set:${setCode}`);
      const data = await response.json();

      for (const card of data.data) {
        // Check if card exists
        const existing = await db.query(
          'SELECT id FROM cards WHERE scryfall_id = $1',
          [card.id]
        );

        if (existing.rows.length === 0) {
          // Insert new card
          await db.query(
            `INSERT INTO cards (game_id, set_id, name, card_number, rarity, card_type, description, image_url, scryfall_id)
             VALUES ((SELECT id FROM games WHERE code = 'mtg'), 
                     (SELECT id FROM card_sets WHERE code = $1),
                     $2, $3, $4, $5, $6, $7, $8)`,
            [setCode, card.name, card.collector_number, card.rarity, card.type_line, card.oracle_text, card.image_uris?.large, card.id]
          );
        }
      }

      return { success: true, imported: data.data.length };
    } catch (error) {
      console.error('Scryfall sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Pokemon TCG API integration
  static async syncPokemonCards(setId) {
    try {
      const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}`, {
        headers: {
          'X-Api-Key': process.env.POKEMON_TCG_API_KEY
        }
      });

      const data = await response.json();

      for (const card of data.data) {
        const existing = await db.query(
          'SELECT id FROM cards WHERE pokemontcg_id = $1',
          [card.id]
        );

        if (existing.rows.length === 0) {
          await db.query(
            `INSERT INTO cards (game_id, set_id, name, card_number, rarity, card_type, image_url, pokemontcg_id)
             VALUES ((SELECT id FROM games WHERE code = 'pokemon'),
                     (SELECT id FROM card_sets WHERE code = $1),
                     $2, $3, $4, $5, $6, $7)`,
            [setId, card.name, card.number, card.rarity, card.supertype, card.images.large, card.id]
          );
        }
      }

      return { success: true, imported: data.data.length };
    } catch (error) {
      console.error('Pokemon TCG sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Manual price update
  static async updateManualPrice(inventoryId, newPrice) {
    try {
      const updateResult = await db.query(
        `UPDATE card_inventory
         SET price = $1, price_source = 'manual', last_price_update = NOW()
         WHERE id = $2 AND (price IS DISTINCT FROM $1)
         RETURNING price`,
        [newPrice, inventoryId]
      );

      // Only log price history if the price was actually updated
      if (updateResult.rows.length > 0) {
        await db.query(
          `INSERT INTO price_history (inventory_id, price, source, recorded_at)
           VALUES ($1, $2, 'manual', NOW())`,
          [inventoryId, newPrice]
        );
      }

      return { success: true, updated: updateResult.rows.length > 0 };
    } catch (error) {
      console.error('Manual price update failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// ============================================
// CRON JOBS FOR AUTOMATED TASKS
// ============================================

const cron = require('node-cron');

// Update prices daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Running daily price update...');

  try {
    // Get all inventory items with API-based pricing
    const items = await db.query(
      `SELECT DISTINCT tcgplayer_id
       FROM card_inventory
       WHERE price_source LIKE 'api_%' AND tcgplayer_id IS NOT NULL`
    );

    const tcgplayerIds = items.rows.map(row => row.tcgplayer_id);

    // Handle empty arrays
    if (tcgplayerIds.length === 0) {
      console.log('No TCGPlayer IDs found for price update');
      return;
    }

    // Process in batches of 100 to respect rate limits
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < tcgplayerIds.length; i += batchSize) {
      const batch = tcgplayerIds.slice(i, i + batchSize);

      try {
        const result = await PriceService.updatePricesFromTCGPlayer(batch);
        if (result.success) {
          successCount += result.updated;
          console.log(`Batch ${Math.floor(i/batchSize) + 1}: Updated ${result.updated} prices`);
        } else {
          errorCount += batch.length;
          console.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, result.error);
        }
      } catch (error) {
        errorCount += batch.length;
        console.error(`Batch ${Math.floor(i/batchSize) + 1} error:`, error.message);
      }

      // Add delay between batches to respect rate limits
      if (i + batchSize < tcgplayerIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    console.log(`Daily price update completed: ${successCount} updated, ${errorCount} errors`);
  } catch (error) {
    console.error('Daily price update failed:', error);
  }
});

// Export modules
module.exports = {
  PriceService
};