#!/usr/bin/env tsx
/**
 * Debug Variations Script
 *
 * Shows what's in the cards table vs what's in the overrides table
 */

import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

async function debugVariations() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🔍 Checking variation data...\n');

    // 1. Show all treatments in cards table
    console.log('📊 Treatments in CARDS table:');
    const cardTreatments = await pool.query(`
      SELECT DISTINCT UPPER(TRIM(treatment)) as treatment, COUNT(*) as count
      FROM cards
      WHERE treatment IS NOT NULL
      GROUP BY UPPER(TRIM(treatment))
      ORDER BY treatment
    `);
    console.log('   Total unique treatments:', cardTreatments.rows.length);
    cardTreatments.rows.forEach(row => {
      console.log(`   - ${row.treatment} (${row.count} cards)`);
    });
    console.log('');

    // 2. Show all treatments in overrides table
    console.log('📊 Treatments in VARIATION_DISPLAY_OVERRIDES table:');
    const overrideTreatments = await pool.query(`
      SELECT DISTINCT treatment, COUNT(*) as count
      FROM variation_display_overrides
      WHERE treatment IS NOT NULL
      GROUP BY treatment
      ORDER BY treatment
    `);
    console.log('   Total unique treatments:', overrideTreatments.rows.length);
    overrideTreatments.rows.forEach(row => {
      console.log(`   - ${row.treatment} (${row.count} overrides)`);
    });
    console.log('');

    // 3. Show treatments in overrides but NOT in cards (orphaned)
    console.log('🚫 Treatments in OVERRIDES but NOT in CARDS (orphaned):');
    const orphaned = await pool.query(`
      SELECT DISTINCT o.treatment
      FROM variation_display_overrides o
      WHERE o.treatment IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM cards c
          WHERE UPPER(TRIM(c.treatment)) = o.treatment
        )
      ORDER BY o.treatment
    `);
    console.log('   Total orphaned treatments:', orphaned.rows.length);
    if (orphaned.rows.length > 0) {
      orphaned.rows.forEach(row => {
        console.log(`   - ${row.treatment}`);
      });
    } else {
      console.log('   ✅ No orphaned treatments found');
    }
    console.log('');

    // 4. Show full variation combinations from cards
    console.log('📋 Full variation combinations in CARDS table:');
    const cardCombos = await pool.query(`
      SELECT
        UPPER(TRIM(treatment)) as treatment,
        LOWER(TRIM(finish)) as finish,
        COUNT(*) as count
      FROM cards
      GROUP BY UPPER(TRIM(treatment)), LOWER(TRIM(finish))
      ORDER BY count DESC
      LIMIT 20
    `);
    console.log(`   Showing top ${cardCombos.rows.length} combinations:`);
    cardCombos.rows.forEach(row => {
      console.log(`   - ${row.treatment || 'null'} / ${row.finish || 'null'} (${row.count} cards)`);
    });
    console.log('');

    // 5. Show what the API endpoint would return
    console.log('🔌 What discoverVariationCombinations would return:');
    const apiResult = await pool.query(`
      SELECT
        UPPER(TRIM(treatment)) as treatment,
        LOWER(TRIM(finish)) as finish,
        LOWER(TRIM(border_color)) as border_color,
        LOWER(TRIM(frame_effect)) as frame_effect,
        UPPER(TRIM(promo_type)) as promo_type,
        COUNT(*) as count
      FROM cards
      GROUP BY UPPER(TRIM(treatment)), LOWER(TRIM(finish)), LOWER(TRIM(border_color)), LOWER(TRIM(frame_effect)), UPPER(TRIM(promo_type))
      ORDER BY count DESC
      LIMIT 20
    `);
    console.log(`   Total combinations: ${apiResult.rows.length}`);
    apiResult.rows.forEach(row => {
      console.log(`   - ${row.treatment || 'null'} / ${row.finish || 'null'} / ${row.border_color || 'null'} (${row.count} cards)`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

debugVariations();
