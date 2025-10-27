// apps/api/src/routes/inventory.ts
import express, { type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { adminAuthJWT } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /admin/inventory
 * Get all inventory with optional filtering
 */
router.get("/admin/inventory", adminAuthJWT, async (req: Request, res: Response) => {
  try {
    const { card_id, page, per_page } = req.query;

    const pageRaw = page;
    const pageNum = typeof pageRaw === 'string' ? Number(pageRaw) : 1;
    const currentPage = Number.isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;

    const perPageRaw = per_page;
    const perPageNum = typeof perPageRaw === 'string' ? Number(perPageRaw) : 50;
    const limit = Math.min(Number.isNaN(perPageNum) ? 50 : perPageNum, 100);
    const offset = (currentPage - 1) * limit;

    let sql = `
      SELECT 
        ci.*,
        c.name as card_name,
        c.card_number,
        cs.name as set_name
      FROM card_inventory ci
      JOIN cards c ON ci.card_id = c.id
      LEFT JOIN card_sets cs ON c.set_id = cs.id
      WHERE 1=1
    `;
    
    const params: (string | number)[] = [];
    
    if (card_id) {
      params.push(card_id);
      sql += ` AND ci.card_id = $${params.length}`;
    }
    
    sql += ` ORDER BY ci.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const inventory = await db.query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as total FROM card_inventory ci WHERE 1=1`;
    const countParams: (string | number)[] = [];
    
    if (card_id) {
      countParams.push(card_id);
      countSql += ` AND ci.card_id = $1`;
    }
    
    const countResult = await db.query(countSql, countParams);
    const total = parseInt(countResult[0]?.total || "0", 10);

    return res.json({
      inventory,
      pagination: {
        page: currentPage,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    console.error("GET /admin/inventory failed", err instanceof Error ? {
      code: (err && typeof err === 'object' && 'code' in err) ? (err as {code: unknown}).code : 'unknown',
      message: err.message
    } : err);
    return res.status(500).json({ error: "Failed to retrieve inventory" });
  }
});

/**
 * POST /admin/inventory
 * Adds (or upserts) inventory for a specific card variation.
 */
const AddInventorySchema = z.object({
  card_id: z.coerce.number().int().positive(),
  quality: z.string().trim().min(1),
  foil_type: z.string().trim().min(1),
  price: z.coerce.number().min(0).default(0),
  stock_quantity: z.coerce.number().int().min(0).default(0),
  language: z.string().trim().min(1),
  cost: z.coerce.number().min(0).optional(),
  markup_percentage: z.coerce.number().min(0).max(999).default(0),
  auto_price_enabled: z.boolean().default(false),
  low_stock_threshold: z.coerce.number().int().min(0).default(3),
  tcgplayer_id: z.string().trim().optional(),
  price_source: z.string().trim().optional(),
  sku: z.string().trim().optional(),
});

router.post("/admin/inventory", adminAuthJWT, async (req: Request, res: Response) => {
  const parsed = AddInventorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }

  const {
    card_id, quality, foil_type, price, stock_quantity, language,
    cost, markup_percentage, auto_price_enabled, low_stock_threshold,
    tcgplayer_id, price_source, sku
  } = parsed.data;

  // Check if card exists
  const cardCheck = await db.query("SELECT id FROM cards WHERE id = $1", [card_id]);
  if (cardCheck.length === 0) {
    return res.status(400).json({ error: "Invalid card_id" });
  }

  // Upsert with explicit target matching your unique index
  const sql = `
    INSERT INTO card_inventory (
      card_id, variation_id, quality, foil_type, language, price, stock_quantity,
      cost, markup_percentage, auto_price_enabled, low_stock_threshold,
      tcgplayer_id, price_source, sku
    )
    VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (card_id, variation_id, quality, foil_type, language)
    DO UPDATE SET
      price = EXCLUDED.price,
      stock_quantity = EXCLUDED.stock_quantity,
      cost = EXCLUDED.cost,
      markup_percentage = EXCLUDED.markup_percentage,
      auto_price_enabled = EXCLUDED.auto_price_enabled,
      low_stock_threshold = EXCLUDED.low_stock_threshold,
      tcgplayer_id = EXCLUDED.tcgplayer_id,
      price_source = EXCLUDED.price_source,
      sku = EXCLUDED.sku,
      updated_at = NOW()
    RETURNING *
  `;

  try {
    const rows = await db.query(sql, [
      card_id, quality, foil_type, language, price, stock_quantity,
      cost, markup_percentage, auto_price_enabled, low_stock_threshold,
      tcgplayer_id, price_source, sku
    ]);
    return res.status(200).json({ inventory: rows[0] });
  } catch (err: unknown) {
    console.error("POST /admin/inventory failed", err instanceof Error ? {
      code: (err && typeof err === 'object' && 'code' in err) ? (err as {code: unknown}).code : 'unknown',
      message: err.message,
      card_id
    } : { err, card_id });
    return res.status(500).json({ error: "Failed to upsert inventory" });
  }
});

/**
 * PATCH /admin/inventory/:id
 * Update existing inventory item
 */
const UpdateInventorySchema = z.object({
  stock_quantity: z.coerce.number().int().min(0).optional(),
  price: z.coerce.number().min(0).optional(),
  quality: z.string().trim().min(1).optional(),
  foil_type: z.string().trim().min(1).optional(),
  language: z.string().trim().min(1).optional(),
  cost: z.coerce.number().min(0).optional(),
  markup_percentage: z.coerce.number().min(0).max(999).optional(),
  auto_price_enabled: z.boolean().optional(),
  low_stock_threshold: z.coerce.number().int().min(0).optional(),
  tcgplayer_id: z.string().trim().optional(),
  price_source: z.string().trim().optional(),
  sku: z.string().trim().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update"
});

router.patch("/admin/inventory/:id", adminAuthJWT, async (req: Request, res: Response) => {
  const inventoryId = parseInt(req.params.id, 10);
  
  if (isNaN(inventoryId)) {
    return res.status(400).json({ error: "Invalid inventory ID" });
  }

  const parsed = UpdateInventorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }

  try {
    // Check if inventory exists
    const existing = await db.query("SELECT id FROM card_inventory WHERE id = $1", [inventoryId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    Object.entries(parsed.data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });

    updates.push(`updated_at = NOW()`);
    params.push(inventoryId);

    const sql = `
      UPDATE card_inventory 
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const rows = await db.query(sql, params);
    const inventory = rows[0];
    
    // Convert price from string to number for test compatibility
    if (inventory) {
      inventory.price = parseFloat(inventory.price);
    }
    
    return res.json({ inventory });
  } catch (err: unknown) {
    console.error("PATCH /admin/inventory/:id failed", err instanceof Error ? {
      code: (err && typeof err === 'object' && 'code' in err) ? (err as {code: unknown}).code : 'unknown',
      message: err.message,
      inventoryId
    } : { err, inventoryId });
    return res.status(500).json({ error: "Failed to update inventory" });
  }
});

/**
 * DELETE /admin/inventory/:id
 * Delete inventory item
 */
router.delete("/admin/inventory/:id", adminAuthJWT, async (req: Request, res: Response) => {
  const inventoryId = parseInt(req.params.id, 10);
  
  if (isNaN(inventoryId)) {
    return res.status(400).json({ error: "Invalid inventory ID" });
  }

  try {
    // Check if inventory exists
    const existing = await db.query("SELECT id FROM card_inventory WHERE id = $1", [inventoryId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    await db.query("DELETE FROM card_inventory WHERE id = $1", [inventoryId]);
    
    return res.json({ 
      success: true, 
      message: "Inventory item deleted successfully" 
    });
  } catch (err: unknown) {
    console.error("DELETE /admin/inventory/:id failed", err instanceof Error ? {
      code: (err && typeof err === 'object' && 'code' in err) ? (err as {code: unknown}).code : 'unknown',
      message: err.message,
      inventoryId
    } : { err, inventoryId });
    return res.status(500).json({ error: "Failed to delete inventory" });
  }
});

/**
 * GET /admin/inventory/export
 * Export inventory to CSV
 */
router.get("/admin/inventory/export", adminAuthJWT, async (req: Request, res: Response) => {
  try {
    const inventory = await db.query(`
      SELECT 
        ci.id,
        ci.card_id,
        c.name as card_name,
        c.card_number,
        cs.name as set_name,
        ci.quality,
        ci.foil_type,
        ci.language,
        ci.price,
        ci.stock_quantity,
        ci.created_at
      FROM card_inventory ci
      JOIN cards c ON ci.card_id = c.id
      LEFT JOIN card_sets cs ON c.set_id = cs.id
      ORDER BY ci.created_at DESC
    `);

    // Convert to CSV
    if (inventory.length === 0) {
      return res.status(404).json({ error: "No inventory to export" });
    }

    const row = inventory[0];
    if (!row) {
      return res.status(500).json({ error: "Failed to process inventory data" });
    }
    const headers = Object.keys(row).join(",");
    const rows = inventory.map(row => 
      Object.values(row).map(val => 
        typeof val === "string" && val.includes(",") ? `"${val}"` : val
      ).join(",")
    );

    const csv = [headers, ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="inventory-export-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err: unknown) {
    console.error("GET /admin/inventory/export failed", err instanceof Error ? {
      code: (err && typeof err === 'object' && 'code' in err) ? (err as {code: unknown}).code : 'unknown',
      message: err.message
    } : err);
    return res.status(500).json({ error: "Failed to export inventory" });
  }
});

/**
 * POST /admin/inventory/bulk-import
 * Bulk import inventory from CSV/JSON
 */
router.post("/admin/inventory/bulk-import", adminAuthJWT, async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items array is required" });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: {row: number; message: string}[] = [];

    for (const item of items) {
      const parsed = AddInventorySchema.safeParse(item);
      if (!parsed.success) {
        errorCount++;
        errors.push({ item, error: parsed.error.flatten() });
        continue;
      }

      const { card_id, quality, foil_type, price, stock_quantity, language } = parsed.data;

      try {
        await db.query(`
          INSERT INTO card_inventory (card_id, variation_id, quality, foil_type, language, price, stock_quantity)
          VALUES ($1, NULL, $2, $3, $4, $5, $6)
          ON CONFLICT (card_id, variation_id, quality, foil_type, language)
          DO UPDATE SET price = EXCLUDED.price, stock_quantity = EXCLUDED.stock_quantity, updated_at = NOW()
        `, [card_id, quality, foil_type, language, price, stock_quantity]);
        
        successCount++;
      } catch (err) {
        errorCount++;
        errors.push({ item, error: "Database error" });
      }
    }

    return res.json({
      success: true,
      imported: successCount,
      failed: errorCount,
      errors: errors.slice(0, 10), // Limit error details
    });
  } catch (err: unknown) {
    console.error("POST /admin/inventory/bulk-import failed", err instanceof Error ? {
      code: (err && typeof err === 'object' && 'code' in err) ? (err as {code: unknown}).code : 'unknown',
      message: err.message
    } : err);
    return res.status(500).json({ error: "Failed to bulk import inventory" });
  }
});

export default router;