#!/usr/bin/env tsx

/**
 * Migration: Add Unique Constraint to card_inventory
 *
 * This script adds the missing UNIQUE constraint on (card_id, quality, language)
 * which is required for the UPSERT operation in the inventory API to work.
 *
 * Error being fixed:
 * "there is no unique or exclusion constraint matching the ON CONFLICT specification"
 * Code: 42P10
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const { Pool } = pg;

// Database configuration from environment or defaults
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mana_meeples',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function runMigration() {
  console.log('\n🚀 Running Migration: Add Inventory Unique Constraint');
  console.log('━'.repeat(60));

  const client = await pool.connect();

  try {
    // Read the SQL migration file
    const sqlPath = join(__dirname, 'add-inventory-unique-constraint.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    console.log('📄 Migration SQL loaded');
    console.log('⚡ Executing migration...\n');

    // Execute the migration
    await client.query(sql);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n🔍 Verifying constraint...');

    // Verify the constraint exists
    const result = await client.query(`
      SELECT
        conname as constraint_name,
        contype as constraint_type
      FROM pg_constraint
      WHERE conname = 'card_inventory_card_quality_language_key'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Constraint verified:', result.rows[0].constraint_name);
    } else {
      throw new Error('Constraint was not found after migration');
    }

    // Test that UPSERT now works
    console.log('\n🧪 Testing UPSERT operation...');

    const testResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM cards LIMIT 1
      ) as has_cards
    `);

    if (testResult.rows[0]?.has_cards) {
      console.log('✅ Database has cards - ready for inventory operations');
    } else {
      console.log('⚠️  No cards in database - add cards before testing inventory');
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);

    if (error.code === '23505') {
      console.error('\n⚠️  Duplicate entries exist in the database.');
      console.error('You need to clean up duplicate entries before adding this constraint.');
      console.error('\nRun this query to find duplicates:');
      console.error(`
SELECT card_id, quality, language, COUNT(*) as count
FROM card_inventory
GROUP BY card_id, quality, language
HAVING COUNT(*) > 1;
      `);
    }

    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
