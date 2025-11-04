#!/usr/bin/env node

/**
 * Migration: Add Unique Constraint to card_inventory
 *
 * Fixes the error:
 * "there is no unique or exclusion constraint matching the ON CONFLICT specification"
 *
 * Usage: node apps/api/scripts/add-inventory-constraint.js
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  console.log('\n🚀 Adding Unique Constraint to card_inventory');
  console.log('━'.repeat(60));

  const client = await pool.connect();

  try {
    console.log('🔍 Checking for existing constraint...');

    const existingConstraint = await client.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conname = 'card_inventory_card_quality_language_key'
    `);

    if (existingConstraint.rows.length > 0) {
      console.log('✅ Constraint already exists! No changes needed.');
      return;
    }

    console.log('📊 Checking for duplicate entries...');

    const duplicates = await client.query(`
      SELECT card_id, quality, language, COUNT(*) as count
      FROM card_inventory
      GROUP BY card_id, quality, language
      HAVING COUNT(*) > 1
    `);

    if (duplicates.rows.length > 0) {
      console.log('⚠️  WARNING: Found duplicate entries:');
      duplicates.rows.forEach(row => {
        console.log(`  - card_id: ${row.card_id}, quality: ${row.quality}, language: ${row.language}, count: ${row.count}`);
      });
      console.log('\n❌ Cannot add constraint with duplicates present.');
      console.log('Please resolve duplicates first.');
      process.exit(1);
    }

    console.log('✅ No duplicates found.');
    console.log('⚡ Adding unique constraint...');

    await client.query(`
      ALTER TABLE card_inventory
      ADD CONSTRAINT card_inventory_card_quality_language_key
      UNIQUE (card_id, quality, language)
    `);

    console.log('✅ Constraint added successfully!');

    // Verify
    const verify = await client.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conname = 'card_inventory_card_quality_language_key'
    `);

    if (verify.rows.length > 0) {
      console.log('✅ Constraint verified!');
      console.log('\n🎉 Migration completed successfully!');
      console.log('\nThe "Add to Inventory" feature should now work correctly.');
    } else {
      throw new Error('Constraint was not created');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
