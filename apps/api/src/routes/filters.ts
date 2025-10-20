// apps/api/src/routes/filters.ts
import express, { type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../db.js";

const router = express.Router();

/** Handle both `T[]` and `{ rows: T[] }` */
function unwrapRows<T>(result: T[] | { rows: T[] }): T[] {
  return Array.isArray(result) ? result : result.rows;
}

// ==================== Filter Endpoints ====================

/**
 * GET /filters/treatments
 * Returns available treatment options with counts
 */
router.get("/treatments", async (req: Request, res: Response) => {
  try {
    const gameId = req.query.game_id ? parseInt(req.query.game_id as string) : null;
    
    let sql = `
      SELECT DISTINCT 
        i.foil_type as value,
        i.foil_type as label,
        COUNT(*)::int as count
      FROM card_inventory i
      WHERE i.stock_quantity > 0
    `;
    
    const params: any[] = [];
    if (gameId) {
      sql += ` AND i.game_id = $1`;
      params.push(gameId);
    }
    
    sql += `
      GROUP BY i.foil_type
      ORDER BY count DESC
    `;
    
    const result = await db.query(sql, params);
    const rows = unwrapRows(result);
    
    res.json(rows.map(row => ({
      value: row.value || 'Regular',
      label: row.label || 'Regular',
      count: row.count || 0
    })));
  } catch (err: any) {
    console.error("GET /filters/treatments failed", err);
    res.status(500).json({ error: "Failed to fetch treatments" });
  }
});

/**
 * GET /filters/rarities
 * Returns available rarity options with counts
 */
router.get("/rarities", async (req: Request, res: Response) => {
  try {
    const gameId = req.query.game_id ? parseInt(req.query.game_id as string) : null;
    
    let sql = `
      SELECT DISTINCT 
        c.rarity as value,
        c.rarity as label,
        COUNT(DISTINCT i.id)::int as count
      FROM card_inventory i
      JOIN cards c ON c.id = i.card_id
      WHERE i.stock_quantity > 0
        AND c.rarity IS NOT NULL
    `;
    
    const params: any[] = [];
    if (gameId) {
      sql += ` AND c.game_id = $1`;
      params.push(gameId);
    }
    
    sql += `
      GROUP BY c.rarity
      ORDER BY 
        CASE c.rarity
          WHEN 'Mythic' THEN 1
          WHEN 'Rare' THEN 2
          WHEN 'Uncommon' THEN 3
          WHEN 'Common' THEN 4
          ELSE 5
        END
    `;
    
    const result = await db.query(sql, params);
    const rows = unwrapRows(result);
    
    res.json(rows.map(row => ({
      value: row.value,
      label: row.label,
      count: row.count || 0
    })));
  } catch (err: any) {
    console.error("GET /filters/rarities failed", err);
    res.status(500).json({ error: "Failed to fetch rarities" });
  }
});

/**
 * GET /filters/qualities
 * Returns available quality/condition options with counts
 */
router.get("/qualities", async (req: Request, res: Response) => {
  try {
    const gameId = req.query.game_id ? parseInt(req.query.game_id as string) : null;
    
    let sql = `
      SELECT DISTINCT 
        i.quality as value,
        i.quality as label,
        COUNT(*)::int as count
      FROM card_inventory i
      WHERE i.stock_quantity > 0
    `;
    
    const params: any[] = [];
    if (gameId) {
      sql += ` AND i.game_id = $1`;
      params.push(gameId);
    }
    
    sql += `
      GROUP BY i.quality
      ORDER BY 
        CASE i.quality
          WHEN 'Near Mint' THEN 1
          WHEN 'Lightly Played' THEN 2
          WHEN 'Moderately Played' THEN 3
          WHEN 'Heavily Played' THEN 4
          WHEN 'Damaged' THEN 5
          ELSE 6
        END
    `;
    
    const result = await db.query(sql, params);
    const rows = unwrapRows(result);
    
    res.json(rows.map(row => ({
      value: row.value || 'Near Mint',
      label: row.label || 'Near Mint',
      count: row.count || 0
    })));
  } catch (err: any) {
    console.error("GET /filters/qualities failed", err);
    res.status(500).json({ error: "Failed to fetch qualities" });
  }
});

/**
 * GET /filters/foil-types
 * Returns available foil type options with counts
 */
router.get("/foil-types", async (req: Request, res: Response) => {
  try {
    const gameId = req.query.game_id ? parseInt(req.query.game_id as string) : null;
    
    let sql = `
      SELECT DISTINCT 
        i.foil_type as value,
        i.foil_type as label,
        COUNT(*)::int as count
      FROM card_inventory i
      WHERE i.stock_quantity > 0
    `;
    
    const params: any[] = [];
    if (gameId) {
      sql += ` AND i.game_id = $1`;
      params.push(gameId);
    }
    
    sql += `
      GROUP BY i.foil_type
      ORDER BY 
        CASE 
          WHEN i.foil_type = 'Regular' THEN 1
          WHEN i.foil_type = 'Foil' THEN 2
          ELSE 3
        END,
        i.foil_type
    `;
    
    const result = await db.query(sql, params);
    const rows = unwrapRows(result);
    
    res.json(rows.map(row => ({
      value: row.value || 'Regular',
      label: row.label || 'Regular',
      count: row.count || 0
    })));
  } catch (err: any) {
    console.error("GET /filters/foil-types failed", err);
    res.status(500).json({ error: "Failed to fetch foil types" });
  }
});

/**
 * GET /filters/languages
 * Returns available language options with counts
 */
router.get("/languages", async (req: Request, res: Response) => {
  try {
    const gameId = req.query.game_id ? parseInt(req.query.game_id as string) : null;
    
    let sql = `
      SELECT DISTINCT 
        i.language as value,
        i.language as label,
        COUNT(*)::int as count
      FROM card_inventory i
      WHERE i.stock_quantity > 0
    `;
    
    const params: any[] = [];
    if (gameId) {
      sql += ` AND i.game_id = $1`;
      params.push(gameId);
    }
    
    sql += `
      GROUP BY i.language
      ORDER BY 
        CASE i.language
          WHEN 'English' THEN 1
          WHEN 'Japanese' THEN 2
          ELSE 3
        END,
        i.language
    `;
    
    const result = await db.query(sql, params);
    const rows = unwrapRows(result);
    
    res.json(rows.map(row => ({
      value: row.value || 'English',
      label: row.label || 'English',
      count: row.count || 0
    })));
  } catch (err: any) {
    console.error("GET /filters/languages failed", err);
    res.status(500).json({ error: "Failed to fetch languages" });
  }
});

// ==================== Helper Functions (for use by other routes) ====================

export type CardFilters = {
  game_id?: number;
  set_id?: number;
  q?: string; // search query
  treatment?: string[];
  border_color?: string[];
  finish?: string[];
  promo_type?: string[];
  frame_effect?: string[];
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
};

/**
 * Zod schema for cards query params (pagination + filters)
 */
// Helper: coerce string | string[] | undefined → string[] | undefined
const zStringArray = z.preprocess(
  (val) => {
    if (val == null) return undefined;
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      // support comma-separated values: ?treatment=FOIL,ETCHED
      return val.split(",").map(s => s.trim()).filter(Boolean);
    }
    return undefined;
  },
  z.array(z.string()).optional()
);

