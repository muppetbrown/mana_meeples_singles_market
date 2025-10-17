import type { PoolClient } from 'pg';


export async function getLatestPrice(client: PoolClient, cardId: number) {
const { rows } = await client.query<{ price_cents: number }>(
`SELECT price_cents FROM card_pricing WHERE card_id = $1 ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
[cardId]
);
return rows[0]?.price_cents ?? null;
}