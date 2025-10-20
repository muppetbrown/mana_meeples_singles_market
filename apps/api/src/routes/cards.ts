// apps/api/src/routes/cards.ts
import express, { type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";

const router = express.Router();

/* ──────────────────────────────────────────────────────────────
   Shared filter schemas & SQL builders (Single Source of Truth)
   ────────────────────────────────────────────────────────────── */

export const CardFiltersQuery = z.object({
  game_id: z.coerce.number().int().positive().optional(),
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
});

type CardFilters = z.infer<typeof CardFiltersQuery>;

function buildFilterSQL(alias: string, f: CardFilters) {
  const where: string[] = [];
  const joins: string[] = [];
  const params: any[] = [];

  if (f.game_id) {
    params.push(f.game_id);
    where.push(`${alias}.game_id = $${params.length}`);
  }

  if (f.set_name) {
    joins.push(`JOIN card_sets cs ON cs.id = ${alias}.set_id`);
    params.push(f.set_name);
    // ILIKE with pg_trgm index on cs.name if present; otherwise keep exact match if preferred
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
    // Leverage pg_trgm GIN on c.name / c.card_number if available
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
   GET /cards  → list (mounted under /cards so path is /cards)
   Your router is mounted at "/cards", and you call "/cards/cards"
   from the frontend. We keep that stable here.
   ────────────────────────────────────────────────────────────── */

router.get("/cards", async (req: Request, res: Response) => {
  const parsed = CardsIndexQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }
  const { page, per_page, sort, order, ...filters } = parsed.data;

  const { where, joins, params } = buildFilterSQL("c", filters);
  const { orderBy, limitOffset, extraJoins } = buildPagingSQL("c", { page, per_page, sort, order });

  let sql = `SELECT c.*
             FROM cards c
             ${[...joins, ...extraJoins].join(" ")}`;
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  sql += ` ${orderBy} ${limitOffset}`;

  try {
    const rows = await db.query<any>(sql, params);
    // Frontend expects { cards: [...] }
    return res.json({ cards: rows });
  } catch (err: any) {
    console.error("GET /cards failed", { code: err?.code, message: err?.message });
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
  } catch (err: any) {
    console.error("GET /cards/count failed", { code: err?.code, message: err?.message });
    return res.status(500).json({ error: "Failed to fetch card count" });
  }
});

/* ──────────────────────────────────────────────────────────────
   GET /filters  → facet options (resilient to empty inventory/pricing)
   Mounted under /cards → final path /cards/filters
   ────────────────────────────────────────────────────────────── */

const FiltersQuery = z.object({
  game: z.string().trim().optional(),
  game_id: z.coerce.number().int().optional(),
  set_id: z.coerce.number().int().optional(),
  set_name: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

router.get('/filters', async (req: Request, res: Response) => {
  const parsed = FiltersQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.flatten() });
  }
  const { game, game_id, set_id, set_name, search } = parsed.data;

  const where: string[] = [];
  const params: any[] = [];

  if (typeof game_id === 'number') { params.push(game_id); where.push(`c.game_id = $${params.length}`); }
  if (game)                         { params.push(game);    where.push(`g.code = $${params.length}`); }
  if (typeof set_id === 'number')   { params.push(set_id);  where.push(`c.set_id = $${params.length}`); }
  if (set_name)                     { params.push(set_name);where.push(`c.set_name = $${params.length}`); }
  if (search && search.length > 1) {
    params.push(search, `%${search}%`);
    where.push(`(c.search_tsv @@ plainto_tsquery('simple', $${params.length-1}) OR c.name ILIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    WITH latest_prices AS (
      SELECT DISTINCT ON (card_id)
             card_id, base_price, foil_price
      FROM card_pricing
      ORDER BY card_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ),
    base AS (
      SELECT
        c.id,
        c.set_id
      FROM cards c
      JOIN games g ON g.id = c.game_id
      ${whereSql}
    ),
    inv AS (
      SELECT
        ci.card_id,
        ci.quality,
        COALESCE(ci.foil_type,'Regular') AS foil_type,
        COALESCE(ci.language,'English')  AS language,
        ci.stock_quantity,
        -- compute a price per inventory row from latest_prices
        CASE WHEN COALESCE(ci.foil_type,'Regular') ILIKE 'foil'
             THEN lp.foil_price ELSE lp.base_price END AS price
      FROM base b
      JOIN card_inventory ci ON ci.card_id = b.id
      LEFT JOIN latest_prices lp ON lp.card_id = ci.card_id
    )
    SELECT
      -- Distinct sets of each facet (flatten in app)
      ARRAY(SELECT DISTINCT c.treatment FROM cards c WHERE c.id IN (SELECT id FROM base) AND c.treatment IS NOT NULL) AS treatments,
      ARRAY(SELECT DISTINCT inv.language FROM inv WHERE inv.language IS NOT NULL) AS languages,
      ARRAY(SELECT DISTINCT inv.quality  FROM inv WHERE inv.quality  IS NOT NULL) AS qualities,
      ARRAY(SELECT DISTINCT inv.foil_type FROM inv WHERE inv.foil_type IS NOT NULL) AS foilTypes,
      MIN(inv.price) AS priceMin,
      MAX(inv.price) AS priceMax,
      SUM(CASE WHEN inv.stock_quantity > 0 THEN 1 ELSE 0 END)::int AS inStockCount
    ;
  `;

  try {
    const [row] = await db.query(sql, params);
    const out = {
      treatments: (row?.treatments ?? []).filter(Boolean),
      languages: (row?.languages ?? []).filter(Boolean),
      qualities: (row?.qualities ?? []).filter(Boolean),
      foilTypes: (row?.foiltypes ?? row?.foilTypes ?? []).filter(Boolean),
      priceMin: row?.pricemin ?? null,
      priceMax: row?.pricemax ?? null,
      inStockCount: row?.instockcount ?? 0,
    };
    return res.json(out);
  } catch (err: any) {
    console.error('GET /cards/filters failed', { code: err?.code, message: err?.message });
    return res.status(500).json({ error: 'Failed to fetch card filters' });
  }
});


export default router;

// Re-export builders so other routes (if any) can reuse them without drift
export { buildFilterSQL, buildPagingSQL };
