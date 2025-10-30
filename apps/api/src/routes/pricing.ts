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
});

interface PriceUpdateResult {
  total: number;
  updated: number;
  skipped: number;
  failed: number;
  details: {
    updated_card_pricing: number;
    updated_inventory: number;
  };
}

// -------------------- Helper Functions --------------------

/**
 * Update card_pricing table with new prices
 * Only updates rows where price_source = 'scryfall'
 */
async function updateCardPricing(
  cardId: number,
  finish: string,
  usd: number | null,
  usdFoil: number | null
): Promise<boolean> {
  try {
    // Determine which price to use based on finish
    const price = finish === 'foil' ? usdFoil : usd;
    
    if (price === null) {
      return false; // No price available
    }

    // Check if card_pricing record exists with price_source='scryfall'
    const existing = await db.query(
      `SELECT id FROM card_pricing 
       WHERE card_id = $1 AND price_source = 'scryfall'`,
      [cardId]
    );

    if (existing.length === 0) {
      // No existing record with scryfall source, skip
      return false;
    }

    // Update the appropriate price column based on finish
    if (finish === 'foil') {
      await db.query(
        `UPDATE card_pricing 
         SET foil_price = $1, updated_at = NOW()
         WHERE card_id = $2 AND price_source = 'scryfall'`,
        [price, cardId]
      );
    } else {
      await db.query(
        `UPDATE card_pricing 
         SET base_price = $1, updated_at = NOW()
         WHERE card_id = $2 AND price_source = 'scryfall'`,
        [price, cardId]
      );
    }

    return true;
  } catch (error) {
    console.error(`Failed to update card_pricing for card_id ${cardId}:`, error);
    return false;
  }
}

/**
 * Update card_inventory table with new prices
 * Only updates rows where price_source = 'scryfall'
 */
async function updateInventoryPricing(
  cardId: number,
  price: number | null
): Promise<number> {
  try {
    if (price === null) {
      return 0; // No price to update
    }

    // Update all inventory entries for this card where price_source='scryfall'
    const result = await db.query(
      `UPDATE card_inventory 
       SET price = $1, updated_at = NOW()
       WHERE card_id = $2 AND price_source = 'scryfall'
       RETURNING id`,
      [price, cardId]
    );

    return result.length;
  } catch (error) {
    console.error(`Failed to update inventory for card_id ${cardId}:`, error);
    return 0;
  }
}

// -------------------- Routes --------------------

/**
 * POST /api/admin/pricing/update
 * 
 * Bulk update prices from Scryfall data
 * Updates both card_pricing and card_inventory tables
 * Only updates records where price_source = 'scryfall'
 * 
 * Body:
 * {
 *   prices: [
 *     {
 *       card_id: 123,
 *       scryfall_id: "abc-def",
 *       usd: 1.50,
 *       usd_foil: 3.00,
 *       usd_etched: null,
 *       finish: "nonfoil",
 *       last_updated: "2025-10-30T12:00:00Z"
 *     },
 *     ...
 *   ]
 * }
 * 
 * Response:
 * {
 *   total: 100,
 *   updated: 85,
 *   skipped: 10,
 *   failed: 5,
 *   details: {
 *     updated_card_pricing: 50,
 *     updated_inventory: 35
 *   }
 * }
 */
router.post('/admin/pricing/update', adminAuthJWT, async (req: Request, res: Response) => {
  const parsed = UpdatePricesSchema.safeParse(req.body);
  
  if (!parsed.success) {
    return res.status(400).json({ 
      error: 'Invalid request body', 
      details: parsed.error.flatten() 
    });
  }

  const { prices } = parsed.data;

  // Initialize result counters
  const result: PriceUpdateResult = {
    total: prices.length,
    updated: 0,
    skipped: 0,
    failed: 0,
    details: {
      updated_card_pricing: 0,
      updated_inventory: 0,
    },
  };

  // Process each price update
  for (const priceData of prices) {
    try {
      const { card_id, finish, usd, usd_foil } = priceData;

      // Determine the price to use for inventory
      const inventoryPrice = finish === 'foil' ? usd_foil : usd;

      // Update card_pricing table
      const cardPricingUpdated = await updateCardPricing(
        card_id,
        finish,
        usd,
        usd_foil
      );

      if (cardPricingUpdated) {
        result.details.updated_card_pricing++;
      }

      // Update card_inventory table
      const inventoryUpdated = await updateInventoryPricing(
        card_id,
        inventoryPrice
      );

      if (inventoryUpdated > 0) {
        result.details.updated_inventory += inventoryUpdated;
      }

      // Track overall status
      if (cardPricingUpdated || inventoryUpdated > 0) {
        result.updated++;
      } else {
        result.skipped++;
      }

    } catch (error) {
      console.error(`Failed to process price for card_id ${priceData.card_id}:`, error);
      result.failed++;
    }
  }

  return res.json(result);
});

/**
 * GET /api/admin/pricing/scryfall-eligible
 * 
 * Get all cards that are eligible for Scryfall price updates
 * (cards with scryfall_id and price_source='scryfall')
 * 
 * Response:
 * {
 *   cards: [
 *     {
 *       card_id: 123,
 *       scryfall_id: "abc-def",
 *       name: "Lightning Bolt",
 *       set_name: "Dominaria",
 *       finish: "nonfoil",
 *       current_price: 1.50
 *     },
 *     ...
 *   ]
 * }
 */
router.get('/admin/pricing/scryfall-eligible', adminAuthJWT, async (req: Request, res: Response) => {
  try {
    // Get cards with scryfall_id that have pricing records with price_source='scryfall'
    const cards = await db.query(`
      SELECT DISTINCT
        c.id as card_id,
        c.scryfall_id,
        c.name,
        c.finish,
        cs.name as set_name,
        COALESCE(
          CASE 
            WHEN c.finish = 'foil' THEN cp.foil_price
            ELSE cp.base_price
          END,
          ci.price
        ) as current_price
      FROM cards c
      LEFT JOIN card_sets cs ON c.set_id = cs.id
      LEFT JOIN card_pricing cp ON c.id = cp.card_id AND cp.price_source = 'scryfall'
      LEFT JOIN card_inventory ci ON c.id = ci.card_id AND ci.price_source = 'scryfall'
      WHERE c.scryfall_id IS NOT NULL
        AND (cp.price_source = 'scryfall' OR ci.price_source = 'scryfall')
      ORDER BY c.name, c.finish
    `);

    return res.json({ cards });
  } catch (error) {
    console.error('Failed to fetch Scryfall-eligible cards:', error);
    return res.status(500).json({ error: 'Failed to fetch eligible cards' });
  }
});

export default router;
