"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestPrice = getLatestPrice;
async function getLatestPrice(client, cardId) {
    const { rows } = await client.query(`SELECT price_cents FROM card_pricing WHERE card_id = $1 ORDER BY updated_at DESC NULLS LAST LIMIT 1`, [cardId]);
    return rows[0]?.price_cents ?? null;
}
