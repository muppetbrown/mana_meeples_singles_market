// scripts/export-database-schema.ts
/**
 * Database Schema Export Script
 * 
 * Generates comprehensive documentation of the database schema including:
 * - Table structures with columns, types, and constraints
 * - Foreign key relationships
 * - Indexes
 * - Sample data
 * - Row counts
 *
 * Usage:
 *   pnpm export:schema
 *   # or directly:
 *   pnpm tsx scripts/export-database-schema.ts
 */

import 'dotenv/config'; // Load environment variables FIRST
import { promises as fs } from 'fs';
import path from 'path';
import { Pool } from 'pg';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_SCHEMA = process.env.DB_SCHEMA || 'public';
const OUTPUT_DIR = path.resolve(process.cwd(), 'database');
const MD_PATH = path.join(OUTPUT_DIR, 'DATABASE_SCHEMA.md');
const JSON_PATH = path.join(OUTPUT_DIR, 'database-stats.json');
const SAMPLE_ROWS = 5;

// ============================================================================
// Types
// ============================================================================

type Row = Record<string, unknown>;

type ColumnInfo = {
  column_name: string;
  data_type: string;
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
};

type ForeignKeyInfo = {
  constraint_name: string;
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
  update_rule: string;
  delete_rule: string;
};

type IndexInfo = {
  index_name: string;
  indexdef: string;
  is_unique: boolean;
  is_primary: boolean;
};

type ConstraintInfo = {
  constraint_name: string;
  constraint_type: 'PRIMARY KEY' | 'UNIQUE' | 'CHECK' | 'FOREIGN KEY';
  definition?: string | null;
};

type TableInfo = {
  name: string;
  columns: ColumnInfo[];
  constraints: ConstraintInfo[];
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
  sampleRows: Row[];
  rowCount: number;
};

type SchemaDoc = {
  generatedAt: string;
  schema: string;
  tables: TableInfo[];
};

