// apps/api/tests/setup/testEnv.ts
import { beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import pg from "pg";
import { writeFile, appendFile, mkdir } from "fs/promises";
import { join } from "path";

let container: StartedPostgreSqlContainer | null = null;
let pool: pg.Pool | null = null;
let schemaBootstrapped = false;

// Singleton control - prevents duplicate initialization
let initializationPromise: Promise<void> | null = null;
let isInitialized = false;

// Configuration for logging - both formats
const LOG_DIR = join(process.cwd(), "test-logs");
const timestamp = Date.now();
const JSON_LOG_FILE = join(LOG_DIR, `test-env-${timestamp}.json`);
const TXT_LOG_FILE = join(LOG_DIR, `test-env-${timestamp}.txt`);
const startTime = Date.now();

interface LogEntry {
  timestamp: string;
  event: string;
  details?: Record<string, unknown>;
}

// Store all entries for JSON output
const logEntries: LogEntry[] = [];
let finalized = false;

/** Write a log entry to both files */
async function log(event: string, details?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...(details && { details }),
  };
  
  // Store for JSON file
  logEntries.push(entry);
  
  // Format for text file
  const textLine = formatTextEntry(entry);
  
  try {
    // Append to text file immediately
    await appendFile(TXT_LOG_FILE, textLine, "utf-8");
  } catch (error) {
    console.warn("Failed to write to log files:", error);
  }
}

/** Format a log entry for human-readable text */
function formatTextEntry(entry: LogEntry): string {
  const time = new Date(entry.timestamp).toLocaleTimeString();
  let line = `[${time}] ${entry.event}`;
  
  if (entry.details) {
    const detailsStr = Object.entries(entry.details)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(", ");
    line += ` | ${detailsStr}`;
  }
  
  return line + "\n";
}

/** Initialize both log files with headers */
async function initializeLog() {
  try {
    await mkdir(LOG_DIR, { recursive: true });
    
    // Text file header
    const txtHeader = `
═══════════════════════════════════════════════════
  Test Environment Log
  Started: ${new Date().toISOString()}
  Node: ${process.version}
  Platform: ${process.platform}
  Log Files:
    - JSON: test-env-${timestamp}.json
    - TXT:  test-env-${timestamp}.txt
═══════════════════════════════════════════════════

`;
    await writeFile(TXT_LOG_FILE, txtHeader, "utf-8");
    
    console.log(`📝 Test logging initialized:\n   JSON: ${JSON_LOG_FILE}\n   TXT:  ${TXT_LOG_FILE}`);
  } catch (error) {
    console.warn("Failed to initialize log files:", error);
  }
}

/** Finalize both logs with summary */
async function finalizeLog() {
  // Prevent multiple calls from overwriting metadata
  if (finalized) return;
  finalized = true;
  
  const duration = Date.now() - startTime;
  const endTimestamp = new Date().toISOString();
  
  // Text file summary
  const txtSummary = `
═══════════════════════════════════════════════════
  Test Environment Summary
  Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)
  Ended: ${endTimestamp}
  Total Events: ${logEntries.length}
  Container Initialized: ${isInitialized}
  Schema Bootstrapped: ${schemaBootstrapped}
═══════════════════════════════════════════════════
`;
  
  try {
    await appendFile(TXT_LOG_FILE, txtSummary, "utf-8");
  } catch (error) {
    console.warn("Failed to finalize text log:", error);
  }
  
  // JSON file - complete structured output
  const jsonOutput = {
    metadata: {
      started: logEntries[0]?.timestamp || new Date(startTime).toISOString(),
      ended: endTimestamp,
      duration_ms: duration,
      node_version: process.version,
      platform: process.platform,
      total_events: logEntries.length,
      container_initialized: isInitialized,
      schema_bootstrapped: schemaBootstrapped,
    },
    events: logEntries,
  };
  
  try {
    await writeFile(JSON_LOG_FILE, JSON.stringify(jsonOutput, null, 2), "utf-8");
    console.log(`\n✅ Test environment logs written:\n   📄 ${TXT_LOG_FILE}\n   📊 ${JSON_LOG_FILE}`);
  } catch (error) {
    console.warn("Failed to write JSON log:", error);
  }
}

