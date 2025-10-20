import { Router } from "express";
import { z } from "zod";
import type { Pool } from "pg";

// If you already have a pooled client exported somewhere, import it instead:
import { db } from "../db.js"; // <- adjust to your actual db module

const router = Router();

const QuerySchema = z.object({
  game: z.string().trim().toLowerCase().optional(),   // game code e.g. "mtg"
  set_id: z.coerce.number().int().positive().optional()
});

router.get("/filters", async (req, res, next) => {
  try {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query", issues: parsed.error.flatten() });
    }
    const { game, set_id } = parsed.data;

    // WHERE builder
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

    // NOTE:
    // - LEFT JOIN inventory & pricing so absence doesn't kill the aggregates
    // - COALESCE(..., '{}') to force arrays instead of null
    // - FILTER (...) to avoid nulls in arrays
    // - COUNT DISTINCT for inStockCount based on stock > 0
    const sql = `
      WITH base AS (
        SELECT c.id, c.treatment, c.finish, c.border_color, c.frame_effect, c.promo_type
        FROM cards c
        JOIN games g ON g.id = c.game_id
        ${whereSql}
      )
      SELECT
        COALESCE(ARRAY_AGG(DISTINCT b.treatment)     FILTER (WHERE b.treatment     IS NOT NULL), '{}') AS treatments,
        COALESCE(ARRAY_AGG(DISTINCT b.finish)        FILTER (WHERE b.finish        IS NOT NULL), '{}') AS finishes,
        COALESCE(ARRAY_AGG(DISTINCT b.border_color)  FILTER (WHERE b.border_color  IS NOT NULL), '{}') AS border_colors,
        COALESCE(ARRAY_AGG(DISTINCT b.promo_type)    FILTER (WHERE b.promo_type    IS NOT NULL), '{}') AS promo_types,
        COALESCE(ARRAY_AGG(DISTINCT b.frame_effect)  FILTER (WHERE b.frame_effect  IS NOT NULL), '{}') AS frame_effects,

        COALESCE(ARRAY_AGG(DISTINCT ci.language)     FILTER (WHERE ci.language     IS NOT NULL), '{}') AS languages,
        COALESCE(ARRAY_AGG(DISTINCT ci.quality)      FILTER (WHERE ci.quality      IS NOT NULL), '{}') AS qualities,
        COALESCE(ARRAY_AGG(DISTINCT ci.foil_type)    FILTER (WHERE ci.foil_type    IS NOT NULL), '{}') AS foil_types,

        COALESCE(COUNT(DISTINCT b.id)                FILTER (WHERE ci.stock > 0), 0)               AS in_stock_count,

        MIN(p.price) AS price_min,
        MAX(p.price) AS price_max
      FROM base b
      LEFT JOIN card_inventory ci ON ci.card_id = b.id
      LEFT JOIN card_pricing  p  ON p.card_id  = b.id
    `;

    const rows = await db.query(sql, vals);
    const r = rows[0] ?? {};

    // normalize casing if you rely on uppercase codes in UI
    const normalize = (arr?: string[]) => Array.isArray(arr) ? arr.filter(Boolean) : [];

    res.json({
      treatments:    normalize(r.treatments),
      finishes:      normalize(r.finishes),
      borderColors:  normalize(r.border_colors),
      promoTypes:    normalize(r.promo_types),
      frameEffects:  normalize(r.frame_effects),

      languages:     normalize(r.languages),
      qualities:     normalize(r.qualities),
      foilTypes:     normalize(r.foil_types),

      inStockCount:  Number.isFinite(r.in_stock_count) ? Number(r.in_stock_count) : 0,
      priceMin:      r.price_min ?? null,
      priceMax:      r.price_max ?? null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
