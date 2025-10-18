// apps/api/src/routes/api.ts
import express from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";

// ---------- Types (aligned to your DB) ----------
type CardRow = {
  id: number;
  set_id: number;
  card_number: string;
  name: string;
  game_id: number;
  finish: string | null;
  border_color: string | null;
  treatment: string | null;
  frame_effect: string | null;
  promo_type: string | null;
  sku: string;
};

type InventoryAgg = {
  quality: string | null;
  foil_type: string | null;
  language: string | null;
  stock: number;
  min_price: number | null;
  max_price: number | null;
};

// ---------- Router ----------
const router = express.Router();

// ---------- Validation ----------
const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(), // search term
  game_id: z.coerce.number().int().positive().optional(),
  set_id: z.coerce.number().int().positive().optional(),
  // Sorting: allowlist of fields
  sort: z
    .enum(["name.asc", "name.desc", "number.asc", "number.desc", "created.desc", "created.asc"])
    .optional()
    .default("name.asc"),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(24),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ---------- Helpers ----------
function buildOrderBy(sort: string): string {
  switch (sort) {
    case "name.asc":
      return `c.name ASC, c.card_number ASC`;
    case "name.desc":
      return `c.name DESC, c.card_number DESC`;
    case "number.asc":
      // card_number is text; sort by natural-ish cast when numeric, then fallback
      return `NULLIF(regexp_replace(c.card_number, '\\D', '', 'g'), '')::int NULLS LAST, c.card_number ASC`;
    case "number.desc":
      return `NULLIF(regexp_replace(c.card_number, '\\D', '', 'g'), '')::int DESC NULLS LAST, c.card_number DESC`;
    case "created.desc":
      return `c.id DESC`;
    case "created.asc":
      return `c.id ASC`;
    default:
      return `c.name ASC`;
  }
}

function pushWhere(where: string[], params: any[], clause: string, value?: any) {
  if (typeof value !== "undefined" && value !== null && value !== "") {
    where.push(clause.replace("$n", `$${params.length + 1}`));
    params.push(value);
  }
}

// ---------- GET /api/cards ----------
// List cards (each row is a variation). Supports simple search + filters + pagination.
//
// Notes on performance:
// - Uses search_tsv GIN index if you pass q (text search), falls back to ILIKE/pg_trgm on name/number.
// - Avoids joining inventory by default (fast). Ask specific aggregates via /cards/:id/inventory.
router.get("/cards", async (req: Request, res: Response) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
    return;
  }
  const { q, game_id, set_id, sort, page, page_size } = parsed.data;

  const where: string[] = ["1=1"];
  const params: any[] = [];

  // Filters (use indexes on game_id/set_id and search_tsv/name/number)
  if (q && q.length > 0) {
    // Prefer full-text if available; otherwise fallback to ILIKE
    where.push(
      `(c.search_tsv @@ plainto_tsquery('simple', $${params.length + 1})
        OR c.name ILIKE $${params.length + 2}
        OR c.card_number ILIKE $${params.length + 3})`
    );
    params.push(q, `%${q}%`, `%${q}%`);
  }
  pushWhere(where, params, "c.game_id = $n", game_id);
  pushWhere(where, params, "c.set_id = $n", set_id);

  const orderBy = buildOrderBy(sort);
  const limit = page_size;
  const offset = (page - 1) * page_size;

  // Count first (fast, no joins)
  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM cards c
    WHERE ${where.join(" AND ")}
  `;
  // Page query
  const pageSql = `
    SELECT
      c.id, c.set_id, c.card_number, c.name, c.game_id, c.finish,
      c.border_color, c.treatment, c.frame_effect, c.promo_type, c.sku
    FROM cards c
    WHERE ${where.join(" AND ")}
    ORDER BY ${orderBy}
    LIMIT ${limit} OFFSET ${offset}
  `;

  try {
    const [countRows, rows] = await Promise.all([
      db.query<{ total: number }>(countSql, params),
      db.query<CardRow>(pageSql, params),
    ]);

    const total = countRows[0]?.total ?? 0;
    res.setHeader("X-Total-Count", String(total));
    res.json(rows);
  } catch (err: any) {
    console.error("❌ GET /api/cards failed:", err.message);
    res.status(500).json({ error: "Failed to fetch cards" });
  }
});

// ---------- GET /api/cards/:id ----------
// Fetch a single card/variation by ID (no inventory join by default)
router.get("/cards/:id", async (req: Request, res: Response) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid card id" });
    return;
  }
  const { id } = parsed.data;

  const sql = `
    SELECT
      c.id, c.set_id, c.card_number, c.name, c.game_id, c.finish,
      c.border_color, c.treatment, c.frame_effect, c.promo_type, c.sku
    FROM cards c
    WHERE c.id = $1
    LIMIT 1
  `;

  try {
    const rows = await db.query<CardRow>(sql, [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: "Card not found" });
      return;
    }
    res.json(rows[0]);
  } catch (err: any) {
    console.error("❌ GET /api/cards/:id failed:", err.message);
    res.status(500).json({ error: "Failed to fetch card" });
  }
});

// ---------- GET /api/cards/:id/inventory ----------
// Aggregate inventory for a specific card variation.
// Respect rule: inventory exists only if present in `card_inventory`.
router.get("/cards/:id/inventory", async (req: Request, res: Response) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid card id" });
    return;
  }
  const { id } = parsed.data;

  const sql = `
    SELECT
      i.quality,
      i.foil_type,
      i.language,
      SUM(i.stock)::int AS stock,
      MIN(i.price)::numeric AS min_price,
      MAX(i.price)::numeric AS max_price
    FROM card_inventory i
    WHERE i.card_id = $1
    GROUP BY i.quality, i.foil_type, i.language
    HAVING SUM(i.stock) > 0
    ORDER BY i.quality NULLS LAST, i.language NULLS LAST, i.foil_type NULLS LAST
  `;

  try {
    const rows = await db.query<InventoryAgg>(sql, [id]);
    res.json(rows);
  } catch (err: any) {
    console.error("❌ GET /api/cards/:id/inventory failed:", err.message);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// ---------- GET /api/health/db ----------
// DB-focused healthcheck (useful for Render + uptime)
router.get("/health/db", async (_req: Request, res: Response) => {
  try {
    const r = await db.query<{ ok: number }>("SELECT 1 AS ok");
    const ok = r[0]?.ok === 1;
    res.json({ database: ok ? "connected" : "disconnected" });
  } catch {
    res.status(500).json({ database: "disconnected" });
  }
});

export default router;
