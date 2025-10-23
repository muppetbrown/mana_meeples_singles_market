// apps/api/src/routes/orders.ts
import express from "express";
import type { Request, Response } from "express";
import { z } from "zod";

import { db, pool } from "../lib/db.js";
import { adminAuthJWT } from "../middleware/auth.js";

const router = express.Router();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Strips HTML tags from input string for security
 */
function stripTags(input: string): string { 
  return input.replace(/<\/?[^>]+(>|$)/g, ""); 
}

/**
 * Formats Zod validation errors into user-friendly messages
 * Handles nested field errors (e.g., customer.email)
 */
function formatValidationError(error: z.ZodError): string {
  const issues = error.issues;
  
  if (issues.length === 0) {
    return 'Invalid request data';
  }

  // Get the first error
  const firstIssue = issues[0];
  
  // Build the field path (e.g., ["customer", "email"] -> "customer.email")
  const fieldPath = firstIssue.path.join('.');
  const message = firstIssue.message;
  
  // Return formatted error with field path and message
  return fieldPath ? `${fieldPath}: ${message}` : message;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ORDER_STATUSES = [
  'pending', 
  'confirmed', 
  'processing', 
  'shipped', 
  'completed', 
  'cancelled'
] as const;

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateOrderSchema = z.object({
  customer: z.object({
    email: z.string().email("Invalid email address"),
    name: z.string().min(1, "Name is required"),
    address: z.string().optional(),
    phone: z.string().optional(),
  }),
  items: z.array(
    z.object({
      inventory_id: z.number().int().positive("Invalid inventory ID"),
      card_id: z.number().int().positive("Invalid card ID"),
      card_name: z.string().min(1, "Card name is required"),
      quantity: z.number().int().min(1, "Quantity must be at least 1").max(10, "Quantity cannot exceed 10"),
      price: z.number().positive("Price must be positive"),
    })
  ).min(1, "Order must contain at least one item"),
  total: z.number().positive("Total must be positive"),
  currency: z.string().default("NZD"),
  notes: z.string().optional(),
});

const UpdateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${ORDER_STATUSES.join(', ')}` })
  }),
  notes: z.string().optional(),
});

const AdminOrderQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(ORDER_STATUSES).optional(),
  search: z.string().optional(),
});

const OrderIdSchema = z.object({
  orderId: z.string().regex(/^\d+$/, "Order ID must be numeric"),
});

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

/**
 * POST /orders
 * Create a new order (public - for checkout)
 * 
 * Features:
 * - Input sanitization (HTML tag stripping)
 * - Email normalization (lowercase)
 * - Transaction safety (rollback on any error)
 * - Stock validation and decrement
 * - Complete order response with items
 */
router.post("/orders", async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = CreateOrderSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({ error: formatValidationError(validation.error) });
      return;
    }

    let { customer, items, total, currency, notes } = validation.data;
    
    // Sanitize customer input
    customer = {
      ...customer,
      name: stripTags(customer.name),
      address: customer.address ? stripTags(customer.address) : undefined,
      email: customer.email.toLowerCase(),
    };

    const client = await db.getClient();
    
    try {
      await client.query("BEGIN");

      // 1. Create order record
      const orderResult = await client.query(
        `INSERT INTO orders (
          customer_email, 
          customer_name,
          customer_address,
          customer_phone,
          subtotal,
          tax,
          shipping,
          total,
          notes,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) 
        RETURNING id, created_at`,
        [
          customer.email,
          customer.name,
          customer.address || null,
          customer.phone || null,
          total,
          0, // tax
          0, // shipping
          total,
          notes || null,
          "pending",
        ]
      );

      const orderId = orderResult.rows[0].id;
      const createdAt = orderResult.rows[0].created_at;

      // 2. Process each order item
      for (const item of items) {
        // Get current inventory details
        const inventoryInfo = await client.query(
          `SELECT quality, foil_type, language, stock_quantity 
           FROM card_inventory 
           WHERE id = $1`,
          [item.inventory_id]
        );

        if (inventoryInfo.rows.length === 0) {
          throw new Error(`Inventory item not found: ${item.inventory_id}`);
        }

        const { quality, stock_quantity } = inventoryInfo.rows[0];

        // Validate stock availability
        if (stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.card_name}`);
        }

        // Insert order item
        await client.query(
          `INSERT INTO order_items (
            order_id, 
            inventory_id,
            card_id,
            card_name,
            quality,
            quantity,
            unit_price, 
            total_price,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            orderId,
            item.inventory_id,
            item.card_id,
            item.card_name,
            quality,
            item.quantity,
            item.price,
            item.price * item.quantity,
          ]
        );

        // Decrement inventory with atomic check
        const inventoryUpdate = await client.query(
          `UPDATE card_inventory 
           SET stock_quantity = stock_quantity - $1,
               updated_at = NOW()
           WHERE id = $2 AND stock_quantity >= $1
           RETURNING stock_quantity`,
          [item.quantity, item.inventory_id]
        );

        if (inventoryUpdate.rows.length === 0) {
          throw new Error(`Insufficient stock for ${item.card_name}`);
        }
      }

      await client.query("COMMIT");

      // 3. Fetch complete order with items for response
      const itemsResult = await client.query(
        `SELECT 
          id, 
          inventory_id,
          card_id,
          card_name,
          quality,
          quantity, 
          unit_price, 
          total_price 
         FROM order_items 
         WHERE order_id = $1 
         ORDER BY id`,
        [orderId]
      );

      res.status(201).json({
        success: true,
        order: {
          id: orderId,
          status: "pending",
          total: total,
          currency: currency || "NZD",
          created_at: createdAt,
          customer_email: customer.email,
          customer_name: customer.name,
          items: itemsResult.rows,
        },
        message: "Order created successfully",
      });
      
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    console.error("❌ Create order error:", error);
    
    const errorMessage = error?.message || "Failed to create order";
    
    // Return appropriate status codes
    if (errorMessage.includes("Insufficient stock") || 
        errorMessage.includes("Inventory item not found")) {
      res.status(400).json({ error: errorMessage });
      return;
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * GET /orders/:orderId
 * Get order details by ID (public - for order tracking)
 */
router.get("/orders/:orderId", async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = OrderIdSchema.safeParse(req.params);
    
    if (!validation.success) {
      res.status(400).json({ error: "Invalid order ID format" });
      return;
    }

    const orderId = parseInt(validation.data.orderId, 10);

    const orderResult = await db.query(
      `SELECT 
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'inventory_id', oi.inventory_id,
              'card_id', oi.card_id,
              'card_name', oi.card_name,
              'quality', oi.quality,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'total_price', oi.total_price
            ) ORDER BY oi.id
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
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
 * List all orders with filtering and pagination (admin only)
 */
