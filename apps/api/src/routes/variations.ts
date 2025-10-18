// apps/api/src/routes/variations.ts
import express, { Request, Response } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";

const router = express.Router();

// ---------- Types ----------
interface VariationFilters {
  treatments: string[];
  finishes: string[];
  border_colors: string[];
  frame_effects: string[];
  promo_types: string[];
}

// ---------- Schema ----------
const idSchema = z.object({
  game_id: z.coerce.number().int().positive().optional(),
  set_id: z.coerce.number().int().positive().optional(),
});

// ---------- Helper ----------
function normalizeValues(values: string[] | null): string[] {
  if (!values) return [];
  return values
    .filter(Boolean)
    .map((v) => v.trim().toUpperCase())
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort();
}

// ---------- Routes ----------

// 1️⃣  GET /api/variations/game/:game_id
// Fetch variation metadata for a specific game (from game_variations_metadata)
router.get("/game/:game_id", async (req: Request, res: Response) => {
  const parsed = idSchema.safeParse(req.params);
  if (!parsed.success || !parsed.data.game_id) {
    res.status(400).json({ error: "Invalid or missing game_id" });
    return;
  }

  const { game_id } = parsed.data;

  try {
    const rows = await db.query<VariationFilters>(
      `
      SELECT
        treatment_codes AS treatments,
        special_foils AS finishes,
        border_colors,
        frame_effects,
        promo_types
      FROM game_variations_metadata
      WHERE game_id = $1
      LIMIT 1
      `,
      [game_id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: "Game variation metadata not found" });
      return;
    }

    const v = rows[0];
    res.json({
      treatments: normalizeValues(v.treatments),
      finishes: normalizeValues(v.finishes),
      border_colors: normalizeValues(v.border_colors),
      frame_effects: normalizeValues(v.frame_effects),
      promo_types: normalizeValues(v.promo_types),
    });
  } catch (err: any) {
    console.error("❌ GET /api/variations/game/:game_id failed:", err.message);
    res.status(500).json({ error: "Failed to fetch game variation metadata" });
  }
});

// 2️⃣  GET /api/variations/set/:set_id
// Fetch variation metadata for a specific set.
// Prefer materialized view mv_set_variation_filters (faster + indexed).
router.get("/set/:set_id", async (req: Request, res: Response) => {
  const parsed = idSchema.safeParse(req.params);
  if (!parsed.success || !parsed.data.set_id) {
    res.status(400).json({ error: "Invalid or missing set_id" });
    return;
  }

  const { set_id } = parsed.data;

  try {
    const mvRows = await db.query<VariationFilters>(
      `
      SELECT treatments, finishes, border_colors, frame_effects, promo_types
      FROM mv_set_variation_filters
      WHERE set_id = $1
      LIMIT 1
      `,
      [set_id]
    );

    if (mvRows.length > 0) {
      const mv = mvRows[0];
      res.json({
        treatments: normalizeValues(mv.treatments),
        finishes: normalizeValues(mv.finishes),
        border_colors: normalizeValues(mv.border_colors),
        frame_effects: normalizeValues(mv.frame_effects),
        promo_types: normalizeValues(mv.promo_types),
        source: "materialized_view",
      });
      return;
    }

    // Fallback: metadata table
    const metaRows = await db.query<VariationFilters>(
      `
      SELECT
        treatment_codes AS treatments,
        special_foils AS finishes,
        border_colors,
        frame_effects,
        promo_types
      FROM set_variations_metadata
      WHERE set_id = $1
      LIMIT 1
      `,
      [set_id]
    );

    if (metaRows.length === 0) {
      res.status(404).json({ error: "Set variation metadata not found" });
      return;
    }

    const v = metaRows[0];
    res.json({
      treatments: normalizeValues(v.treatments),
      finishes: normalizeValues(v.finishes),
      border_colors: normalizeValues(v.border_colors),
      frame_effects: normalizeValues(v.frame_effects),
      promo_types: normalizeValues(v.promo_types),
      source: "metadata_fallback",
    });
  } catch (err: any) {
    console.error("❌ GET /api/variations/set/:set_id failed:", err.message);
    res.status(500).json({ error: "Failed to fetch set variation metadata" });
  }
});

// 3️⃣  GET /api/variations/refresh
// Optional: trigger refresh of mv_set_variation_filters (if you support that)
router.post("/refresh", async (_req: Request, res: Response) => {
  try {
    await db.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_set_variation_filters`);
    res.json({ success: true, refreshed: "mv_set_variation_filters" });
  } catch (err: any) {
    console.error("❌ POST /api/variations/refresh failed:", err.message);
    res.status(500).json({ error: "Failed to refresh materialized view" });
  }
});

export default router;
