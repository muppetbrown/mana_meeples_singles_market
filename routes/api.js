// ============================================
// API ENDPOINTS (Express.js Example)
// ============================================

const express = require('express');
const router = express.Router();

// GET /api/games - Get all active games
router.get('/games', async (req, res) => {
  try {
    const games = await db.query(
      'SELECT id, name, code FROM games WHERE active = true ORDER BY name'
    );
    res.json(games.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// GET /api/sets?game_id=1 - Get sets for a game
router.get('/sets', async (req, res) => {
  try {
    const { game_id } = req.query;
    const query = game_id 
      ? 'SELECT id, name, code FROM card_sets WHERE game_id = $1 AND active = true ORDER BY release_date DESC'
      : 'SELECT id, name, code, game_id FROM card_sets WHERE active = true ORDER BY release_date DESC';
    
    const sets = game_id 
      ? await db.query(query, [game_id])
      : await db.query(query);
    
    res.json(sets.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sets' });
  }
});

// GET /api/cards - Get cards with filtering and pagination
router.get('/cards', async (req, res) => {
  try {
    const {
      game_id,
      set_id,
      search,
      quality,
      min_price,
      max_price,
      sort_by = 'name',
      sort_order = 'asc',
      page = 1,
      limit = 20
    } = req.query;

    let query = `
      SELECT 
        c.id,
        c.name,
        c.card_number,
        c.rarity,
        c.card_type,
        c.description,
        c.image_url,
        g.name as game_name,
        cs.name as set_name,
        cv.variation_name,
        ci.quality,
        ci.stock_quantity,
        ci.price,
        ci.id as inventory_id
      FROM cards c
      JOIN games g ON c.game_id = g.id
      JOIN card_sets cs ON c.set_id = cs.id
      LEFT JOIN card_variations cv ON cv.card_id = c.id
      JOIN card_inventory ci ON ci.card_id = c.id
      WHERE ci.stock_quantity > 0
    `;

    const params = [];
    let paramCount = 1;

    if (game_id) {
      query += ` AND c.game_id = $${paramCount}`;
      params.push(game_id);
      paramCount++;
    }

    if (set_id) {
      query += ` AND c.set_id = $${paramCount}`;
      params.push(set_id);
      paramCount++;
    }

    if (search) {
      query += ` AND (c.name ILIKE $${paramCount} OR c.card_number ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (quality) {
      query += ` AND ci.quality = $${paramCount}`;
      params.push(quality);
      paramCount++;
    }

    if (min_price) {
      query += ` AND ci.price >= $${paramCount}`;
      params.push(min_price);
      paramCount++;
    }

    if (max_price) {
      query += ` AND ci.price <= $${paramCount}`;
      params.push(max_price);
      paramCount++;
    }

    // Sorting
    const validSortFields = {
      name: 'c.name',
      price: 'ci.price',
      stock: 'ci.stock_quantity'
    };
    const sortField = validSortFields[sort_by] || 'c.name';
    const order = sort_order === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortField} ${order}`;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM cards c JOIN card_inventory ci ON ci.card_id = c.id WHERE ci.stock_quantity > 0';
    const countResult = await db.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      cards: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// GET /api/admin/inventory - Get ALL inventory including zero stock
router.get('/admin/inventory', async (req, res) => {
  try {
    const {
      search,
      game_id,
      set_id,
      quality,
      sort_by = 'name',
      sort_order = 'asc',
      page = 1,
      limit = 1000
    } = req.query;

    let query = `
      SELECT 
        c.id,
        c.name,
        c.card_number,
        c.rarity,
        c.card_type,
        c.description,
        c.image_url,
        g.name as game_name,
        cs.name as set_name,
        ci.quality,
        ci.stock_quantity,
        ci.price,
        ci.price_source,
        ci.id as inventory_id
      FROM cards c
      JOIN games g ON c.game_id = g.id
      JOIN card_sets cs ON c.set_id = cs.id
      JOIN card_inventory ci ON ci.card_id = c.id
    `;

    const params = [];
    let paramCount = 1;
    const conditions = [];

    if (search) {
      conditions.push(`(c.name ILIKE $${paramCount} OR c.card_number ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (game_id) {
      conditions.push(`c.game_id = $${paramCount}`);
      params.push(game_id);
      paramCount++;
    }

    if (set_id) {
      conditions.push(`c.set_id = $${paramCount}`);
      params.push(set_id);
      paramCount++;
    }

    if (quality) {
      conditions.push(`ci.quality = $${paramCount}`);
      params.push(quality);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Sorting
    const validSortFields = {
      name: 'c.name',
      price: 'ci.price',
      stock: 'ci.stock_quantity'
    };
    const sortField = validSortFields[sort_by] || 'c.name';
    const order = sort_order === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortField} ${order}`;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      inventory: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching admin inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// GET /api/cards/:id - Get single card with all details
router.get('/cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const cardQuery = `
      SELECT 
        c.*,
        g.name as game_name,
        cs.name as set_name,
        json_agg(
          json_build_object(
            'inventory_id', ci.id,
            'quality', ci.quality,
            'price', ci.price,
            'stock', ci.stock_quantity,
            'variation', cv.variation_name
          )
        ) as inventory
      FROM cards c
      JOIN games g ON c.game_id = g.id
      JOIN card_sets cs ON c.set_id = cs.id
      LEFT JOIN card_variations cv ON cv.card_id = c.id
      JOIN card_inventory ci ON ci.card_id = c.id
      WHERE c.id = $1
      GROUP BY c.id, g.name, cs.name
    `;

    const result = await db.query(cardQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({ error: 'Failed to fetch card details' });
  }
});

// POST /api/orders - Create a new order
router.post('/orders', async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    const { customer_email, customer_name, items, shipping_info } = req.body;

    // Validate stock availability
    for (const item of items) {
      const stockCheck = await client.query(
        'SELECT stock_quantity FROM card_inventory WHERE id = $1 FOR UPDATE',
        [item.inventory_id]
      );

      if (stockCheck.rows[0].stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for item ${item.inventory_id}`);
      }
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1; // Example: 10% tax
    const shipping = 5.99; // Flat shipping
    const total = subtotal + tax + shipping;

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (customer_email, customer_name, subtotal, tax, shipping, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id`,
      [customer_email, customer_name, subtotal, tax, shipping, total]
    );

    const orderId = orderResult.rows[0].id;

    // Create order items and update inventory
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, inventory_id, card_name, quality, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, item.inventory_id, item.card_name, item.quality, item.quantity, item.price, item.price * item.quantity]
      );

      await client.query(
        'UPDATE card_inventory SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.quantity, item.inventory_id]
      );
    }

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      order_id: orderId,
      total: total
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message || 'Failed to create order' });
  } finally {
    client.release();
  }
});

// Export the router - THIS IS REQUIRED!
module.exports = router;