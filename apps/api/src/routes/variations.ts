/**
 * VARIATION FILTER API ENDPOINTS
 * 
 * Dynamic endpoints that return only the variations that exist
 * in the selected game/set context
 */

// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'express'.
const express = require('express');
// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'router'.
const router = express.Router();
// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'variationS... Remove this comment to see the full error message
const variationService = require('../services/variationAnalysis');
// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'db'.
const db = require('../config/database');

/**
 * GET /api/variations/filters
 * 
 * Get available variation filters based on context
 * - If setId provided: Returns only variations in that set
 * - If gameId provided: Returns all variations in that game
 * - If neither: Returns all variations across all games
 */
router.get('/variations/filters', async (req: any, res: any) => {
  try {
    const { game_id, set_id } = req.query;
    
    let filters;
    
    if (set_id) {
      // Set-specific filters
      filters = await variationService.getVariationFilters(null, parseInt(set_id));
      
      if (!filters) {
        // Fallback: analyze the set if metadata doesn't exist
        const setInfo = await db.query(
          'SELECT game_id FROM card_sets WHERE id = $1',
          [set_id]
        );
        
        if (setInfo.rows.length > 0) {
          await variationService.analyzeSetVariations(
            parseInt(set_id), 
            setInfo.rows[0].game_id
          );
          filters = await variationService.getVariationFilters(null, parseInt(set_id));
        }
      }
    } else if (game_id) {
      // Game-wide filters
      filters = await variationService.getVariationFilters(parseInt(game_id), null);
      
      if (!filters) {
        // Fallback: analyze the game if metadata doesn't exist
        await variationService.analyzeGameVariations(parseInt(game_id));
        filters = await variationService.getVariationFilters(parseInt(game_id), null);
      }
    } else {
      // All games
      filters = await variationService.getVariationFilters();
    }
    
    // Format response
    res.json({
      treatments: filters?.treatments || [],
      borderColors: filters?.border_colors || [],
      finishes: filters?.finishes || [],
      promoTypes: filters?.promo_types || [],
      frameEffects: filters?.frame_effects || [],
      context: {
        game_id: game_id ? parseInt(game_id) : null,
        set_id: set_id ? parseInt(set_id) : null,
        scope: set_id ? 'set' : game_id ? 'game' : 'all'
      }
    });
    
  } catch (error) {
    console.error('Error fetching variation filters:', error);
    res.status(500).json({ 
      error: 'Failed to fetch variation filters',
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      details: error.message 
    });
  }
});

/**
 * GET /api/variations/metadata/:setId
 * 
 * Get detailed variation metadata for a specific set
 */
router.get('/variations/metadata/:setId', async (req: any, res: any) => {
  try {
    const { setId } = req.params;
    
    const metadata = await variationService.getSetVariations(parseInt(setId));
    
    if (!metadata) {
      return res.status(404).json({ 
        error: 'Set metadata not found',
        message: 'Run analysis on this set first' 
      });
    }
    
    res.json({
      setId: parseInt(setId),
      visualTreatments: metadata.visual_treatments,
      specialFoils: metadata.special_foils,
      borderColors: metadata.border_colors,
      frameEffects: metadata.frame_effects,
      treatmentCodes: metadata.treatment_codes,
      statistics: {
        totalCards: metadata.total_cards,
        totalVariations: metadata.total_variations
      },
      lastAnalyzed: metadata.last_analyzed
    });
    
  } catch (error) {
    console.error('Error fetching set metadata:', error);
    res.status(500).json({ 
      error: 'Failed to fetch set metadata',
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      details: error.message 
    });
  }
});

/**
 * GET /api/variations/metadata/game/:gameId
 * 
 * Get detailed variation metadata for a game
 */
router.get('/variations/metadata/game/:gameId', async (req: any, res: any) => {
  try {
    const { gameId } = req.params;
    
    const metadata = await variationService.getGameVariations(parseInt(gameId));
    
    if (!metadata) {
      return res.status(404).json({ 
        error: 'Game metadata not found',
        message: 'Run analysis on this game first' 
      });
    }
    
    res.json({
      gameId: parseInt(gameId),
      visualTreatments: metadata.visual_treatments,
      specialFoils: metadata.special_foils,
      borderColors: metadata.border_colors,
      frameEffects: metadata.frame_effects,
      treatmentCodes: metadata.treatment_codes,
      statistics: {
        totalSets: metadata.total_sets,
        totalCards: metadata.total_cards,
        totalVariations: metadata.total_variations
      },
      lastAnalyzed: metadata.last_analyzed
    });
    
  } catch (error) {
    console.error('Error fetching game metadata:', error);
    res.status(500).json({ 
      error: 'Failed to fetch game metadata',
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      details: error.message 
    });
  }
});

/**
 * GET /api/variations/stats/:setId
 * 
 * Get variation statistics for a set
 */
router.get('/variations/stats/:setId', async (req: any, res: any) => {
  try {
    const { setId } = req.params;
    
    const stats = await db.query(
      'SELECT * FROM get_set_variation_stats($1)',
      [parseInt(setId)]
    );
    
    res.json({
      setId: parseInt(setId),
      variations: stats.rows.map((row: any) => ({
        treatment: row.treatment_code,
        count: parseInt(row.count),
        percentage: parseFloat(row.percentage)
      }))
    });
    
  } catch (error) {
    console.error('Error fetching variation stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch variation statistics',
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      details: error.message 
    });
  }
});

