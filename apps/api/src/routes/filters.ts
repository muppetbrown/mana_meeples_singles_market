import { Router } from 'express';
import { withConn } from '../lib/db';
// @ts-expect-error TS(2742): The inferred type of 'filters' cannot be named wit... Remove this comment to see the full error message
export const filters = Router();


filters.get('/', async (_req, res, next) => {
try {
const data = await withConn(async (c) => {
// Generic facet payload from mv_set_variation_filters if present
const { rows } = await c.query(
`SELECT * FROM mv_set_variation_filters LIMIT 500` // adjust as needed
);
return rows;
});
res.json({ data });
} catch (e) { next(e); }
});