import { db } from "../lib/db.js";

export interface CardPrice {
  card_id: number;
  variation_id: number | null;
  currency: string;
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
  updated_at: string;
}

export async function getCurrentPrice(
  cardId: number,
  variationId?: number
): Promise<CardPrice | null> {
  const rows = await db.query<CardPrice>(
    `
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
    `,
    [cardId, variationId ?? null]
  );

  return rows[0] || null;
}

export async function getPriceHistory(
  cardId: number,
  limit = 30
): Promise<CardPrice[]> {
  const rows = await db.query<CardPrice>(
    `
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
    `,
    [cardId, limit]
  );

  return rows.reverse(); // oldest first
}

export async function upsertPrice(
  cardId: number,
  data: Omit<CardPrice, "card_id" | "updated_at">
): Promise<void> {
  const { variation_id, currency, low, mid, high, market } = data;
  await db.query(
    `
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
    `,
    [cardId, variation_id, currency, low, mid, high, market]
  );
}

export async function getSetAveragePrice(setId: number): Promise<number | null> {
  const rows = await db.query<{ avg_market: number | null }>(
    `
    SELECT AVG(market) AS avg_market
    FROM card_pricing
    WHERE card_id IN (SELECT id FROM cards WHERE set_id = $1)
      AND market IS NOT NULL;
    `,
    [setId]
  );

  return rows[0]?.avg_market ?? null;
}
