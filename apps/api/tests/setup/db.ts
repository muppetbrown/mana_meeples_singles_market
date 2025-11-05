// apps/api/tests/setup/db.ts
import pg from "pg";

function getClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set in test env");
  return new pg.Client({ connectionString: url });
}

/**
 * Seed a single card for basic tests
 */
export async function seedCards() {
  const client = getClient();
  await client.connect();
  try {
    await client.query(
      `INSERT INTO games (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [1, "Magic: The Gathering"]
    );
    
    // Need to create card_sets table if not exists
    await client.query(
      `CREATE TABLE IF NOT EXISTS card_sets (
        id integer PRIMARY KEY,
        name text NOT NULL,
        game_id integer NOT NULL
      )`
    );
    
    await client.query(
      `INSERT INTO card_sets (id, name, game_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [1, "Alpha", 1]
    );
    
    const res = await client.query(
      `INSERT INTO cards (id, game_id, set_id, card_number, finish, name, sku)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [1001, 1, 1, "001", "NONFOIL", "Lightning Bolt", "SKU-TEST-001"]
    );
    return res.rows[0]?.id ?? 1001;
  } finally {
    await client.end();
  }
}

/**
 * Seed multiple cards for pagination/filtering tests
 */
export async function seedMultipleCards() {
  const client = getClient();
  await client.connect();
  try {
    // Seed games
    await client.query(
      `INSERT INTO games (id, name) VALUES 
       (1, 'Magic: The Gathering'),
       (2, 'Pokemon TCG')
       ON CONFLICT (id) DO NOTHING`
    );
    
    // Seed card sets
    await client.query(
      `INSERT INTO card_sets (id, name, game_id) VALUES 
       (1, 'Alpha', 1),
       (2, 'Base Set', 2)
       ON CONFLICT (id) DO NOTHING`
    );

    // Seed multiple cards - now with game_id included
    const cards = [
      [1001, 1, 1, "001", "NONFOIL", "Lightning Bolt", "SKU-MTG-001"],
      [1002, 1, 1, "002", "FOIL", "Lightning Bolt", "SKU-MTG-002"],
      [1003, 1, 1, "003", "NONFOIL", "Black Lotus", "SKU-MTG-003"],
      [1004, 1, 1, "004", "NONFOIL", "Ancestral Recall", "SKU-MTG-004"],
      [1005, 2, 2, "001", "NONFOIL", "Pikachu", "SKU-PKM-001"],
      [1006, 2, 2, "002", "HOLOFOIL", "Charizard", "SKU-PKM-002"],
    ];

    for (const card of cards) {
      await client.query(
        `INSERT INTO cards (id, game_id, set_id, card_number, finish, name, sku)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        card
      );
    }

    return cards.map(c => c[0]);
  } finally {
    await client.end();
  }
}

/**
 * Seed inventory for cards
 */
export async function seedInventory(cardId: number, quantity: number = 10) {
  const client = getClient();
  await client.connect();
  try {
    // Ensure card_inventory table has the right structure
    await client.query(`
      CREATE TABLE IF NOT EXISTS card_inventory (
        id SERIAL PRIMARY KEY,
        card_id integer NOT NULL,
        variation_id integer,
        quality text NOT NULL,
        foil_type text NOT NULL,
        language text NOT NULL,
        price numeric(10,2) NOT NULL DEFAULT 0,
        stock_quantity integer NOT NULL DEFAULT 0,
        UNIQUE(card_id, variation_id, quality, foil_type, language)
      )
    `);
    
    // Create MULTIPLE variations to support tests that need 2+ variations
    const variations = [
      { quality: 'Near Mint', foil_type: 'Regular', language: 'English', price: 5.99 },
      { quality: 'Near Mint', foil_type: 'Foil', language: 'English', price: 12.99 },
      { quality: 'Lightly Played', foil_type: 'Regular', language: 'English', price: 4.99 },
    ];

    const insertedIds = [];
    
    for (const variation of variations) {
      const res = await client.query(
        `INSERT INTO card_inventory (card_id, variation_id, quality, foil_type, language, price, stock_quantity)
         VALUES ($1, NULL, $2, $3, $4, $5, $6)
         ON CONFLICT (card_id, variation_id, quality, foil_type, language) 
         DO UPDATE SET stock_quantity = EXCLUDED.stock_quantity
         RETURNING id`,
        [cardId, variation.quality, variation.foil_type, variation.language, variation.price, quantity]
      );
      insertedIds.push(res.rows[0]?.id);
    }

    return insertedIds[0];
  } finally {
    await client.end();
  }
}

/**
 * Create a test order
 */
export async function createTestOrder(customerId: number = 1) {
  const client = getClient();
  await client.connect();
  try {
    // Ensure orders table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_email text NOT NULL,
        customer_name text NOT NULL,
        subtotal numeric(10,2) NOT NULL,
        tax numeric(10,2) NOT NULL DEFAULT 0,
        shipping numeric(10,2) NOT NULL DEFAULT 0,
        total numeric(10,2) NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      )
    `);
    
    const res = await client.query(
      `INSERT INTO orders (customer_email, customer_name, total, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id`,
      ['test@example.com', 'Test Customer', 65.00, 'pending']
    );
    return res.rows[0]?.id;
  } finally {
    await client.end();
  }
}

/**
 * Get card by ID for assertions
 */
export async function getCardById(cardId: number) {
  const client = getClient();
  await client.connect();
  try {
    const res = await client.query(
      `SELECT * FROM cards WHERE id = $1`,
      [cardId]
    );
    return res.rows[0];
  } finally {
    await client.end();
  }
}

/**
 * Count total cards
 */
export async function countCards(): Promise<number> {
  const client = getClient();
  await client.connect();
  try {
    const res = await client.query(`SELECT COUNT(*)::int as count FROM cards`);
    return res.rows[0]?.count ?? 0;
  } finally {
    await client.end();
  }
}