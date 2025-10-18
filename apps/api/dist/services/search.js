"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchCards = searchCards;
async function searchCards(client, q, opts = {}) {
    const limit = Math.min(Math.max(opts.limit ?? 24, 1), 100);
    const offset = Math.max(opts.offset ?? 0, 0);
    // Uses GIN(search_tsv) and pg_trgm on name/number
    const { rows } = await client.query(`
SELECT id, name, set_id, card_number, finish, sku
FROM cards
WHERE search_tsv @@ plainto_tsquery('simple', $1)
OR name % $1
OR card_number % $1
ORDER BY similarity(name, $1) DESC, set_id ASC, card_number ASC
LIMIT $2 OFFSET $3
`, [q, limit, offset]);
    return rows;
}
