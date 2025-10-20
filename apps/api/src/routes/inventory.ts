// apps/api/src/routes/inventory.ts
import express from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { adminAuthJWT } from "../middleware/auth.js";

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateInventorySchema = z.object({
  card_id: z.number().int().positive(),
  variation_id: z.number().int().positive().optional(),
  quality: z.enum(["Near Mint", "Lightly Played", "Moderately Played", "Heavily Played", "Damaged"]),
  foil_type: z.enum(["Regular", "Foil"]).default("Regular"),
  language: z.string().default("English"),
  stock_quantity: z.number().int().min(0),
  price: z.number().positive(),
  cost: z.number().positive().optional(),
  sku: z.string().optional(),
});

const UpdateInventorySchema = CreateInventorySchema.partial().extend({
  id: z.number().int().positive(),
});

const BulkImportSchema = z.object({
  records: z.array(CreateInventorySchema),
  mode: z.enum(["replace", "append"]).default("append"),
});

// ============================================================================
// ADMIN INVENTORY ENDPOINTS
// ============================================================================

/**
 * GET /admin/inventory
 * Get all inventory with card details (for analytics and management)
 */
router.get("/admin/inventory", adminAuthJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      game_id, 
      set_id, 
      quality,
      foil_type,
      low_stock,
      limit = 1000,
      offset = 0 
    } = req.query;

    // Build query conditions
    const conditions: string[] = ["1=1"];
    const params: any[] = [];
    let paramIndex = 1;

    if (game_id) {
      conditions.push(`c.game_id = $${paramIndex++}`);
      params.push(game_id);
    }

    if (set_id) {
      conditions.push(`c.set_id = $${paramIndex++}`);
      params.push(set_id);
    }

    if (quality) {
      conditions.push(`ci.quality = $${paramIndex++}`);
      params.push(quality);
    }

    if (foil_type) {
      conditions.push(`ci.foil_type = $${paramIndex++}`);
      params.push(foil_type);
    }

    if (low_stock === "true") {
      conditions.push(`ci.stock_quantity <= ci.low_stock_threshold`);
    }

    const whereClause = conditions.join(" AND ");

    // Get inventory with card details
    params.push(limit, offset);
    const inventory = await db.query(
      `SELECT 
        ci.id,
        ci.card_id,
        ci.variation_id,
        ci.quality,
        ci.foil_type,
        ci.language,
        ci.stock_quantity,
        ci.price,
        ci.cost,
        ci.markup_percentage,
        ci.sku,
        ci.low_stock_threshold,
        ci.created_at,
        ci.updated_at,
        c.name as card_name,
        c.card_number,
        c.finish,
        c.treatment,
        cs.name as set_name,
        cs.code as set_code,
        g.name as game_name,
        cv.name as variation_name,
        CASE 
          WHEN ci.stock_quantity <= ci.low_stock_threshold THEN true 
          ELSE false 
        END as is_low_stock,
        CASE 
          WHEN ci.stock_quantity = 0 THEN true 
          ELSE false 
        END as is_out_of_stock
      FROM card_inventory ci
      JOIN cards c ON ci.card_id = c.id
      JOIN card_sets cs ON c.set_id = cs.id
      JOIN games g ON c.game_id = g.id
      LEFT JOIN card_variations cv ON ci.variation_id = cv.id
      WHERE ${whereClause}
      ORDER BY 
        is_out_of_stock DESC,
        is_low_stock DESC,
        cs.name ASC,
        c.card_number ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    // Get summary statistics
    const stats = await db.query(
      `SELECT 
        COUNT(*) as total_items,
        SUM(stock_quantity) as total_stock,
        SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
        SUM(CASE WHEN stock_quantity <= low_stock_threshold THEN 1 ELSE 0 END) as low_stock_count,
        SUM(stock_quantity * price) as total_value,
        SUM(stock_quantity * COALESCE(cost, 0)) as total_cost
      FROM card_inventory ci
      JOIN cards c ON ci.card_id = c.id
      WHERE ${whereClause}`,
      params.slice(0, -2) // Remove limit/offset params
    );

    res.json({
      inventory,
      stats: stats[0],
      pagination: {
        limit: parseInt(String(limit), 10),
        offset: parseInt(String(offset), 10),
        total: parseInt(stats[0]?.total_items || "0", 10),
      },
    });
  } catch (error) {
    console.error("❌ Get inventory error:", error);
    res.status(500).json({ error: "Failed to retrieve inventory" });
  }
});

/**
 * POST /admin/inventory
 * Create new inventory entry
 */
router.post("/admin/inventory", adminAuthJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = CreateInventorySchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ 
        error: "Invalid inventory data", 
        details: validation.error.errors 
      });
      return;
    }

    const data = validation.data;

    // Check if inventory already exists
    const existing = await db.query(
      `SELECT id FROM card_inventory 
       WHERE card_id = $1 
         AND COALESCE(variation_id, 0) = $2
         AND quality = $3 
         AND foil_type = $4 
         AND language = $5`,
      [
        data.card_id,
        data.variation_id || 0,
        data.quality,
        data.foil_type,
        data.language,
      ]
    );

    if (existing.length > 0) {
      res.status(409).json({ 
        error: "Inventory entry already exists",
        inventory_id: existing[0].id 
      });
      return;
    }

    // Calculate SKU if not provided
    const sku = data.sku || `${data.card_id}-${data.quality.substring(0, 2)}-${data.foil_type.substring(0, 1)}`;

    // Insert inventory
    const result = await db.query(
      `INSERT INTO card_inventory (
        card_id,
        variation_id,
        quality,
        foil_type,
        language,
        stock_quantity,
        price,
        cost,
        sku,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *`,
      [
        data.card_id,
        data.variation_id || null,
        data.quality,
        data.foil_type,
        data.language,
        data.stock_quantity,
        data.price,
        data.cost || null,
        sku,
      ]
    );

    res.status(201).json({
      success: true,
      inventory: result[0],
      message: "Inventory created successfully",
    });
  } catch (error) {
    console.error("❌ Create inventory error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to create inventory" 
    });
  }
});

/**
 * PATCH /admin/inventory/:id
 * Update existing inventory entry
 */
router.patch("/admin/inventory/:id", adminAuthJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid inventory ID" });
      return;
    }

    const validation = UpdateInventorySchema.omit({ id: true }).safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ 
        error: "Invalid update data", 
        details: validation.error.errors 
      });
      return;
    }

    const data = validation.data;

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex++}`);
        params.push(value);
      }
    });

    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await db.query(
      `UPDATE card_inventory 
       SET ${updates.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.length === 0) {
      res.status(404).json({ error: "Inventory not found" });
      return;
    }

    res.json({
      success: true,
      inventory: result[0],
      message: "Inventory updated successfully",
    });
  } catch (error) {
    console.error("❌ Update inventory error:", error);
    res.status(500).json({ error: "Failed to update inventory" });
  }
});

/**
 * DELETE /admin/inventory/:id
 * Delete inventory entry
 */
router.delete("/admin/inventory/:id", adminAuthJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid inventory ID" });
      return;
    }

    const result = await db.query(
      `DELETE FROM card_inventory 
       WHERE id = $1 
       RETURNING id`,
      [id]
    );

    if (result.length === 0) {
      res.status(404).json({ error: "Inventory not found" });
      return;
    }

    res.json({
      success: true,
      message: "Inventory deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete inventory error:", error);
    res.status(500).json({ error: "Failed to delete inventory" });
  }
});

/**
 * GET /admin/inventory/export
 * Export inventory as CSV
 */
router.get("/admin/inventory/export", adminAuthJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const inventory = await db.query(
      `SELECT 
        ci.id,
        c.name as card_name,
        c.card_number,
        cs.name as set_name,
        g.name as game_name,
        ci.quality,
        ci.foil_type,
        ci.language,
        ci.stock_quantity,
        ci.price,
        ci.cost,
        ci.sku
      FROM card_inventory ci
      JOIN cards c ON ci.card_id = c.id
      JOIN card_sets cs ON c.set_id = cs.id
      JOIN games g ON c.game_id = g.id
      ORDER BY g.name, cs.name, c.card_number`
    );

    // Convert to CSV
    const headers = [
      "ID", "Card Name", "Card Number", "Set", "Game", 
      "Quality", "Foil Type", "Language", "Stock", "Price", "Cost", "SKU"
    ];

    const csvRows = [
      headers.join(","),
      ...inventory.map(row => [
        row.id,
        `"${row.card_name.replace(/"/g, '""')}"`,
        row.card_number,
        `"${row.set_name.replace(/"/g, '""')}"`,
        row.game_name,
        row.quality,
        row.foil_type,
        row.language,
        row.stock_quantity,
        row.price,
        row.cost || "",
        row.sku || "",
      ].join(","))
    ];

    const csv = csvRows.join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=inventory-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error("❌ Export inventory error:", error);
    res.status(500).json({ error: "Failed to export inventory" });
  }
});

