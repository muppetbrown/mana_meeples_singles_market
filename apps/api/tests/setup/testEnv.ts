// apps/api/tests/setup/testEnv.ts
import { beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import pg from "pg";
import { writeFile, appendFile, mkdir } from "fs/promises";
import { join } from "path";

let container: StartedPostgreSqlContainer | null = null;
let pool: pg.Pool | null = null;
let schemaBootstrapped = false;
let initializationPromise: Promise<void> | null = null;

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
═══════════════════════════════════════════════════

`;
    await writeFile(TXT_LOG_FILE, txtHeader, "utf-8");
    
    // JSON file will be written at the end with all entries
    console.log(`📝 Logging to:\n   JSON: ${JSON_LOG_FILE}\n   TXT:  ${TXT_LOG_FILE}`);
  } catch (error) {
    console.warn("Failed to initialize log files:", error);
  }
}

/** Finalize both logs with summary */
async function finalizeLog() {
  const duration = Date.now() - startTime;
  const endTimestamp = new Date().toISOString();
  
  // Text file summary
  const txtSummary = `
═══════════════════════════════════════════════════
  Test Environment Summary
  Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)
  Ended: ${endTimestamp}
  Total Events: ${logEntries.length}
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
  if (!pool) throw new Error("DB pool not initialized");
  return pool;
};

export async function startPostgres() {
  // Prevent duplicate initialization
  if (initializationPromise) {
    await initializationPromise;
    return;
  }
  
  if (container && pool) {
    await log("PostgreSQL already running", { reused: true });
    return;
  }

  initializationPromise = (async () => {
    await initializeLog();
    await log("Starting PostgreSQL container");
    
    // ... rest of your startup code
  })();
  
  await initializationPromise;
  initializationPromise = null;
}

export async function stopPostgres() {
  await log("Stopping PostgreSQL container");
  
  await pool?.end();
  await container?.stop();
  
  pool = null;
  container = null;
  schemaBootstrapped = false;
  
  await log("PostgreSQL container stopped");
  await finalizeLog();
}

/** Minimal schema to satisfy routes touched by tests */
export async function bootstrapMinimalSchema() {
  if (schemaBootstrapped) {
    await log("Schema already bootstrapped", { skipped: true });
    return;
  }
  
  await log("Bootstrapping minimal schema");
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
  await log("Schema bootstrap complete", {
    tables: ["games", "cards"],
    indexes: ["idx_cards_name_trgm"],
  });
}

/** Optional helper to wipe between tests */
export async function resetDb() {
  await log("Resetting database");
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
  
  await log("Database reset complete");
}