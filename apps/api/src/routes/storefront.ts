// apps/api/src/routes/storefront.ts
import express, { type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const IdSchema = z.object({ 
  id: z.string().regex(/^\d+$/, "id must be numeric") 
});

// STANDARDIZED: Query schema matching frontend SearchFilters interface
const StorefrontQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(200).default(100),
  sort: z.enum(['name', 'number', 'rarity', 'created_at']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().trim().max(200).optional(), // Searches: name, card_number, set name, treatment
  game_id: z.coerce.number().int().optional(),
  set_id: z.coerce.number().int().optional(),
  treatment: z.string().trim().max(50).optional(), // Card treatment filter
  finish: z.string().trim().max(50).optional(), // Card finish filter
  rarity: z.string().trim().max(50).optional(),
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Converts sort field and order into SQL ORDER BY clause
 */
function sortToSql(alias: string, sort: string, order: 'asc' | 'desc'): string {
  switch (sort) {
    case 'number':     
      return `ORDER BY ${alias}.card_number ${order}, ${alias}.name ${order}`;
    case 'rarity':     
      return `ORDER BY ${alias}.rarity ${order}, ${alias}.name ASC`;
    case 'created_at': 
      return `ORDER BY ${alias}.created_at ${order}, ${alias}.name ASC`;
    case 'name':
    default:           
      return `ORDER BY ${alias}.name ${order}, ${alias}.card_number ASC`;
  }
}

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

/**
 * GET /storefront/cards
 * Returns paginated list of cards with inventory variations
 * 
 * Features:
 * - Filtering by game, set, rarity, search term
 * - Sorting and pagination
 * - Aggregated inventory data with pricing
 * - Consistent CardVariation format (inventory_id, stock)
 */
router.get('/cards', async (req: Request, res: Response) => {
  const parsed = StorefrontQuery.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid query parameters',
      details: parsed.error.flatten()
    });
  }

  const { page, per_page, sort, order, search, game_id, set_id, treatment, finish, rarity } = parsed.data;

  const where: string[] = [];
  const params: unknown[] = [];

  // Build WHERE conditions - STANDARDIZED
  if (typeof game_id === 'number') {
    params.push(game_id);
    where.push(`c.game_id = $${params.length}`);
  }

  if (typeof set_id === 'number') {
    params.push(set_id);
    where.push(`c.set_id = $${params.length}`);
  }

  if (treatment) {
    params.push(treatment.toUpperCase()); // Normalize to uppercase
    where.push(`c.treatment = $${params.length}`);
  }

  if (finish) {
    params.push(finish); // Card finish from cards table
    where.push(`c.finish = $${params.length}`);
  }

  if (rarity) {
    params.push(rarity);
    where.push(`c.rarity = $${params.length}`);
  }

  // ENHANCED SEARCH: name, card_number, set name, and treatment
  if (search && search.length > 1) {
    params.push(`%${search}%`);
    const searchParam = `$${params.length}`;
    where.push(`(
      c.name ILIKE ${searchParam} OR
      c.card_number ILIKE ${searchParam} OR
      cs.name ILIKE ${searchParam} OR
      c.treatment ILIKE ${searchParam}
    )`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderByOut = sortToSql('c', sort, order);
  const offset = (page - 1) * per_page;

  // FIXED: Show all variations of cards that have inventory on ANY variation
  // This ensures that if a card has regular and foil versions, and only regular has inventory,
  // both versions will be returned so the frontend can properly group them
  const sql = `
    WITH card_identities_with_inventory AS (
      -- Find card identities (name, card_number, set_id) that have ANY inventory
      SELECT DISTINCT
        c.name,
        c.card_number,
        c.set_id
      FROM cards c
      JOIN card_inventory ci ON ci.card_id = c.id
      WHERE ci.stock_quantity > 0
    )
    SELECT *
    FROM (
      SELECT
        c.id,
        c.name,
        c.card_number,
        cs.name AS set_name,
        c.rarity,
        c.image_url,
        c.scryfall_id,
        c.sku,
        c.treatment,
        c.finish,
        c.border_color,
        c.frame_effect,
        c.promo_type,
        c.set_id,
        c.game_id,
        g.name AS game_name,
        COALESCE(inv.total_stock, 0)::int AS total_stock,
        COALESCE(inv.variation_count, 0)::int AS variation_count,
        COALESCE(inv.variations, '[]'::jsonb) AS variations,
        inv.base_price,
        inv.foil_price,
        inv.price_source
      FROM cards c
      JOIN games g ON g.id = c.game_id
      JOIN card_sets cs ON cs.id = c.set_id
      -- Only include variations where the card identity has inventory
      JOIN card_identities_with_inventory ciwi ON ciwi.name = c.name
        AND ciwi.card_number = c.card_number
        AND ciwi.set_id = c.set_id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(ci.id)::int AS variation_count,
          COALESCE(SUM(ci.stock_quantity), 0)::int AS total_stock,
          COALESCE(
            JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'inventory_id', ci.id,
                'quality', ci.quality,
                'language', COALESCE(ci.language, 'English'),
                'price', COALESCE(
                  CASE
                    WHEN COALESCE(c.finish, 'nonfoil') = 'foil'
                    THEN lp.foil_price
                    ELSE lp.base_price
                  END,
                  ci.price
                ),
                'stock', ci.stock_quantity,
                'variation_key',
                  CONCAT(ci.quality,'-',COALESCE(ci.language,'English')),
                'price_source', COALESCE(lp.price_source, ci.price_source),
                'price_updated_at', lp.updated_at
              )
            ) FILTER (WHERE ci.id IS NOT NULL),
            '[]'::jsonb
          ) AS variations,
          MAX(lp.base_price) AS base_price,
          MAX(lp.foil_price) AS foil_price,
          MAX(lp.price_source) AS price_source
        FROM card_inventory ci
        LEFT JOIN (
          SELECT DISTINCT ON (card_id)
                 card_id, base_price, foil_price, price_source, updated_at
          FROM card_pricing
          WHERE card_id = c.id
          ORDER BY card_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        ) lp ON lp.card_id = c.id
        WHERE ci.card_id = c.id
      ) inv ON TRUE
      ${whereSql ? whereSql : ''}
      ${orderByOut}
    ) cards_with_inventory
    LIMIT $${params.push(per_page)} OFFSET $${params.push(offset)};
  `;

  try {
    const rows = await db.query(sql, params);
    return res.json({ cards: rows || [] });
  } catch (err: unknown) {
    console.error('GET /storefront/cards failed', err instanceof Error ? {
      code: (err && typeof err === 'object' && 'code' in err) ? (err as {code: unknown}).code : 'unknown',
      message: err.message,
      detail: (err && typeof err === 'object' && 'detail' in err) ? (err as {detail: unknown}).detail : 'No details'
    } : err);
    return res.status(500).json({ error: 'Failed to fetch storefront cards' });
  }
});

/**
 * GET /storefront/cards/:id
 * Returns a single card with all inventory variations
 * 
 * CRITICAL: Returns variations with inventory_id and stock fields
 * to match CardVariation interface and frontend expectations
 */
router.get("/cards/:id", async (req: Request, res: Response) => {
  const parsed = IdSchema.safeParse(req.params);
  
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid card id" });
  }

  const id = Number(parsed.data.id);
  const client = await db.getClient();
  
  try {
    // Get card details with joined game and set information
    const cardRes = await client.query(
      `SELECT
        c.*,
        g.name AS game_name,
        cs.name AS set_name
       FROM cards c
       LEFT JOIN games g ON c.game_id = g.id
       LEFT JOIN card_sets cs ON c.set_id = cs.id
       WHERE c.id = $1`,
      [id]
    );

    if (cardRes.rowCount === 0 || !cardRes.rows[0]) {
      return res.status(404).json({ error: "Card not found" });
    }

    const card = cardRes.rows[0];

    // Get inventory variations with proper field aliases
    // IMPORTANT: Alias 'id' as 'inventory_id' and 'stock_quantity' as 'stock'
    // to match the CardVariation interface used throughout the app
    const invRes = await client.query(
      `SELECT
        id AS inventory_id,
        quality,
        language,
        stock_quantity AS stock,
        price
       FROM card_inventory
       WHERE card_id = $1
       ORDER BY id ASC`,
      [id]
    );

    return res.json({
      card: {
        ...card,
        variations: invRes.rows
      }
    });
    
  } catch (err) {
    console.error("GET /storefront/cards/:id failed", { id, err });
    return res.status(500).json({ error: "Failed to fetch card" });
  } finally {
    client.release();
  }
});

export default router;