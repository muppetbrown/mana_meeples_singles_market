"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const router = (0, express_1.Router)();
exports.cardsRouter = router;
const listParams = zod_1.z.object({
    q: zod_1.z.string().trim().max(64).optional(),
    set_id: zod_1.z.string().trim().optional(),
    finish: zod_1.z.enum(["NONFOIL", "FOIL", "ETCHED"]).optional(),
    treatment: zod_1.z.string().trim().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(24),
    offset: zod_1.z.coerce.number().int().min(0).default(0)
});
router.get("/", async (req, res) => {
    const p = listParams.parse(req.query);
    const values = [];
    const where = [];
    if (p.q) {
        values.push(p.q);
        where.push(`search_tsv @@ plainto_tsquery('simple', $${values.length})`);
    }
    if (p.set_id) {
        values.push(p.set_id);
        where.push(`set_id = $${values.length}`);
    }
    if (p.finish) {
        values.push(p.finish);
        where.push(`finish = $${values.length}`);
    }
    if (p.treatment) {
        values.push(p.treatment.toUpperCase());
        where.push(`treatment = $${values.length}`);
    }
    const sql = `
SELECT id, name, set_id, card_number, finish, treatment, border_color, frame_effect, sku
FROM cards
${where.length ? `WHERE ${where.join(" AND ")}` : ""}
ORDER BY set_id, card_number
LIMIT $${values.push(p.limit)} OFFSET $${values.push(p.offset)};
`;
    const rows = await (0, db_1.query)(sql, values);
    res.json({ items: rows, nextOffset: p.offset + p.limit });
});
