// apps/api/src/routes/pricing.ts
import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { adminAuthJWT } from '../middleware/auth.js';

const router = Router();

// -------------------- Types & Schemas --------------------

const PriceDataSchema = z.object({
  card_id: z.number().int().positive(),
  scryfall_id: z.string(),
  usd: z.number().nullable(),
  usd_foil: z.number().nullable(),
  usd_etched: z.number().nullable(),
  finish: z.string(),
  last_updated: z.string(),
});

const UpdatePricesSchema = z.object({
  prices: z.array(PriceDataSchema),
  price_source: z.string().default('scryfall'), // Allow flexible price sources
});

interface PriceUpdateResult {
  total: number;
  updated: number;
  skipped: number;
  failed: number;
  details: {
    created_card_pricing: number;
    updated_card_pricing: number;
    updated_inventory: number;
  };
}

// -------------------- Helper Functions --------------------

/**
 * UPSERT card_pricing table with new prices
 * Creates new records or updates existing ones
 * 
 * @param cardId - The card ID
 * @param finish - The finish type (foil/nonfoil/etched)
 * @param usd - Base price for nonfoil
 * @param usdFoil - Price for foil
 * @param priceSource - Source of the price (e.g., 'scryfall', 'tcgplayer')
 * @returns Object with wasCreated and wasUpdated flags
 */