/**
 * POST /admin/inventory/bulk-import
 * Bulk import inventory from CSV/JSON
 */
router.post("/admin/inventory/bulk-import", adminAuthJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = BulkImportSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ 
        error: "Invalid bulk import data", 
        details: validation.error.errors 
      });
      return;
    }

    const { records, mode } = validation.data;

    const client = await (db as any).pool.connect();
    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    try {
      await client.query("BEGIN");

      for (const record of records) {
        try {
          // Check if exists
          const existing = await client.query(
            `SELECT id FROM card_inventory 
             WHERE card_id = $1 
               AND quality = $2 
               AND foil_type = $3 
               AND language = $4`,
            [record.card_id, record.quality, record.foil_type, record.language]
          );

          if (existing.rows.length > 0) {
            if (mode === "replace") {
              // Update existing
              await client.query(
                `UPDATE card_inventory 
                 SET stock_quantity = $1, price = $2, cost = $3, updated_at = NOW()
                 WHERE id = $4`,
                [record.stock_quantity, record.price, record.cost, existing.rows[0].id]
              );
              results.updated++;
            } else {
              results.skipped++;
            }
          } else {
            // Insert new
            const sku = record.sku || `${record.card_id}-${record.quality.substring(0, 2)}-${record.foil_type.substring(0, 1)}`;
            
            await client.query(
              `INSERT INTO card_inventory (
                card_id, variation_id, quality, foil_type, language,
                stock_quantity, price, cost, sku, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
              [
                record.card_id,
                record.variation_id || null,
                record.quality,
                record.foil_type,
                record.language,
                record.stock_quantity,
                record.price,
                record.cost || null,
                sku,
              ]
            );
            results.imported++;
          }
        } catch (err) {
          results.errors.push(`Card ${record.card_id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      await client.query("COMMIT");

      res.json({
        success: true,
        results,
        message: `Bulk import completed: ${results.imported} imported, ${results.updated} updated, ${results.skipped} skipped`,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Bulk import error:", error);
    res.status(500).json({ error: "Failed to bulk import inventory" });
  }
});

export default router;