export const CardFiltersQuery = z.object({
  game_id: z.coerce.number().int().positive().optional(),
  set_id: z.coerce.number().int().positive().optional(),
  q: z.string().optional(),
  treatment: zStringArray,
  border_color: zStringArray,
  finish: zStringArray,
  promo_type: zStringArray,
  frame_effect: zStringArray,
  min_price: z.coerce.number().nonnegative().optional(),
  max_price: z.coerce.number().nonnegative().optional(),
  // default to true (your routes expect in-stock by default)
  in_stock: z.coerce.boolean().default(true).optional(),
});

export const CardsIndexQuery = CardFiltersQuery.extend({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(200).default(50),
  sort: z.enum(["name", "price", "rarity", "created_at"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

/**
 * Build WHERE clause + JOINs for card filters.
 * `cardAlias` lets you use 'c' (recommended) when querying `cards c`.
 */
export function buildFilterSQL(
  cardAlias: string,
  filters: CardFilters
): { where: string[]; joins: string[]; params: any[] } {
  const where: string[] = [];
  const joins: string[] = [];
  const params: any[] = [];

  const c = cardAlias;

  if (filters.game_id != null) {
    params.push(filters.game_id);
    where.push(`${c}.game_id = $${params.length}`);
  }

  if (filters.set_id != null) {
    params.push(filters.set_id);
    where.push(`${c}.set_id = $${params.length}`);
  }

  if (filters.q) {
    params.push(filters.q);
    // Uses GIN index on cards.search_tsv
    where.push(`${c}.search_tsv @@ plainto_tsquery('english', $${params.length})`);
  }

  // Facet arrays → ANY($n)
  if (filters.treatment && filters.treatment.length) {
    params.push(filters.treatment);
    where.push(`${c}.treatment = ANY($${params.length})`);
  }
  if (filters.border_color && filters.border_color.length) {
    params.push(filters.border_color);
    where.push(`${c}.border_color = ANY($${params.length})`);
  }
  if (filters.finish && filters.finish.length) {
    params.push(filters.finish);
    where.push(`${c}.finish = ANY($${params.length})`);
  }
  if (filters.promo_type && filters.promo_type.length) {
    params.push(filters.promo_type);
    where.push(`${c}.promo_type = ANY($${params.length})`);
  }
  if (filters.frame_effect && filters.frame_effect.length) {
    params.push(filters.frame_effect);
    where.push(`${c}.frame_effect = ANY($${params.length})`);
  }

  // Prices (adjust to your pricing table/view)
  if (filters.min_price != null || filters.max_price != null) {
    joins.push(`LEFT JOIN card_pricing cp ON cp.card_id = ${c}.id`);
    if (filters.min_price != null) {
      params.push(filters.min_price);
      where.push(`cp.price >= $${params.length}`);
    }
    if (filters.max_price != null) {
      params.push(filters.max_price);
      where.push(`cp.price <= $${params.length}`);
    }
  }

  if (filters.in_stock) {
    // Leverage partial index on card_inventory(stock > 0)
    joins.push(
      `JOIN card_inventory ci ON ci.card_id = ${c}.id AND ci.stock > 0`
    );
  }

  return { where, joins, params };
}

/**
 * Build ORDER BY / LIMIT / OFFSET safely from pagination options.
 * Only allow whitelisted sort columns to avoid SQL injection.
 */
export function buildPagingSQL(
  cardAlias: string,
  opts: { page: number; per_page: number; sort: string; order: string }
): { orderBy: string; limitOffset: string; extraJoins: string[] } {
  const c = cardAlias;
  const extraJoins: string[] = [];

  // Whitelist sort columns
  const sortMap: Record<string, string> = {
    name: `${c}.name`,
    created_at: `${c}.created_at`,
    rarity: `${c}.rarity`,
    price: "cp.price",
  };

  const orderCol = sortMap[opts.sort] || `${c}.name`;
  const orderDir = opts.order === "desc" ? "DESC" : "ASC";

  // If sorting by price, ensure join
  if (opts.sort === "price" && !extraJoins.includes("card_pricing")) {
    extraJoins.push(`LEFT JOIN card_pricing cp ON cp.card_id = ${c}.id`);
  }

  const orderBy = `ORDER BY ${orderCol} ${orderDir}`;
  const offset = (opts.page - 1) * opts.per_page;
  const limitOffset = `LIMIT ${opts.per_page} OFFSET ${offset}`;

  return { orderBy, limitOffset, extraJoins };
}

export default router;