async function upsertCardPricing(
  cardId: number,
  finish: string,
  usd: number | null,
  usdFoil: number | null,
  priceSource: string = 'scryfall'
): Promise<{ wasCreated: boolean; wasUpdated: boolean }> {
  try {
    // Determine which price to use based on finish
    const basePrice = finish === 'foil' ? null : usd;
    const foilPrice = finish === 'foil' ? usdFoil : null;
    
    if (basePrice === null && foilPrice === null) {
      return { wasCreated: false, wasUpdated: false }; // No price available
    }

    // Check if card_pricing record exists
    const existing = await db.query(
      `SELECT id, base_price, foil_price, price_source FROM card_pricing 
       WHERE card_id = $1`,
      [cardId]
    );

    if (existing.length === 0) {
      // CREATE new record
      await db.query(
        `INSERT INTO card_pricing (card_id, base_price, foil_price, price_source, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [cardId, basePrice || 0, foilPrice || 0, priceSource]
      );
      return { wasCreated: true, wasUpdated: false };
    } else {
      // UPDATE existing record
      const current = existing[0];
      
      // Update the appropriate price column based on finish
      if (finish === 'foil' && foilPrice !== null) {
        await db.query(
          `UPDATE card_pricing 
           SET foil_price = $1, price_source = $2, updated_at = NOW()
           WHERE card_id = $3`,
          [foilPrice, priceSource, cardId]
        );
      } else if (basePrice !== null) {
        await db.query(
          `UPDATE card_pricing 
           SET base_price = $1, price_source = $2, updated_at = NOW()
           WHERE card_id = $3`,
          [basePrice, priceSource, cardId]
        );
      }
      
      return { wasCreated: false, wasUpdated: true };
    }
  } catch (error) {
    console.error(`Failed to upsert card_pricing for card_id ${cardId}:`, error);
    return { wasCreated: false, wasUpdated: false };
  }
}

/**
 * Update card_inventory table with new prices
 * Updates ALL inventory entries for a card, regardless of price_source
 * 
 * @param cardId - The card ID
 * @param finish - The finish type (foil/nonfoil/etched)
 * @param price - The price to set
 * @param priceSource - Source of the price (e.g., 'scryfall', 'tcgplayer')
 * @returns Number of inventory records updated
 */
async function updateInventoryPricing(
  cardId: number,
  finish: string,
  price: number | null,
  priceSource: string = 'scryfall'
): Promise<number> {
  try {
    if (price === null) {
      return 0; // No price to update
    }

    // Update all inventory entries for this card with matching finish
    const result = await db.query(
      `UPDATE card_inventory 
       SET price = $1, price_source = $2, updated_at = NOW()
       WHERE card_id = $3
       RETURNING id`,
      [price, priceSource, cardId]
    );

    return result.length;
  } catch (error) {
    console.error(`Failed to update inventory for card_id ${cardId}:`, error);
    return 0;
  }
}

// -------------------- Routes --------------------

/**
 * POST /api/admin/pricing/initialize
 * 
 * BUTTON 1: Initialize prices for all cards without pricing
 * Creates card_pricing records for all cards with scryfall_id that don't have pricing yet
 * This is a fallback for cards imported without initial prices
 * 
 * Body:
 * {
 *   prices: [...],
 *   price_source: 'scryfall'
 * }
 * 
 * Response: PriceUpdateResult
 */
router.post('/admin/pricing/initialize', adminAuthJWT, async (req: Request, res: Response) => {
  const parsed = UpdatePricesSchema.safeParse(req.body);

  if (!parsed.success) {
    console.error('❌ Initialize prices validation failed:', parsed.error.flatten());
    return res.status(400).json({
      error: 'Invalid request body',
      details: parsed.error.flatten()
    });
  }

  const { prices, price_source = 'scryfall' } = parsed.data;

  console.log(`📊 Initialize Prices: Processing ${prices.length} price updates from ${price_source}`);

  // Validate we have prices to process
  if (prices.length === 0) {
    console.warn('⚠️  Initialize prices called with empty prices array');
    return res.status(400).json({
      error: 'No prices provided',
      message: 'The prices array cannot be empty'
    });
  }

  const result: PriceUpdateResult = {
    total: prices.length,
    updated: 0,
    skipped: 0,
    failed: 0,
    details: {
      created_card_pricing: 0,
      updated_card_pricing: 0,
      updated_inventory: 0,
    },
  };

  for (const priceData of prices) {
    try {
      const { card_id, finish, usd, usd_foil } = priceData;

      // Validate that we have at least one price
      if (usd === null && usd_foil === null) {
        console.warn(`⚠️  Skipping card_id ${card_id}: No prices available (usd and usd_foil are both null)`);
        result.skipped++;
        continue;
      }

      // Upsert card_pricing (will create if doesn't exist)
      const pricingResult = await upsertCardPricing(
        card_id,
        finish,
        usd,
        usd_foil,
        price_source
      );

      if (pricingResult.wasCreated) {
        result.details.created_card_pricing++;
        result.updated++;
      } else if (pricingResult.wasUpdated) {
        result.details.updated_card_pricing++;
        result.updated++;
      } else {
        result.skipped++;
      }

    } catch (error) {
      console.error(`❌ Failed to initialize price for card_id ${priceData.card_id}:`, error);
      result.failed++;
    }
  }

  console.log(`✅ Initialize Prices complete: ${result.updated} updated, ${result.skipped} skipped, ${result.failed} failed`);

  return res.json(result);
});

/**
 * POST /api/admin/pricing/refresh-inventory
 * 
 * BUTTON 2: Refresh prices for cards in inventory
 * Updates both card_pricing AND card_inventory for cards with stock_quantity > 0
 * 
 * Body:
 * {
 *   prices: [...],
 *   price_source: 'scryfall'
 * }
 * 
 * Response: PriceUpdateResult
 */
router.post('/admin/pricing/refresh-inventory', adminAuthJWT, async (req: Request, res: Response) => {
  const parsed = UpdatePricesSchema.safeParse(req.body);

  if (!parsed.success) {
    console.error('❌ Refresh inventory validation failed:', parsed.error.flatten());
    return res.status(400).json({
      error: 'Invalid request body',
      details: parsed.error.flatten()
    });
  }

  const { prices, price_source = 'scryfall' } = parsed.data;

  console.log(`📊 Refresh Inventory: Processing ${prices.length} price updates from ${price_source}`);

  // Validate we have prices to process
  if (prices.length === 0) {
    console.warn('⚠️  Refresh inventory called with empty prices array');
    return res.status(400).json({
      error: 'No prices provided',
      message: 'The prices array cannot be empty'
    });
  }

  const result: PriceUpdateResult = {
    total: prices.length,
    updated: 0,
    skipped: 0,
    failed: 0,
    details: {
      created_card_pricing: 0,
      updated_card_pricing: 0,
      updated_inventory: 0,
    },
  };

  for (const priceData of prices) {
    try {
      const { card_id, finish, usd, usd_foil } = priceData;

      // Determine the price to use for inventory
      const inventoryPrice = finish === 'foil' ? usd_foil : usd;

      // Validate that we have a price for this finish
      if (inventoryPrice === null) {
        console.warn(`⚠️  Skipping card_id ${card_id} (${finish}): No price available for this finish`);
        result.skipped++;
        continue;
      }

      // Update card_pricing table
      const pricingResult = await upsertCardPricing(
        card_id,
        finish,
        usd,
        usd_foil,
        price_source
      );

      if (pricingResult.wasCreated) {
        result.details.created_card_pricing++;
      } else if (pricingResult.wasUpdated) {
        result.details.updated_card_pricing++;
      }

      // Update card_inventory table
      const inventoryUpdated = await updateInventoryPricing(
        card_id,
        finish,
        inventoryPrice,
        price_source
      );

      if (inventoryUpdated > 0) {
        result.details.updated_inventory += inventoryUpdated;
      }

      // Track overall status
      if (pricingResult.wasCreated || pricingResult.wasUpdated || inventoryUpdated > 0) {
        result.updated++;
      } else {
        result.skipped++;
      }

    } catch (error) {
      console.error(`❌ Failed to refresh price for card_id ${priceData.card_id}:`, error);
      result.failed++;
    }
  }

  console.log(`✅ Refresh Inventory complete: ${result.updated} updated, ${result.skipped} skipped, ${result.failed} failed`);

  return res.json(result);
});

/**
 * POST /api/admin/pricing/refresh-card
 * 
 * BUTTON 3: Refresh prices for a specific card (all variations)
 * Updates both card_pricing AND all card_inventory records for a specific card
 * Refreshes ALL finish types and quality variations
 * 
 * Body:
 * {
 *   prices: [...], // Should include all finish variations for this card
 *   price_source: 'scryfall'
 * }
 * 
 * Response: PriceUpdateResult
 */
router.post('/admin/pricing/refresh-card', adminAuthJWT, async (req: Request, res: Response) => {
  const parsed = UpdatePricesSchema.safeParse(req.body);
  
  if (!parsed.success) {
    return res.status(400).json({ 
      error: 'Invalid request body', 
      details: parsed.error.flatten() 
    });
  }

  const { prices, price_source = 'scryfall' } = parsed.data;

  const result: PriceUpdateResult = {
    total: prices.length,
    updated: 0,
    skipped: 0,
    failed: 0,
    details: {
      created_card_pricing: 0,
      updated_card_pricing: 0,
      updated_inventory: 0,
    },
  };

  for (const priceData of prices) {
    try {
      const { card_id, finish, usd, usd_foil } = priceData;
      
      // Determine the price to use for inventory
      const inventoryPrice = finish === 'foil' ? usd_foil : usd;

      // Update card_pricing table
      const pricingResult = await upsertCardPricing(
        card_id,
        finish,
        usd,
        usd_foil,
        price_source
      );

      if (pricingResult.wasCreated) {
        result.details.created_card_pricing++;
      } else if (pricingResult.wasUpdated) {
        result.details.updated_card_pricing++;
      }

      // Update ALL card_inventory entries for this card (regardless of stock_quantity)
      const inventoryUpdated = await updateInventoryPricing(
        card_id,
        finish,
        inventoryPrice,
        price_source
      );

      if (inventoryUpdated > 0) {
        result.details.updated_inventory += inventoryUpdated;
      }

      // Track overall status
      if (pricingResult.wasCreated || pricingResult.wasUpdated || inventoryUpdated > 0) {
        result.updated++;
      } else {
        result.skipped++;
      }

    } catch (error) {
      console.error(`Failed to refresh card price for card_id ${priceData.card_id}:`, error);
      result.failed++;
    }
  }

  return res.json(result);
});

/**
 * GET /api/admin/pricing/cards-without-pricing
 * 
 * Get all cards that have scryfall_id but NO card_pricing record
 * Used by Button 1 (Initialize Prices)
 */
router.get('/admin/pricing/cards-without-pricing', adminAuthJWT, async (req: Request, res: Response) => {
  try {
    console.log('📋 Fetching cards without pricing...');
    const cards = await db.query(`
      SELECT
        c.id as card_id,
        c.scryfall_id,
        c.name,
        c.finish,
        cs.name as set_name,
        cs.code as set_code
      FROM cards c
      LEFT JOIN card_sets cs ON c.set_id = cs.id
      LEFT JOIN card_pricing cp ON c.id = cp.card_id
      WHERE c.scryfall_id IS NOT NULL
        AND cp.id IS NULL
      ORDER BY c.name, c.finish
    `);

    console.log(`✅ Found ${cards.length} cards without pricing`);
    return res.json({ cards, count: cards.length });
  } catch (error) {
    console.error('❌ Failed to fetch cards without pricing:', error);
    return res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

/**
 * GET /api/admin/pricing/inventory-cards
 * 
 * Get all cards that are in inventory (stock_quantity > 0)
 * Used by Button 2 (Refresh Inventory Prices)
 */
router.get('/admin/pricing/inventory-cards', adminAuthJWT, async (req: Request, res: Response) => {
  try {
    console.log('📋 Fetching inventory cards...');
    const cards = await db.query(`
      SELECT DISTINCT
        c.id as card_id,
        c.scryfall_id,
        c.name,
        c.finish,
        cs.name as set_name,
        cs.code as set_code,
        SUM(ci.stock_quantity) as total_stock
      FROM cards c
      INNER JOIN card_inventory ci ON c.id = ci.card_id
      LEFT JOIN card_sets cs ON c.set_id = cs.id
      WHERE c.scryfall_id IS NOT NULL
        AND ci.stock_quantity > 0
      GROUP BY c.id, c.scryfall_id, c.name, c.finish, cs.name, cs.code
      ORDER BY c.name, c.finish
    `);

    console.log(`✅ Found ${cards.length} inventory cards`);
    return res.json({ cards, count: cards.length });
  } catch (error) {
    console.error('❌ Failed to fetch inventory cards:', error);
    return res.status(500).json({ error: 'Failed to fetch inventory cards' });
  }
});

/**
 * GET /api/admin/pricing/card-variations/:cardId
 * 
 * Get all finish variations for a specific card
 * Used by Button 3 (Refresh Single Card)
 */
router.get('/admin/pricing/card-variations/:cardId', adminAuthJWT, async (req: Request, res: Response) => {
  try {
    const cardId = parseInt(req.params.cardId);
    
    if (isNaN(cardId)) {
      return res.status(400).json({ error: 'Invalid card ID' });
    }

    // Get all finish variations of this card
    const cards = await db.query(`
      SELECT 
        c.id as card_id,
        c.scryfall_id,
        c.name,
        c.finish,
        cs.name as set_name,
        cs.code as set_code,
        cp.base_price,
        cp.foil_price,
        cp.price_source
      FROM cards c
      LEFT JOIN card_sets cs ON c.set_id = cs.id
      LEFT JOIN card_pricing cp ON c.id = cp.card_id
      WHERE c.name = (SELECT name FROM cards WHERE id = $1)
        AND c.set_id = (SELECT set_id FROM cards WHERE id = $1)
        AND c.scryfall_id IS NOT NULL
      ORDER BY c.finish
    `, [cardId]);

    return res.json({ cards, count: cards.length });
  } catch (error) {
    console.error('Failed to fetch card variations:', error);
    return res.status(500).json({ error: 'Failed to fetch card variations' });
  }
});

export default router;