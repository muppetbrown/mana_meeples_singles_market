/**
 * Import Routes
 *
 * Handles importing card sets from various sources
 * Protected by admin authentication
 */

import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import { adminAuthJWT } from '../middleware/auth.js';
import { importMTGSet } from '../services/cardImport.js';

const router = express.Router();

// All routes require admin authentication
router.use(adminAuthJWT);

/**
 * Import Set Request Schema
 */
const ImportSetSchema = z.object({
  game: z.enum(['mtg', 'pokemon', 'onepiece'], {
    required_error: 'Game is required',
    invalid_type_error: 'Invalid game type'
  }),
  setCode: z.string().min(1, 'Set code is required').max(20, 'Set code too long'),
});

/**
 * POST /admin/import/set
 *
 * Import a card set from an external source (Scryfall for MTG, etc.)
 *
 * Request body:
 * {
 *   game: 'mtg' | 'pokemon' | 'onepiece',
 *   setCode: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   setId: number,
 *   stats: {
 *     imported: number,
 *     updated: number,
 *     variations: number,
 *     skipped: number
 *   }
 * }
 */
router.post('/admin/import/set', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const parsed = ImportSetSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.flatten()
      });
    }

    const { game, setCode } = parsed.data;

    console.log(`📥 Starting import for ${game.toUpperCase()} set: ${setCode}`);
    console.log(`👤 Requested by admin: ${req.user?.username || 'unknown'}`);

    let result;

    // Route to appropriate import function based on game
    switch (game) {
      case 'mtg':
        result = await importMTGSet(setCode.toUpperCase(), (progress) => {
          console.log(`[Import Progress] ${progress.stage}: ${progress.message}`);
        });
        break;

      case 'pokemon':
        return res.status(501).json({
          error: 'Pokemon import not yet implemented',
          message: 'Pokemon card importing will be available in a future update'
        });

      case 'onepiece':
        return res.status(501).json({
          error: 'One Piece import not yet implemented',
          message: 'One Piece card importing will be available in a future update'
        });

      default:
        return res.status(400).json({
          error: 'Invalid game type',
          supportedGames: ['mtg', 'pokemon', 'onepiece']
        });
    }

    console.log(`✅ Import complete for ${game.toUpperCase()} set: ${setCode}`);
    console.log(`   Imported: ${result.imported}, Updated: ${result.updated}, Skipped: ${result.skipped}`);

    return res.json({
      success: true,
      setId: result.setId,
      stats: {
        imported: result.imported,
        updated: result.updated,
        variations: result.variations,
        skipped: result.skipped,
      }
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Import failed:', message);

    if (error instanceof Error) {
      console.error(error.stack);
    }

    // Provide helpful error messages for common issues
    if (message.includes('No cards found')) {
      return res.status(404).json({
        error: 'Set not found',
        message: 'No cards found for the provided set code. Please check the set code and try again.',
        hint: 'You can find set codes at https://scryfall.com/sets for MTG cards'
      });
    }

    if (message.includes('game not found')) {
      return res.status(500).json({
        error: 'Database configuration error',
        message: 'The game is not properly configured in the database. Please contact support.'
      });
    }

    if (message.includes('Scryfall API')) {
      return res.status(502).json({
        error: 'External API error',
        message: 'Failed to fetch data from Scryfall. The service may be temporarily unavailable.'
      });
    }

    return res.status(500).json({
      error: 'Import failed',
      message: message
    });
  }
});

/**
 * GET /admin/import/games
 *
 * Get list of supported games for importing
 *
 * Response:
 * {
 *   games: Array<{
 *     code: string,
 *     name: string,
 *     supported: boolean,
 *     hint?: string
 *   }>
 * }
 */
router.get('/admin/import/games', (_req: Request, res: Response) => {
  return res.json({
    games: [
      {
        code: 'mtg',
        name: 'Magic: The Gathering',
        supported: true,
        hint: 'Find set codes at https://scryfall.com/sets'
      },
      {
        code: 'pokemon',
        name: 'Pokémon TCG',
        supported: false,
        hint: 'Coming soon'
      },
      {
        code: 'onepiece',
        name: 'One Piece Card Game',
        supported: false,
        hint: 'Coming soon'
      }
    ]
  });
});

export default router;
