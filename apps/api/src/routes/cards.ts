// apps/api/src/routes/cards.ts
import express from 'express';
import type { Request, Response } from 'express';
import { db } from '../db.js';
import { z } from 'zod';

const router = express.Router();

// Shape of rows returned from the DB.
// Adjust columns to match exactly what you SELECT below.
const CardRowSchema = z.object({
  id: z.number(),
  name: z.string(),
  set_id: z.number(),
  card_number: z.string().nullable(),
  finish: z.string().nullable(),
});
type CardRow = z.infer<typeof CardRowSchema>;

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().trim().max(100).optional(),
});

router.get('/cards', async (req: Request, res: Response) => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query', issues: parsed.error.issues });
  }
  const { limit, page, search } = parsed.data;
  const offset = (page - 1) * limit;

  // Build SQL + params safely (no string interpolation for values)
  const params: unknown[] = [];
  let where = '';
  if (search) {
    params.push(`%${search}%`);
    where = `WHERE name ILIKE $${params.length}`;
  }

  // Push limit and offset after any search param
  params.push(limit, offset);

  const SQL = `
    SELECT id, name, set_id, card_number, finish
    FROM cards
    ${where}
    ORDER BY id DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  try {
    const rows = await db.query<CardRow>(SQL, params);
    const safe = z.array(CardRowSchema).safeParse(rows);
    if (!safe.success) {
      return res.status(500).json({ error: 'Invalid data shape from DB' });
    }
    res.json({
      items: safe.data,
      count: safe.data.length,
      page,
      limit,
    });
  } catch (err: any) {
      console.error('cards query failed', { code: err?.code, message: err?.message });
      return res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

export default router;