// ============================================================================
// Database Connection
// ============================================================================

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL || 'postgresql://tcg_admin:1FhON1ZvCR7bRry4L9UoonvorMD4BjAR@dpg-d3i3387diees738trbg0-a.singapore-postgres.render.com/tcg_singles';
  
  if (!connectionString) {
    console.error('\n❌ DATABASE_URL environment variable is not set');
    console.error('\n💡 Make sure you have a .env file in the project root with:');
    console.error('   DATABASE_URL=postgresql://user:password@host:port/database\n');
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('🔌 Connecting to database...');
  
  try {
    // Remove query params for URL parsing (split always returns at least one element)
    const baseUrl = connectionString.split('?')[0] || connectionString;
    const dbUrl = new URL(baseUrl);
    console.log(`   Host: ${dbUrl.hostname}`);
    console.log(`   Database: ${dbUrl.pathname.slice(1)}`);
    console.log(`   SSL: ${connectionString.includes('sslmode') ? 'Required' : 'Optional'}\n`);
  } catch (error) {
    console.log('   (Unable to parse connection details)\n');
  }

  // Detect if SSL is required from connection string or if using external host
  const requireSSL = connectionString.includes('sslmode=require') 
    || connectionString.includes('.render.com')
    || process.env.NODE_ENV === 'production';

  return new Pool({
    connectionString,
    ssl: requireSSL ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

// ============================================================================
// Query Functions
// ============================================================================

async function getTables(pool: Pool, schema: string): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = $1 
       AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
    [schema]
  );
  return rows.map((r: Row) => String(r.table_name));
}

async function getColumns(pool: Pool, schema: string, table: string): Promise<ColumnInfo[]> {
  const { rows } = await pool.query(
    `SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
     FROM information_schema.columns
     WHERE table_schema = $1 
       AND table_name = $2
     ORDER BY ordinal_position`,
    [schema, table]
  );
  return rows as ColumnInfo[];
}

async function getConstraints(pool: Pool, schema: string, table: string): Promise<ConstraintInfo[]> {
  const { rows } = await pool.query(
    `SELECT
        tc.constraint_name,
        tc.constraint_type,
        pg_get_constraintdef(con.oid) as definition
     FROM information_schema.table_constraints tc
     JOIN pg_constraint con
       ON con.conname = tc.constraint_name
      AND con.connamespace = (SELECT oid FROM pg_namespace WHERE nspname = $1)
     WHERE tc.table_schema = $1 
       AND tc.table_name = $2
     ORDER BY tc.constraint_type, tc.constraint_name`,
    [schema, table]
  );
  return rows as ConstraintInfo[];
}

async function getForeignKeys(pool: Pool, schema: string, table: string): Promise<ForeignKeyInfo[]> {
  const { rows } = await pool.query(
    `SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name as foreign_table_name,
        ccu.column_name as foreign_column_name,
        rc.update_rule,
        rc.delete_rule
     FROM information_schema.table_constraints as tc
     JOIN information_schema.key_column_usage as kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
     JOIN information_schema.referential_constraints as rc
       ON rc.constraint_name = tc.constraint_name
      AND rc.constraint_schema = tc.table_schema
     JOIN information_schema.constraint_column_usage as ccu
       ON ccu.constraint_name = rc.unique_constraint_name
      AND ccu.constraint_schema = rc.unique_constraint_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = $1
       AND tc.table_name = $2
     ORDER BY tc.constraint_name, kcu.ordinal_position`,
    [schema, table]
  );
  return rows as ForeignKeyInfo[];
}

async function getIndexes(pool: Pool, schema: string, table: string): Promise<IndexInfo[]> {
  const { rows } = await pool.query(
    `SELECT
        i.relname as index_name,
        pg_get_indexdef(ix.indexrelid) as indexdef,
        ix.indisunique as is_unique,
        ix.indisprimary as is_primary
     FROM pg_index ix
     JOIN pg_class i ON i.oid = ix.indexrelid
     JOIN pg_class t ON t.oid = ix.indrelid
     JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = $1 
       AND t.relname = $2
     ORDER BY ix.indisprimary DESC, i.relname`,
    [schema, table]
  );
  return rows as IndexInfo[];
}

async function getSample(pool: Pool, schema: string, table: string, limit = SAMPLE_ROWS): Promise<Row[]> {
  const safeLimit = Math.max(0, Math.min(limit, 100)); // Cap at 100
  const sql = `SELECT * FROM "${schema}"."${table}" LIMIT ${safeLimit}`;
  
  try {
    const { rows } = await pool.query(sql);
    return rows as Row[];
  } catch (error) {
    console.warn(`⚠️  Could not fetch sample rows from ${schema}.${table}:`, error instanceof Error ? error.message : String(error));
    return [];
  }
}

async function getRowCount(pool: Pool, schema: string, table: string): Promise<number> {
  try {
    const { rows } = await pool.query(
      `SELECT reltuples::bigint as estimate
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = $1 
         AND c.relname = $2`,
      [schema, table]
    );
    
    const estimate = rows[0]?.estimate;
    return typeof estimate === 'number' ? estimate : Number(estimate || 0);
  } catch (error) {
    console.warn(`⚠️  Could not fetch row count for ${schema}.${table}:`, error instanceof Error ? error.message : String(error));
    return 0;
  }
}

// ============================================================================
// Rendering Functions
// ============================================================================

function mdCode(lang: string, code: unknown): string {
  return '```' + lang + '\n' + String(code ?? '').trim() + '\n```';
}

function renderColumns(columns: ColumnInfo[]): string {
  if (!columns.length) return '_No columns found_';
  
  const header = `| Column | Type | Null | Default | Length/Precision |
|--------|------|------|---------|------------------|`;
  
  const rows = columns.map((c) => {
    const len = c.character_maximum_length 
      ?? (c.numeric_precision != null 
        ? `${c.numeric_precision}${c.numeric_scale != null ? `,${c.numeric_scale}` : ''}` 
        : '');
    
    return `| \`${c.column_name}\` | \`${c.data_type}\` | \`${c.is_nullable}\` | \`${c.column_default ?? ''}\` | \`${len ?? ''}\` |`;
  });
  
  return [header, ...rows].join('\n');
}

function renderConstraints(constraints: ConstraintInfo[]): string {
  if (!constraints.length) return '_None_';
  
  return constraints
    .map((c) => {
      const def = c.definition ? `\n${mdCode('sql', c.definition)}` : '';
      return `- **${c.constraint_type}** \`${c.constraint_name}\`${def}`;
    })
    .join('\n');
}

function renderForeignKeys(fks: ForeignKeyInfo[]): string {
  if (!fks.length) return '_None_';
  
  return fks
    .map((fk) =>
      `- \`${fk.column_name}\` → \`${fk.foreign_table_name}.${fk.foreign_column_name}\` ` +
      `(on update ${fk.update_rule.toLowerCase()}, on delete ${fk.delete_rule.toLowerCase()})`
    )
    .join('\n');
}

function renderIndexes(idxs: IndexInfo[]): string {
  if (!idxs.length) return '_None_';
  
  return idxs
    .map((i) => {
      const badges = [
        i.is_primary ? '**PRIMARY**' : '',
        i.is_unique ? '**UNIQUE**' : '',
      ].filter(Boolean).join(' ');
      
      return `- ${badges} \`${i.index_name}\`\n${mdCode('sql', i.indexdef)}`;
    })
    .join('\n\n');
}

function renderSampleRows(rows: Row[]): string {
  if (!rows.length) return '';
  
  return `### Sample Rows\n\n${mdCode('json', JSON.stringify(rows, null, 2))}\n\n`;
}

// ============================================================================
// Schema Exporter Class
// ============================================================================

class SchemaExporter {
  private schema: string;
  private pool: Pool;

  constructor(schema = DEFAULT_SCHEMA) {
    this.schema = schema;
    this.pool = createPool();
  }

  async generate(): Promise<SchemaDoc> {
    console.log(`📊 Scanning schema: ${this.schema}`);
    
    // Test connection first
    try {
      await this.pool.query('SELECT 1');
      console.log('✅ Database connection successful\n');
    } catch (error) {
      console.error('❌ Database connection failed:');
      if (error instanceof Error) {
        console.error(`   ${error.message}`);
      }
      throw error;
    }
    
    const tables = await getTables(this.pool, this.schema);
    console.log(`📋 Found ${tables.length} tables\n`);
    
    if (tables.length === 0) {
      console.warn(`⚠️  No tables found in schema "${this.schema}"`);
    }

    const details: TableInfo[] = [];
    
    for (const table of tables) {
      process.stdout.write(`   Processing: ${table}...`);
      
      try {
        const [columns, constraints, fks, idxs, sample, count] = await Promise.all([
          getColumns(this.pool, this.schema, table),
          getConstraints(this.pool, this.schema, table),
          getForeignKeys(this.pool, this.schema, table),
          getIndexes(this.pool, this.schema, table),
          getSample(this.pool, this.schema, table, SAMPLE_ROWS),
          getRowCount(this.pool, this.schema, table),
        ]);
        
        details.push({
          name: table,
          columns,
          constraints,
          foreignKeys: fks,
          indexes: idxs,
          sampleRows: sample,
          rowCount: count,
        });
        
        console.log(` ✓ (${count.toLocaleString()} rows)`);
      } catch (error) {
        console.log(` ✗`);
        console.error(`   Error processing table "${table}":`, error instanceof Error ? error.message : String(error));
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      schema: this.schema,
      tables: details,
    };
  }

  async writeFiles(doc: SchemaDoc): Promise<void> {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Generate Markdown documentation
    console.log(`\n📝 Generating documentation...`);
    const markdown = this.generateMarkdown(doc);
    await fs.writeFile(MD_PATH, markdown, 'utf8');
    console.log(`   ✓ ${MD_PATH}`);

    // Generate JSON stats
    const stats = {
      generatedAt: doc.generatedAt,
      schema: doc.schema,
      tableCount: doc.tables.length,
      tableCounts: Object.fromEntries(
        doc.tables.map((t) => [t.name, t.rowCount])
      ),
      totalRows: doc.tables.reduce((sum, t) => sum + t.rowCount, 0),
    };
    
    await fs.writeFile(JSON_PATH, JSON.stringify(stats, null, 2), 'utf8');
    console.log(`   ✓ ${JSON_PATH}`);
  }

  private generateMarkdown(doc: SchemaDoc): string {
    let md = `# Database Schema — \`${this.schema}\`\n\n`;
    md += `**Generated:** ${new Date(doc.generatedAt).toLocaleString()}\n\n`;
    md += `**Tables:** ${doc.tables.length}\n\n`;
    md += `**Total Rows:** ${doc.tables.reduce((sum, t) => sum + t.rowCount, 0).toLocaleString()}\n\n`;
    md += `---\n\n`;

    for (const t of doc.tables) {
      md += `## 📋 ${t.name}\n\n`;
      md += `**Row Count:** ${t.rowCount.toLocaleString()}\n\n`;
      md += `### Columns\n\n${renderColumns(t.columns)}\n\n`;
      md += `### Constraints\n\n${renderConstraints(t.constraints)}\n\n`;
      md += `### Foreign Keys\n\n${renderForeignKeys(t.foreignKeys)}\n\n`;
      md += `### Indexes\n\n${renderIndexes(t.indexes)}\n\n`;
      md += renderSampleRows(t.sampleRows);
      md += `---\n\n`;
    }

    return md;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('🚀 Database Schema Exporter\n');
  
  const startTime = Date.now();
  let exporter: SchemaExporter | null = null;

  try {
    const schema = process.env.DB_SCHEMA || DEFAULT_SCHEMA;
    exporter = new SchemaExporter(schema);
    
    const doc = await exporter.generate();
    await exporter.writeFiles(doc);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Schema documentation generated successfully in ${duration}s`);
    console.log(`📂 Output directory: ${OUTPUT_DIR}`);
    
  } catch (err) {
    console.error('\n❌ Error generating schema documentation:');
    
    if (err instanceof Error) {
      console.error(`   ${err.message}`);
      
      if (err.message.includes('DATABASE_URL')) {
        console.error('\n💡 Tip: Make sure your .env file contains DATABASE_URL');
      }
      
      if (process.env.DEBUG) {
        console.error('\nStack trace:');
        console.error(err.stack);
      }
    } else {
      console.error(String(err));
    }
    
    process.exitCode = 1;
  } finally {
    if (exporter) {
      try {
        await exporter.close();
      } catch (closeError) {
        // Ignore close errors
      }
    }
  }
}

// Always run when executed directly (simplified for cross-platform compatibility)
main();

// Export for reuse in other scripts/tests
export { SchemaExporter };