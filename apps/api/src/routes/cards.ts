// apps/api/src/routes/cards.ts
import express, { type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../db.js";
import {
  CardsIndexQuery,
  CardFiltersQuery,
  buildFilterSQL,
  buildPagingSQL,
} from "./filters.js";

const router = express.Router();

/** Handle both `T[]` and `{ rows: T[] }` wrappers */
function unwrapRows<T>(result: T[] | { rows: T[] }): T[] {
  return Array.isArray(result) ? result : result.rows;
}

/* ------------------------------ /cards ------------------------------ */

/**
 * GET /cards
 * List cards with filters + pagination.
 */
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
    const result = await db.query<any>(sql, params);
    const rows = unwrapRows(result);
    return res.json(rows);
  } catch (err: any) {
    console.error("GET /cards failed", { code: err?.code, message: err?.message });
    return res.status(500).json({ error: "Failed to fetch cards" });
  }
});

/**
 * GET /cards/count
 * Count cards for provided filters (fixes game_id=1 400 by coercion).
 */
const CountQuerySchema = CardFiltersQuery; // same filters, no pagination needed

router.get("/cards/count", async (req: Request, res: Response) => {
  const parsed = CountQuerySchema.safeParse(req.query);
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
    const result = await db.query<{ count: number }>(sql, params);
    const rows = unwrapRows(result);
    return res.json({ count: rows?.[0]?.count ?? 0 });
  } catch (err: any) {
    console.error("GET /cards/count failed", { code: err?.code, message: err?.message });
    return res.status(500).json({ error: "Failed to fetch card count" });
  }
});

export default router;
