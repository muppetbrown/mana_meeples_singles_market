// apps/api/src/routes/orders.ts
import express from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { adminAuthJWT } from "../middleware/auth.js";

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateOrderSchema = z.object({
  customer: z.object({
    email: z.string().email(),
    name: z.string().min(1),
    address: z.string().optional(),
    phone: z.string().optional(),
  }),
  items: z.array(
    z.object({
      inventory_id: z.number().int().positive(),
      card_id: z.number().int().positive(),
      card_name: z.string(),
      quantity: z.number().int().min(1).max(10),
      price: z.number().positive(),
    })
  ).min(1),
  total: z.number().positive(),
  currency: z.string().default("NZD"),
  notes: z.string().optional(),
});

const UpdateOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
  notes: z.string().optional(),
});

const AdminOrderQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  search: z.string().optional(),
});

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

/**
 * POST /orders
 * Create a new order (public - for checkout)
 */
router.post("/orders", async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = CreateOrderSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({ 
        error: "Invalid order data", 
        details: validation.error.errors 
      });
      return;
    }

    const { customer, items, total, currency, notes } = validation.data;

    // Start transaction
    const client = await (db as any).pool.connect();
    
    try {
      await client.query("BEGIN");

      // 1. Create order (matching existing schema)
      const orderResult = await client.query(
        `INSERT INTO orders (
          customer_email, 
          customer_name,
          subtotal,
          tax,
          shipping,
          total,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
        RETURNING id, created_at`,
        [
          customer.email,
          customer.name,
          total, // subtotal
          0, // tax (calculate if needed)
          0, // shipping (calculate if needed)
          total, // total
          "pending",
        ]
      );

      const orderId = orderResult.rows[0].id;
      const createdAt = orderResult.rows[0].created_at;

      // 2. Insert order items & decrement inventory (matching existing schema)
      for (const item of items) {
        // Insert order item
        await client.query(
          `INSERT INTO order_items (
            order_id, 
            inventory_id,
            card_name,
            quality,
            quantity, 
            unit_price, 
            total_price,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            orderId,
            item.inventory_id,
            item.card_name,
            "Near Mint", // Default quality, adjust if you pass it
            item.quantity,
            item.price,
            item.price * item.quantity,
          ]
        );

        // Decrement inventory
        const inventoryUpdate = await client.query(
          `UPDATE card_inventory 
           SET stock_quantity = stock_quantity - $1,
               updated_at = NOW()
           WHERE id = $2 AND stock_quantity >= $1
           RETURNING stock_quantity`,
          [item.quantity, item.inventory_id]
        );

        if (inventoryUpdate.rows.length === 0) {
          throw new Error(`Insufficient stock for item: ${item.card_name}`);
        }
      }

      await client.query("COMMIT");

      // Return success
      res.status(201).json({
        success: true,
        order: {
          id: orderId,
          status: "pending",
          total: total,
          currency: currency,
          created_at: createdAt,
        },
        message: "Order created successfully",
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Create order error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to create order",
    });
  }
});

/**
 * GET /orders/:orderId
 * Get order details (public - for order tracking)
 * Note: In production, add email verification or order token
 */
router.get("/orders/:orderId", async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.orderId, 10);

    if (isNaN(orderId)) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }

    // Get order with items
    const orderResult = await db.query(
      `SELECT 
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'card_name', oi.card_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'subtotal', oi.subtotal
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id`,
      [orderId]
    );

    if (orderResult.length === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json({ order: orderResult[0] });
  } catch (error) {
    console.error("❌ Get order error:", error);
    res.status(500).json({ error: "Failed to retrieve order" });
  }
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * GET /admin/orders
 * List all orders with filtering (admin only)
 */
router.get("/admin/orders", adminAuthJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = AdminOrderQuerySchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json({ 
        error: "Invalid query parameters", 
        details: validation.error.errors 
      });
      return;
    }

    const { limit, offset, status, search } = validation.data;

    // Build query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`o.status = $${paramIndex++}`);
      params.push(status);
    }

    if (search) {
      conditions.push(`(
        o.customer_email ILIKE $${paramIndex} OR 
        o.customer_name ILIKE $${paramIndex} OR 
        o.id::text ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult[0]?.total || "0", 10);

    // Get orders with item count
    params.push(limit, offset);
    const ordersResult = await db.query(
      `SELECT 
        o.*,
        COUNT(oi.id) as item_count,
        SUM(oi.quantity) as total_items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    res.json({
      orders: ordersResult,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error("❌ List orders error:", error);
    res.status(500).json({ error: "Failed to retrieve orders" });
  }
});

/**
 * GET /admin/orders/:orderId
 * Get detailed order information (admin only)
 */
router.get("/admin/orders/:orderId", adminAuthJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.orderId, 10);

    if (isNaN(orderId)) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }

    // Get order with full item details
    const orderResult = await db.query(
      `SELECT 
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'card_id', oi.card_id,
            'inventory_id', oi.inventory_id,
            'card_name', oi.card_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'subtotal', oi.subtotal,
            'card_number', c.card_number,
            'set_name', cs.name
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN cards c ON oi.card_id = c.id
      LEFT JOIN card_sets cs ON c.set_id = cs.id
      WHERE o.id = $1
      GROUP BY o.id`,
      [orderId]
    );

    if (orderResult.length === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json({ order: orderResult[0] });
  } catch (error) {
    console.error("❌ Get admin order error:", error);
    res.status(500).json({ error: "Failed to retrieve order" });
  }
});

/**
 * PATCH /admin/orders/:orderId/status
 * Update order status (admin only)
 */
router.patch("/admin/orders/:orderId/status", adminAuthJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.orderId, 10);

    if (isNaN(orderId)) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }

    const validation = UpdateOrderStatusSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ 
        error: "Invalid status data", 
        details: validation.error.errors 
      });
      return;
    }

    const { status, notes } = validation.data;

    // Update order status
    const updateResult = await db.query(
      `UPDATE orders 
       SET status = $1, 
           notes = COALESCE($2, notes),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, notes, orderId]
    );

    if (updateResult.length === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    // If cancelled, restore inventory
    if (status === "cancelled") {
      await db.query(
        `UPDATE card_inventory ci
         SET stock_quantity = stock_quantity + oi.quantity,
             updated_at = NOW()
         FROM order_items oi
         WHERE oi.order_id = $1 
           AND oi.inventory_id = ci.id`,
        [orderId]
      );
    }

    res.json({
      success: true,
      order: updateResult[0],
      message: `Order status updated to ${status}`,
    });
  } catch (error) {
    console.error("❌ Update order status error:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

export default router;