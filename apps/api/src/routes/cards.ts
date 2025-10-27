// apps/api/src/routes/cards.ts - REFACTORED FOR NEW ARCHITECTURE
/**
 * Cards API Routes
 * 
 * NEW ARCHITECTURE:
 * - Variation metadata (treatment, finish, border_color, frame_effect, promo_type) 
 *   is stored directly on cards table
 * - Each card row represents a unique variation
 * - For ADMIN: Return cards without variations array (just metadata + stock aggregates)
 * - For STOREFRONT: Still build variations array from card_inventory
 * 
 * This endpoint is for ADMIN use - returns card metadata without variations array
 */

import express, { type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";

const router = express.Router();

/* ──────────────────────────────────────────────────────────────
   Shared filter schemas & SQL builders (Single Source of Truth)
   ────────────────────────────────────────────────────────────── */

export const CardFiltersQuery = z.object({
  game_id: z.coerce.number().int().positive().optional(),
  set_id: z.coerce.number().int().positive().optional(),
  set_name: z.string().trim().min(1).optional(),
  treatment: z.string().trim().optional(), // expect canonical UPPERCASE (STANDARD, BORDERLESS, etc.)
  rarity: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

export const CardsIndexQuery = CardFiltersQuery.extend({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(1000).default(50),
  sort: z.enum(["name", "number", "rarity", "created_at"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
  limit: z.coerce.number().int().min(1).max(1000).optional(), // Allow limit param
});

type CardFilters = z.infer<typeof CardFiltersQuery>;

function buildFilterSQL(alias: string, f: CardFilters) {
  const where: string[] = [];
  const joins: string[] = [];
  const params: unknown[] = [];

  if (f.game_id) {
    params.push(f.game_id);
    where.push(`${alias}.game_id = $${params.length}`);
  }

  if (f.set_id) {
    params.push(f.set_id);
    where.push(`${alias}.set_id = $${params.length}`);
  }

  if (f.set_name) {
    joins.push(`JOIN card_sets cs ON cs.id = ${alias}.set_id`);
    params.push(f.set_name);
    where.push(`cs.name ILIKE $${params.length}`);
  }

  if (f.treatment) {
    params.push(f.treatment.toUpperCase());
    where.push(`${alias}.treatment = $${params.length}`);
  }

  if (f.rarity) {
    params.push(f.rarity);
    where.push(`${alias}.rarity = $${params.length}`);
  }

  if (f.search) {
    const term = `%${f.search}%`;
    params.push(term, term);
    where.push(`(${alias}.name ILIKE $${params.length - 1} OR ${alias}.card_number ILIKE $${params.length})`);
  }

  return { where, joins, params };
}

function buildPagingSQL(
  alias: string,
  opts: { page: number; per_page: number; sort: string; order: string }
) {
  const { page, per_page, sort, order } = opts;

  const sortMap: Record<string, string> = {
    name: `${alias}.name`,
    number: `${alias}.card_number`,
    rarity: `${alias}.rarity`,
    created_at: `${alias}.created_at`,
  };
  const col = sortMap[sort] ?? `${alias}.name`;
  const safeOrder = order.toLowerCase() === "desc" ? "DESC" : "ASC";
  const orderBy = `ORDER BY ${col} ${safeOrder}`;
  const limitOffset = `LIMIT ${per_page} OFFSET ${(page - 1) * per_page}`;

  return { orderBy, limitOffset, extraJoins: [] as string[] };
}

/* ──────────────────────────────────────────────────────────────
   GET /cards  → list cards WITHOUT variations array (ADMIN MODE)
   
   REFACTORED FOR NEW ARCHITECTURE:
   - Returns card metadata (treatment, finish, border_color, etc.) directly
   - NO variations array (each card IS a variation)
   - Includes stock aggregates (total_stock, variation_count, has_inventory)
   - Frontend displays cards as-is without grouping
   ────────────────────────────────────────────────────────────── */

router.get("/cards", async (req: Request, res: Response) => {
  const parsed = CardsIndexQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }
  
  const { page, per_page, sort, order, limit, ...filters } = parsed.data;

  const { where, joins, params } = buildFilterSQL("c", filters);
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : '';
  
  // Use limit if provided, otherwise use per_page with pagination
  const limitSql = limit 
    ? `LIMIT ${limit}` 
    : `LIMIT ${per_page} OFFSET ${(page - 1) * per_page}`;

  const sortMap: Record<string, string> = {
    name: `c.name`,
    number: `c.card_number`,
    rarity: `c.rarity`,
    created_at: `c.created_at`,
  };
  const col = sortMap[sort] ?? `c.name`;
  const safeOrder = order.toLowerCase() === "desc" ? "DESC" : "ASC";
  const orderBy = `ORDER BY ${col} ${safeOrder}`;

  // ============================================================================
  // SIMPLIFIED QUERY - NO VARIATIONS ARRAY
  // Returns card metadata + stock aggregates only
  // ============================================================================
  const sql = `
    SELECT
      c.id,
      c.name,
      c.card_number,
      cs.name AS set_name,
      c.rarity,
      c.image_url,
      
      -- NEW: Return variation metadata directly from cards table
      c.treatment,
      c.border_color,
      c.finish,
      c.frame_effect,
      c.promo_type,
      
      g.name AS game_name,
      c.game_id,
      c.set_id,
      
      -- Stock aggregates from card_inventory (but NO variations array)
      COALESCE(inv.total_stock, 0)::int AS total_stock,
      COALESCE(inv.variation_count, 0)::int AS variation_count,
      COALESCE(inv.has_inventory, false) AS has_inventory
    FROM (
      SELECT c.*
      FROM cards c
      ${joins.join(" ")}
      ${whereSql}
      ${orderBy}
      ${limitSql}
    ) c
    JOIN games g ON g.id = c.game_id
    JOIN card_sets cs ON cs.id = c.set_id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(ci.id)::int AS variation_count,
        COALESCE(SUM(ci.stock_quantity), 0)::int AS total_stock,
        BOOL_OR(ci.stock_quantity > 0) AS has_inventory
      FROM card_inventory ci
      WHERE ci.card_id = c.id
    ) inv ON TRUE
  `;

  try {
    const rows = await db.query<unknown[]>(sql, params);

    return res.json({ cards: rows });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const dbError = err && typeof err === 'object' && 'code' in err
      ? err as { code?: string; detail?: string }
      : undefined;
    console.error("GET /cards failed", {
      code: dbError?.code,
      message: error.message,
      detail: dbError?.detail,
      stack: error.stack
    });
    return res.status(500).json({ error: "Failed to fetch cards" });
  }
});

/* ──────────────────────────────────────────────────────────────
   GET /count  → count for provided filters
   Mounted under /cards → final path /cards/count
   ────────────────────────────────────────────────────────────── */

router.get("/count", async (req: Request, res: Response) => {
  const parsed = CardFiltersQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
      details: parsed.error.flatten(),
    });
  }

  const filters = parsed.data;
  const { where, joins, params } = buildFilterSQL("c", filters);

  let sql = `SELECT COUNT(*)::int AS count
             FROM cards c
             ${joins.join(" ")}`;
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;

  try {
    const rows = await db.query<{ count: number }>(sql, params);
    return res.json({ count: rows?.[0]?.count ?? 0 });
  } catch (err: unknown) {
    console.error("GET /cards/count failed", err instanceof Error ? {
      code: (err && typeof err === 'object' && 'code' in err) ? (err as {code: unknown}).code : 'unknown',
      message: err.message
    } : err);
    return res.status(500).json({ error: "Failed to fetch card count" });
  }
});

/* ──────────────────────────────────────────────────────────────
   GET /filters  → facet options + games + sets
   Mounted under /cards → final path /cards/filters
   
   Returns filter options for admin UI
   ────────────────────────────────────────────────────────────── */

const FiltersQuery = z.object({
  game: z.string().trim().optional(),
  game_id: z.coerce.number().int().optional(),
  set_id: z.coerce.number().int().optional(),
  set_name: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

router.get('/filters', async (req: Request, res: Response) => {
  const parsed = CardFiltersQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid query',
      details: parsed.error.flatten(),
    });
  }

  const { where, joins, params } = buildFilterSQL('c', parsed.data);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // ============================================================================
  // QUERY 1: Get all games with card counts
  // ============================================================================
  const gamesSql = `
    SELECT 
      g.id,
      g.name,
      g.code,
      COUNT(DISTINCT c.id)::int AS card_count
    FROM games g
    LEFT JOIN cards c ON c.game_id = g.id
    WHERE g.active = true
    GROUP BY g.id, g.name, g.code
    ORDER BY g.name
  `;

  // ============================================================================
  // QUERY 2: Get sets (optionally filtered by game_id)
  // ============================================================================
  const setsSqlParams: unknown[] = [];
  let setsSql = `
    SELECT 
      s.id,
      s.name,
      s.code,
      s.game_id,
      COUNT(DISTINCT c.id)::int AS card_count
    FROM card_sets s
    LEFT JOIN cards c ON c.set_id = s.id
  `;
  
  // If game_id provided, filter sets to that game
  if (parsed.data.game_id) {
    setsSqlParams.push(parsed.data.game_id);
    setsSql += ` WHERE s.game_id = $1`;
  }
  
  setsSql += `
    GROUP BY s.id, s.name, s.code, s.game_id
    ORDER BY s.name
  `;

  // ============================================================================
  // QUERY 3: Get filter facets (treatments, qualities, foilTypes, etc.)
  // ============================================================================
  const filtersSql = `
    WITH base AS (
      SELECT
        c.id,
        c.set_id,
        c.treatment
      FROM cards c
      JOIN games g ON g.id = c.game_id
      ${whereSql}
    )
    SELECT
      COALESCE(ARRAY_AGG(DISTINCT c.treatment) FILTER (WHERE c.treatment IS NOT NULL), ARRAY[]::text[]) AS treatments,
      COALESCE(ARRAY_AGG(DISTINCT inv.language) FILTER (WHERE inv.language IS NOT NULL), ARRAY[]::text[]) AS languages,
      COALESCE(ARRAY_AGG(DISTINCT inv.quality) FILTER (WHERE inv.quality IS NOT NULL), ARRAY[]::text[]) AS qualities,
      COALESCE(ARRAY_AGG(DISTINCT inv.foil_type) FILTER (WHERE inv.foil_type IS NOT NULL), ARRAY[]::text[]) AS foilTypes,
      MIN(inv.price) AS priceMin,
      MAX(inv.price) AS priceMax,
      COUNT(DISTINCT CASE WHEN inv.stock_quantity > 0 THEN inv.id END)::int AS inStockCount
    FROM base b
    LEFT JOIN cards c ON c.id = b.id
    LEFT JOIN (
      SELECT
        ci.card_id,
        ci.id,
        ci.quality,
        COALESCE(ci.foil_type, 'Regular') AS foil_type,
        COALESCE(ci.language, 'English') AS language,
        ci.stock_quantity,
        COALESCE(
          CASE 
            WHEN COALESCE(ci.foil_type, 'Regular') ILIKE 'foil' 
            THEN lp.foil_price 
            ELSE lp.base_price 
          END,
          ci.price
        ) AS price
      FROM card_inventory ci
      LEFT JOIN (
        SELECT DISTINCT ON (card_id)
               card_id, base_price, foil_price
        FROM card_pricing
        ORDER BY card_id, updated_at DESC NULLS LAST
      ) lp ON lp.card_id = ci.card_id
    ) inv ON inv.card_id = b.id
  `;

  try {
    // ============================================================================
    // Execute all three queries in parallel for performance
    // ============================================================================
    const [gamesResult, setsResult, filtersResult] = await Promise.all([
      db.query(gamesSql),
      db.query(setsSql, setsSqlParams),
      db.query(filtersSql, params)
    ]);

    const filterRow = filtersResult?.[0];
    
    // ============================================================================
    // RETURN COMPLETE FILTER OPTIONS INCLUDING GAMES AND SETS
    // ============================================================================
    const response = {
      // Games and Sets
      games: gamesResult.map(g => ({
        id: g.id,
        name: g.name,
        code: g.code,
        card_count: g.card_count || 0
      })),
      sets: setsResult.map(s => ({
        id: s.id,
        name: s.name,
        code: s.code,
        game_id: s.game_id,
        card_count: s.card_count || 0
      })),
      
      // Filter facets
      treatments: filterRow?.treatments ?? [],
      languages: filterRow?.languages ?? [],
      qualities: filterRow?.qualities ?? [],
      foilTypes: filterRow?.foilTypes ?? [],

      // Price range
      priceMin: filterRow?.priceMin ?? null,
      priceMax: filterRow?.priceMax ?? null,

      // Stock info
      inStockCount: filterRow?.inStockCount ?? 0,
    };
    
    return res.json(response);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const dbError = err && typeof err === 'object' && 'code' in err
      ? err as { code?: string }
      : undefined;
    console.error('GET /cards/filters failed', {
      code: dbError?.code,
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({ error: 'Failed to fetch card filters' });
  }
});


export default router;

// Re-export builders so other routes (if any) can reuse them without drift
export { buildFilterSQL, buildPagingSQL };