export const getDb = () => {
  if (!pool) {
    const error = new Error("DB pool not initialized - did you call startPostgres()?");
    log("ERROR: getDb called before initialization", { 
      stack: error.stack,
      isInitialized,
      hasPool: !!pool,
      hasContainer: !!container,
    }).catch(console.error);
    throw error;
  }
  return pool;
};

export async function startPostgres() {
  // If already initialized, just return
  if (isInitialized && container && pool) {
    await log("PostgreSQL already initialized", { 
      reused: true,
      port: container.getPort(),
    });
    return;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    await log("Waiting for ongoing initialization");
    await initializationPromise;
    return;
  }

  // Start new initialization
  initializationPromise = (async () => {
    try {
      await initializeLog();
      await log("Starting PostgreSQL container");
      
      const containerStartTime = Date.now();
      
      // Start a lightweight Postgres with explicit creds
      container = await new PostgreSqlContainer("postgres:16-alpine")
        .withDatabase("testdb")
        .withUsername("testuser")
        .withPassword("testpw")
        .withStartupTimeout(120_000)
        .start();

      const containerDuration = Date.now() - containerStartTime;
      const connectionString = container.getConnectionUri();
      
      // Log with sensitive info masked
      await log("PostgreSQL container started", {
        duration_ms: containerDuration,
        host: container.getHost(),
        port: container.getPort(),
        database: "testdb",
        connection_available: true,
      });
      
      process.env.NODE_ENV = "test";
      process.env.DATABASE_URL = connectionString;

      pool = new pg.Pool({ connectionString });

      // Quick readiness + extension
      const client = await pool.connect();
      try {
        await client.query("SELECT 1");
        await log("Database connection verified");
        
        await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
        await log("PostgreSQL extensions installed", {
          extensions: ["pg_trgm"],
        });
      } finally {
        client.release();
      }

      isInitialized = true;
      await log("PostgreSQL initialization complete", {
        success: true,
        ready_for_tests: true,
      });

    } catch (error) {
      await log("PostgreSQL initialization FAILED", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  })();

  await initializationPromise;
  initializationPromise = null;
}

export async function stopPostgres() {
  if (!container && !pool) {
    await log("PostgreSQL already stopped or never started", {
      skipped: true,
    });
    // Don't finalize here - let the global afterAll do it
    return;
  }

  await log("Stopping PostgreSQL container");
  
  try {
    await pool?.end();
    await container?.stop();
    
    await log("PostgreSQL container stopped", {
      success: true,
    });
    
    // Capture final state BEFORE resetting
    await finalizeLog();
    
    // Now reset state
    pool = null;
    container = null;
    schemaBootstrapped = false;
    isInitialized = false;
    
  } catch (error) {
    await log("Error stopping PostgreSQL", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Still finalize logs on error
    await finalizeLog();
    throw error;
  }
}

/** Minimal schema to satisfy routes touched by tests */
export async function bootstrapMinimalSchema() {
  if (schemaBootstrapped) {
    await log("Schema already bootstrapped", { skipped: true });
    return;
  }

  if (!isInitialized || !pool) {
    const error = new Error("Cannot bootstrap schema - database not initialized");
    await log("ERROR: bootstrapMinimalSchema called before initialization", {
      isInitialized,
      hasPool: !!pool,
      hasContainer: !!container,
    });
    throw error;
  }
  
  await log("Bootstrapping minimal schema");
  const db = getDb();
  
  try {
    await db.query(`
      -- Core tables
      CREATE TABLE IF NOT EXISTS games (
        id integer PRIMARY KEY,
        name text NOT NULL,
        code text
      );
      
      CREATE TABLE IF NOT EXISTS card_sets (
        id integer PRIMARY KEY,
        name text NOT NULL,
        code text,
        game_id integer NOT NULL REFERENCES games(id)
      );
      
      CREATE TABLE IF NOT EXISTS cards (
        id integer PRIMARY KEY,
        set_id integer NOT NULL REFERENCES card_sets(id),
        game_id integer NOT NULL REFERENCES games(id),
        card_number text NOT NULL,
        finish text,
        name text NOT NULL,
        rarity text,
        image_url text,
        treatment text,
        sku text UNIQUE NOT NULL
      );
      
      -- Pricing table (critical for storefront queries)
      CREATE TABLE IF NOT EXISTS card_pricing (
        id SERIAL PRIMARY KEY,
        card_id integer NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        base_price numeric(10,2) NOT NULL DEFAULT 0,
        foil_price numeric(10,2) NOT NULL DEFAULT 0,
        price_source varchar(50) DEFAULT 'manual',
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(card_id)
      );
      
      -- Inventory table (critical for stock management)
      CREATE TABLE IF NOT EXISTS card_inventory (
        id SERIAL PRIMARY KEY,
        card_id integer NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        variation_id integer,
        quality text NOT NULL,
        foil_type text DEFAULT 'Regular',
        language text DEFAULT 'English',
        price numeric(10,2) NOT NULL,
        stock_quantity integer NOT NULL DEFAULT 0,
        price_source text DEFAULT 'manual',
        sku text UNIQUE,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(card_id, variation_id, quality, foil_type, language)
      );
      
      -- Orders table (for checkout flow)
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_email text NOT NULL,
        customer_name text NOT NULL,
        customer_address text,
        customer_phone text,
        total numeric(10,2) NOT NULL,
        currency text DEFAULT 'NZD',
        status text NOT NULL DEFAULT 'pending',
        notes text,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Order items table
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        inventory_id integer NOT NULL REFERENCES card_inventory(id),
        card_id integer NOT NULL REFERENCES cards(id),
        card_name text NOT NULL,
        quantity integer NOT NULL,
        price numeric(10,2) NOT NULL,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_cards_name_trgm 
        ON cards USING gin (name gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_card_pricing_card_id 
        ON card_pricing(card_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_card_id 
        ON card_inventory(card_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_stock 
        ON card_inventory(stock_quantity);
      CREATE INDEX IF NOT EXISTS idx_orders_status 
        ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
        ON order_items(order_id);
    `);
    
    schemaBootstrapped = true;
    await log("Schema bootstrap complete", {
      tables: ["games", "card_sets", "cards", "card_pricing", "card_inventory", "orders", "order_items"],
      indexes: [
        "idx_cards_name_trgm", 
        "idx_card_pricing_card_id", 
        "idx_inventory_card_id", 
        "idx_inventory_stock", 
        "idx_orders_status", 
        "idx_order_items_order_id"
      ],
      success: true,
    });
  } catch (error) {
    await log("Schema bootstrap FAILED", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    schemaBootstrapped = false;
    throw error;
  }
}

/** Optional helper to wipe between tests */
export async function resetDb() {
  if (!isInitialized || !pool) {
    const error = new Error("Cannot reset database - not initialized");
    await log("ERROR: resetDb called before initialization", {
      isInitialized,
      hasPool: !!pool,
    });
    throw error;
  }

  await log("Resetting database");
  const db = getDb();
  
  try {
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
    
    await log("Database reset complete", {
      success: true,
    });
  } catch (error) {
    await log("Database reset FAILED", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Global hooks - these run once for the entire test suite */
beforeAll(async () => {
  await log("Global beforeAll hook triggered");
  await startPostgres();
}, 120_000);

afterAll(async () => {
  await log("Global afterAll hook triggered");
  await stopPostgres();
  // Always finalize, even if container was already stopped
  await finalizeLog();
});