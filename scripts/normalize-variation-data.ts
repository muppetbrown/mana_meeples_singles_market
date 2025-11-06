#!/usr/bin/env tsx
/**
 * Normalize Variation Data Script
 *
 * This script checks for and optionally fixes inconsistent casing and whitespace
 * in variation-related fields (treatment, finish, border_color, frame_effect, promo_type).
 *
 * Run with:
 *   npm run normalize-variations -- --dry-run  (to preview changes)
 *   npm run normalize-variations -- --fix      (to apply changes)
 */

import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

interface VariationStats {
  original: string | null;
  normalized: string | null;
  count: number;
}

async function checkVariationData(dryRun: boolean = true) {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🔍 Checking for variation data inconsistencies...\n');

    // Check treatment field
    console.log('📊 Checking TREATMENT field:');
    const treatmentCheck = await pool.query<VariationStats>(`
      SELECT
        treatment as original,
        UPPER(TRIM(treatment)) as normalized,
        COUNT(*) as count
      FROM cards
      WHERE treatment IS NOT NULL
        AND treatment != UPPER(TRIM(treatment))
      GROUP BY treatment
      ORDER BY count DESC
    `);

    if (treatmentCheck.rows.length > 0) {
      console.log(`   Found ${treatmentCheck.rows.length} inconsistent treatment values:`);
      treatmentCheck.rows.forEach(row => {
        console.log(`   - "${row.original}" → "${row.normalized}" (${row.count} cards)`);
      });
    } else {
      console.log('   ✅ All treatment values are normalized\n');
    }

    // Check finish field
    console.log('📊 Checking FINISH field:');
    const finishCheck = await pool.query<VariationStats>(`
      SELECT
        finish as original,
        LOWER(TRIM(finish)) as normalized,
        COUNT(*) as count
      FROM cards
      WHERE finish IS NOT NULL
        AND finish != LOWER(TRIM(finish))
      GROUP BY finish
      ORDER BY count DESC
    `);

    if (finishCheck.rows.length > 0) {
      console.log(`   Found ${finishCheck.rows.length} inconsistent finish values:`);
      finishCheck.rows.forEach(row => {
        console.log(`   - "${row.original}" → "${row.normalized}" (${row.count} cards)`);
      });
    } else {
      console.log('   ✅ All finish values are normalized\n');
    }

    // Check border_color field
    console.log('📊 Checking BORDER_COLOR field:');
    const borderCheck = await pool.query<VariationStats>(`
      SELECT
        border_color as original,
        LOWER(TRIM(border_color)) as normalized,
        COUNT(*) as count
      FROM cards
      WHERE border_color IS NOT NULL
        AND border_color != LOWER(TRIM(border_color))
      GROUP BY border_color
      ORDER BY count DESC
    `);

    if (borderCheck.rows.length > 0) {
      console.log(`   Found ${borderCheck.rows.length} inconsistent border_color values:`);
      borderCheck.rows.forEach(row => {
        console.log(`   - "${row.original}" → "${row.normalized}" (${row.count} cards)`);
      });
    } else {
      console.log('   ✅ All border_color values are normalized\n');
    }

    // Check frame_effect field
    console.log('📊 Checking FRAME_EFFECT field:');
    const frameCheck = await pool.query<VariationStats>(`
      SELECT
        frame_effect as original,
        LOWER(TRIM(frame_effect)) as normalized,
        COUNT(*) as count
      FROM cards
      WHERE frame_effect IS NOT NULL
        AND frame_effect != LOWER(TRIM(frame_effect))
      GROUP BY frame_effect
      ORDER BY count DESC
    `);

    if (frameCheck.rows.length > 0) {
      console.log(`   Found ${frameCheck.rows.length} inconsistent frame_effect values:`);
      frameCheck.rows.forEach(row => {
        console.log(`   - "${row.original}" → "${row.normalized}" (${row.count} cards)`);
      });
    } else {
      console.log('   ✅ All frame_effect values are normalized\n');
    }

    // Check promo_type field
    console.log('📊 Checking PROMO_TYPE field:');
    const promoCheck = await pool.query<VariationStats>(`
      SELECT
        promo_type as original,
        UPPER(TRIM(promo_type)) as normalized,
        COUNT(*) as count
      FROM cards
      WHERE promo_type IS NOT NULL
        AND promo_type != UPPER(TRIM(promo_type))
      GROUP BY promo_type
      ORDER BY count DESC
    `);

    if (promoCheck.rows.length > 0) {
      console.log(`   Found ${promoCheck.rows.length} inconsistent promo_type values:`);
      promoCheck.rows.forEach(row => {
        console.log(`   - "${row.original}" → "${row.normalized}" (${row.count} cards)`);
      });
    } else {
      console.log('   ✅ All promo_type values are normalized\n');
    }

    // Apply fixes if --fix flag is provided
    if (!dryRun) {
      console.log('\n🔧 Applying normalization fixes...\n');

      const updates = await pool.query(`
        UPDATE cards SET
          treatment = UPPER(TRIM(treatment)),
          finish = LOWER(TRIM(finish)),
          border_color = LOWER(TRIM(border_color)),
          frame_effect = LOWER(TRIM(frame_effect)),
          promo_type = UPPER(TRIM(promo_type))
        WHERE
          (treatment IS NOT NULL AND treatment != UPPER(TRIM(treatment)))
          OR (finish IS NOT NULL AND finish != LOWER(TRIM(finish)))
          OR (border_color IS NOT NULL AND border_color != LOWER(TRIM(border_color)))
          OR (frame_effect IS NOT NULL AND frame_effect != LOWER(TRIM(frame_effect)))
          OR (promo_type IS NOT NULL AND promo_type != UPPER(TRIM(promo_type)))
      `);

      console.log(`✅ Updated ${updates.rowCount} cards\n`);
    } else {
      console.log('\n💡 Run with --fix flag to apply these normalizations\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--fix');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Normalize Variation Data Script

Usage:
  npm run normalize-variations              (dry run - preview changes)
  npm run normalize-variations -- --dry-run (dry run - preview changes)
  npm run normalize-variations -- --fix     (apply changes)
  npm run normalize-variations -- --help    (show this help)

This script normalizes variation field values:
  - treatment: UPPERCASE
  - finish: lowercase
  - border_color: lowercase
  - frame_effect: lowercase
  - promo_type: UPPERCASE
`);
  process.exit(0);
}

checkVariationData(dryRun);
