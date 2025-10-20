// apps/api/src/routes/variations.ts
import express, { type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../db.js";

const router = express.Router();

/** Handle both `T[]` and `{ rows: T[] }` */
function unwrapRows<T>(result: T[] | { rows: T[] }): T[] {
  return Array.isArray(result) ? result : result.rows;
}

/**
 * Schema: require either set_id OR game_id (coerced).
 */
const VariationsQuery = z
  .object({
    set_id: z.coerce.number().int().positive().optional(),
    game_id: z.coerce.number().int().positive().optional(),
  })
  .refine((v) => v.set_id != null || v.game_id != null, {
    message: "set_id or game_id is required",
  });

/**
 * GET /variations
 * Returns distinct variation facets for a set or game using mv_set_variation_filters.
 * - If set_id provided, narrows to that set.
 * - Else if game_id provided, aggregates across that game.
 *
 * Expected columns in mv_set_variation_filters:
 *   set_id, game_id, treatments, border_colors, finishes, promo_types, frame_effects
 */
router.get("/variations", async (req: Request, res: Response) => {
  const parsed = VariationsQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
      details: parsed.error.flatten(),
    });
  }

  const { set_id, game_id } = parsed.data;

  let sql = `
    SELECT
      COALESCE(array_agg(DISTINCT unnest(treatments)) FILTER (WHERE treatments IS NOT NULL), '{}') AS treatments,
      COALESCE(array_agg(DISTINCT unnest(border_colors)) FILTER (WHERE border_colors IS NOT NULL), '{}') AS border_colors,
      COALESCE(array_agg(DISTINCT unnest(finishes)) FILTER (WHERE finishes IS NOT NULL), '{}') AS finishes,
      COALESCE(array_agg(DISTINCT unnest(promo_types)) FILTER (WHERE promo_types IS NOT NULL), '{}') AS promo_types,
      COALESCE(array_agg(DISTINCT unnest(frame_effects)) FILTER (WHERE frame_effects IS NOT NULL), '{}') AS frame_effects
    FROM mv_set_variation_filters
  `;
  const where: string[] = [];
  const params: any[] = [];

  if (set_id != null) {
    params.push(set_id);
    where.push(`set_id = $${params.length}`);
  } else if (game_id != null) {
    params.push(game_id);
    where.push(`game_id = $${params.length}`);
  }

  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;

  try {
    const result = await db.query<any>(sql, params);
    const rows = unwrapRows(result);
    // Normalize each array to uppercase strings (defensive)
    const row = rows?.[0] ?? {};
    const normalize = (a: any) =>
      Array.isArray(a) ? a.filter(Boolean).map((x) => String(x).toUpperCase()) : [];
    return res.json({
      treatments: normalize(row.treatments),
      border_colors: normalize(row.border_colors),
      finishes: normalize(row.finishes),
      promo_types: normalize(row.promo_types),
      frame_effects: normalize(row.frame_effects),
    });
  } catch (err: any) {
    console.error("GET /variations failed", { code: err?.code, message: err?.message });
    return res.status(500).json({ error: "Failed to fetch variations" });
  }
});

export default router;
