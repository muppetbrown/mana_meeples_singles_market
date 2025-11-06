/**
 * VARIATION DISPLAY OVERRIDES API ROUTES
 *
 * Endpoints for managing custom variation badge text
 */

import { Router } from 'express';
import * as overrideService from '../services/variationDisplayOverrides.js';

const router = Router();

/**
 * Initialize the table (called on app startup)
 * POST /api/variation-overrides/init
 */
router.post('/init', async (req, res) => {
  try {
    await overrideService.initializeTable();
    res.json({ success: true, message: 'Table initialized' });
  } catch (error) {
    console.error('Error initializing table:', error);
    res.status(500).json({ error: 'Failed to initialize table' });
  }
});

/**
 * Get all variation combinations with their overrides
 * GET /api/variation-overrides/combinations?game_id=1
 */
router.get('/combinations', async (req, res) => {
  try {
    const gameId = req.query.game_id ? parseInt(req.query.game_id as string) : undefined;
    const combinations = await overrideService.discoverVariationCombinations(gameId);
    res.json(combinations);
  } catch (error) {
    console.error('Error getting variation combinations:', error);
    res.status(500).json({ error: 'Failed to get variation combinations' });
  }
});

/**
 * Get all overrides
 * GET /api/variation-overrides?game_id=1
 */
router.get('/', async (req, res) => {
  try {
    const gameId = req.query.game_id ? parseInt(req.query.game_id as string) : undefined;
    const overrides = await overrideService.getAllOverrides(gameId);
    res.json(overrides);
  } catch (error) {
    console.error('Error getting overrides:', error);
    res.status(500).json({ error: 'Failed to get overrides' });
  }
});

/**
 * Get specific override by variation fields
 * GET /api/variation-overrides/lookup?game_id=1&treatment=BORDERLESS&finish=nonfoil
 */
router.get('/lookup', async (req, res) => {
  try {
    const gameId = req.query.game_id ? parseInt(req.query.game_id as string) : null;
    const treatment = (req.query.treatment as string) || null;
    const finish = (req.query.finish as string) || null;
    const borderColor = (req.query.border_color as string) || null;
    const frameEffect = (req.query.frame_effect as string) || null;
    const promoType = (req.query.promo_type as string) || null;

    const override = await overrideService.getOverride(
      gameId,
      treatment,
      finish,
      borderColor,
      frameEffect,
      promoType
    );

    if (override) {
      res.json(override);
    } else {
      res.status(404).json({ error: 'Override not found' });
    }
  } catch (error) {
    console.error('Error looking up override:', error);
    res.status(500).json({ error: 'Failed to lookup override' });
  }
});

/**
 * Create a new override
 * POST /api/variation-overrides
 * Body: { game_id?, treatment?, finish?, border_color?, frame_effect?, promo_type?, display_text, notes? }
 */
router.post('/', async (req, res) => {
  try {
    const input = req.body;

    // Validate required field
    if (!input.display_text || typeof input.display_text !== 'string') {
      return res.status(400).json({ error: 'display_text is required' });
    }

    const override = await overrideService.createOverride(input);
    res.status(201).json(override);
  } catch (error: any) {
    console.error('Error creating override:', error);

    // Check for unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Override already exists for this variation combination' });
    }

    res.status(500).json({ error: 'Failed to create override' });
  }
});

/**
 * Update an existing override
 * PUT /api/variation-overrides/:id
 * Body: { display_text?, notes?, game_id? }
 */
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const override = await overrideService.updateOverride(id, updates);

    if (override) {
      res.json(override);
    } else {
      res.status(404).json({ error: 'Override not found' });
    }
  } catch (error) {
    console.error('Error updating override:', error);
    res.status(500).json({ error: 'Failed to update override' });
  }
});

/**
 * Toggle active status
 * PATCH /api/variation-overrides/:id/toggle
 * Body: { active: boolean }
 */
router.patch('/:id/toggle', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { active } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'active must be a boolean' });
    }

    const override = await overrideService.toggleOverride(id, active);

    if (override) {
      res.json(override);
    } else {
      res.status(404).json({ error: 'Override not found' });
    }
  } catch (error) {
    console.error('Error toggling override:', error);
    res.status(500).json({ error: 'Failed to toggle override' });
  }
});

/**
 * Find orphaned overrides (overrides for variations that no longer exist)
 * GET /api/variation-overrides/orphaned?game_id=1
 */
router.get('/orphaned', async (req, res) => {
  try {
    const gameId = req.query.game_id ? parseInt(req.query.game_id as string) : undefined;
    const orphaned = await overrideService.findOrphanedOverrides(gameId);
    res.json(orphaned);
  } catch (error) {
    console.error('Error finding orphaned overrides:', error);
    res.status(500).json({ error: 'Failed to find orphaned overrides' });
  }
});

/**
 * Delete orphaned overrides (overrides for variations that no longer exist)
 * DELETE /api/variation-overrides/orphaned?game_id=1
 */
router.delete('/orphaned', async (req, res) => {
  try {
    const gameId = req.query.game_id ? parseInt(req.query.game_id as string) : undefined;
    const deletedCount = await overrideService.deleteOrphanedOverrides(gameId);
    res.json({
      success: true,
      message: `Deleted ${deletedCount} orphaned override${deletedCount !== 1 ? 's' : ''}`,
      count: deletedCount
    });
  } catch (error) {
    console.error('Error deleting orphaned overrides:', error);
    res.status(500).json({ error: 'Failed to delete orphaned overrides' });
  }
});

/**
 * Delete an override
 * DELETE /api/variation-overrides/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const success = await overrideService.deleteOverride(id);

    if (success) {
      res.json({ success: true, message: 'Override deleted' });
    } else {
      res.status(404).json({ error: 'Override not found' });
    }
  } catch (error) {
    console.error('Error deleting override:', error);
    res.status(500).json({ error: 'Failed to delete override' });
  }
});

export default router;
