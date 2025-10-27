// apps/api/src/routes/additional.ts
import express from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";

const router = express.Router();

// ============================================================================
// SETS ENDPOINTS
// ============================================================================

/**
 * GET /sets
 * Get all card sets, optionally filtered by game
 */
router.get("/sets", async (req: Request, res: Response): Promise<void> => {
  try {
    const { game_id } = req.query;

    let query = `
      SELECT 
        cs.id,
        cs.name,
        cs.code,
        cs.release_date,
        cs.game_id,
        g.name as game_name,
        COUNT(DISTINCT c.id) as card_count
      FROM card_sets cs
      JOIN games g ON cs.game_id = g.id
      LEFT JOIN cards c ON c.set_id = cs.id
    `;

    const params: unknown[] = [];

    if (game_id) {
      query += ` WHERE cs.game_id = $1`;
      params.push(game_id);
    }

    query += `
      GROUP BY cs.id, cs.name, cs.code, cs.release_date, cs.game_id, g.name
      ORDER BY cs.release_date DESC, cs.name ASC
    `;

    const sets = await db.query(query, params);

    res.json(sets);
  } catch (error) {
    console.error("❌ Get sets error:", error);
    res.status(500).json({ error: "Failed to retrieve sets" });
  }
});

/**
 * GET /sets/:id
 * Get detailed information about a specific set
 */
router.get("/sets/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const setId = parseInt(req.params.id, 10);

    if (isNaN(setId)) {
      res.status(400).json({ error: "Invalid set ID" });
      return;
    }

    const setResult = await db.query(
      `SELECT 
        cs.*,
        g.name as game_name,
        COUNT(DISTINCT c.id) as card_count,
        COUNT(DISTINCT ci.id) as inventory_count,
        SUM(ci.stock_quantity) as total_stock
      FROM card_sets cs
      JOIN games g ON cs.game_id = g.id
      LEFT JOIN cards c ON c.set_id = cs.id
      LEFT JOIN card_inventory ci ON ci.card_id = c.id
      WHERE cs.id = $1
      GROUP BY cs.id, g.name`,
      [setId]
    );

    if (setResult.length === 0) {
      res.status(404).json({ error: "Set not found" });
      return;
    }

    res.json(setResult[0]);
  } catch (error) {
    console.error("❌ Get set error:", error);
    res.status(500).json({ error: "Failed to retrieve set" });
  }
});

// ============================================================================
// GAMES ENDPOINTS
// ============================================================================

/**
 * GET /games
 * Get all games with card counts
 */
router.get("/games", async (req: Request, res: Response): Promise<void> => {
  try {
    const games = await db.query(
      `SELECT 
        g.id,
        g.name,
        g.code,
        g.created_at,
        COUNT(DISTINCT cs.id) as set_count,
        COUNT(DISTINCT c.id) as card_count,
        COUNT(DISTINCT ci.id) as inventory_count
      FROM games g
      LEFT JOIN card_sets cs ON cs.game_id = g.id
      LEFT JOIN cards c ON c.game_id = g.id
      LEFT JOIN card_inventory ci ON ci.card_id = c.id
      GROUP BY g.id, g.name, g.code, g.created_at
      ORDER BY g.name ASC`
    );

    res.json({ games });
  } catch (error) {
    console.error("❌ Get games error:", error);
    res.status(500).json({ error: "Failed to retrieve games" });
  }
});

/**
 * GET /games/:id
 * Get detailed information about a specific game
 */
router.get("/games/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const gameId = parseInt(req.params.id, 10);

    if (isNaN(gameId)) {
      res.status(400).json({ error: "Invalid game ID" });
      return;
    }

    const gameResult = await db.query(
      `SELECT 
        g.*,
        COUNT(DISTINCT cs.id) as set_count,
        COUNT(DISTINCT c.id) as card_count,
        json_agg(DISTINCT jsonb_build_object(
          'id', cs.id,
          'name', cs.name,
          'code', cs.code,
          'release_date', cs.release_date
        )) FILTER (WHERE cs.id IS NOT NULL) as sets
      FROM games g
      LEFT JOIN card_sets cs ON cs.game_id = g.id
      LEFT JOIN cards c ON c.game_id = g.id
      WHERE g.id = $1
      GROUP BY g.id`,
      [gameId]
    );

    if (gameResult.length === 0) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    res.json(gameResult[0]);
  } catch (error) {
    console.error("❌ Get game error:", error);
    res.status(500).json({ error: "Failed to retrieve game" });
  }
});

