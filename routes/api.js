// ============================================
// API ENDPOINTS (Express.js Example)
// ============================================

const express = require('express');
const router = express.Router();
const { normalizeSearchTerms, buildSearchConditions, CARD_SEARCH_FIELDS, CARD_SEARCH_FIELDS_BASIC } = require('../services/searchUtils');

// Database connection (expects global.db to be set by server.js)
const db = global.db;

// Basic authentication middleware for admin routes
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const [type, credentials] = authHeader.split(' ');

  if (type !== 'Basic') {
    return res.status(401).json({ error: 'Basic authentication required' });
  }

  try {
    const decoded = Buffer.from(credentials, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');

    // Basic hardcoded admin credentials (in production, use proper user management)
    const validUsername = process.env.ADMIN_USERNAME || 'admin';
    const validPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (username === validUsername && password === validPassword) {
      req.user = { username, role: 'admin' };
      next();
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Invalid authentication format' });
  }
};

// Rate limiting middleware (simple in-memory implementation)
const rateLimitStore = new Map();
const rateLimit = (windowMs = 60000, maxRequests = 100) => (req, res, next) => {
  const clientId = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Clean old entries
  for (const [key, timestamps] of rateLimitStore.entries()) {
    rateLimitStore.set(key, timestamps.filter(time => time > windowStart));
    if (rateLimitStore.get(key).length === 0) {
      rateLimitStore.delete(key);
    }
  }

  const clientRequests = rateLimitStore.get(clientId) || [];

  if (clientRequests.length >= maxRequests) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  clientRequests.push(now);
  rateLimitStore.set(clientId, clientRequests);
  next();
};

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

// GET /api/cards - Get cards with advanced filtering and pagination
router.get('/cards', rateLimit(60000, 200), async (req, res) => {
  try {
    const {
      game_id,
      set_id,
      search,
      quality,
      min_price,
      max_price,
      rarity,
      card_type,
      collector_number,
      foil_type,
      language = 'English',
      sort_by = 'name',
      sort_order = 'asc',
      page = 1,
      limit = 20,
      include_zero_stock = false
    } = req.query;

    // Input validation and sanitization
    const sanitizedPage = Math.max(1, parseInt(page) || 1);
    const sanitizedLimit = Math.min(200, Math.max(1, parseInt(limit) || 20)); // Cap at 200
    const sanitizedMinPrice = min_price ? Math.max(0, parseFloat(min_price) || 0) : null;
    const sanitizedMaxPrice = max_price ? Math.max(0, parseFloat(max_price) || 0) : null;
    const sanitizedGameId = game_id ? parseInt(game_id) || null : null;
    const sanitizedSetId = set_id ? parseInt(set_id) || null : null;

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
        cs.code as set_code,
        cv.variation_name,
        ci.quality,
        ci.stock_quantity,
        ci.price,
        ci.id as inventory_id,
        ci.language,
        ci.foil_type,
        ci.updated_at
      FROM cards c
      JOIN games g ON c.game_id = g.id
      JOIN card_sets cs ON c.set_id = cs.id
      JOIN card_inventory ci ON ci.card_id = c.id
      LEFT JOIN card_variations cv ON cv.id = ci.variation_id
    `;

    const params = [];
    let paramCount = 1;
    const conditions = [];

    // Stock filter
    if (!include_zero_stock || include_zero_stock === 'false') {
      conditions.push('ci.stock_quantity > 0');
    }

    if (sanitizedGameId) {
      conditions.push(`c.game_id = $${paramCount}`);
      params.push(sanitizedGameId);
      paramCount++;
    }

    if (sanitizedSetId) {
      conditions.push(`c.set_id = $${paramCount}`);
      params.push(sanitizedSetId);
      paramCount++;
    }

    if (search) {
      // Use full-text search with ranking for better results
      conditions.push(`(
        to_tsvector('english', c.name || ' ' || COALESCE(c.card_type, '') || ' ' || COALESCE(c.description, '')) @@ plainto_tsquery('english', $${paramCount})
        OR similarity(c.name, $${paramCount + 1}) > 0.3
        OR similarity(c.card_number, $${paramCount + 2}) > 0.4
      )`);
      params.push(search, search, search);
      paramCount += 3;
    }

    if (collector_number) {
      conditions.push(`c.card_number ILIKE $${paramCount}`);
      params.push(`%${collector_number}%`);
      paramCount++;
    }

    if (quality) {
      conditions.push(`ci.quality = $${paramCount}`);
      params.push(quality);
      paramCount++;
    }

    if (rarity) {
      conditions.push(`c.rarity = $${paramCount}`);
      params.push(rarity);
      paramCount++;
    }

    if (card_type) {
      conditions.push(`c.card_type ILIKE $${paramCount}`);
      params.push(`%${card_type}%`);
      paramCount++;
    }

    if (foil_type) {
      conditions.push(`ci.foil_type = $${paramCount}`);
      params.push(foil_type);
      paramCount++;
    }

    if (language) {
      conditions.push(`ci.language = $${paramCount}`);
      params.push(language);
      paramCount++;
    }

    if (sanitizedMinPrice !== null) {
      conditions.push(`ci.price >= $${paramCount}`);
      params.push(sanitizedMinPrice);
      paramCount++;
    }

    if (sanitizedMaxPrice !== null) {
      conditions.push(`ci.price <= $${paramCount}`);
      params.push(sanitizedMaxPrice);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Enhanced sorting options
    const validSortFields = {
      name: 'c.name',
      price: 'ci.price',
      stock: 'ci.stock_quantity',
      rarity: 'c.rarity',
      set: 'cs.name',
      number: 'c.card_number',
      updated: 'ci.updated_at'
    };
    const sortField = validSortFields[sort_by] || 'c.name';
    const order = sort_order === 'desc' ? 'DESC' : 'ASC';

    if (search) {
      // When searching, prioritize by relevance first, then by selected sort field
      // Use parameterized queries to prevent SQL injection
      const searchParam1 = paramCount++;
      const searchParam2 = paramCount++;
      const searchParam3 = paramCount++;
      params.push(search, search, search);

      query += ` ORDER BY GREATEST(
        ts_rank(to_tsvector('english', c.name || ' ' || COALESCE(c.card_type, '') || ' ' || COALESCE(c.description, '')), plainto_tsquery('english', $${searchParam1})),
        similarity(c.name, $${searchParam2}) * 0.8,
        similarity(c.card_number, $${searchParam3}) * 0.6
      ) DESC, ${sortField} ${order}`;
    } else if (sort_by === 'number') {
      // Safe numeric sorting for card numbers that may contain non-numeric characters
      query += ` ORDER BY NULLIF(regexp_replace(c.card_number, '\\D','','g'),'')::int ${order} NULLS LAST, c.card_number ${order}`;
    } else {
      query += ` ORDER BY ${sortField} ${order}`;
    }

    // Pagination
    const offset = (sanitizedPage - 1) * sanitizedLimit;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(sanitizedLimit, offset);

    const result = await db.query(query, params);

    // Get total count for pagination with same conditions
    let countQuery = `
      SELECT COUNT(*)
      FROM cards c
      JOIN card_inventory ci ON ci.card_id = c.id
      JOIN card_sets cs ON c.set_id = cs.id
    `;

    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }

    const countResult = await db.query(countQuery, params.slice(0, -2)); // Remove limit and offset params
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      cards: result.rows,
      pagination: {
        page: sanitizedPage,
        limit: sanitizedLimit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / sanitizedLimit)
      }
    });
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// GET /api/admin/inventory - Get ALL inventory including zero stock
router.get('/admin/inventory', adminAuth, async (req, res) => {
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

    // Sanitize input parameters to prevent injection
    const sanitizedGameId = game_id ? parseInt(game_id) || null : null;
    const sanitizedSetId = set_id ? parseInt(set_id) || null : null;

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
        ci.id as inventory_id,
        ci.updated_at,
        ci.last_price_update
      FROM cards c
      JOIN games g ON c.game_id = g.id
      JOIN card_sets cs ON c.set_id = cs.id
      JOIN card_inventory ci ON ci.card_id = c.id
    `;

    const params = [];
    let paramCount = 1;
    const conditions = [];

    if (search) {
      const searchTerms = normalizeSearchTerms(search);
      const searchResult = buildSearchConditions(searchTerms, CARD_SEARCH_FIELDS_BASIC, paramCount);

      if (searchResult.condition) {
        conditions.push(searchResult.condition);
        params.push(...searchResult.params);
        paramCount = searchResult.paramCount;
      }
    }

    if (sanitizedGameId) {
      conditions.push(`c.game_id = $${paramCount}`);
      params.push(sanitizedGameId);
      paramCount++;
    }

    if (sanitizedSetId) {
      conditions.push(`c.set_id = $${paramCount}`);
      params.push(sanitizedSetId);
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
      JOIN card_inventory ci ON ci.card_id = c.id
      LEFT JOIN card_variations cv ON cv.id = ci.variation_id
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

// POST /api/orders - Create a new order with overselling prevention
router.post('/orders', async (req, res) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const { customer_email, customer_name, items, shipping_info } = req.body;

    // Enhanced stock validation with overselling prevention
    const stockIssues = [];
    const stockUpdates = [];

    for (const item of items) {
      const stockCheck = await client.query(
        `SELECT ci.stock_quantity, ci.price, c.name as card_name, ci.quality
         FROM card_inventory ci
         JOIN cards c ON c.id = ci.card_id
         WHERE ci.id = $1 FOR UPDATE`,
        [item.inventory_id]
      );

      if (stockCheck.rows.length === 0) {
        stockIssues.push(`Item not found: ${item.inventory_id}`);
        continue;
      }

      const currentStock = stockCheck.rows[0].stock_quantity;
      const currentPrice = parseFloat(stockCheck.rows[0].price);
      const cardName = stockCheck.rows[0].card_name;
      const quality = stockCheck.rows[0].quality;

      if (currentStock < item.quantity) {
        stockIssues.push(`Insufficient stock for ${cardName} (${quality}): requested ${item.quantity}, available ${currentStock}`);
      } else {
        stockUpdates.push({
          inventory_id: item.inventory_id,
          quantity: item.quantity,
          card_name: cardName,
          quality: quality,
          current_price: currentPrice, // Use server-side price instead of client price
          remaining_stock: currentStock - item.quantity
        });
      }
    }

    // If any stock issues, return detailed error
    if (stockIssues.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Stock validation failed',
        details: stockIssues
      });
    }

    // Calculate totals using server-side prices
    const subtotal = stockUpdates.reduce((sum, item) => sum + (item.current_price * item.quantity), 0);
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

    // Create order items and update inventory using server-side pricing
    for (const item of stockUpdates) {
      await client.query(
        `INSERT INTO order_items (order_id, inventory_id, card_name, quality, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, item.inventory_id, item.card_name, item.quality, item.quantity, item.current_price, item.current_price * item.quantity]
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

// PUT /api/admin/inventory/:id - Update inventory price and/or stock
router.put('/admin/inventory/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { price, stock_quantity } = req.body;

    let query = 'UPDATE card_inventory SET';
    let updates = [];
    let params = [];
    let paramCount = 1;

    if (price !== undefined) {
      updates.push(`price = $${paramCount}, price_source = 'manual', last_price_update = CURRENT_TIMESTAMP`);
      params.push(parseFloat(price));
      paramCount++;
    }

    if (stock_quantity !== undefined) {
      updates.push(`stock_quantity = $${paramCount}`);
      params.push(parseInt(stock_quantity));
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    query += ` ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    params.push(id);

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json({
      success: true,
      inventory: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ error: 'Failed to update inventory' });
  }
});

// GET /api/search/autocomplete - Autocomplete suggestions with enhanced fuzzy matching
router.get('/search/autocomplete', rateLimit(60000, 50), async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    // Use the new search suggestions function for better results
    try {
      const suggestions = await db.query('SELECT * FROM get_search_suggestions($1, $2)', [q, 10]);

      // Format for frontend compatibility and filter for cards with stock
      const formattedSuggestions = await Promise.all(
        suggestions.rows.map(async (row) => {
          if (row.match_type === 'card') {
            // Check if card has stock
            const stockCheck = await db.query(
              'SELECT ci.stock_quantity > 0 as has_stock FROM card_inventory ci JOIN cards c ON ci.card_id = c.id WHERE c.name = $1 LIMIT 1',
              [row.name]
            );
            if (stockCheck.rows.length > 0 && stockCheck.rows[0].has_stock) {
              return {
                name: row.name,
                set_name: row.set_name,
                image_url: row.image_url,
                match_type: row.match_type
              };
            }
          }
          return row.match_type === 'set' ? {
            name: row.name,
            set_name: '',
            image_url: '',
            match_type: row.match_type
          } : null;
        })
      );

      res.json({ suggestions: formattedSuggestions.filter(Boolean) });
    } catch (functionError) {
      // Fallback to enhanced basic search if full-text functions aren't available
      const fallbackSuggestions = await db.query(`
        SELECT DISTINCT c.name, c.image_url, cs.name as set_name, 'card' as match_type
        FROM cards c
        JOIN card_sets cs ON c.set_id = cs.id
        JOIN card_inventory ci ON ci.card_id = c.id
        WHERE (c.name ILIKE $1 OR c.card_number ILIKE $1 OR similarity(c.name, $2) > 0.3)
          AND ci.stock_quantity > 0
        ORDER BY c.name
        LIMIT 10
      `, [`%${q}%`, q]);

      res.json({ suggestions: fallbackSuggestions.rows });
    }
  } catch (error) {
    console.error('Error fetching autocomplete:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// GET /api/filters - Get available filter options
router.get('/filters', async (req, res) => {
  try {
    const { game_id } = req.query;

    const baseQuery = game_id ?
      'FROM cards c JOIN card_inventory ci ON ci.card_id = c.id WHERE c.game_id = $1' :
      'FROM cards c JOIN card_inventory ci ON ci.card_id = c.id';

    const params = game_id ? [game_id] : [];

    const [rarities, qualities, foilTypes, cardTypes, languages] = await Promise.all([
      db.query(`SELECT DISTINCT c.rarity ${baseQuery} ORDER BY c.rarity`, params),
      db.query(`SELECT DISTINCT ci.quality ${baseQuery} ORDER BY ci.quality`, params),
      db.query(`SELECT DISTINCT ci.foil_type ${baseQuery} ORDER BY ci.foil_type`, params),
      db.query(`SELECT DISTINCT c.card_type ${baseQuery} ORDER BY c.card_type`, params),
      db.query(`SELECT DISTINCT ci.language ${baseQuery} ORDER BY ci.language`, params)
    ]);

    res.json({
      rarities: rarities.rows.map(r => r.rarity).filter(Boolean),
      qualities: qualities.rows.map(q => q.quality).filter(Boolean),
      foilTypes: foilTypes.rows.map(f => f.foil_type).filter(Boolean),
      cardTypes: cardTypes.rows.map(t => t.card_type).filter(Boolean),
      languages: languages.rows.map(l => l.language).filter(Boolean)
    });
  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

// GET /api/filters/counts - Get filter counts for dynamic UI
router.get('/filters/counts', async (req, res) => {
  try {
    const { game_id, quality, rarity, foil_type, language = 'English' } = req.query;

    let baseQuery = `
      FROM cards c
      JOIN card_inventory ci ON ci.card_id = c.id
      WHERE ci.stock_quantity > 0
    `;

    const params = [];
    let paramCount = 1;

    // Apply existing filters to get context-aware counts
    if (game_id) {
      baseQuery += ` AND c.game_id = $${paramCount}`;
      params.push(game_id);
      paramCount++;
    }

    if (quality) {
      baseQuery += ` AND ci.quality = $${paramCount}`;
      params.push(quality);
      paramCount++;
    }

    if (rarity) {
      baseQuery += ` AND c.rarity = $${paramCount}`;
      params.push(rarity);
      paramCount++;
    }

    if (foil_type) {
      baseQuery += ` AND ci.foil_type = $${paramCount}`;
      params.push(foil_type);
      paramCount++;
    }

    if (language) {
      baseQuery += ` AND ci.language = $${paramCount}`;
      params.push(language);
      paramCount++;
    }

    // Get counts for each filter category
    const [rarityCounts, qualityCounts, foilCounts] = await Promise.all([
      db.query(`
        SELECT c.rarity, COUNT(DISTINCT c.id) as count
        ${baseQuery.replace('AND c.rarity = $' + (rarity ? params.findIndex(p => p === rarity) + 1 : 0), '')}
        GROUP BY c.rarity
        ORDER BY c.rarity
      `, params.filter(p => p !== rarity)),

      db.query(`
        SELECT ci.quality, COUNT(DISTINCT c.id) as count
        ${baseQuery.replace('AND ci.quality = $' + (quality ? params.findIndex(p => p === quality) + 1 : 0), '')}
        GROUP BY ci.quality
        ORDER BY ci.quality
      `, params.filter(p => p !== quality)),

      db.query(`
        SELECT ci.foil_type, COUNT(DISTINCT c.id) as count
        ${baseQuery.replace('AND ci.foil_type = $' + (foil_type ? params.findIndex(p => p === foil_type) + 1 : 0), '')}
        GROUP BY ci.foil_type
        ORDER BY ci.foil_type
      `, params.filter(p => p !== foil_type))
    ]);

    const formatCounts = (rows) => rows.reduce((acc, row) => {
      if (row.rarity || row.quality || row.foil_type) {
        const key = row.rarity || row.quality || row.foil_type;
        acc[key] = parseInt(row.count);
      }
      return acc;
    }, {});

    res.json({
      rarities: formatCounts(rarityCounts.rows),
      qualities: formatCounts(qualityCounts.rows),
      foilTypes: formatCounts(foilCounts.rows)
    });
  } catch (error) {
    console.error('Error fetching filter counts:', error);
    res.status(500).json({ error: 'Failed to fetch filter counts' });
  }
});

// GET /api/cards/:id/stock - Get current stock for a card
router.get('/cards/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        ci.id as inventory_id,
        ci.quality,
        ci.stock_quantity as stock,
        ci.foil_type,
        ci.language
      FROM card_inventory ci
      WHERE ci.card_id = $1
      ORDER BY ci.quality, ci.foil_type
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const totalStock = result.rows.reduce((sum, item) => sum + item.stock, 0);

    res.json({
      card_id: id,
      total_stock: totalStock,
      variations: result.rows,
      in_stock: totalStock > 0
    });
  } catch (error) {
    console.error('Error fetching card stock:', error);
    res.status(500).json({ error: 'Failed to fetch stock information' });
  }
});

// GET /api/cards/:id/current-price - Get current price for a card inventory item
router.get('/cards/:id/current-price', async (req, res) => {
  try {
    const { id } = req.params;
    const { quality, foil_type = 'Regular', language = 'English' } = req.query;

    let query = `
      SELECT
        ci.price,
        ci.price_source,
        ci.last_price_update,
        ci.stock_quantity,
        ci.quality,
        ci.foil_type,
        ci.language,
        c.name as card_name
      FROM card_inventory ci
      JOIN cards c ON c.id = ci.card_id
      WHERE ci.card_id = $1
    `;

    const params = [id];
    let paramCount = 2;

    if (quality) {
      query += ` AND ci.quality = $${paramCount}`;
      params.push(quality);
      paramCount++;
    }

    if (foil_type) {
      query += ` AND ci.foil_type = $${paramCount}`;
      params.push(foil_type);
      paramCount++;
    }

    if (language) {
      query += ` AND ci.language = $${paramCount}`;
      params.push(language);
      paramCount++;
    }

    query += ' ORDER BY ci.quality, ci.foil_type LIMIT 1';

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card variation not found' });
    }

    const item = result.rows[0];

    res.json({
      card_id: id,
      price: parseFloat(item.price),
      price_source: item.price_source,
      last_updated: item.last_price_update,
      stock_quantity: item.stock_quantity,
      quality: item.quality,
      foil_type: item.foil_type,
      language: item.language,
      card_name: item.card_name,
      is_stale: item.last_price_update && (Date.now() - new Date(item.last_price_update).getTime()) > 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  } catch (error) {
    console.error('Error fetching current price:', error);
    res.status(500).json({ error: 'Failed to fetch current price' });
  }
});

// GET /api/analytics/trending - Get trending cards (most viewed/bought)
router.get('/analytics/trending', async (req, res) => {
  try {
    const { days = 7, limit = 10 } = req.query;

    // For now, we'll simulate trending by recent sales and stock turnover
    const trending = await db.query(`
      SELECT
        c.id,
        c.name,
        c.image_url,
        cs.name as set_name,
        AVG(ci.price) as avg_price,
        SUM(CASE WHEN oi.created_at > NOW() - INTERVAL '${days} days' THEN oi.quantity ELSE 0 END) as recent_sales
      FROM cards c
      JOIN card_sets cs ON c.set_id = cs.id
      JOIN card_inventory ci ON ci.card_id = c.id
      LEFT JOIN order_items oi ON oi.inventory_id = ci.id
      WHERE ci.stock_quantity > 0
      GROUP BY c.id, c.name, c.image_url, cs.name
      HAVING SUM(CASE WHEN oi.created_at > NOW() - INTERVAL '${days} days' THEN oi.quantity ELSE 0 END) > 0
      ORDER BY recent_sales DESC, avg_price DESC
      LIMIT $1
    `, [limit]);

    res.json({ trending: trending.rows });
  } catch (error) {
    console.error('Error fetching trending cards:', error);
    res.status(500).json({ error: 'Failed to fetch trending cards' });
  }
});

// POST /api/admin/bulk-update - Bulk update prices and stock
router.post('/admin/bulk-update', adminAuth, async (req, res) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const { updates } = req.body; // Array of {inventory_id, price?, stock_quantity?, markup_percentage?}
    const results = [];

    for (const update of updates) {
      const { inventory_id, price, stock_quantity, markup_percentage } = update;

      let query = 'UPDATE card_inventory SET';
      let setParts = [];
      let params = [];
      let paramCount = 1;

      if (price !== undefined) {
        setParts.push(`price = $${paramCount}, price_source = 'manual', last_price_update = CURRENT_TIMESTAMP`);
        params.push(parseFloat(price));
        paramCount++;
      }

      if (stock_quantity !== undefined) {
        setParts.push(`stock_quantity = $${paramCount}`);
        params.push(parseInt(stock_quantity));
        paramCount++;
      }

      if (markup_percentage !== undefined) {
        setParts.push(`markup_percentage = $${paramCount}`);
        params.push(parseFloat(markup_percentage));
        paramCount++;
      }

      if (setParts.length === 0) continue;

      setParts.push('updated_at = CURRENT_TIMESTAMP');
      query += ` ${setParts.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      params.push(inventory_id);

      const result = await client.query(query, params);
      if (result.rows.length > 0) {
        results.push(result.rows[0]);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      updated: results.length,
      items: results
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in bulk update:', error);
    res.status(500).json({ error: 'Failed to perform bulk update' });
  } finally {
    client.release();
  }
});

// POST /api/admin/csv-import - Bulk import/update from CSV with overselling prevention
router.post('/admin/csv-import', adminAuth, async (req, res) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const { csvData } = req.body; // Array of {sku, stock_quantity, price}
    const results = {
      success: 0,
      errors: [],
      warnings: []
    };

    for (const row of csvData) {
      const { sku, stock_quantity, price } = row;

      try {
        // Find inventory item by SKU
        const inventoryCheck = await client.query(
          `SELECT ci.id, ci.stock_quantity, c.name as card_name, ci.quality
           FROM card_inventory ci
           JOIN cards c ON c.id = ci.card_id
           WHERE ci.sku = $1`,
          [sku]
        );

        if (inventoryCheck.rows.length === 0) {
          results.errors.push(`SKU not found: ${sku}`);
          continue;
        }

        const item = inventoryCheck.rows[0];

        // Prevent negative stock updates
        if (stock_quantity !== undefined && stock_quantity < 0) {
          results.errors.push(`Invalid stock quantity for ${sku}: ${stock_quantity} (must be >= 0)`);
          continue;
        }

        // Update inventory
        let query = 'UPDATE card_inventory SET';
        let updates = [];
        let params = [];
        let paramCount = 1;

        if (stock_quantity !== undefined) {
          updates.push(`stock_quantity = $${paramCount}`);
          params.push(parseInt(stock_quantity));
          paramCount++;

          // Log significant stock changes
          const stockDiff = parseInt(stock_quantity) - item.stock_quantity;
          if (Math.abs(stockDiff) > 10) {
            results.warnings.push(`Large stock change for ${item.card_name}: ${stockDiff > 0 ? '+' : ''}${stockDiff}`);
          }
        }

        if (price !== undefined) {
          updates.push(`price = $${paramCount}, price_source = 'csv_import', last_price_update = CURRENT_TIMESTAMP`);
          params.push(parseFloat(price));
          paramCount++;
        }

        if (updates.length === 0) continue;

        updates.push('updated_at = CURRENT_TIMESTAMP');
        query += ` ${updates.join(', ')} WHERE id = $${paramCount}`;
        params.push(item.id);

        await client.query(query, params);
        results.success++;

      } catch (error) {
        results.errors.push(`Error processing SKU ${sku}: ${error.message}`);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      summary: results
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in CSV import:', error);
    res.status(500).json({ error: 'Failed to import CSV data' });
  } finally {
    client.release();
  }
});

// GET /api/currency/detect - Detect user's currency based on location
router.get('/currency/detect', async (req, res) => {
  try {
    // Simple IP-based detection (in production, use a proper geolocation service)
    const clientIP = req.ip || req.connection.remoteAddress;

    // For now, default to USD, but can be enhanced with IP geolocation
    let currency = 'USD';
    let symbol = '$';

    // Check if request is from New Zealand (simplified example)
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';

    if (acceptLanguage.includes('en-NZ') || userAgent.includes('NZ')) {
      currency = 'NZD';
      symbol = 'NZ$';
    }

    res.json({
      currency,
      symbol,
      rate: currency === 'NZD' ? 1.6 : 1.0 // Simplified conversion rate
    });
  } catch (error) {
    console.error('Error detecting currency:', error);
    res.json({ currency: 'USD', symbol: '$', rate: 1.0 });
  }
});

// GET /api/cards/sectioned - Get cards with section breaks for sorting
router.get('/cards/sectioned', async (req, res) => {
  try {
    const {
      game_id,
      search,
      quality,
      sort_by = 'name',
      sort_order = 'asc',
      limit = 100
    } = req.query;

    let query = `
      SELECT
        c.id, c.name, c.card_number, c.rarity, c.card_type, c.image_url,
        g.name as game_name, cs.name as set_name, cs.code as set_code,
        ci.quality, ci.stock_quantity, ci.price, ci.id as inventory_id
      FROM cards c
      JOIN games g ON c.game_id = g.id
      JOIN card_sets cs ON c.set_id = cs.id
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

    if (search) {
      const searchTerms = normalizeSearchTerms(search);
      const searchFields = ['c.name', 'c.card_number'];
      const searchResult = buildSearchConditions(searchTerms, searchFields, paramCount);

      if (searchResult.condition) {
        query += ` AND ${searchResult.condition}`;
        params.push(...searchResult.params);
        paramCount = searchResult.paramCount;
      }
    }

    if (quality) {
      query += ` AND ci.quality = $${paramCount}`;
      params.push(quality);
      paramCount++;
    }

    // Sorting with different section break logic
    const validSortFields = {
      name: 'c.name',
      price: 'ci.price',
      rarity: 'c.rarity',
      set: 'cs.name'
    };
    const sortField = validSortFields[sort_by] || 'c.name';
    const order = sort_order === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortField} ${order} LIMIT $${paramCount}`;
    params.push(limit);

    const result = await db.query(query, params);
    const cards = result.rows;

    // Group cards into sections based on sort field
    const sections = [];
    let currentSection = null;
    let currentSectionKey = null;

    for (const card of cards) {
      let sectionKey;
      let sectionTitle;

      switch (sort_by) {
        case 'name':
          sectionKey = card.name.charAt(0).toUpperCase();
          sectionTitle = sectionKey;
          break;
        case 'price':
          const price = parseFloat(card.price);
          if (price < 1) {
            sectionKey = 'under-1';
            sectionTitle = 'Under $1';
          } else if (price < 5) {
            sectionKey = '1-5';
            sectionTitle = '$1 - $5';
          } else if (price < 10) {
            sectionKey = '5-10';
            sectionTitle = '$5 - $10';
          } else if (price < 25) {
            sectionKey = '10-25';
            sectionTitle = '$10 - $25';
          } else {
            sectionKey = 'over-25';
            sectionTitle = '$25+';
          }
          break;
        case 'rarity':
          sectionKey = card.rarity || 'Unknown';
          sectionTitle = sectionKey;
          break;
        case 'set':
          sectionKey = card.set_name;
          sectionTitle = card.set_name;
          break;
        default:
          sectionKey = 'all';
          sectionTitle = 'All Cards';
      }

      if (sectionKey !== currentSectionKey) {
        currentSection = {
          key: sectionKey,
          title: sectionTitle,
          cards: []
        };
        sections.push(currentSection);
        currentSectionKey = sectionKey;
      }

      currentSection.cards.push(card);
    }

    res.json({ sections, total: cards.length });
  } catch (error) {
    console.error('Error fetching sectioned cards:', error);
    res.status(500).json({ error: 'Failed to fetch sectioned cards' });
  }
});

// POST /api/admin/create-foil - Create foil version of existing card
router.post('/admin/create-foil', adminAuth, async (req, res) => {
  try {
    const { card_id, quality, foil_type, price, stock_quantity = 0, language = 'English' } = req.body;

    // Validation
    if (!card_id || !quality || !foil_type || !price) {
      return res.status(400).json({
        error: 'Missing required fields: card_id, quality, foil_type, price'
      });
    }

    // Check if this foil variation already exists
    const existingFoil = await db.query(
      `SELECT id FROM card_inventory
       WHERE card_id = $1 AND quality = $2 AND foil_type = $3 AND language = $4`,
      [card_id, quality, foil_type, language]
    );

    if (existingFoil.rows.length > 0) {
      return res.status(400).json({
        error: 'This foil variation already exists for this card'
      });
    }

    // Create the foil inventory item
    const result = await db.query(
      `INSERT INTO card_inventory (card_id, quality, foil_type, language, stock_quantity, price, price_source, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'manual', NOW(), NOW())
       RETURNING *`,
      [card_id, quality, foil_type, language, stock_quantity, parseFloat(price)]
    );

    // Get card details for response
    const cardDetails = await db.query(
      `SELECT c.name, c.card_number, g.name as game_name, cs.name as set_name
       FROM cards c
       JOIN games g ON c.game_id = g.id
       JOIN card_sets cs ON c.set_id = cs.id
       WHERE c.id = $1`,
      [card_id]
    );

    res.json({
      success: true,
      foil_item: result.rows[0],
      card: cardDetails.rows[0]
    });

  } catch (error) {
    console.error('Error creating foil version:', error);
    res.status(500).json({ error: 'Failed to create foil version' });
  }
});

// POST /api/admin/bulk-create-foils - Bulk create foil versions for multiple cards
router.post('/admin/bulk-create-foils', adminAuth, async (req, res) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const { card_ids, foil_type = 'Foil', price_multiplier = 2.5 } = req.body;

    if (!card_ids || !Array.isArray(card_ids) || card_ids.length === 0) {
      return res.status(400).json({ error: 'card_ids must be a non-empty array' });
    }

    const results = {
      success: 0,
      errors: [],
      created: []
    };

    const qualities = ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'];

    for (const cardId of card_ids) {
      try {
        // Get existing regular versions to base foil prices on
        const regularVersions = await client.query(
          `SELECT ci.*, c.name as card_name
           FROM card_inventory ci
           JOIN cards c ON c.id = ci.card_id
           WHERE ci.card_id = $1 AND ci.foil_type = 'Regular'`,
          [cardId]
        );

        if (regularVersions.rows.length === 0) {
          results.errors.push(`No regular versions found for card ID ${cardId}`);
          continue;
        }

        for (const regular of regularVersions.rows) {
          const foilPrice = regular.price * price_multiplier;

          // Check if foil version already exists
          const existingFoil = await client.query(
            `SELECT id FROM card_inventory
             WHERE card_id = $1 AND quality = $2 AND foil_type = $3`,
            [cardId, regular.quality, foil_type]
          );

          if (existingFoil.rows.length > 0) {
            continue; // Skip if already exists
          }

          // Create foil version
          const foilResult = await client.query(
            `INSERT INTO card_inventory (card_id, quality, foil_type, language, stock_quantity, price, price_source)
             VALUES ($1, $2, $3, $4, 0, $5, 'bulk_foil_creation')
             RETURNING *`,
            [cardId, regular.quality, foil_type, regular.language || 'English', foilPrice]
          );

          results.created.push({
            card_name: regular.card_name,
            quality: regular.quality,
            foil_type: foil_type,
            price: foilPrice
          });
          results.success++;
        }

      } catch (error) {
        results.errors.push(`Error processing card ID ${cardId}: ${error.message}`);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      summary: results
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in bulk foil creation:', error);
    res.status(500).json({ error: 'Failed to bulk create foil versions' });
  } finally {
    client.release();
  }
});

// Export the router - THIS IS REQUIRED!
module.exports = router;