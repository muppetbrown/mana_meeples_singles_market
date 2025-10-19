/**
 * VARIATION ANALYSIS SERVICE
 *
 * Analyzes card variations during import and maintains metadata
 * for dynamic filtering based on what actually exists in each set.
 */

import { db } from '../lib/db.js';

// Constants from MTG spec
const IGNORE_FRAME_EFFECTS = [
  'legendary', 'enchantment', 'snow', 'miracle', 'boosterfun'
];

const VISUAL_TREATMENTS = [
  'extendedart', 'inverted', 'showcase', 'fullart', 'tombstone', 'wanted'
];

const SPECIAL_FOILS = [
  'surgefoil', 'galaxyfoil', 'fracturefoil', 'singularityfoil',
  'chocobotrackfoil', 'cosmicfoil', 'halofoil', 'textured',
  'firstplacefoil', 'rainbowfoil', 'dragonscalefoil', 'raisedfoil', 'neonink'
];

const BORDER_COLORS = ['black', 'borderless', 'white', 'yellow'];

/**
 * Analyze a set's variations and update metadata
 */
async function analyzeSetVariations(setId: any, gameId: any) {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Get all cards in the set
    const cardsResult = await client.query(`
      SELECT 
        treatment,
        border_color,
        finish,
        promo_type,
        frame_effect
      FROM cards
      WHERE set_id = $1 AND game_id = $2
    `, [setId, gameId]);
    
    const cards = cardsResult.rows;
    
    if (cards.length === 0) {
      console.log(`No cards found for set ${setId}`);
      await client.query('COMMIT');
      return null;
    }
    
    // Analyze variations
    const analysis = {
      visualTreatments: new Set(),
      specialFoils: new Set(),
      borderColors: new Set(),
      frameEffects: new Set(),
      treatmentCodes: new Set(),
      totalCards: cards.length,
      totalVariations: cards.length
    };
    
    cards.forEach((card: any) => {
      // Collect treatment codes
      if (card.treatment) {
        analysis.treatmentCodes.add(card.treatment);
      }
      
      // Collect border colors
      if (card.border_color) {
        analysis.borderColors.add(card.border_color);
      }
      
      // Collect special foils
      if (card.promo_type && SPECIAL_FOILS.includes(card.promo_type)) {
        analysis.specialFoils.add(card.promo_type);
      }
      
      // Collect frame effects (filtered)
      if (card.frame_effect) {
        const effects = card.frame_effect.split(',').map((e: any) => e.trim());
        effects.forEach((effect: any) => {
          if (VISUAL_TREATMENTS.includes(effect)) {
            analysis.visualTreatments.add(effect);
            analysis.frameEffects.add(effect);
          }
        });
      }
    });
    
    // Convert Sets to Arrays
    const metadata = {
      visualTreatments: Array.from(analysis.visualTreatments),
      specialFoils: Array.from(analysis.specialFoils),
      borderColors: Array.from(analysis.borderColors),
      frameEffects: Array.from(analysis.frameEffects),
      treatmentCodes: Array.from(analysis.treatmentCodes),
      totalCards: analysis.totalCards,
      totalVariations: analysis.totalVariations
    };
    
    // Update or insert set metadata
    await client.query(`
      INSERT INTO set_variations_metadata (
        set_id, 
        game_id, 
        visual_treatments, 
        special_foils, 
        border_colors, 
        frame_effects, 
        treatment_codes,
        total_cards,
        total_variations,
        last_analyzed
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (set_id, game_id) 
      DO UPDATE SET
        visual_treatments = EXCLUDED.visual_treatments,
        special_foils = EXCLUDED.special_foils,
        border_colors = EXCLUDED.border_colors,
        frame_effects = EXCLUDED.frame_effects,
        treatment_codes = EXCLUDED.treatment_codes,
        total_cards = EXCLUDED.total_cards,
        total_variations = EXCLUDED.total_variations,
        last_analyzed = NOW(),
        updated_at = NOW()
    `, [
      setId,
      gameId,
      JSON.stringify(metadata.visualTreatments),
      JSON.stringify(metadata.specialFoils),
      JSON.stringify(metadata.borderColors),
      JSON.stringify(metadata.frameEffects),
      JSON.stringify(metadata.treatmentCodes),
      metadata.totalCards,
      metadata.totalVariations
    ]);
    
    await client.query('COMMIT');
    
    console.log(`✅ Analyzed set ${setId}:`, {
      treatments: metadata.treatmentCodes.length,
      visualTreatments: metadata.visualTreatments.length,
      specialFoils: metadata.specialFoils.length,
      borderColors: metadata.borderColors.length,
      cards: metadata.totalCards
    });
    
    return metadata;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error analyzing set variations:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Analyze game-wide variations
 */
async function analyzeGameVariations(gameId: any) {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Get all cards in the game
    const cardsResult = await client.query(`
      SELECT 
        treatment,
        border_color,
        finish,
        promo_type,
        frame_effect,
        set_id
      FROM cards
      WHERE game_id = $1
    `, [gameId]);
    
    const cards = cardsResult.rows;
    
    if (cards.length === 0) {
      console.log(`No cards found for game ${gameId}`);
      await client.query('COMMIT');
      return null;
    }
    
    // Analyze variations
    const analysis = {
      visualTreatments: new Set(),
      specialFoils: new Set(),
      borderColors: new Set(),
      frameEffects: new Set(),
      treatmentCodes: new Set(),
      sets: new Set(),
      totalCards: cards.length
    };
    
    cards.forEach((card: any) => {
      // Track sets
      if (card.set_id) {
        analysis.sets.add(card.set_id);
      }
      
      // Collect treatment codes
      if (card.treatment) {
        analysis.treatmentCodes.add(card.treatment);
      }
      
      // Collect border colors
      if (card.border_color) {
        analysis.borderColors.add(card.border_color);
      }
      
      // Collect special foils
      if (card.promo_type && SPECIAL_FOILS.includes(card.promo_type)) {
        analysis.specialFoils.add(card.promo_type);
      }
      
      // Collect frame effects
      if (card.frame_effect) {
        const effects = card.frame_effect.split(',').map((e: any) => e.trim());
        effects.forEach((effect: any) => {
          if (VISUAL_TREATMENTS.includes(effect)) {
            analysis.visualTreatments.add(effect);
            analysis.frameEffects.add(effect);
          }
        });
      }
    });
    
    // Convert Sets to Arrays
    const metadata = {
      visualTreatments: Array.from(analysis.visualTreatments),
      specialFoils: Array.from(analysis.specialFoils),
      borderColors: Array.from(analysis.borderColors),
      frameEffects: Array.from(analysis.frameEffects),
      treatmentCodes: Array.from(analysis.treatmentCodes),
      totalSets: analysis.sets.size,
      totalCards: analysis.totalCards,
      totalVariations: analysis.totalCards
    };
    
    // Update or insert game metadata
    await client.query(`
      INSERT INTO game_variations_metadata (
        game_id, 
        visual_treatments, 
        special_foils, 
        border_colors, 
        frame_effects, 
        treatment_codes,
        total_sets,
        total_cards,
        total_variations,
        last_analyzed
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (game_id) 
      DO UPDATE SET
        visual_treatments = EXCLUDED.visual_treatments,
        special_foils = EXCLUDED.special_foils,
        border_colors = EXCLUDED.border_colors,
        frame_effects = EXCLUDED.frame_effects,
        treatment_codes = EXCLUDED.treatment_codes,
        total_sets = EXCLUDED.total_sets,
        total_cards = EXCLUDED.total_cards,
        total_variations = EXCLUDED.total_variations,
        last_analyzed = NOW(),
        updated_at = NOW()
    `, [
      gameId,
      JSON.stringify(metadata.visualTreatments),
      JSON.stringify(metadata.specialFoils),
      JSON.stringify(metadata.borderColors),
      JSON.stringify(metadata.frameEffects),
      JSON.stringify(metadata.treatmentCodes),
      metadata.totalSets,
      metadata.totalCards,
      metadata.totalVariations
    ]);
    
    await client.query('COMMIT');
    
    console.log(`✅ Analyzed game ${gameId}:`, {
      treatments: metadata.treatmentCodes.length,
      sets: metadata.totalSets,
      cards: metadata.totalCards
    });
    
    return metadata;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error analyzing game variations:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get available variations for a set
 */
async function getSetVariations(setId: any) {
  try {
    const result = await db.query(`
      SELECT 
        visual_treatments,
        special_foils,
        border_colors,
        frame_effects,
        treatment_codes,
        total_cards,
        total_variations,
        last_analyzed
      FROM set_variations_metadata
      WHERE set_id = $1
    `, [setId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error getting set variations:', error);
    throw error;
  }
}

/**
 * Get available variations for a game
 */
async function getGameVariations(gameId: any) {
  try {
    const result = await db.query(`
      SELECT 
        visual_treatments,
        special_foils,
        border_colors,
        frame_effects,
        treatment_codes,
        total_sets,
        total_cards,
        total_variations,
        last_analyzed
      FROM game_variations_metadata
      WHERE game_id = $1
    `, [gameId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error getting game variations:', error);
    throw error;
  }
}

/**
 * Get variation filters for UI (set-specific or game-wide)
 */
async function getVariationFilters(gameId = null, setId = null) {
  try {
    let query, params;
    
    if (setId) {
      // Set-specific filters from materialized view
      query = `
        SELECT 
          treatments,
          border_colors,
          finishes,
          promo_types,
          frame_effects
        FROM mv_set_variation_filters
        WHERE set_id = $1
      `;
      params = [setId];
    } else if (gameId) {
      // Game-wide filters
      query = `
        SELECT 
          visual_treatments as treatments,
          border_colors,
          special_foils as promo_types,
          frame_effects
        FROM game_variations_metadata
        WHERE game_id = $1
      `;
      params = [gameId];
      
      // Also get finishes from actual cards
      const finishResult = await db.query(`
        SELECT ARRAY_AGG(DISTINCT finish) as finishes
        FROM cards
        WHERE game_id = $1 AND finish IS NOT NULL
      `, [gameId]);
      
      const result = await db.query(query, params);
      if (result.rows.length > 0) {
        result.rows[0].finishes = finishResult.rows[0]?.finishes || [];
        return result.rows[0];
      }
      return null;
    } else {
      // All games - aggregate all variations
      query = `
        SELECT 
          ARRAY_AGG(DISTINCT elem) FILTER (WHERE elem IS NOT NULL) as treatments
        FROM game_variations_metadata, 
             jsonb_array_elements_text(treatment_codes) as elem
      `;
      
      const [treatments, borders, foils, frames, finishes] = await Promise.all([
        db.query(query),
        db.query(`
          SELECT ARRAY_AGG(DISTINCT elem) FILTER (WHERE elem IS NOT NULL) as border_colors
          FROM game_variations_metadata,
               jsonb_array_elements_text(border_colors) as elem
        `),
        db.query(`
          SELECT ARRAY_AGG(DISTINCT elem) FILTER (WHERE elem IS NOT NULL) as promo_types
          FROM game_variations_metadata,
               jsonb_array_elements_text(special_foils) as elem
        `),
        db.query(`
          SELECT ARRAY_AGG(DISTINCT elem) FILTER (WHERE elem IS NOT NULL) as frame_effects
          FROM game_variations_metadata,
               jsonb_array_elements_text(frame_effects) as elem
        `),
        db.query(`
          SELECT ARRAY_AGG(DISTINCT finish) as finishes
          FROM cards
          WHERE finish IS NOT NULL
        `)
      ]);
      
      return {
        treatments: treatments.rows[0]?.treatments || [],
        border_colors: borders.rows[0]?.border_colors || [],
        promo_types: foils.rows[0]?.promo_types || [],
        frame_effects: frames.rows[0]?.frame_effects || [],
        finishes: finishes.rows[0]?.finishes || []
      };
    }
    
    const result = await db.query(query, params);
    return result.rows.length > 0 ? result.rows[0] : null;
    
  } catch (error) {
    console.error('Error getting variation filters:', error);
    throw error;
  }
}

/**
 * Refresh materialized view
 */
async function refreshVariationFilters() {
  try {
    await db.query('SELECT refresh_variation_filters()');
    console.log('✅ Refreshed variation filters materialized view');
  } catch (error) {
    console.error('Error refreshing variation filters:', error);
    throw error;
  }
}

export {
  analyzeSetVariations,
  analyzeGameVariations,
  getSetVariations,
  getGameVariations,
  getVariationFilters,
  refreshVariationFilters,

  // Export constants for reuse
  IGNORE_FRAME_EFFECTS,
  VISUAL_TREATMENTS,
  SPECIAL_FOILS,
  BORDER_COLORS
};