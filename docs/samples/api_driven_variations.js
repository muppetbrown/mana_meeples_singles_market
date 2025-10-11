/**
 * API-Driven Card Variations Management
 *
 * This utility demonstrates how to interact with the card variations API
 * for bulk operations, imports, and inventory management.
 *
 * Usage:
 *   node docs/samples/api_driven_variations.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-admin-token-here';

// API client setup
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ADMIN_TOKEN}`
  }
});

/**
 * Card Variations Manager Class
 */
class CardVariationsManager {
  constructor() {
    this.results = {
      imported_cards: 0,
      created_variations: 0,
      updated_inventory: 0,
      errors: []
    };
  }

  /**
   * Import cards from JSON file
   */
  async importFromFile(filePath) {
    try {
      console.log(`📥 Importing cards from ${filePath}...`);

      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      const response = await api.post('/api/admin/import-card-data', data);

      if (response.data.success) {
        console.log(`✅ Import successful!`);
        console.log(`   Cards imported: ${response.data.results.cards_imported}`);
        console.log(`   Cards updated: ${response.data.results.cards_updated}`);
        console.log(`   Variations created: ${response.data.results.variations_created}`);
        console.log(`   Inventory entries: ${response.data.results.inventory_entries}`);

        this.results.imported_cards += response.data.results.cards_imported;
        this.results.created_variations += response.data.results.variations_created;

        return response.data.results;
      }
    } catch (error) {
      console.error(`❌ Import failed:`, error.response?.data || error.message);
      this.results.errors.push(`Import failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create variations for multiple cards
   */
  async createBulkVariations(cardIds, variations, createInventory = true) {
    try {
      console.log(`🎨 Creating ${variations.length} variations for ${cardIds.length} cards...`);

      const response = await api.post('/api/admin/bulk-create-variations', {
        card_ids: cardIds,
        variations: variations,
        create_inventory: createInventory
      });

      if (response.data.success) {
        console.log(`✅ Bulk variations created!`);
        console.log(`   Variations: ${response.data.details.success}`);
        console.log(`   Inventory entries: ${response.data.details.created_inventory}`);

        this.results.created_variations += response.data.details.success;
        this.results.updated_inventory += response.data.details.created_inventory;

        return response.data.details;
      }
    } catch (error) {
      console.error(`❌ Bulk variation creation failed:`, error.response?.data || error.message);
      this.results.errors.push(`Bulk variations failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all variations for a specific card
   */
  async getCardVariations(cardId) {
    try {
      const response = await api.get(`/api/admin/variations/${cardId}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to get variations for card ${cardId}:`, error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Update inventory for a specific item
   */
  async updateInventory(inventoryId, updates) {
    try {
      const response = await api.put(`/api/admin/inventory/${inventoryId}`, updates);

      if (response.data.success) {
        console.log(`✅ Inventory updated for item ${inventoryId}`);
        this.results.updated_inventory++;
        return response.data;
      }
    } catch (error) {
      console.error(`❌ Failed to update inventory ${inventoryId}:`, error.response?.data || error.message);
      this.results.errors.push(`Inventory update failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create foil variants for existing cards
   */
  async createFoilVariants(cardIds, priceMultiplier = 2.5) {
    try {
      console.log(`✨ Creating foil variants for ${cardIds.length} cards...`);

      const response = await api.post('/api/admin/bulk-create-foils', {
        card_ids: cardIds,
        foil_type: 'Foil',
        price_multiplier: priceMultiplier
      });

      if (response.data.success) {
        console.log(`✅ Foil variants created!`);
        console.log(`   Success: ${response.data.success}`);

        this.results.created_variations += response.data.success;
        return response.data;
      }
    } catch (error) {
      console.error(`❌ Foil variant creation failed:`, error.response?.data || error.message);
      this.results.errors.push(`Foil variants failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search for cards
   */
  async searchCards(params) {
    try {
      const response = await api.get('/api/cards', { params });
      return response.data;
    } catch (error) {
      console.error(`❌ Search failed:`, error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Display final results
   */
  showResults() {
    console.log('\n' + '━'.repeat(60));
    console.log('📊 FINAL RESULTS');
    console.log('━'.repeat(60));
    console.log(`✅ Cards imported:        ${this.results.imported_cards}`);
    console.log(`🎨 Variations created:    ${this.results.created_variations}`);
    console.log(`📦 Inventory updated:     ${this.results.updated_inventory}`);
    console.log(`❌ Errors:                ${this.results.errors.length}`);

    if (this.results.errors.length > 0) {
      console.log('\n🚨 Errors encountered:');
      this.results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('━'.repeat(60));
  }
}

/**
 * Example workflows
 */
class VariationWorkflows {
  constructor(manager) {
    this.manager = manager;
  }

  /**
   * Complete MTG set import and variation setup
   */
  async setupMTGSet() {
    console.log('\n🃏 Setting up MTG set with variations...');

    try {
      // 1. Import cards from sample file
      const sampleFile = path.join(__dirname, 'mtg_card_variations_sample.json');
      await this.manager.importFromFile(sampleFile);

      // 2. Search for imported cards to get their IDs
      const searchResult = await this.manager.searchCards({
        game: 'mtg',
        limit: 10
      });

      if (searchResult && searchResult.data && searchResult.data.length > 0) {
        const cardIds = searchResult.data.map(card => card.id);

        // 3. Create additional variations
        await this.manager.createBulkVariations(cardIds, [
          { name: 'Extended Art', code: 'EA' },
          { name: 'Promo', code: 'PROMO' }
        ]);

        // 4. Create foil variants
        await this.manager.createFoilVariants(cardIds.slice(0, 3), 2.5);

        console.log('✅ MTG set setup complete!');
        return cardIds;
      }
    } catch (error) {
      console.error('❌ MTG set setup failed:', error.message);
    }
  }

  /**
   * Setup One Piece cards with special variations
   */
  async setupOnePieceSet() {
    console.log('\n🏴‍☠️ Setting up One Piece set with variations...');

    try {
      // 1. Import One Piece cards
      const sampleFile = path.join(__dirname, 'onepiece_card_variations_sample.json');
      await this.manager.importFromFile(sampleFile);

      // 2. Get card IDs
      const searchResult = await this.manager.searchCards({
        game: 'onepiece',
        limit: 10
      });

      if (searchResult && searchResult.data && searchResult.data.length > 0) {
        const cardIds = searchResult.data.map(card => card.id);

        // 3. Create One Piece specific variations
        await this.manager.createBulkVariations(cardIds, [
          { name: 'Manga Rare', code: 'MR' },
          { name: 'Comic Parallel', code: 'CP' },
          { name: 'Special Parallel', code: 'SP' }
        ]);

        console.log('✅ One Piece set setup complete!');
        return cardIds;
      }
    } catch (error) {
      console.error('❌ One Piece set setup failed:', error.message);
    }
  }

  /**
   * Setup Pokemon cards with multiple variations
   */
  async setupPokemonSet() {
    console.log('\n🐾 Setting up Pokémon set with variations...');

    try {
      // 1. Import Pokemon cards
      const sampleFile = path.join(__dirname, 'sv_card_variations_sample.json');
      await this.manager.importFromFile(sampleFile);

      // 2. Get card IDs
      const searchResult = await this.manager.searchCards({
        game: 'pokemon',
        limit: 10
      });

      if (searchResult && searchResult.data && searchResult.data.length > 0) {
        const cardIds = searchResult.data.map(card => card.id);

        // 3. Create Pokemon specific variations
        await this.manager.createBulkVariations(cardIds, [
          { name: 'Full Art', code: 'FA' },
          { name: 'Gold Rare', code: 'GR' },
          { name: 'Trainer Gallery', code: 'TG' }
        ]);

        console.log('✅ Pokémon set setup complete!');
        return cardIds;
      }
    } catch (error) {
      console.error('❌ Pokémon set setup failed:', error.message);
    }
  }

  /**
   * Demonstrate inventory management
   */
  async demoInventoryManagement(cardIds) {
    console.log('\n📦 Demonstrating inventory management...');

    try {
      if (cardIds && cardIds.length > 0) {
        // Get variations for first card
        const variations = await this.manager.getCardVariations(cardIds[0]);

        if (variations && variations.variations.length > 0) {
          console.log(`📋 Card "${variations.card.name}" has ${variations.variations.length} variations`);

          // Show variation details
          variations.variations.forEach(variation => {
            console.log(`   - ${variation.variation_name} (${variation.inventory_count} inventory entries)`);
          });
        }

        // Example: Update some inventory quantities
        // This would need actual inventory IDs from your system
        console.log('💡 Note: In a real scenario, you would update specific inventory IDs');
        console.log('   Example: manager.updateInventory(123, { stock_quantity: 10, price: 15.99 })');
      }
    } catch (error) {
      console.error('❌ Inventory demo failed:', error.message);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Card Variations API Demo');
  console.log('━'.repeat(60));

  const manager = new CardVariationsManager();
  const workflows = new VariationWorkflows(manager);

  try {
    // Run example workflows
    const mtgCards = await workflows.setupMTGSet();
    const onePieceCards = await workflows.setupOnePieceSet();
    const pokemonCards = await workflows.setupPokemonSet();

    // Demonstrate inventory management
    if (mtgCards) {
      await workflows.demoInventoryManagement(mtgCards);
    }

    // Show final results
    manager.showResults();

    console.log('\n✅ Demo completed successfully!');
    console.log('💡 Check your admin interface to see the imported cards and variations.');

  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    manager.showResults();
  }
}

/**
 * Utility functions for common operations
 */
class VariationUtils {
  /**
   * Generate standard MTG variations
   */
  static getMTGVariations() {
    return [
      { name: 'Regular', code: null },
      { name: 'Showcase', code: 'SHOW' },
      { name: 'Borderless', code: 'BDL' },
      { name: 'Extended Art', code: 'EA' },
      { name: 'Promo', code: 'PROMO' }
    ];
  }

  /**
   * Generate standard Pokemon variations
   */
  static getPokemonVariations() {
    return [
      { name: 'Regular', code: null },
      { name: 'Full Art', code: 'FA' },
      { name: 'Special Art Rare', code: 'SAR' },
      { name: 'Ultra Rare', code: 'UR' },
      { name: 'Rainbow Rare', code: 'RR' },
      { name: 'Gold Rare', code: 'GR' }
    ];
  }

  /**
   * Generate standard One Piece variations
   */
  static getOnePieceVariations() {
    return [
      { name: 'Regular', code: null },
      { name: 'Alternative Art', code: 'AA' },
      { name: 'Special Parallel', code: 'SP' },
      { name: 'Comic Parallel', code: 'CP' },
      { name: 'Manga Rare', code: 'MR' }
    ];
  }

  /**
   * Calculate discounted price based on quality
   */
  static calculateQualityPrice(basePrice, quality) {
    const discounts = {
      'Near Mint': 0,
      'Lightly Played': 0.15,
      'Moderately Played': 0.30,
      'Heavily Played': 0.45,
      'Damaged': 0.65
    };

    const discount = discounts[quality] || 0;
    return Math.round(basePrice * (1 - discount) * 100) / 100;
  }

  /**
   * Generate SKU for inventory item
   */
  static generateSKU(gameCode, setCode, cardNumber, variationCode, quality, foilType, language) {
    const parts = [
      gameCode.toUpperCase(),
      setCode.toUpperCase(),
      cardNumber,
      variationCode || 'REG',
      quality.replace(' ', '').toUpperCase().substr(0, 2),
      foilType.substr(0, 1).toUpperCase(),
      language.substr(0, 2).toUpperCase()
    ];

    return parts.join('-');
  }
}

// Export for use in other scripts
module.exports = {
  CardVariationsManager,
  VariationWorkflows,
  VariationUtils
};

// Run demo if called directly
if (require.main === module) {
  main().catch(console.error);
}