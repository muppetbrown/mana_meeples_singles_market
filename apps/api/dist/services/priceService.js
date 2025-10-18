"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentPrice = getCurrentPrice;
exports.getPriceHistory = getPriceHistory;
exports.upsertPrice = upsertPrice;
exports.getSetAveragePrice = getSetAveragePrice;
const db_js_1 = require("../lib/db.js");
async function getCurrentPrice(cardId, variationId) {
    const rows = await db_js_1.db.query(`
    SELECT 
      card_id,
      variation_id,
      currency,
      low,
      mid,
      high,
      market,
      updated_at
    FROM card_pricing
    WHERE card_id = $1
      AND ($2::int IS NULL OR variation_id = $2)
    ORDER BY updated_at DESC
    LIMIT 1;
    `, [cardId, variationId ?? null]);
    return rows[0] || null;
}
async function getPriceHistory(cardId, limit = 30) {
    const rows = await db_js_1.db.query(`
    SELECT 
      card_id,
      variation_id,
      currency,
      low,
      mid,
      high,
      market,
      updated_at
    FROM price_history
    WHERE card_id = $1
    ORDER BY updated_at DESC
    LIMIT $2;
    `, [cardId, limit]);
    return rows.reverse(); // oldest first
}
async function upsertPrice(cardId, data) {
    const { variation_id, currency, low, mid, high, market } = data;
    await db_js_1.db.query(`
    INSERT INTO card_pricing (
      card_id, variation_id, currency, low, mid, high, market, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    ON CONFLICT (card_id, variation_id, currency)
    DO UPDATE SET
      low = EXCLUDED.low,
      mid = EXCLUDED.mid,
      high = EXCLUDED.high,
      market = EXCLUDED.market,
      updated_at = NOW();
    `, [cardId, variation_id, currency, low, mid, high, market]);
}
async function getSetAveragePrice(setId) {
    const rows = await db_js_1.db.query(`
    SELECT AVG(market) AS avg_market
    FROM card_pricing
    WHERE card_id IN (SELECT id FROM cards WHERE set_id = $1)
      AND market IS NOT NULL;
    `, [setId]);
    return rows[0]?.avg_market ?? null;
}
