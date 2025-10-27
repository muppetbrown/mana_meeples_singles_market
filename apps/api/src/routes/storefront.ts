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

const StorefrontQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(200).default(100),
  sort: z.enum(['name', 'number', 'rarity', 'created_at']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().trim().max(200).optional(),
  game_id: z.coerce.number().int().optional(),
  set_id: z.coerce.number().int().optional(),
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

  const { page, per_page, sort, order, search, game_id, set_id, rarity } = parsed.data;

  const where: string[] = [];
  const params: unknown[] = [];

  // Build WHERE conditions
  if (typeof game_id === 'number') {
    params.push(game_id);
    where.push(`c.game_id = $${params.length}`);
  }

  if (typeof set_id === 'number') {
    params.push(set_id);
    where.push(`c.set_id = $${params.length}`);
  }

  if (rarity) {
    params.push(rarity);
    where.push(`c.rarity = $${params.length}`);
  }

  if (search && search.length > 1) {
    params.push(`%${search}%`);
    where.push(`(c.name ILIKE $${params.length} OR c.card_number ILIKE $${params.length})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderByOut = sortToSql('c', sort, order);
  const offset = (page - 1) * per_page;

  const sql = `
    SELECT
      c.id,
      c.name,
      c.card_number,
      cs.name AS set_name,
      c.rarity,
      c.image_url,
      g.name AS game_name,
      COALESCE(inv.total_stock, 0)::int AS total_stock,
      COALESCE(inv.variation_count, 0)::int AS variation_count,
      COALESCE(inv.variations, '[]'::jsonb) AS variations
    FROM (
      SELECT c.*
      FROM cards c
      ${whereSql}
      ${orderByOut}
      LIMIT $${params.push(per_page)} OFFSET $${params.push(offset)}
    ) c
    JOIN games g ON g.id = c.game_id
    JOIN card_sets cs ON cs.id = c.set_id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(ci.id)::int AS variation_count,
        COALESCE(SUM(ci.stock_quantity), 0)::int AS total_stock,
        COALESCE(
          JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'inventory_id', ci.id,
              'quality', ci.quality,
              'foil_type', COALESCE(ci.foil_type, 'Regular'),
              'language', COALESCE(ci.language, 'English'),
              'price', COALESCE(
                CASE 
                  WHEN COALESCE(ci.foil_type, 'Regular') ILIKE 'foil' 
                  THEN lp.foil_price 
                  ELSE lp.base_price 
                END,
                ci.price
              ),
              'stock', ci.stock_quantity,
              'variation_key',
                CONCAT(ci.quality,'-',COALESCE(ci.foil_type,'Regular'),'-',COALESCE(ci.language,'English')),
              'price_source', COALESCE(lp.price_source, ci.price_source),
              'price_updated_at', lp.updated_at
            )
          ) FILTER (WHERE ci.id IS NOT NULL),
          '[]'::jsonb
        ) AS variations
      FROM card_inventory ci
      LEFT JOIN (
        SELECT DISTINCT ON (card_id)
               card_id, base_price, foil_price, price_source, updated_at
        FROM card_pricing
        WHERE card_id = c.id
        ORDER BY card_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
      ) lp ON lp.card_id = ci.card_id
      WHERE ci.card_id = c.id
    ) inv ON TRUE
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
    // Get card details
    const cardRes = await client.query(
      `SELECT c.*
       FROM cards c
       WHERE c.id = $1`,
      [id]
    );
    
    if (cardRes.rowCount === 0) {
      return res.status(404).json({ error: "Card not found" });
    }

    // Get inventory variations with proper field aliases
    // IMPORTANT: Alias 'id' as 'inventory_id' and 'stock_quantity' as 'stock'
    // to match the CardVariation interface used throughout the app
    const invRes = await client.query(
      `SELECT 
        id AS inventory_id,
        quality, 
        foil_type, 
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
        ...cardRes.rows[0], 
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