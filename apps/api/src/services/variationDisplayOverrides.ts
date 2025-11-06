/**
 * VARIATION DISPLAY OVERRIDES SERVICE
 *
 * Manages custom display text for variation badges.
 * Allows admins to override auto-generated variation text.
 */

import { db } from '../lib/db.js';
import type { PoolClient } from 'pg';

export interface VariationDisplayOverride {
  id: number;
  game_id: number | null;
  treatment: string | null;
  finish: string | null;
  border_color: string | null;
  frame_effect: string | null;
  promo_type: string | null;
  display_text: string;
  notes: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateOverrideInput {
  game_id?: number | null;
  treatment?: string | null;
  finish?: string | null;
  border_color?: string | null;
  frame_effect?: string | null;
  promo_type?: string | null;
  display_text: string;
  notes?: string | null;
}

export interface VariationCombination {
  treatment: string | null;
  finish: string | null;
  border_color: string | null;
  frame_effect: string | null;
  promo_type: string | null;
  count: number;
  auto_generated_text: string;
  override?: VariationDisplayOverride;
}

/**
 * Initialize the table if it doesn't exist
 */
export async function initializeTable() {
  const client = await db.getClient();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS variation_display_overrides (
        id SERIAL PRIMARY KEY,
        game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
        treatment VARCHAR(100),
        finish VARCHAR(50),
        border_color VARCHAR(50),
        frame_effect VARCHAR(100),
        promo_type VARCHAR(100),
        display_text VARCHAR(200) NOT NULL,
        notes TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE NULLS NOT DISTINCT (game_id, treatment, finish, border_color, frame_effect, promo_type)
      );

      CREATE INDEX IF NOT EXISTS idx_variation_overrides_game ON variation_display_overrides(game_id);
      CREATE INDEX IF NOT EXISTS idx_variation_overrides_treatment ON variation_display_overrides(treatment);
      CREATE INDEX IF NOT EXISTS idx_variation_overrides_active ON variation_display_overrides(active);
      CREATE INDEX IF NOT EXISTS idx_variation_overrides_lookup ON variation_display_overrides(game_id, treatment, finish) WHERE active = true;
    `);

    console.log('✅ variation_display_overrides table initialized');
  } catch (error) {
    console.error('❌ Error initializing variation_display_overrides table:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get override for a specific variation combination
 */
export async function getOverride(
  gameId: number | null,
  treatment: string | null,
  finish: string | null,
  borderColor: string | null = null,
  frameEffect: string | null = null,
  promoType: string | null = null
): Promise<VariationDisplayOverride | null> {
  const client = await db.getClient();

  try {
    // Try exact match first
    const result = await client.query<VariationDisplayOverride>(
      `SELECT * FROM variation_display_overrides
       WHERE active = true
         AND (game_id IS NULL OR game_id = $1)
         AND (treatment IS NULL OR treatment = $2)
         AND (finish IS NULL OR finish = $3)
         AND (border_color IS NULL OR border_color = $4)
         AND (frame_effect IS NULL OR frame_effect = $5)
         AND (promo_type IS NULL OR promo_type = $6)
       ORDER BY
         (CASE WHEN game_id IS NOT NULL THEN 0 ELSE 1 END),
         (CASE WHEN treatment IS NOT NULL THEN 0 ELSE 1 END),
         (CASE WHEN finish IS NOT NULL THEN 0 ELSE 1 END),
         (CASE WHEN border_color IS NOT NULL THEN 0 ELSE 1 END),
         (CASE WHEN frame_effect IS NOT NULL THEN 0 ELSE 1 END),
         (CASE WHEN promo_type IS NOT NULL THEN 0 ELSE 1 END)
       LIMIT 1`,
      [gameId, treatment, finish, borderColor, frameEffect, promoType]
    );

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Get all overrides, optionally filtered by game
 */
export async function getAllOverrides(gameId?: number): Promise<VariationDisplayOverride[]> {
  const client = await db.getClient();

  try {
    const query = gameId
      ? `SELECT * FROM variation_display_overrides WHERE game_id IS NULL OR game_id = $1 ORDER BY created_at DESC`
      : `SELECT * FROM variation_display_overrides ORDER BY created_at DESC`;

    const result = await client.query<VariationDisplayOverride>(
      query,
      gameId ? [gameId] : []
    );

    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Discover all unique variation combinations that exist in the database
 */
export async function discoverVariationCombinations(gameId?: number): Promise<VariationCombination[]> {
  const client = await db.getClient();

  try {
    const query = gameId
      ? `SELECT
           treatment,
           finish,
           border_color,
           frame_effect,
           promo_type,
           COUNT(*) as count
         FROM cards
         WHERE game_id = $1
         GROUP BY treatment, finish, border_color, frame_effect, promo_type
         ORDER BY count DESC, treatment, finish`
      : `SELECT
           treatment,
           finish,
           border_color,
           frame_effect,
           promo_type,
           COUNT(*) as count
         FROM cards
         GROUP BY treatment, finish, border_color, frame_effect, promo_type
         ORDER BY count DESC, treatment, finish`;

    const result = await client.query(query, gameId ? [gameId] : []);

    // Get all overrides for this game
    const overrides = await getAllOverrides(gameId);
    const overrideMap = new Map<string, VariationDisplayOverride>();

    for (const override of overrides) {
      const key = `${override.treatment}|${override.finish}|${override.border_color}|${override.frame_effect}|${override.promo_type}`;
      overrideMap.set(key, override);
    }

    // Map results with auto-generated text and overrides
    return result.rows.map(row => {
      const key = `${row.treatment}|${row.finish}|${row.border_color}|${row.frame_effect}|${row.promo_type}`;

      return {
        treatment: row.treatment,
        finish: row.finish,
        border_color: row.border_color,
        frame_effect: row.frame_effect,
        promo_type: row.promo_type,
        count: parseInt(row.count),
        auto_generated_text: generateAutoText(row),
        override: overrideMap.get(key)
      };
    });
  } finally {
    client.release();
  }
}

/**
 * Generate auto text for a variation (used for preview/comparison)
 */
function generateAutoText(variation: {
  treatment: string | null;
  finish: string | null;
  border_color: string | null;
  frame_effect?: string | null;
  promo_type?: string | null;
}): string {
  const parts: string[] = [];

  // Format treatment
  if (variation.treatment) {
    const treatment = variation.treatment
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    parts.push(treatment);
  } else {
    parts.push('Standard');
  }

  // Format finish
  if (variation.finish) {
    const lower = variation.finish.toLowerCase();
    if (lower.includes('foil') && !lower.includes('non')) {
      parts.push('Foil');
    } else if (lower.includes('etched')) {
      parts.push('Etched');
    } else {
      parts.push('Regular');
    }
  } else {
    parts.push('Regular');
  }

  // Add border if not black and not already in treatment
  if (variation.border_color && variation.border_color !== 'black') {
    const treatment = parts[0]?.toLowerCase() || '';
    if (!treatment.includes(variation.border_color.toLowerCase())) {
      parts.push(`${variation.border_color} border`);
    }
  }

  return parts.filter(Boolean).join(' ');
}

/**
 * Create a new override
 */
export async function createOverride(input: CreateOverrideInput): Promise<VariationDisplayOverride> {
  const client = await db.getClient();

  try {
    const result = await client.query<VariationDisplayOverride>(
      `INSERT INTO variation_display_overrides
         (game_id, treatment, finish, border_color, frame_effect, promo_type, display_text, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        input.game_id || null,
        input.treatment || null,
        input.finish || null,
        input.border_color || null,
        input.frame_effect || null,
        input.promo_type || null,
        input.display_text,
        input.notes || null
      ]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Update an existing override
 */
export async function updateOverride(
  id: number,
  updates: Partial<CreateOverrideInput>
): Promise<VariationDisplayOverride | null> {
  const client = await db.getClient();

  try {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.display_text !== undefined) {
      fields.push(`display_text = $${paramIndex++}`);
      values.push(updates.display_text);
    }

    if (updates.notes !== undefined) {
      fields.push(`notes = $${paramIndex++}`);
      values.push(updates.notes);
    }

    if (updates.game_id !== undefined) {
      fields.push(`game_id = $${paramIndex++}`);
      values.push(updates.game_id || null);
    }

    if (fields.length === 0) {
      // No fields to update
      const result = await client.query<VariationDisplayOverride>(
        'SELECT * FROM variation_display_overrides WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await client.query<VariationDisplayOverride>(
      `UPDATE variation_display_overrides
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Delete an override
 */
export async function deleteOverride(id: number): Promise<boolean> {
  const client = await db.getClient();

  try {
    const result = await client.query(
      'DELETE FROM variation_display_overrides WHERE id = $1',
      [id]
    );

    return result.rowCount !== null && result.rowCount > 0;
  } finally {
    client.release();
  }
}

/**
 * Toggle active status of an override
 */
export async function toggleOverride(id: number, active: boolean): Promise<VariationDisplayOverride | null> {
  const client = await db.getClient();

  try {
    const result = await client.query<VariationDisplayOverride>(
      `UPDATE variation_display_overrides
       SET active = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [active, id]
    );

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Get treatment-level overrides for filter dropdowns
 * Returns a map of treatment -> display_text for treatments that have overrides
 * where only treatment is set (finish, border, etc. are NULL)
 */
export async function getTreatmentOverrides(gameId?: number | null): Promise<Map<string, string>> {
  const client = await db.getClient();

  try {
    const query = `
      SELECT treatment, display_text
      FROM variation_display_overrides
      WHERE active = true
        AND treatment IS NOT NULL
        AND finish IS NULL
        AND border_color IS NULL
        AND frame_effect IS NULL
        AND promo_type IS NULL
        AND (game_id IS NULL OR game_id = $1)
      ORDER BY
        (CASE WHEN game_id IS NOT NULL THEN 0 ELSE 1 END)
    `;

    const result = await client.query<{ treatment: string; display_text: string }>(
      query,
      [gameId || null]
    );

    const overrideMap = new Map<string, string>();
    for (const row of result.rows) {
      // Game-specific overrides take precedence (due to ORDER BY)
      if (!overrideMap.has(row.treatment)) {
        overrideMap.set(row.treatment, row.display_text);
      }
    }

    return overrideMap;
  } finally {
    client.release();
  }
}
