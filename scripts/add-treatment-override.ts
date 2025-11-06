#!/usr/bin/env tsx
/**
 * Add Treatment-Level Override Script
 *
 * Creates a treatment-level override (for filter dropdowns)
 * where only treatment is set and all other fields are NULL.
 *
 * Usage:
 *   npm run add-treatment-override BORDERLESS_INVERTED "Borderless"
 *   npm run add-treatment-override STANDARD_SURGEFOIL "Standard"
 */

import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

async function addTreatmentOverride() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
Usage:
  npm run add-treatment-override <treatment> <display_text> [notes]

Examples:
  npm run add-treatment-override BORDERLESS_INVERTED "Borderless"
  npm run add-treatment-override STANDARD_SURGEFOIL "Standard" "Remove surgefoil from treatment name"

This creates a treatment-level override that affects filter dropdowns.
For variation-level overrides (badges), use the admin UI.
`);
    process.exit(1);
  }

  const treatment = args[0];
  const displayText = args[1];
  const notes = args[2] || `Treatment-level override for ${treatment}`;

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🔍 Checking if override already exists...\n');

    // Check if override already exists
    const existing = await pool.query(
      `SELECT * FROM variation_display_overrides
       WHERE treatment = $1
         AND finish IS NULL
         AND border_color IS NULL
         AND frame_effect IS NULL
         AND promo_type IS NULL`,
      [treatment]
    );

    if (existing.rows.length > 0) {
      console.log('⚠️  Treatment-level override already exists:');
      console.log(`   Treatment: ${existing.rows[0].treatment}`);
      console.log(`   Display Text: ${existing.rows[0].display_text}`);
      console.log(`   Notes: ${existing.rows[0].notes}`);
      console.log('\nUpdate it in the admin UI or delete it first.\n');
      process.exit(0);
    }

    console.log('✅ No existing override found. Creating new one...\n');

    // Create the override
    const result = await pool.query(
      `INSERT INTO variation_display_overrides
         (treatment, finish, border_color, frame_effect, promo_type, display_text, notes, game_id)
       VALUES ($1, NULL, NULL, NULL, NULL, $2, $3, NULL)
       RETURNING *`,
      [treatment, displayText, notes]
    );

    console.log('✅ Treatment-level override created successfully!\n');
    console.log('Details:');
    console.log(`   Treatment: ${result.rows[0].treatment}`);
    console.log(`   Display Text: ${result.rows[0].display_text}`);
    console.log(`   Notes: ${result.rows[0].notes}`);
    console.log(`   ID: ${result.rows[0].id}`);
    console.log('\n✨ This will now appear in filter dropdowns as:', `"${displayText}"`);
    console.log('   Refresh your browser to see the change.\n');

  } catch (error: any) {
    if (error.code === '23505') {
      console.error('❌ Error: This override already exists.');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addTreatmentOverride();
