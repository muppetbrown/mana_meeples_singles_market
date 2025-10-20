// apps/api/src/routes/inventory.ts
import express, { type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";

const router = express.Router();

/**
 * POST /admin/inventory
 * Adds (or upserts) inventory for a specific card variation.
 *
 * NOTE on schema:
 * - In your DB, each row in `cards` represents a variation already.
 * - `card_inventory` has a unique composite (card_id, variation_id, quality, foil_type, language).
 * - We set variation_id NULL because the card row *is* the variation (keep consistent with your current UI).
 */
const AddInventorySchema = z.object({
  card_id: z.coerce.number().int().positive(),
  quality: z.string().trim().min(1),
  foil_type: z.string().trim().min(1),
  price: z.coerce.number().min(0).default(0),
  stock_quantity: z.coerce.number().int().min(0).default(0),
  language: z.string().trim().min(1),
});

router.post("/admin/inventory", async (req: Request, res: Response) => {
  const parsed = AddInventorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }

  const { card_id, quality, foil_type, price, stock_quantity, language } = parsed.data;

  // Upsert with explicit target matching your unique index
  const sql = `
    INSERT INTO card_inventory (card_id, variation_id, quality, foil_type, language, price, stock_quantity)
    VALUES ($1, NULL, $2, $3, $4, $5, $6)
    ON CONFLICT (card_id, variation_id, quality, foil_type, language)
    DO UPDATE SET price = EXCLUDED.price, stock_quantity = EXCLUDED.stock_quantity
    RETURNING id, card_id, quality, foil_type, language, price, stock_quantity
  `;

  try {
    const rows = await db.query(sql, [card_id, quality, foil_type, language, price, stock_quantity]);
    return res.status(200).json({ inventory: rows[0] });
  } catch (err: any) {
    console.error("POST /admin/inventory failed", { code: err?.code, message: err?.message, card_id });
    return res.status(500).json({ error: "Failed to upsert inventory" });
  }
});

export default router;
