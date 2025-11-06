/**
 * Run Database Migration Script
 *
 * Usage: npx tsx scripts/run-migration.ts <migration-file>
 * Example: npx tsx scripts/run-migration.ts migrations/001_create_variation_display_overrides.sql
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration(migrationFile: string) {
  console.log(`\n🔄 Running migration: ${migrationFile}`);
  console.log('━'.repeat(60));

  try {
    // Read the SQL file
    const sqlPath = resolve(__dirname, migrationFile);
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log(`📖 Reading SQL from: ${sqlPath}`);

    // Execute the migration
    console.log('⚡ Executing SQL...\n');
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('━'.repeat(60));
  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Get migration file from command line
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('\n❌ Error: No migration file provided');
  console.error('\n📖 Usage: npx tsx scripts/run-migration.ts <migration-file>');
  console.error('\n📝 Example:');
  console.error('   npx tsx scripts/run-migration.ts migrations/001_create_variation_display_overrides.sql\n');
  process.exit(1);
}

runMigration(migrationFile);
