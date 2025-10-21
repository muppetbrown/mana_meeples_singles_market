// apps/api/tests/setup/testEnv.ts
import { beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import pg from "pg";

let container: StartedPostgreSqlContainer | null = null;
let pool: pg.Pool | null = null;
let schemaBootstrapped = false;

export const getDb = () => {
  if (!pool) throw new Error("DB pool not initialized");
  return pool;
};

export async function startPostgres() {
  // Start a lightweight Postgres with explicit creds (v11 style)
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("testdb")
    .withUsername("testuser")
    .withPassword("testpw")
    .withStartupTimeout(120_000) // give Windows/Docker time
    .start();

  const connectionString = container.getConnectionUri();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = connectionString;

  pool = new pg.Pool({ connectionString });

  // Quick readiness + extension
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
  } finally {
    client.release();
  }
}

export async function stopPostgres() {
  await pool?.end();
  await container?.stop();
  pool = null;
  container = null;
  schemaBootstrapped = false;
}

/** Minimal schema to satisfy routes touched by tests */
export async function bootstrapMinimalSchema() {
  if (schemaBootstrapped) return;
  const db = getDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS games (
      id integer PRIMARY KEY,
      name text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cards (
      id integer PRIMARY KEY,
      set_id integer NOT NULL,
      card_number text NOT NULL,
      finish text NOT NULL,
      name text NOT NULL,
      sku text UNIQUE NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cards_name_trgm ON cards USING gin (name gin_trgm_ops);
  `);
  schemaBootstrapped = true;
}

/** Optional helper to wipe between tests */
export async function resetDb() {
  const db = getDb();
  await db.query(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'pg_%')
      LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
      END LOOP;
    END$$;
  `);
}

/** If you want auto start/stop for the whole suite, keep these hooks */
beforeAll(async () => {
  await startPostgres();
}, 120_000);

afterAll(async () => {
  await stopPostgres();
});
