// scripts/export-database-schema.ts
/**
 * Database Schema Export Script (TypeScript, ESM-compatible)
 *
 * Updated to use the modern database system for consistency.
 *
 * Usage:
 *   pnpm ts-node scripts/export-database-schema.ts
 *   # or with tsx:
 *   pnpm tsx scripts/export-database-schema.ts
 */

import { promises as fs } from 'fs';
import path from 'path';
import { Pool } from 'pg';

// Create a simple pool for scripts (avoiding complex env.js dependencies)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

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

type SchemaDoc = {
  generatedAt: string;
  schema: string;
  tables: Array<{
    name: string;
    columns: ColumnInfo[];
    constraints: ConstraintInfo[];
    foreignKeys: ForeignKeyInfo[];
    indexes: IndexInfo[];
    sampleRows: Row[];
    rowCount: number;
  }>;
};

const DEFAULT_SCHEMA = process.env.DB_SCHEMA || 'public';
const OUTPUT_DIR = path.resolve(process.cwd(), 'docs');
const MD_PATH = path.join(OUTPUT_DIR, 'DATABASE_SCHEMA.md');
const JSON_PATH = path.join(OUTPUT_DIR, 'database-stats.json');

function mdCode(lang: string, code: unknown): string {
  return '```' + lang + '\n' + String(code ?? '').trim() + '\n```';
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function getTables(schema: string): Promise<string[]> {
  const { rows } = await pool.query(
    `select table_name
     from information_schema.tables
     where table_schema = $1 and table_type='BASE TABLE'
     order by table_name`,
    [schema]
  );
  return rows.map((r: Row) => String(r.table_name));
}

async function getColumns(schema: string, table: string): Promise<ColumnInfo[]> {
  const { rows } = await pool.query(
    `select
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
     from information_schema.columns
     where table_schema = $1 and table_name = $2
     order by ordinal_position`,
    [schema, table]
  );
  return rows as ColumnInfo[];
}

async function getConstraints(schema: string, table: string): Promise<ConstraintInfo[]> {
  const { rows } = await pool.query(
    `select
        tc.constraint_name,
        tc.constraint_type,
        pg_get_constraintdef(con.oid) as definition
     from information_schema.table_constraints tc
     join pg_constraint con
       on con.conname = tc.constraint_name
      and con.connamespace = (select oid from pg_namespace where nspname = $1)
     where tc.table_schema = $1 and tc.table_name = $2
     order by tc.constraint_type, tc.constraint_name`,
    [schema, table]
  );
  return rows as ConstraintInfo[];
}

async function getForeignKeys(schema: string, table: string): Promise<ForeignKeyInfo[]> {
  const { rows } = await pool.query(
    `select
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name as foreign_table_name,
        ccu.column_name as foreign_column_name,
        rc.update_rule,
        rc.delete_rule
     from information_schema.table_constraints as tc
     join information_schema.key_column_usage as kcu
       on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
     join information_schema.referential_constraints as rc
       on rc.constraint_name = tc.constraint_name
      and rc.constraint_schema = tc.table_schema
     join information_schema.constraint_column_usage as ccu
       on ccu.constraint_name = rc.unique_constraint_name
      and ccu.constraint_schema = rc.unique_constraint_schema
     where tc.constraint_type = 'FOREIGN KEY'
       and tc.table_schema = $1
       and tc.table_name = $2
     order by tc.constraint_name, kcu.ordinal_position`,
    [schema, table]
  );
  return rows as ForeignKeyInfo[];
}

async function getIndexes(schema: string, table: string): Promise<IndexInfo[]> {
  const { rows } = await pool.query(
    `select
        i.relname as index_name,
        pg_get_indexdef(ix.indexrelid) as indexdef,
        ix.indisunique as is_unique,
        ix.indisprimary as is_primary
     from pg_index ix
     join pg_class i on i.oid = ix.indexrelid
     join pg_class t on t.oid = ix.indrelid
     join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = $1 and t.relname = $2
     order by ix.indisprimary desc, i.relname`,
    [schema, table]
  );
  return rows as IndexInfo[];
}

function qIdent(name: string): string {
  // Quote an identifier safely for Postgres: "my""name"
  return '"' + String(name).replace(/"/g, '""') + '"';
}

async function getSample(schema: string, table: string, limit = 5): Promise<Row[]> {
  const sql = `select * from ${qIdent(schema)}.${qIdent(table)} limit ${Math.max(0, limit)}`;
  const { rows } = await pool.query(sql);
  return rows as Row[];
}

async function getRowCount(schema: string, table: string): Promise<number> {
  const { rows } = await pool.query(
    `select reltuples::bigint as estimate
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = $1 and c.relname = $2`,
    [schema, table]
  );
  const v = (rows && rows[0] && (rows[0] as any).estimate) ?? 0;
  return typeof v === 'number' ? v : Number(v);
}

function renderColumns(columns: ColumnInfo[]): string {
  if (!columns.length) return '_No columns found_';
  const header = `| Column | Type | Null | Default | Length/Precision |
|---|---|---|---|---|`;
  const rows = columns.map((c) => {
    const len =
      c.character_maximum_length ??
      (c.numeric_precision != null ? `${c.numeric_precision}${c.numeric_scale != null ? `,${c.numeric_scale}` : ''}` : '');
    return `| \`${c.column_name}\` | \`${c.data_type}\` | \`${c.is_nullable}\` | \`${c.column_default ?? ''}\` | \`${len ?? ''}\` |`;
  });
  return [header, ...rows].join('\n');
}

function renderConstraints(constraints: ConstraintInfo[]): string {
  if (!constraints.length) return '_None_';
  return constraints
    .map((c) => `- **${c.constraint_type}** \`${c.constraint_name}\`${c.definition ? `\n${mdCode('sql', c.definition)}` : ''}`)
    .join('\n');
}

function renderFKs(fks: ForeignKeyInfo[]): string {
  if (!fks.length) return '_None_';
  return fks
    .map(
      (fk) =>
        `- \`${fk.column_name}\` → \`${fk.foreign_table_name}.${fk.foreign_column_name}\` ` +
        `(on update ${fk.update_rule.toLowerCase()}, on delete ${fk.delete_rule.toLowerCase()})`
    )
    .join('\n');
}

function renderIndexes(idxs: IndexInfo[]): string {
  if (!idxs.length) return '_None_';
  return idxs
    .map((i) => `- ${i.is_primary ? '**PRIMARY** ' : ''}${i.is_unique ? '**UNIQUE** ' : ''}\`${i.index_name}\`\n${mdCode('sql', i.indexdef)}`)
    .join('\n\n');
}

class SchemaExporter {
  private schema: string;
  constructor(schema = DEFAULT_SCHEMA) {
    this.schema = schema;
  }

  async generate() {
    const tables = await getTables(this.schema);
    const details: SchemaDoc['tables'] = [];
    for (const table of tables) {
      const [columns, constraints, fks, idxs, sample, count] = await Promise.all([
        getColumns(this.schema, table),
        getConstraints(this.schema, table),
        getForeignKeys(this.schema, table),
        getIndexes(this.schema, table),
        getSample(this.schema, table, 5),
        getRowCount(this.schema, table),
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
    }
    const doc: SchemaDoc = {
      generatedAt: new Date().toISOString(),
      schema: this.schema,
      tables: details,
    };
    return doc;
  }

  async writeFiles(doc: SchemaDoc): Promise<void> {
    await ensureDir(OUTPUT_DIR);
    // Markdown
    let md = `# Database Schema — schema \`${this.schema}\`\n\n`;
    md += `Generated: ${new Date().toISOString()}\n\n`;
    for (const t of doc.tables) {
      md += `## ${t.name}\n\n`;
      md += `Row estimate: \`${t.rowCount}\`\n\n`;
      md += `### Columns\n\n${renderColumns(t.columns)}\n\n`;
      md += `### Constraints\n\n${renderConstraints(t.constraints)}\n\n`;
      md += `### Foreign Keys\n\n${renderFKs(t.foreignKeys)}\n\n`;
      md += `### Indexes\n\n${renderIndexes(t.indexes)}\n\n`;
      if (t.sampleRows.length) {
        md += `### Sample Rows\n\n\`\`\`json\n${JSON.stringify(t.sampleRows, null, 2)}\n\`\`\`\n\n`;
      }
    }
    await fs.writeFile(MD_PATH, md, 'utf8');

    // JSON stats (compact, machine-readable)
    const stats = {
      generatedAt: doc.generatedAt,
      schema: doc.schema,
      tableCounts: Object.fromEntries(doc.tables.map((t) => [t.name, t.rowCount])),
    };
    await fs.writeFile(JSON_PATH, JSON.stringify(stats, null, 2), 'utf8');
  }
}

async function main() {
  try {
    const schema = process.env.DB_SCHEMA || DEFAULT_SCHEMA;
    const exporter = new SchemaExporter(schema);
    const doc = await exporter.generate();
    await exporter.writeFiles(doc);
    // eslint-disable-next-line no-console
    console.log(`✅ Schema docs written to:\n- ${MD_PATH}\n- ${JSON_PATH}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('❌ Error generating schema documentation:', err);
    process.exitCode = 1;
  } finally {
    try {
      await pool.end?.();
    } catch {
      // ignore
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}

// Export for reuse in other scripts/tests
export { SchemaExporter };
