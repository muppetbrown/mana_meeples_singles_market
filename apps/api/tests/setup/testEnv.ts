// apps/api/tests/setup/testEnv.ts
import { beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import pg from "pg";

let container: StartedPostgreSqlContainer | null = null;
let pool: pg.Pool | null = null;

export const getDb = () => {
  if (!pool) throw new Error("DB pool not initialized");
  return pool;
};

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

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();

  const connectionString = container.getConnectionUri();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = connectionString;

  pool = new pg.Pool({ connectionString });

  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
    // runMigrations(client) if you have migrations
  } finally {
    client.release();
  }
});

afterAll(async () => {
  await pool?.end();
  await container?.stop();
});
