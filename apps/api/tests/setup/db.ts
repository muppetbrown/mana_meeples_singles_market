// apps/api/tests/setup/db.ts
import { getDb } from "./testEnv.js";

export async function seedCards() {
  const db = getDb();
  // Insert the minimum viable records you need; align columns to your schema
  await db.query(`
    INSERT INTO games (id, name) VALUES
      (1, 'Magic: The Gathering')
    ON CONFLICT DO NOTHING;
  `);

  const res = await db.query(
    `INSERT INTO cards (id, set_id, card_number, finish, name, sku)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [1001, 1, '001', 'NONFOIL', 'Lightning Bolt', 'SKU-TEST-001']
  );
  return res.rows[0]?.id ?? 1001;
}
