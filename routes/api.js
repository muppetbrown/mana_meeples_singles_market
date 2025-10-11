// ============================================
// API ENDPOINTS (Express.js Example)
// ============================================

const express = require('express');
const router = express.Router();
const { normalizeSearchTerms, buildSearchConditions, CARD_SEARCH_FIELDS, CARD_SEARCH_FIELDS_BASIC } = require('../services/searchUtils');

// Database connection (expects global.db to be set by server.js)
const db = global.db;

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
const { adminAuthJWT: adminAuth, adminAuthWithCSRF, generateCSRFToken, validateCSRFToken } = require('../middleware/auth');
const { sanitizeCustomerData } = require('../utils/sanitization');

// ============================================
// RATE LIMITING MIDDLEWARE - Fixed memory leak
// ============================================
const expressRateLimit = require('express-rate-limit');

// Create memory-safe rate limiters using express-rate-limit
const createRateLimit = (windowMs, max, message = 'Too many requests') => expressRateLimit({
  windowMs,
  max,
  message: {
    error: message,
    retryAfter: Math.ceil(windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Built-in memory store with automatic cleanup
  store: new expressRateLimit.MemoryStore()
});

// Different limits for different endpoints (Fixed memory leak)
const strictRateLimit = createRateLimit(60000, 30, 'Too many expensive operations');  // 30 req/min
const normalRateLimit = createRateLimit(60000, 100, 'Too many requests');             // 100 req/min
const lenientRateLimit = createRateLimit(60000, 200, 'Too many requests');            // 200 req/min

// Generic rateLimit function for dynamic rate limiting
const rateLimit = (windowMs, max, message = 'Too many requests') => createRateLimit(windowMs, max, message);

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * GET /api/games - Get all active games
 * @description Retrieves a list of all active games available in the system
 * @route GET /api/games
 * @returns {Array} Array of game objects with id, name, and active status
 * @example
 * // Response:
 * [
 *   { "id": 1, "name": "Magic: The Gathering", "active": true },
 *   { "id": 2, "name": "Pokemon", "active": true }
 * ]
 */
router.get('/games', normalRateLimit, async (req, res) => {
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
router.get('/sets', normalRateLimit, async (req, res) => {
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
router.get('/cards', normalRateLimit, async (req, res) => {
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
    const sanitizedLimit = Math.min(1000, Math.max(1, parseInt(limit) || 20)); // Cap at 1000
    const sanitizedMinPrice = min_price ? Math.max(0, parseFloat(min_price) || 0) : null;
    const sanitizedMaxPrice = max_price ? Math.max(0, parseFloat(max_price) || 0) : null;
    const sanitizedGameId = game_id ? parseInt(game_id) || null : null;
    const sanitizedSetId = set_id ? parseInt(set_id) || null : null;

    // Block unreasonably large requests for non-admin users
    if (sanitizedLimit > 100 && !req.user?.isAdmin) {
      return res.status(400).json({ 
        error: 'Limit too high. Maximum allowed is 100 for public access.' 
      });
    }

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
      // Sanitize search input to prevent SQL injection and limit length
      const sanitizedSearch = search
        .trim()
        .slice(0, 100) // Limit to 100 characters
        .replace(/['"\\;-]/g, ''); // Remove dangerous SQL characters

      if (sanitizedSearch.length === 0) {
        // Skip search if sanitized input is empty
      } else {
        // Use simple ILIKE search for better compatibility
        const searchTerms = sanitizedSearch.split(/\s+/).filter(term => term.length > 0);
        const searchConditions = [];

        searchTerms.forEach(term => {
          // Additional character escaping for ILIKE patterns
          const escapedTerm = term.replace(/[%_]/g, '\\$&');
          const termPattern = `%${escapedTerm}%`;
          searchConditions.push(`(
            c.name ILIKE $${paramCount}
            OR c.card_number ILIKE $${paramCount + 1}
            OR c.card_type ILIKE $${paramCount + 2}
            OR cs.name ILIKE $${paramCount + 3}
          )`);
          params.push(termPattern, termPattern, termPattern, termPattern);
          paramCount += 4;
        });

        if (searchConditions.length > 0) {
          conditions.push(`(${searchConditions.join(' AND ')})`);
        }
      }
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
      // When searching, prioritize exact matches first, then by selected sort field (Fixed SQL injection)
      query += ` ORDER BY
        CASE
          WHEN c.name ILIKE $${paramCount} THEN 1
          WHEN c.name ILIKE $${paramCount + 1} THEN 2
          WHEN c.card_number ILIKE $${paramCount + 2} THEN 3
          ELSE 4
        END, ${sortField} ${order}`;
      params.push(`${search}%`, `%${search}%`, `%${search}%`);
      paramCount += 3;
    } else if (sort_by === 'number') {
      // Safe numeric sorting for card numbers
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

// GET /api/admin/csrf-token - Get CSRF token for authenticated admin
router.get('/admin/csrf-token', adminAuth, generateCSRFToken, (req, res) => {
  res.json({
    success: true,
    csrfToken: req.csrfToken
  });
});

// GET /api/admin/inventory - Get ALL inventory with dynamic quality/foil combinations
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

    // Step 1: Get all cards with their base pricing
    let cardQuery = `
      SELECT
        c.id as card_id,
        c.name,
        c.card_number,
        c.rarity,
        c.card_type,
        c.description,
        c.image_url,
        g.name as game_name,
        cs.name as set_name,
        cs.code as set_code,
        cp.base_price,
        cp.foil_price,
        cp.price_source as pricing_source,
        cp.updated_at as pricing_updated_at
      FROM cards c
      JOIN games g ON c.game_id = g.id
      JOIN card_sets cs ON c.set_id = cs.id
      LEFT JOIN card_pricing cp ON cp.card_id = c.id
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

    if (conditions.length > 0) {
      cardQuery += ' WHERE ' + conditions.join(' AND ');
    }

    // Sorting
    const validSortFields = {
      name: 'c.name',
      rarity: 'c.rarity',
      set: 'cs.name'
    };
    const sortField = validSortFields[sort_by] || 'c.name';
    const order = sort_order === 'desc' ? 'DESC' : 'ASC';
    cardQuery += ` ORDER BY ${sortField} ${order}`;

    // Pagination
    const offset = (page - 1) * limit;
    cardQuery += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const cardResults = await db.query(cardQuery, params);

    // Step 2: Get existing inventory for these cards
    const cardIds = cardResults.rows.map(card => card.card_id);
    let existingInventory = [];

    if (cardIds.length > 0) {
      const inventoryQuery = `
        SELECT
          ci.card_id,
          ci.id as inventory_id,
          ci.quality,
          ci.foil_type,
          ci.language,
          ci.stock_quantity,
          ci.price,
          ci.price_source,
          ci.updated_at,
          ci.last_price_update
        FROM card_inventory ci
        WHERE ci.card_id = ANY($1)
      `;

      const inventoryResult = await db.query(inventoryQuery, [cardIds]);
      existingInventory = inventoryResult.rows;
    }

    // Step 3: Generate dynamic inventory entries
    const inventoryEntries = [];
    const qualities = [
      { name: 'Near Mint', discount: 0 },
      { name: 'Lightly Played', discount: 0.1 },
      { name: 'Moderately Played', discount: 0.2 },
      { name: 'Heavily Played', discount: 0.3 },
      { name: 'Damaged', discount: 0.5 }
    ];
    const foilTypes = ['Regular', 'Foil'];
    const languages = ['English'];

    for (const card of cardResults.rows) {
      // Get existing inventory for this card
      const cardInventory = existingInventory.filter(inv => inv.card_id === card.card_id);
      const cardInventoryMap = new Map();

      // Map existing inventory by quality-foil-language combination
      cardInventory.forEach(inv => {
        const key = `${inv.quality}-${inv.foil_type}-${inv.language}`;
        cardInventoryMap.set(key, inv);
      });

      // Generate entries for all quality/foil/language combinations
      for (const qualityObj of qualities) {
        for (const foilType of foilTypes) {
          for (const language of languages) {
            const key = `${qualityObj.name}-${foilType}-${language}`;
            const existing = cardInventoryMap.get(key);

            // Skip if quality filter is specified and doesn't match
            if (quality && qualityObj.name !== quality) {
              continue;
            }

            // Calculate price based on base pricing
            let calculatedPrice = 0;
            if (card.base_price && card.foil_price) {
              const basePrice = foilType === 'Foil' ? parseFloat(card.foil_price) : parseFloat(card.base_price);
              calculatedPrice = Math.max(0.25, basePrice * (1 - qualityObj.discount));
            }

            inventoryEntries.push({
              id: existing ? existing.inventory_id : `virtual-${card.card_id}-${key}`,
              name: card.name,
              card_number: card.card_number,
              rarity: card.rarity,
              card_type: card.card_type,
              description: card.description,
              image_url: card.image_url,
              game_name: card.game_name,
              set_name: card.set_name,
              set_code: card.set_code,
              quality: qualityObj.name,
              foil_type: foilType,
              language: language,
              stock_quantity: existing ? existing.stock_quantity : 0,
              price: existing ? parseFloat(existing.price) : calculatedPrice,
              price_source: existing ? existing.price_source : (card.pricing_source || 'calculated'),
              inventory_id: existing ? existing.inventory_id : null,
              updated_at: existing ? existing.updated_at : card.pricing_updated_at,
              last_price_update: existing ? existing.last_price_update : card.pricing_updated_at,
              card_id: card.card_id,
              is_virtual: !existing // Flag to indicate if this is a calculated entry
            });
          }
        }
      }
    }

    res.json({
      inventory: inventoryEntries,
      total: inventoryEntries.length
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

/**
 * POST /api/orders - Create a new order with overselling prevention
 * @description Creates a new order with comprehensive validation and stock management
 * @route POST /api/orders
 * @param {Object} req.body - Order data
 * @param {Object} req.body.customer - Customer information
 * @param {string} req.body.customer.email - Customer email (validated)
 * @param {string} req.body.customer.phone - Customer phone (validated)
 * @param {string} req.body.customer.name - Customer name
 * @param {Array} req.body.items - Array of order items
 * @param {string} req.body.items[].inventory_id - Inventory item ID
 * @param {number} req.body.items[].quantity - Quantity ordered (1-99)
 * @param {number} req.body.items[].price - Price per item
 * @param {number} req.body.total - Total order amount
 * @param {string} req.body.currency - Currency code (e.g., 'USD', 'NZD')
 * @param {string} req.body.timestamp - Order timestamp
 * @returns {Object} Success response with order ID
 * @throws {400} Validation errors for invalid input
 * @throws {409} Insufficient stock for requested items
 * @throws {500} Database or processing errors
 * @example
 * // Request body:
 * {
 *   "customer": {
 *     "email": "customer@example.com",
 *     "phone": "+64-21-123-4567",
 *     "name": "John Doe"
 *   },
 *   "items": [
 *     {
 *       "inventory_id": "abc123",
 *       "quantity": 2,
 *       "price": 15.99
 *     }
 *   ],
 *   "total": 31.98,
 *   "currency": "NZD",
 *   "timestamp": "2023-12-01T10:30:00Z"
 * }
 *
 * // Response:
 * {
 *   "success": true,
 *   "orderId": "order_789",
 *   "message": "Order created successfully"
 * }
 */
router.post('/orders', validateCSRFToken, async (req, res) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const { customer, items, total, currency, timestamp } = req.body;

    // Comprehensive input validation
    const validationErrors = [];

    // Validate required fields exist
    if (!customer || !items || !total || !currency) {
      return res.status(400).json({
        error: 'Missing required fields: customer, items, total, currency'
      });
    }

    // Validate customer fields with format validation
    if (!customer.email || !customer.firstName || !customer.lastName) {
      validationErrors.push('Missing required customer fields: email, firstName, lastName');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (customer.email && !emailRegex.test(customer.email)) {
      validationErrors.push('Invalid email format');
    }

    // Name validation (remove dangerous characters)
    if (customer.firstName && (customer.firstName.length > 50 || /[<>'"&]/.test(customer.firstName))) {
      validationErrors.push('Invalid firstName format or too long');
    }
    if (customer.lastName && (customer.lastName.length > 50 || /[<>'"&]/.test(customer.lastName))) {
      validationErrors.push('Invalid lastName format or too long');
    }

    // Phone validation if provided
    if (customer.phone) {
      const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(customer.phone) || customer.phone.length > 20) {
        validationErrors.push('Invalid phone number format');
      }
    }

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      validationErrors.push('Items must be a non-empty array');
    } else if (items.length > 100) {
      validationErrors.push('Too many items in cart (maximum 100)');
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.inventory_id || typeof item.inventory_id !== 'string') {
        validationErrors.push(`Item ${i + 1}: Invalid inventory_id`);
      }
      if (!item.quantity || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
        validationErrors.push(`Item ${i + 1}: Invalid quantity (must be 1-50)`);
      }
    }

    // Validate total
    if (typeof total !== 'number' || total < 0 || total > 10000) {
      validationErrors.push('Invalid total amount');
    }

    // Validate currency
    const allowedCurrencies = ['USD', 'EUR', 'GBP', 'NZD', 'AUD'];
    if (typeof currency !== 'string' || !allowedCurrencies.includes(currency)) {
      validationErrors.push('Invalid currency code');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

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

    // Sanitize customer data to prevent XSS attacks
    const customerData = sanitizeCustomerData(customer);

    // Create order - Fixed to match database schema
    const orderResult = await client.query(
      `INSERT INTO orders (
        customer_email,
        customer_name,
        subtotal,
        tax,
        shipping,
        total,
        status,
        payment_intent_id,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
       RETURNING id`,
      [
        customer.email,
        `${customer.firstName} ${customer.lastName}`,
        total, // For now, use total as subtotal
        0, // Tax - to be calculated properly later
        0, // Shipping - to be calculated properly later
        total,
        JSON.stringify(customerData), // Store customer data temporarily in payment_intent_id
        timestamp || new Date().toISOString()
      ]
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

    // Send email confirmations
    try {
      const emailService = require('../services/emailService');

      // Prepare email data with detailed order information
      const emailOrderData = {
        order_id: orderId,
        customer: customerData,
        items: stockUpdates.map(item => ({
          name: item.card_name,
          quality: item.quality,
          quantity: item.quantity,
          price: item.current_price,
          inventory_id: item.inventory_id
        })),
        total: parseFloat(total),
        currency: currency === 'NZD' ? 'NZ$' : (currency === 'USD' ? '$' : currency),
        timestamp: timestamp || new Date().toISOString()
      };

      // Send emails (non-blocking - order success doesn't depend on email delivery)
      const emailResults = await emailService.sendOrderEmails(emailOrderData);

      // Log email results for debugging
      if (emailResults.customerEmail.success) {
        console.log(`✅ Customer confirmation email sent for order ${orderId}`);
      } else {
        console.log(`⚠️ Customer email failed for order ${orderId}:`, emailResults.customerEmail.reason || emailResults.customerEmail.error);
      }

      if (emailResults.ownerEmail.success) {
        console.log(`✅ Owner notification email sent for order ${orderId}`);
      } else {
        console.log(`⚠️ Owner email failed for order ${orderId}:`, emailResults.ownerEmail.reason || emailResults.ownerEmail.error);
      }

    } catch (emailError) {
      // Log email errors but don't fail the order
      console.error(`⚠️ Email service error for order ${orderId}:`, emailError.message);
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

// GET /api/admin/orders - Get all orders for admin management
router.get('/admin/orders', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    const offset = (page - 1) * limit;

    let query = `
      SELECT
        o.id,
        o.customer_email,
        o.customer_name,
        o.payment_intent_id as customer_data,
        'NZD' as currency,
        o.total,
        o.status,
        o.created_at,
        o.updated_at,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
    `;

    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` WHERE o.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += `
      GROUP BY o.id, o.customer_email, o.customer_name, o.payment_intent_id,
               o.total, o.status, o.created_at, o.updated_at
      ORDER BY o.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      orders: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/admin/orders/:id - Get detailed order information
router.get('/admin/orders/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const orderQuery = `
      SELECT o.*,
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'inventory_id', oi.inventory_id,
                 'card_name', oi.card_name,
                 'quality', oi.quality,
                 'quantity', oi.quantity,
                 'unit_price', oi.unit_price,
                 'total_price', oi.total_price
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.id = $1
      GROUP BY o.id
    `;

    const result = await db.query(orderQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// PUT /api/admin/orders/:id/status - Update order status
router.put('/admin/orders/:id/status', adminAuthWithCSRF, async (req, res) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Get current order details
    const currentOrder = await client.query(
      'SELECT status FROM orders WHERE id = $1',
      [id]
    );

    if (currentOrder.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const currentStatus = currentOrder.rows[0].status;

    // If cancelling order, restore inventory
    if (status === 'cancelled' && currentStatus !== 'cancelled') {
      const orderItems = await client.query(
        'SELECT inventory_id, quantity FROM order_items WHERE order_id = $1',
        [id]
      );

      for (const item of orderItems.rows) {
        await client.query(
          'UPDATE card_inventory SET stock_quantity = stock_quantity + $1 WHERE id = $2',
          [item.quantity, item.inventory_id]
        );
      }
    }

    // If un-cancelling order (rare), re-reserve inventory
    if (currentStatus === 'cancelled' && status !== 'cancelled') {
      const orderItems = await client.query(
        'SELECT inventory_id, quantity FROM order_items WHERE order_id = $1',
        [id]
      );

      for (const item of orderItems.rows) {
        // Check stock before re-reserving
        const stockCheck = await client.query(
          'SELECT stock_quantity FROM card_inventory WHERE id = $1',
          [item.inventory_id]
        );

        if (stockCheck.rows.length === 0 || stockCheck.rows[0].stock_quantity < item.quantity) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `Cannot un-cancel order: insufficient stock for item ${item.inventory_id}`
          });
        }

        await client.query(
          'UPDATE card_inventory SET stock_quantity = stock_quantity - $1 WHERE id = $2',
          [item.quantity, item.inventory_id]
        );
      }
    }

    // Update order status
    const updateResult = await client.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      order: updateResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  } finally {
    client.release();
  }
});

// PUT /api/admin/inventory/:id - Update inventory price and/or stock (handles virtual entries)
router.put('/admin/inventory/:id', adminAuthWithCSRF, async (req, res) => {
  try {
    const { id } = req.params;
    const { price, stock_quantity, quality, foil_type, language, card_id } = req.body;

    // Check if this is a virtual entry (starts with "virtual-")
    if (id.startsWith('virtual-')) {
      // Create new inventory entry for virtual entries
      if (!card_id || !quality || !foil_type) {
        return res.status(400).json({ error: 'Card ID, quality, and foil type are required for new inventory entries' });
      }

      const insertQuery = `
        INSERT INTO card_inventory (card_id, quality, foil_type, language, stock_quantity, price, price_source, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'manual', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const insertParams = [
        card_id,
        quality,
        foil_type || 'Regular',
        language || 'English',
        stock_quantity !== undefined ? parseInt(stock_quantity) : 0,
        price !== undefined ? parseFloat(price) : 0
      ];

      const result = await db.query(insertQuery, insertParams);

      return res.json({
        success: true,
        inventory: result.rows[0]
      });
    }

    // Handle existing inventory entries
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

      // Fixed N+1 query by using database function that already includes stock check
      const formattedSuggestions = suggestions.rows.map((row) => {
        return {
          name: row.name,
          set_name: row.set_name,
          image_url: row.image_url,
          match_type: row.match_type
        };
      });

      res.json({ suggestions: formattedSuggestions.filter(Boolean) });
    } catch (functionError) {
      // Fallback to enhanced basic search if full-text functions aren't available (Fixed N+1 query)
      const fallbackSuggestions = await db.query(`
        SELECT DISTINCT
          c.name,
          c.image_url,
          cs.name as set_name,
          'card' as match_type,
          MAX(ci.stock_quantity) > 0 as has_stock
        FROM cards c
        JOIN card_sets cs ON c.set_id = cs.id
        JOIN card_inventory ci ON ci.card_id = c.id
        WHERE (c.name ILIKE $1 OR c.card_number ILIKE $1)
        GROUP BY c.id, c.name, c.image_url, cs.name
        HAVING MAX(ci.stock_quantity) > 0
        ORDER BY
          CASE
            WHEN c.name ILIKE $2 THEN 1
            WHEN c.name ILIKE $3 THEN 2
            ELSE 3
          END, c.name
        LIMIT 10
      `, [`%${q}%`, `${q}%`, `%${q}%`]);

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
router.get('/filters/counts', lenientRateLimit, async (req, res) => {
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

    // Sanitize and validate inputs to prevent SQL injection
    const sanitizedDays = Math.max(1, Math.min(365, parseInt(days, 10))) || 7;
    const sanitizedLimit = Math.max(1, Math.min(100, parseInt(limit, 10))) || 10;

    // For now, we'll simulate trending by recent sales and stock turnover (Fixed SQL injection)
    const trending = await db.query(`
      SELECT
        c.id,
        c.name,
        c.image_url,
        cs.name as set_name,
        AVG(ci.price) as avg_price,
        SUM(CASE WHEN oi.created_at > NOW() - INTERVAL $1 || ' days' THEN oi.quantity ELSE 0 END) as recent_sales
      FROM cards c
      JOIN card_sets cs ON c.set_id = cs.id
      JOIN card_inventory ci ON ci.card_id = c.id
      LEFT JOIN order_items oi ON oi.inventory_id = ci.id
      WHERE ci.stock_quantity > 0
      GROUP BY c.id, c.name, c.image_url, cs.name
      HAVING SUM(CASE WHEN oi.created_at > NOW() - INTERVAL $1 || ' days' THEN oi.quantity ELSE 0 END) > 0
      ORDER BY recent_sales DESC, avg_price DESC
      LIMIT $2
    `, [sanitizedDays, sanitizedLimit]);

    res.json({ trending: trending.rows });
  } catch (error) {
    console.error('Error fetching trending cards:', error);
    res.status(500).json({ error: 'Failed to fetch trending cards' });
  }
});

// POST /api/admin/bulk-update - Bulk update prices and stock
router.post('/admin/bulk-update', adminAuthWithCSRF, async (req, res) => {
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
router.post('/admin/csv-import', adminAuthWithCSRF, async (req, res) => {
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

    // Default to NZD for NZ-based shop
    let currency = 'NZD';
    let symbol = 'NZ$';
    let rate = 1.6;

    // Check if request is from US/other countries to show USD
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';

    if (acceptLanguage.includes('en-US') || acceptLanguage.includes('en-CA') || acceptLanguage.includes('en-GB')) {
      currency = 'USD';
      symbol = '$';
      rate = 1.0;
    }

    res.json({
      currency,
      symbol,
      rate
    });
  } catch (error) {
    console.error('Error detecting currency:', error);
    res.json({ currency: 'NZD', symbol: 'NZ$', rate: 1.6 });
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
router.post('/admin/create-foil', adminAuthWithCSRF, async (req, res) => {
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
router.post('/admin/bulk-create-foils', adminAuthWithCSRF, async (req, res) => {
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

// POST /api/admin/refresh-prices - Refresh MTG prices from Scryfall CardKingdom
router.post('/admin/refresh-prices', adminAuthWithCSRF, async (req, res) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Get all MTG cards with Scryfall IDs that need price updates
    const mtgCards = await client.query(`
      SELECT DISTINCT c.scryfall_id, c.name, ci.id as inventory_id, ci.foil_type, ci.quality
      FROM cards c
      JOIN games g ON c.game_id = g.id
      JOIN card_inventory ci ON ci.card_id = c.id
      WHERE g.code = 'mtg'
        AND c.scryfall_id IS NOT NULL
        AND ci.stock_quantity >= 0
        AND (ci.last_price_update IS NULL OR ci.last_price_update < NOW() - INTERVAL '1 hour')
      ORDER BY c.scryfall_id
    `);

    const results = {
      updated: 0,
      errors: [],
      total: mtgCards.rows.length
    };

    // Process cards in batches to respect rate limits
    const batchSize = 75; // Scryfall allows 10 requests per second, we'll be conservative

    for (let i = 0; i < mtgCards.rows.length; i += batchSize) {
      const batch = mtgCards.rows.slice(i, i + batchSize);
      const scryfallIds = batch.map(card => card.scryfall_id);

      try {
        // Fetch price data from Scryfall
        const response = await fetch('https://api.scryfall.com/cards/collection', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identifiers: scryfallIds.map(id => ({ id }))
          })
        });

        if (!response.ok) {
          results.errors.push(`Scryfall API error: ${response.statusText}`);
          continue;
        }

        const scryfallData = await response.json();

        // Update prices for each card
        for (const scryfallCard of scryfallData.data) {
          const matchingInventoryItems = batch.filter(item => item.scryfall_id === scryfallCard.id);

          for (const item of matchingInventoryItems) {
            let price = null;

            // Get appropriate price based on foil type from CardKingdom prices
            if (scryfallCard.prices) {
              if (item.foil_type === 'Regular' || item.foil_type === 'Non-foil') {
                price = scryfallCard.prices.usd;
              } else {
                // For foil cards, try foil price first, fall back to regular with multiplier
                price = scryfallCard.prices.usd_foil || (scryfallCard.prices.usd ? parseFloat(scryfallCard.prices.usd) * 2.5 : null);
              }
            }

            if (price && price > 0) {
              // Apply condition modifier
              let conditionMultiplier = 1.0;
              switch (item.quality) {
                case 'Lightly Played': conditionMultiplier = 0.9; break;
                case 'Moderately Played': conditionMultiplier = 0.8; break;
                case 'Heavily Played': conditionMultiplier = 0.7; break;
                case 'Damaged': conditionMultiplier = 0.5; break;
                default: conditionMultiplier = 1.0; // Near Mint
              }

              const adjustedPrice = parseFloat(price) * conditionMultiplier;

              await client.query(`
                UPDATE card_inventory
                SET price = $1,
                    price_source = 'api_scryfall_cardkingdom',
                    last_price_update = NOW(),
                    updated_at = NOW()
                WHERE id = $2
              `, [adjustedPrice.toFixed(2), item.inventory_id]);

              results.updated++;
            }
          }
        }

        // Rate limit: wait 100ms between batches
        if (i + batchSize < mtgCards.rows.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        results.errors.push(`Batch error: ${error.message}`);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      ...results,
      message: `Updated ${results.updated} prices from ${results.total} MTG cards`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Price refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh prices',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// POST /api/admin/bulk-create-variations - Create multiple card variations at once
router.post('/admin/bulk-create-variations', adminAuthWithCSRF, async (req, res) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const { card_ids, variations, create_inventory = true } = req.body;

    // Validation
    if (!card_ids || !Array.isArray(card_ids) || card_ids.length === 0) {
      return res.status(400).json({ error: 'card_ids must be a non-empty array' });
    }

    if (!variations || !Array.isArray(variations) || variations.length === 0) {
      return res.status(400).json({ error: 'variations must be a non-empty array' });
    }

    // Validate variation structure
    for (const variation of variations) {
      if (!variation.name || typeof variation.name !== 'string') {
        return res.status(400).json({ error: 'Each variation must have a name string' });
      }
    }

    const results = {
      success: 0,
      errors: [],
      created_variations: [],
      created_inventory: 0
    };

    const qualities = ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'];
    const foilTypes = ['Regular', 'Foil'];
    const languages = ['English'];

    for (const cardId of card_ids) {
      try {
        // Get card details for pricing reference
        const cardData = await client.query(
          `SELECT c.*, cp.base_price, cp.foil_price, g.name as game_name
           FROM cards c
           LEFT JOIN card_pricing cp ON cp.card_id = c.id
           LEFT JOIN games g ON g.id = c.game_id
           WHERE c.id = $1`,
          [cardId]
        );

        if (cardData.rows.length === 0) {
          results.errors.push(`Card ${cardId} not found`);
          continue;
        }

        const card = cardData.rows[0];

        for (const variation of variations) {
          try {
            // Create the card variation
            const variationResult = await client.query(
              `INSERT INTO card_variations (card_id, variation_name, variation_code, image_url)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT DO NOTHING
               RETURNING id`,
              [cardId, variation.name, variation.code || null, variation.image_url || card.image_url]
            );

            let variationId;
            if (variationResult.rows.length > 0) {
              variationId = variationResult.rows[0].id;
              results.created_variations.push({
                card_id: cardId,
                card_name: card.name,
                variation_id: variationId,
                variation_name: variation.name
              });
              results.success++;
            } else {
              // Variation already exists, get its ID
              const existingVar = await client.query(
                `SELECT id FROM card_variations WHERE card_id = $1 AND variation_name = $2`,
                [cardId, variation.name]
              );
              variationId = existingVar.rows[0]?.id;
            }

            if (create_inventory && variationId) {
              // Create inventory entries for all quality/foil/language combinations
              for (const quality of qualities) {
                for (const foilType of foilTypes) {
                  for (const language of languages) {
                    // Calculate price based on quality and foil
                    const basePrice = foilType === 'Foil' ?
                      (parseFloat(card.foil_price) || parseFloat(card.base_price) * 2.5 || 0) :
                      (parseFloat(card.base_price) || 0);

                    // Apply quality discount
                    const qualityDiscounts = {
                      'Near Mint': 0,
                      'Lightly Played': 0.15,
                      'Moderately Played': 0.30,
                      'Heavily Played': 0.45,
                      'Damaged': 0.65
                    };

                    const discount = qualityDiscounts[quality] || 0;
                    const finalPrice = basePrice * (1 - discount);

                    try {
                      await client.query(
                        `INSERT INTO card_inventory (
                          card_id, variation_id, quality, foil_type, language,
                          stock_quantity, price, price_source, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, 0, $6, 'bulk_create', NOW(), NOW())
                        ON CONFLICT (card_id, variation_id, quality, foil_type, language) DO NOTHING`,
                        [cardId, variationId, quality, foilType, language, finalPrice]
                      );
                      results.created_inventory++;
                    } catch (invErr) {
                      console.log(`Warning: Could not create inventory for ${card.name} ${variation.name} ${quality} ${foilType} ${language}`);
                    }
                  }
                }
              }
            }

          } catch (varErr) {
            results.errors.push(`Error creating variation ${variation.name} for card ${cardId}: ${varErr.message}`);
          }
        }

      } catch (cardErr) {
        results.errors.push(`Error processing card ${cardId}: ${cardErr.message}`);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Created ${results.success} variations with ${results.created_inventory} inventory entries`,
      details: results
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in bulk create variations:', error);
    res.status(500).json({
      error: 'Failed to create variations',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// POST /api/admin/import-card-data - Import cards and variations from JSON
router.post('/admin/import-card-data', adminAuthWithCSRF, async (req, res) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const { game_code, set_data, cards_data } = req.body;

    if (!game_code || !set_data || !cards_data || !Array.isArray(cards_data)) {
      return res.status(400).json({
        error: 'Required fields: game_code, set_data, cards_data (array)'
      });
    }

    // Get or create game
    const gameResult = await client.query(
      `INSERT INTO games (name, code, active)
       VALUES ($1, $2, true)
       ON CONFLICT (code) DO UPDATE SET active = true
       RETURNING id`,
      [set_data.game_name || game_code.toUpperCase(), game_code.toLowerCase()]
    );

    const gameId = gameResult.rows[0].id;

    // Get or create set
    const setResult = await client.query(
      `INSERT INTO card_sets (game_id, name, code, release_date, active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (game_id, code)
       DO UPDATE SET name = EXCLUDED.name, release_date = EXCLUDED.release_date
       RETURNING id`,
      [gameId, set_data.name, set_data.code, set_data.release_date]
    );

    const setId = setResult.rows[0].id;

    const results = {
      game_id: gameId,
      set_id: setId,
      cards_imported: 0,
      cards_updated: 0,
      variations_created: 0,
      inventory_entries: 0,
      errors: []
    };

    for (const cardData of cards_data) {
      try {
        // Insert or update card
        const cardResult = await client.query(
          `INSERT INTO cards (game_id, set_id, name, card_number, rarity, card_type, description, image_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (set_id, card_number)
           DO UPDATE SET
             name = EXCLUDED.name,
             rarity = EXCLUDED.rarity,
             card_type = EXCLUDED.card_type,
             description = EXCLUDED.description,
             image_url = EXCLUDED.image_url,
             updated_at = NOW()
           RETURNING id, (xmax = 0) as inserted`,
          [
            gameId, setId, cardData.name, cardData.card_number,
            cardData.rarity, cardData.card_type, cardData.description,
            cardData.image_url
          ]
        );

        const cardId = cardResult.rows[0].id;
        const wasInserted = cardResult.rows[0].inserted;

        if (wasInserted) {
          results.cards_imported++;
        } else {
          results.cards_updated++;
        }

        // Store pricing data
        if (cardData.base_price || cardData.foil_price) {
          await client.query(
            `INSERT INTO card_pricing (card_id, base_price, foil_price, price_source, updated_at)
             VALUES ($1, $2, $3, 'import', NOW())
             ON CONFLICT (card_id)
             DO UPDATE SET
               base_price = EXCLUDED.base_price,
               foil_price = EXCLUDED.foil_price,
               updated_at = NOW()`,
            [cardId, cardData.base_price || 0, cardData.foil_price || cardData.base_price * 2.5 || 0]
          );
        }

        // Create variations if provided
        if (cardData.variations && Array.isArray(cardData.variations)) {
          for (const variation of cardData.variations) {
            const variationResult = await client.query(
              `INSERT INTO card_variations (card_id, variation_name, variation_code, image_url)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT DO NOTHING
               RETURNING id`,
              [cardId, variation.name, variation.code || null, variation.image_url || cardData.image_url]
            );

            if (variationResult.rows.length > 0) {
              results.variations_created++;
              const variationId = variationResult.rows[0].id;

              // Create inventory entries if provided
              if (variation.inventory && Array.isArray(variation.inventory)) {
                for (const inventory of variation.inventory) {
                  try {
                    await client.query(
                      `INSERT INTO card_inventory (
                        card_id, variation_id, quality, foil_type, language,
                        stock_quantity, price, price_source, created_at, updated_at
                      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'import', NOW(), NOW())
                      ON CONFLICT (card_id, variation_id, quality, foil_type, language)
                      DO UPDATE SET
                        stock_quantity = EXCLUDED.stock_quantity,
                        price = EXCLUDED.price,
                        updated_at = NOW()`,
                      [
                        cardId, variationId,
                        inventory.quality || 'Near Mint',
                        inventory.foil_type || 'Regular',
                        inventory.language || 'English',
                        inventory.stock_quantity || 0,
                        inventory.price || 0
                      ]
                    );
                    results.inventory_entries++;
                  } catch (invErr) {
                    results.errors.push(`Inventory error for ${cardData.name}: ${invErr.message}`);
                  }
                }
              }
            }
          }
        }

      } catch (cardErr) {
        results.errors.push(`Error importing card ${cardData.name}: ${cardErr.message}`);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Import completed: ${results.cards_imported} new cards, ${results.cards_updated} updated`,
      results: results
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in import card data:', error);
    res.status(500).json({
      error: 'Failed to import card data',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// GET /api/admin/variations/:card_id - Get all variations for a card
router.get('/admin/variations/:card_id', adminAuth, async (req, res) => {
  try {
    const cardId = parseInt(req.params.card_id);

    if (isNaN(cardId)) {
      return res.status(400).json({ error: 'Invalid card ID' });
    }

    // Get card details
    const cardResult = await db.query(
      `SELECT c.*, g.name as game_name, cs.name as set_name
       FROM cards c
       JOIN games g ON g.id = c.game_id
       JOIN card_sets cs ON cs.id = c.set_id
       WHERE c.id = $1`,
      [cardId]
    );

    if (cardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Get all variations with inventory counts
    const variationsResult = await db.query(
      `SELECT
        cv.*,
        COUNT(ci.id) as inventory_count,
        SUM(ci.stock_quantity) as total_stock,
        MIN(ci.price) as min_price,
        MAX(ci.price) as max_price
       FROM card_variations cv
       LEFT JOIN card_inventory ci ON ci.variation_id = cv.id
       WHERE cv.card_id = $1
       GROUP BY cv.id, cv.card_id, cv.variation_name, cv.variation_code, cv.image_url, cv.created_at
       ORDER BY cv.created_at`,
      [cardId]
    );

    res.json({
      card: cardResult.rows[0],
      variations: variationsResult.rows
    });

  } catch (error) {
    console.error('Error fetching variations:', error);
    res.status(500).json({ error: 'Failed to fetch variations' });
  }
});

// DELETE /api/admin/variations/:variation_id - Delete a card variation
router.delete('/admin/variations/:variation_id', adminAuthWithCSRF, async (req, res) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const variationId = parseInt(req.params.variation_id);

    if (isNaN(variationId)) {
      return res.status(400).json({ error: 'Invalid variation ID' });
    }

    // Check if variation exists and get info
    const variationResult = await client.query(
      `SELECT cv.*, c.name as card_name
       FROM card_variations cv
       JOIN cards c ON c.id = cv.card_id
       WHERE cv.id = $1`,
      [variationId]
    );

    if (variationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Variation not found' });
    }

    const variation = variationResult.rows[0];

    // Check if there's any inventory with stock
    const stockResult = await client.query(
      `SELECT SUM(stock_quantity) as total_stock
       FROM card_inventory
       WHERE variation_id = $1`,
      [variationId]
    );

    const totalStock = parseInt(stockResult.rows[0].total_stock) || 0;

    if (totalStock > 0) {
      return res.status(400).json({
        error: `Cannot delete variation with ${totalStock} items in stock`,
        suggestion: 'Set stock quantities to 0 first, or transfer stock to another variation'
      });
    }

    // Delete all inventory entries for this variation
    await client.query('DELETE FROM card_inventory WHERE variation_id = $1', [variationId]);

    // Delete the variation
    await client.query('DELETE FROM card_variations WHERE id = $1', [variationId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Deleted variation "${variation.variation_name}" for card "${variation.card_name}"`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting variation:', error);
    res.status(500).json({ error: 'Failed to delete variation' });
  } finally {
    client.release();
  }
});

// Export the router
module.exports = router;