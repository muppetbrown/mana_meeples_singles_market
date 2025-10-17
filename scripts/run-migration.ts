#!/usr/bin/env node

/**
 * Database Migration Runner
 * Usage: node scripts/run-migration.js [migration-file]
 * Example: node scripts/run-migration.js 003_add_fulltext_search.sql
 */

// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'fs'.
const fs = require('fs');
// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'path'.
const path = require('path');
// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'Pool'.
const { Pool } = require('pg');

// Database configuration
// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'pool'.
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mana_meeples',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function runMigration(migrationFile: any) {
  console.log(`\n🚀 Running migration: ${migrationFile}`);
  console.log('━'.repeat(60));

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');
    console.log(`📊 SQL size: ${migrationSQL.length} characters\n`);

    // Execute the migration
    const client = await pool.connect();

    try {
      console.log('⚡ Executing migration...');
      const startTime = Date.now();

      await client.query(migrationSQL);

      const duration = Date.now() - startTime;
      console.log(`✅ Migration completed successfully in ${duration}ms`);

      // Test the new indexes
      console.log('\n🔍 Testing new indexes...');

      const indexTest = await client.query(`
        SELECT
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE tablename IN ('cards', 'card_inventory')
        AND indexname LIKE 'idx_%'
        ORDER BY tablename, indexname;
      `);

      console.log(`📈 Found ${indexTest.rows.length} indexes:`);
      indexTest.rows.forEach((row: any) => {
        console.log(`   ${row.indexname} on ${row.tablename}`);
      });

      // Test search performance
      console.log('\n🎯 Testing search functionality...');

      const searchTest = await client.query(`
        SELECT COUNT(*) as total_cards FROM cards;
      `);

      console.log(`📦 Total cards in database: ${searchTest.rows[0].total_cards}`);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Migration failed:');
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    console.error(error.message);
    process.exit(1);
  }
}

async function main() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.log('📋 Available migrations:');
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter((f: any) => f.endsWith('.sql'));
    files.forEach((file: any) => console.log(`   ${file}`));
    console.log('\nUsage: node scripts/run-migration.js [migration-file]');
    console.log('Example: node scripts/run-migration.js 003_add_fulltext_search.sql');
    return;
  }

  await runMigration(migrationFile);

  console.log('\n🎉 All done!');
  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = { runMigration };