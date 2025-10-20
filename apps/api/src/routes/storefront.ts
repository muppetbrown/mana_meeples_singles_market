// apps/api/src/routes/storefront.ts
import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db.js';

const router = express.Router();

/** Filters the storefront accepts (align with TCGShop today) */
const StorefrontQuery = z.object({
  // paging/sort
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(200).default(100),
  sort: z.enum(['name', 'number', 'rarity', 'created_at']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),

  // filters
  search: z.string().trim().max(200).optional(),
  game_id: z.coerce.number().int().optional(),
  set_name: z.string().trim().max(200).optional(),
  rarity: z.string().trim().max(50).optional(), // keep loose; you can tighten later
});

/** Map sort to SQL clauses */
function sortToSql(alias: string, sort: string, order: 'asc' | 'desc'): string {
  switch (sort) {
    case 'number': return `ORDER BY ${alias}.card_number ${order}, ${alias}.name ${order}`;
    case 'rarity': return `ORDER BY ${alias}.rarity ${order}, ${alias}.name ASC`;
    case 'created_at': return `ORDER BY ${alias}.created_at ${order}`;
    case 'name':
    default: return `ORDER BY ${alias}.name ${order}, ${alias}.card_number ASC`;
  }
}

/**
 * GET /storefront/cards
 * Returns base card rows with aggregated inventory variations array.
 * Shape is tailored to TCGShop UI (inventory_id, quality, foil_type, language, price, stock, variation_key).
 */
router.get('/cards', async (req: Request, res: Response) => {
  const parsed = StorefrontQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query', details: parsed.error.flatten() });
  }
  const { page, per_page, sort, order, search, game_id, set_name, rarity } = parsed.data;

  const where: string[] = [];
  const params: any[] = [];

  // Filters against cards table
  if (typeof game_id === 'number') {
    params.push(game_id);
    where.push(`c.game_id = $${params.length}`);
  }
  if (set_name) {
    params.push(set_name);
    where.push(`c.set_name = $${params.length}`);
  }
  if (rarity) {
    params.push(rarity);
    where.push(`c.rarity = $${params.length}`);
  }
  if (search && search.length > 1) {
    // Use tsvector if available; fall back to ILIKE
    // Prefer indexed search_tsv for performance
    params.push(search);
    params.push(`%${search}%`);
    where.push(`(c.search_tsv @@ plainto_tsquery('simple', $${params.length-1}) OR c.name ILIKE $${params.length})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderBy = sortToSql('c', sort, order);
  const offset = (page - 1) * per_page;

  // NOTE:
  // - We aggregate inventory across card_inventory (ci) per card id.
  // - If price also exists in card_pricing, you can COALESCE(ci.price, cp.price); keeping ci.price for now.
  // - We include 0-stock rows (so user can see variants), but you can filter `ci.stock_quantity > 0` if desired.
  const sql = `
    WITH filtered AS (
      SELECT
        c.id,
        c.name,
        c.card_number,
        c.set_name,
        c.rarity,
        c.image_url,
        c.treatment,
        c.finish,
        c.border_color,
        c.frame_effect,
        g.name AS game_name
      FROM cards c
      JOIN games g ON g.id = c.game_id
      ${whereSql}
      ${orderBy}
      LIMIT $${params.push(per_page)} OFFSET $${params.push(offset)}
    )
    SELECT
      f.id,
      f.name,
      f.card_number,
      f.set_name,
      f.rarity,
      f.image_url,
      f.game_name,
      -- summarize inventory
      COALESCE(SUM(ci.stock_quantity), 0) AS total_stock,
      COALESCE(COUNT(DISTINCT ci.id), 0) AS variation_count,
      COALESCE(
        JSONB_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'inventory_id', ci.id,
            'quality', ci.quality,
            'foil_type', COALESCE(ci.foil_type, 'Regular'),
            'language', COALESCE(ci.language, 'English'),
            'price', ci.price,
            'stock', ci.stock_quantity,
            'variation_key', CONCAT(ci.quality,'-',COALESCE(ci.foil_type,'Regular'),'-',COALESCE(ci.language,'English'))
          )
        ) FILTER (WHERE ci.id IS NOT NULL),
        '[]'::jsonb
      ) AS variations
    FROM filtered f
    LEFT JOIN card_inventory ci ON ci.card_id = f.id
    GROUP BY
      f.id, f.name, f.card_number, f.set_name, f.rarity, f.image_url, f.game_name
    ${orderBy};
  `;

  try {
    const rows = await db.query(sql, params);
    return res.json({ cards: rows });
  } catch (err: any) {
    console.error('GET /storefront/cards failed', { code: err?.code, message: err?.message });
    return res.status(500).json({ error: 'Failed to fetch storefront cards' });
  }
});

export default router;