// ============================================================================
// SEARCH ENDPOINTS
// ============================================================================

const AutocompleteQuerySchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  game_id: z.coerce.number().int().positive().optional(),
});

/**
 * GET /search/autocomplete
 * Fast autocomplete search for cards
 */
router.get("/search/autocomplete", async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = AutocompleteQuerySchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json({ 
        error: "Invalid search query", 
        details: validation.error.errors 
      });
      return;
    }

    const { q, limit, game_id } = validation.data;

    // Build query
    const conditions = ["(c.name ILIKE $1 OR c.card_number ILIKE $1)"];
    const params: unknown[] = [`%${q}%`];
    let paramIndex = 2;

    if (game_id) {
      conditions.push(`c.game_id = $${paramIndex++}`);
      params.push(game_id);
    }

    params.push(limit);

    const suggestions = await db.query(
      `SELECT DISTINCT
        c.id,
        c.name,
        c.card_number,
        cs.name as set_name,
        cs.code as set_code,
        g.name as game_name,
        c.finish,
        c.treatment,
        CASE 
          WHEN c.name ILIKE $1 THEN 1
          WHEN c.card_number ILIKE $1 THEN 2
          ELSE 3
        END as relevance
      FROM cards c
      JOIN card_sets cs ON c.set_id = cs.id
      JOIN games g ON c.game_id = g.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY relevance ASC, c.name ASC
      LIMIT $${paramIndex}`,
      params
    );

    res.json({ 
      query: q,
      suggestions,
      count: suggestions.length 
    });
  } catch (error) {
    console.error("❌ Autocomplete error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

/**
 * GET /search
 * Full-text search for cards with filtering
 */
router.get("/search", async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      q, 
      game_id,
      set_id,
      limit = 50,
      offset = 0 
    } = req.query;

    if (!q || String(q).trim().length < 2) {
      res.status(400).json({ error: "Search query must be at least 2 characters" });
      return;
    }

    const searchTerm = String(q).trim();

    // Build search query
    const conditions = [
      "(c.name ILIKE $1 OR c.card_number ILIKE $1 OR c.sku ILIKE $1)"
    ];
    const params: unknown[] = [`%${searchTerm}%`];
    let paramIndex = 2;

    if (game_id) {
      conditions.push(`c.game_id = $${paramIndex++}`);
      params.push(game_id);
    }

    if (set_id) {
      conditions.push(`c.set_id = $${paramIndex++}`);
      params.push(set_id);
    }

    const whereClause = conditions.join(" AND ");

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(DISTINCT c.id) as total 
       FROM cards c 
       WHERE ${whereClause}`,
      params
    );

    // Get results
    params.push(limit, offset);
    const results = await db.query(
      `SELECT DISTINCT
        c.*,
        cs.name as set_name,
        cs.code as set_code,
        g.name as game_name,
        (
          SELECT json_agg(json_build_object(
            'id', ci.id,
            'quality', ci.quality,
            'foil_type', ci.foil_type,
            'price', ci.price,
            'stock', ci.stock_quantity
          ))
          FROM card_inventory ci
          WHERE ci.card_id = c.id AND ci.stock_quantity > 0
        ) as available_inventory
      FROM cards c
      JOIN card_sets cs ON c.set_id = cs.id
      JOIN games g ON c.game_id = g.id
      WHERE ${whereClause}
      ORDER BY 
        CASE WHEN c.name ILIKE $1 THEN 1 ELSE 2 END,
        c.name ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    res.json({
      query: searchTerm,
      results,
      pagination: {
        total: parseInt(countResult[0]?.total || "0", 10),
        limit: parseInt(String(limit), 10),
        offset: parseInt(String(offset), 10),
      },
    });
  } catch (error) {
    console.error("❌ Search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;