// apps/api/tests/setup/db.ts
import pg from "pg";

function getClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set in test env");
  return new pg.Client({ connectionString: url });
}

export async function seedCards() {
  const client = getClient();
  await client.connect();
  try {
    await client.query(
      `INSERT INTO games (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [1, "Magic: The Gathering"]
    );
    const res = await client.query(
      `INSERT INTO cards (id, set_id, card_number, finish, name, sku)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [1001, 1, "001", "NONFOIL", "Lightning Bolt", "SKU-TEST-001"]
    );
    return res.rows[0]?.id ?? 1001;
  } finally {
    await client.end();
  }
}