router.get("/admin/orders", adminAuthJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = AdminOrderQuerySchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json({ 
        error: formatValidationError(validation.error)
      });
      return;
    }

    const { limit, offset, status, search } = validation.data;

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

    // Get paginated orders
    params.push(limit, offset);
    const ordersResult = await db.query(
      `SELECT 
        o.*,
        COUNT(oi.id)::int as item_count,
        SUM(oi.quantity)::int as total_items
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
 * Get detailed order information including card details (admin only)
 */
router.get("/admin/orders/:orderId", adminAuthJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = OrderIdSchema.safeParse(req.params);
    
    if (!validation.success) {
      res.status(400).json({ error: "Invalid order ID format" });
      return;
    }

    const orderId = parseInt(validation.data.orderId, 10);

    const orderResult = await db.query(
      `SELECT 
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'card_id', oi.card_id,
              'inventory_id', oi.inventory_id,
              'card_name', oi.card_name,
              'quality', oi.quality,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'total_price', oi.total_price,
              'card_number', c.card_number,
              'set_name', cs.name
            ) ORDER BY oi.id
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
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
 * PATCH /admin/orders/:id/status
 * Update order status with automatic inventory restoration on cancellation (admin only)
 * 
 * Features:
 * - Restores inventory when order is cancelled
 * - Prevents double restoration
 * - Transaction safety
 * - Audit trail via notes
 */
router.patch("/admin/orders/:id/status", adminAuthJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id, 10);
    
    if (isNaN(orderId)) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }

    const validation = UpdateOrderStatusSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({ 
        error: formatValidationError(validation.error)
      });
      return;
    }

    const { status, notes } = validation.data;

    const client = await db.getClient();
    
    try {
      await client.query("BEGIN");

      // Get current order status and items
      const orderCheck = await client.query(
        `SELECT o.status
         FROM orders o
         WHERE o.id = $1`,
        [orderId]
      );

      if (orderCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Order not found" });
        return;
      }

      const currentStatus = orderCheck.rows[0].status;

      // If changing TO cancelled from a non-cancelled status, restore inventory
      if (status === 'cancelled' && currentStatus !== 'cancelled') {
        const orderItems = await client.query(
          `SELECT inventory_id, quantity
           FROM order_items
           WHERE order_id = $1`,
          [orderId]
        );

        // Restore inventory for each item
        for (const item of orderItems.rows) {
          await client.query(
            `UPDATE card_inventory 
             SET stock_quantity = stock_quantity + $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [item.quantity, item.inventory_id]
          );
        }
      }

      // Update order status
      const updateQuery = notes
        ? `UPDATE orders 
           SET status = $1, notes = $2, updated_at = NOW() 
           WHERE id = $3 
           RETURNING *`
        : `UPDATE orders 
           SET status = $1, updated_at = NOW() 
           WHERE id = $2 
           RETURNING *`;
      
      const updateParams = notes ? [status, notes, orderId] : [status, orderId];
      const updateResult = await client.query(updateQuery, updateParams);

      await client.query("COMMIT");

      // Fetch complete order with items for response
      const finalOrder = await db.query(
        `SELECT
          o.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'card_name', oi.card_name,
                'quality', oi.quality,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'total_price', oi.total_price
              ) ORDER BY oi.id
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::json
          ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.id = $1
        GROUP BY o.id`,
        [orderId]
      );

      res.json({ 
        order: finalOrder[0],
        message: `Order status updated to ${status}${status === 'cancelled' && currentStatus !== 'cancelled' ? ' (inventory restored)' : ''}` 
      });
      
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    console.error("❌ Update order status error:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

export default router;