/**
 * GET /api/variations/stats/game/:gameId
 * 
 * Get variation statistics for a game
 */
router.get('/variations/stats/game/:gameId', async (req: any, res: any) => {
  try {
    const { gameId } = req.params;
    
    const stats = await db.query(
      'SELECT * FROM get_game_variation_stats($1)',
      [parseInt(gameId)]
    );
    
    res.json({
      gameId: parseInt(gameId),
      variations: stats.rows.map((row: any) => ({
        treatment: row.treatment_code,
        count: parseInt(row.count),
        percentage: parseFloat(row.percentage)
      }))
    });
    
  } catch (error) {
    console.error('Error fetching game variation stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch game variation statistics',
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      details: error.message 
    });
  }
});

/**
 * POST /api/admin/variations/analyze
 * 
 * Manually trigger variation analysis
 * Admin only endpoint
 */
router.post('/admin/variations/analyze', async (req: any, res: any) => {
  try {
    const { game_id, set_id } = req.body;
    
    const results = {
      analyzed: []
    };
    
    if (set_id) {
      // Analyze specific set
      const setInfo = await db.query(
        'SELECT game_id FROM card_sets WHERE id = $1',
        [set_id]
      );
      
      if (setInfo.rows.length === 0) {
        return res.status(404).json({ error: 'Set not found' });
      }
      
      const metadata = await variationService.analyzeSetVariations(
        set_id, 
        setInfo.rows[0].game_id
      );
      
      results.analyzed.push({
        // @ts-expect-error TS(2322): Type 'string' is not assignable to type 'never'.
        type: 'set',
        // @ts-expect-error TS(2322): Type 'any' is not assignable to type 'never'.
        id: set_id,
        // @ts-expect-error TS(2322): Type 'any' is not assignable to type 'never'.
        metadata
      });
      
      // Also update game metadata
      await variationService.analyzeGameVariations(setInfo.rows[0].game_id);
      
    } else if (game_id) {
      // Analyze entire game
      const gameMetadata = await variationService.analyzeGameVariations(game_id);
      
      results.analyzed.push({
        // @ts-expect-error TS(2322): Type 'string' is not assignable to type 'never'.
        type: 'game',
        // @ts-expect-error TS(2322): Type 'any' is not assignable to type 'never'.
        id: game_id,
        // @ts-expect-error TS(2322): Type 'any' is not assignable to type 'never'.
        metadata: gameMetadata
      });
      
      // Also analyze all sets in game
      const sets = await db.query(
        'SELECT id FROM card_sets WHERE game_id = $1 AND active = true',
        [game_id]
      );
      
      for (const set of sets.rows) {
        const setMetadata = await variationService.analyzeSetVariations(set.id, game_id);
        results.analyzed.push({
          // @ts-expect-error TS(2322): Type 'string' is not assignable to type 'never'.
          type: 'set',
          // @ts-expect-error TS(2322): Type 'any' is not assignable to type 'never'.
          id: set.id,
          // @ts-expect-error TS(2322): Type 'any' is not assignable to type 'never'.
          metadata: setMetadata
        });
      }
      
    } else {
      // Analyze everything
      const games = await db.query('SELECT id FROM games');
      
      for (const game of games.rows) {
        const gameMetadata = await variationService.analyzeGameVariations(game.id);
        results.analyzed.push({
          // @ts-expect-error TS(2322): Type 'string' is not assignable to type 'never'.
          type: 'game',
          // @ts-expect-error TS(2322): Type 'any' is not assignable to type 'never'.
          id: game.id,
          // @ts-expect-error TS(2322): Type 'any' is not assignable to type 'never'.
          metadata: gameMetadata
        });
        
        const sets = await db.query(
          'SELECT id FROM card_sets WHERE game_id = $1 AND active = true',
          [game.id]
        );
        
        for (const set of sets.rows) {
          const setMetadata = await variationService.analyzeSetVariations(set.id, game.id);
          results.analyzed.push({
            // @ts-expect-error TS(2322): Type 'string' is not assignable to type 'never'.
            type: 'set',
            // @ts-expect-error TS(2322): Type 'any' is not assignable to type 'never'.
            id: set.id,
            // @ts-expect-error TS(2322): Type 'any' is not assignable to type 'never'.
            metadata: setMetadata
          });
        }
      }
    }
    
    // Refresh materialized view
    await variationService.refreshVariationFilters();
    
    res.json({
      success: true,
      message: 'Variation analysis complete',
      results
    });
    
  } catch (error) {
    console.error('Error analyzing variations:', error);
    res.status(500).json({ 
      error: 'Failed to analyze variations',
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      details: error.message 
    });
  }
});

/**
 * POST /api/admin/variations/refresh
 * 
 * Refresh materialized views
 * Admin only endpoint
 */
router.post('/admin/variations/refresh', async (req: any, res: any) => {
  try {
    await variationService.refreshVariationFilters();
    
    res.json({
      success: true,
      message: 'Variation filters refreshed'
    });
    
  } catch (error) {
    console.error('Error refreshing variation filters:', error);
    res.status(500).json({ 
      error: 'Failed to refresh variation filters',
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      details: error.message 
    });
  }
});

module.exports = router;