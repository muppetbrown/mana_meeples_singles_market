// ============================================
// PRICE API INTEGRATION SERVICE
// ============================================
module.exports = PriceService;

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

        // Log price history
        await db.query(
          `INSERT INTO price_history (inventory_id, price, source, recorded_at)
           SELECT id, $1, 'api_tcgplayer', NOW()
           FROM card_inventory WHERE tcgplayer_id = $2`,
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
      await db.query(
        `UPDATE card_inventory 
         SET price = $1, price_source = 'manual', last_price_update = NOW()
         WHERE id = $2`,
        [newPrice, inventoryId]
      );

      await db.query(
        `INSERT INTO price_history (inventory_id, price, source, recorded_at)
         VALUES ($1, $2, 'manual', NOW())`,
        [inventoryId, newPrice]
      );

      return { success: true };
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
  
  // Get all inventory items with API-based pricing
  const items = await db.query(
    `SELECT DISTINCT tcgplayer_id 
     FROM card_inventory 
     WHERE price_source LIKE 'api_%' AND tcgplayer_id IS NOT NULL`
  );

  const tcgplayerIds = items.rows.map(row => row.tcgplayer_id);
  await PriceService.updatePricesFromTCGPlayer(tcgplayerIds);
  
  console.log('Daily price update completed');
});

// Export modules
module.exports = {
  router,
  PriceService
};