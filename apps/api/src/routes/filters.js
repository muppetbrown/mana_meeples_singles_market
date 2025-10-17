// routes/filters.js
const express = require('express');
const router = express.Router();
// if this file is under routes/, go up one level
const pool = require('../db/pool');

// Helper to build WHERE with paramized filters
function applyCardScope(where, params, scope = {}) {
  const { game_id, set_id } = scope;
  if (game_id) {
    where.push(`c.game_id = $${params.length + 1}`);
    params.push(game_id);
  }
  if (set_id) {
    where.push(`c.set_id = $${params.length + 1}`);
    params.push(set_id);
  }
}

//
// GET /api/filters/treatments
//
router.get('/treatments', async (req, res) => {
  try {
    const params = [];
    const where = ['c.treatment IS NOT NULL'];

    // join inventory to ensure “available”; toggle stock check as needed
    // If you want ALL cards (not only in-stock), remove the join and stock clause.
    applyCardScope(where, params, req.query);

    const sql = `
      SELECT
        c.treatment AS value,
        c.treatment AS label,
        COUNT(DISTINCT c.id) AS count
      FROM cards c
      JOIN card_inventory i ON i.card_id = c.id
      -- Uncomment next line to only count in-stock items:
      -- AND i.stock > 0
      WHERE ${where.join(' AND ')}
      GROUP BY c.treatment
      ORDER BY count DESC, c.treatment
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching treatments:', err);
    res.status(500).json({ error: 'Failed to fetch treatments' });
  }
});

//
// GET /api/filters/rarities
//
router.get('/rarities', async (req, res) => {
  try {
    const params = [];
    const where = ['c.rarity IS NOT NULL'];
    applyCardScope(where, params, req.query);

    const sql = `
      SELECT
        c.rarity AS value,
        c.rarity AS label,
        COUNT(DISTINCT c.id) AS count
      FROM cards c
      JOIN card_inventory i ON i.card_id = c.id
      -- AND i.stock > 0
      WHERE ${where.join(' AND ')}
      GROUP BY c.rarity
      ORDER BY count DESC, c.rarity
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching rarities:', err);
    res.status(500).json({ error: 'Failed to fetch rarities' });
  }
});

//
// GET /api/filters/qualities
//
router.get('/qualities', async (req, res) => {
  try {
    const params = [];
    const where = ['i.quality IS NOT NULL'];
    applyCardScope(where, params, req.query);

    const sql = `
      SELECT
        i.quality AS value,
        i.quality AS label,
        COUNT(DISTINCT i.id) AS count
      FROM card_inventory i
      JOIN cards c ON c.id = i.card_id
      -- AND i.stock > 0
      WHERE ${where.join(' AND ')}
      GROUP BY i.quality
      ORDER BY count DESC, i.quality
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching qualities:', err);
    res.status(500).json({ error: 'Failed to fetch qualities' });
  }
});

//
// GET /api/filters/foil-types
//
router.get('/foil-types', async (req, res) => {
  try {
    const params = [];
    const where = ['i.foil_type IS NOT NULL'];
    applyCardScope(where, params, req.query);

    const sql = `
      SELECT
        i.foil_type AS value,
        i.foil_type AS label,
        COUNT(DISTINCT i.id) AS count
      FROM card_inventory i
      JOIN cards c ON c.id = i.card_id
      -- AND i.stock > 0
      WHERE ${where.join(' AND ')}
      GROUP BY i.foil_type
      ORDER BY count DESC, i.foil_type
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching foil types:', err);
    res.status(500).json({ error: 'Failed to fetch foil types' });
  }
});

//
// GET /api/filters/languages
//
router.get('/languages', async (req, res) => {
  try {
    const params = [];
    const where = ['i.language IS NOT NULL'];
    applyCardScope(where, params, req.query);

    const sql = `
      SELECT
        i.language AS value,
        i.language AS label,
        COUNT(DISTINCT i.id) AS count
      FROM card_inventory i
      JOIN cards c ON c.id = i.card_id
      -- AND i.stock > 0
      WHERE ${where.join(' AND ')}
      GROUP BY i.language
      ORDER BY count DESC, i.language
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching languages:', err);
    res.status(500).json({ error: 'Failed to fetch languages' });
  }
});

//
// GET /api/cards/count
//
router.get('/count', async (req, res) => {
  try {
    const params = [];
    const where = ['1=1'];
    applyCardScope(where, params, req.query);

    const sql = `
      SELECT COUNT(DISTINCT c.id) AS count
      FROM cards c
      JOIN card_inventory i ON i.card_id = c.id
      -- AND i.stock > 0
      WHERE ${where.join(' AND ')}
    `;

    const { rows } = await pool.query(sql, params);
    res.json({ count: parseInt(rows[0].count, 10) });
  } catch (err) {
    console.error('Error counting cards:', err);
    res.status(500).json({ error: 'Failed to count cards' });
  }
});

module.exports = router;
