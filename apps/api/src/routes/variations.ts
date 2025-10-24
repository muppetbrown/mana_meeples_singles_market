// apps/api/src/routes/variations.ts
import express, { type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";

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
      COALESCE(
        CASE
          WHEN $1::int IS NOT NULL THEN (SELECT treatment_codes FROM set_variations_metadata WHERE set_id = $1 LIMIT 1)
          ELSE (SELECT treatment_codes FROM game_variations_metadata WHERE game_id = $2 LIMIT 1)
        END, '[]'::jsonb
      ) AS treatments,
      COALESCE(
        CASE
          WHEN $1::int IS NOT NULL THEN (SELECT border_colors FROM set_variations_metadata WHERE set_id = $1 LIMIT 1)
          ELSE (SELECT border_colors FROM game_variations_metadata WHERE game_id = $2 LIMIT 1)
        END, '[]'::jsonb
      ) AS border_colors,
      COALESCE(
        CASE
          WHEN $1::int IS NOT NULL THEN (SELECT special_foils FROM set_variations_metadata WHERE set_id = $1 LIMIT 1)
          ELSE (SELECT special_foils FROM game_variations_metadata WHERE game_id = $2 LIMIT 1)
        END, '[]'::jsonb
      ) AS finishes,
      '[]'::jsonb AS promo_types,
      COALESCE(
        CASE
          WHEN $1::int IS NOT NULL THEN (SELECT frame_effects FROM set_variations_metadata WHERE set_id = $1 LIMIT 1)
          ELSE (SELECT frame_effects FROM game_variations_metadata WHERE game_id = $2 LIMIT 1)
        END, '[]'::jsonb
      ) AS frame_effects
  `;

  // Parameters are: $1 = set_id, $2 = game_id
  const params = [set_id || null, game_id || null];

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
