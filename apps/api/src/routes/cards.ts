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

const FacetQuery = z.object({
  game: z.string().trim().toLowerCase().optional(),  // code like 'mtg'
  set_id: z.coerce.number().int().positive().optional(),
});

router.get("/filters", async (req, res, next) => {
  try {
    const parsed = FacetQuery.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query", issues: parsed.error.flatten() });
    }
    const { game, set_id } = parsed.data;

    const vals: any[] = [];
    const conds: string[] = [];
    if (game) {
      vals.push(game);
      conds.push(`g.code = $${vals.length}`);
    }
    if (set_id) {
      vals.push(set_id);
      conds.push(`c.set_id = $${vals.length}`);
    }
    const whereSql = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

    const sql = `
      WITH base AS (
        SELECT c.id, c.treatment, c.finish, c.border_color, c.frame_effect, c.promo_type
        FROM cards c
        JOIN games g ON g.id = c.game_id
        ${whereSql}
      )
      SELECT
        COALESCE(ARRAY_AGG(DISTINCT b.treatment)    FILTER (WHERE b.treatment    IS NOT NULL), '{}') AS treatments,
        COALESCE(ARRAY_AGG(DISTINCT b.finish)       FILTER (WHERE b.finish       IS NOT NULL), '{}') AS finishes,
        COALESCE(ARRAY_AGG(DISTINCT b.border_color) FILTER (WHERE b.border_color IS NOT NULL), '{}') AS border_colors,
        COALESCE(ARRAY_AGG(DISTINCT b.promo_type)   FILTER (WHERE b.promo_type   IS NOT NULL), '{}') AS promo_types,
        COALESCE(ARRAY_AGG(DISTINCT b.frame_effect) FILTER (WHERE b.frame_effect IS NOT NULL), '{}') AS frame_effects,

        COALESCE(ARRAY_AGG(DISTINCT ci.language)    FILTER (WHERE ci.language    IS NOT NULL), '{}') AS languages,
        COALESCE(ARRAY_AGG(DISTINCT ci.quality)     FILTER (WHERE ci.quality     IS NOT NULL), '{}') AS qualities,
        COALESCE(ARRAY_AGG(DISTINCT ci.foil_type)   FILTER (WHERE ci.foil_type   IS NOT NULL), '{}') AS foil_types,

        COALESCE(COUNT(DISTINCT b.id)               FILTER (WHERE ci.stock > 0), 0) AS in_stock_count,

        MIN(p.price) AS price_min,
        MAX(p.price) AS price_max
      FROM base b
      LEFT JOIN card_inventory ci ON ci.card_id = b.id
      LEFT JOIN card_pricing  p  ON p.card_id  = b.id
    `;

    const rows = await db.query(sql, vals);
    const r = (rows[0] ?? {}) as any;

    const norm = (a: unknown) => (Array.isArray(a) ? a.filter(Boolean) : []);

    res.json({
      treatments:    norm(r.treatments),
      finishes:      norm(r.finishes),
      borderColors:  norm(r.border_colors),
      promoTypes:    norm(r.promo_types),
      frameEffects:  norm(r.frame_effects),
      languages:     norm(r.languages),
      qualities:     norm(r.qualities),
      foilTypes:     norm(r.foil_types),
      inStockCount:  Number.isFinite(r.in_stock_count) ? Number(r.in_stock_count) : 0,
      priceMin:      r.price_min ?? null,
      priceMax:      r.price_max ?? null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

// Re-export builders so other routes (if any) can reuse them without drift
export { buildFilterSQL, buildPagingSQL };
