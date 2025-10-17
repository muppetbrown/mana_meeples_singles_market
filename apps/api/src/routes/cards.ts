import { Router } from "express";
// @ts-expect-error TS(2307): Cannot find module 'zod' or its corresponding type... Remove this comment to see the full error message
import { z } from "zod";
import { query } from "../db";


// @ts-expect-error TS(2742): The inferred type of 'router' cannot be named with... Remove this comment to see the full error message
const router = Router();


const listParams = z.object({
q: z.string().trim().max(64).optional(),
set_id: z.string().trim().optional(),
finish: z.enum(["NONFOIL","FOIL","ETCHED"]).optional(),
treatment: z.string().trim().optional(),
limit: z.coerce.number().int().min(1).max(50).default(24),
offset: z.coerce.number().int().min(0).default(0)
});


router.get("/", async (req, res) => {
const p = listParams.parse(req.query);
const values: any[] = [];
const where: string[] = [];


if (p.q) { values.push(p.q); where.push(`search_tsv @@ plainto_tsquery('simple', $${values.length})`); }
if (p.set_id) { values.push(p.set_id); where.push(`set_id = $${values.length}`); }
if (p.finish) { values.push(p.finish); where.push(`finish = $${values.length}`); }
if (p.treatment) { values.push(p.treatment.toUpperCase()); where.push(`treatment = $${values.length}`); }


const sql = `
SELECT id, name, set_id, card_number, finish, treatment, border_color, frame_effect, sku
FROM cards
${where.length ? `WHERE ${where.join(" AND ")}` : ""}
ORDER BY set_id, card_number
LIMIT $${values.push(p.limit)} OFFSET $${values.push(p.offset)};
`;
const rows = await query(sql, values);
res.json({ items: rows, nextOffset: p.offset + p.limit });
});


export { router as cardsRouter };