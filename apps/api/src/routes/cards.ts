import { Router } from 'express';
import { z } from 'zod';
import { withConn } from '../lib/db';
import { searchCards } from '../services/search';
import { getLatestPrice } from '../services/pricing';


export const cards = Router();


const QuerySchema = z.object({ q: z.string().min(1).max(100), limit: z.string().optional(), offset: z.string().optional() });


cards.get('/', async (req, res, next) => {
try {
const parsed = QuerySchema.safeParse(req.query);
if (!parsed.success) return res.status(400).json({ error: { code: 'BAD_QUERY', message: parsed.error.issues[0].message } });
const { q } = parsed.data;
const limit = Number(parsed.data.limit ?? '24');
const offset = Number(parsed.data.offset ?? '0');


const result = await withConn(async (c) => {
const rows = await searchCards(c, q, { limit, offset });
const priced = await Promise.all(
rows.map(async (r) => ({ ...r, latest_price_cents: await getLatestPrice(c, r.id) }))
);
return priced;
});


res.json({ data: result });
} catch (e) { next(e); }
});


const SkuParams = z.object({ sku: z.string().min(3).max(64) });


cards.get('/:sku', async (req, res, next) => {
try {
const { sku } = SkuParams.parse(req.params);
const data = await withConn(async (c) => {
const { rows } = await c.query(
`SELECT c.id, c.name, c.set_id, c.card_number, c.finish, c.sku,
ci.quality, ci.foil_type, ci.language, ci.quantity, ci.price_cents
FROM cards c
LEFT JOIN card_inventory ci ON ci.card_id = c.id
WHERE c.sku = $1`,
[sku]
);
return rows;
});
if (!data.length) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Card not found' } });
res.json({ data });
} catch (e) { next(e); }
});