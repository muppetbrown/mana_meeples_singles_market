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
import { importJobTracker } from '../services/importJobTracker.js';

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
 * Returns immediately with a job ID for tracking progress via SSE
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
 *   jobId: string
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

    // Check if game is supported
    if (game !== 'mtg') {
      return res.status(501).json({
        error: `${game} import not yet implemented`,
        message: `${game} card importing will be available in a future update`
      });
    }

    console.log(`📥 Creating import job for ${game.toUpperCase()} set: ${setCode}`);
    console.log(`👤 Requested by admin: ${req.user?.username || 'unknown'}`);

    // Create a new job
    const jobId = importJobTracker.createJob(game, setCode.toUpperCase());

    // Start the import in the background (don't await)
    runImportJob(jobId, game, setCode.toUpperCase()).catch((error) => {
      console.error(`❌ Unhandled error in import job ${jobId}:`, error);
      importJobTracker.failJob(jobId, error instanceof Error ? error.message : String(error));
    });

    // Return immediately with job ID
    return res.json({
      success: true,
      jobId
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to create import job:', message);

    return res.status(500).json({
      error: 'Failed to create import job',
      message: message
    });
  }
});

/**
 * Run an import job in the background
 */
async function runImportJob(jobId: string, game: string, setCode: string): Promise<void> {
  try {
    console.log(`🚀 Starting import job ${jobId} for ${game} set: ${setCode}`);

    let result;

    // Route to appropriate import function based on game
    switch (game) {
      case 'mtg':
        result = await importMTGSet(setCode, (progress) => {
          console.log(`[Job ${jobId}] ${progress.stage}: ${progress.message}`);
          importJobTracker.updateProgress(jobId, progress);
        });
        break;

      default:
        throw new Error(`Unsupported game: ${game}`);
    }

    console.log(`✅ Import job ${jobId} complete for ${game} set: ${setCode}`);
    console.log(`   Imported: ${result.imported}, Updated: ${result.updated}, Skipped: ${result.skipped}`);

    // Mark job as completed
    importJobTracker.completeJob(jobId, {
      setId: result.setId,
      imported: result.imported,
      updated: result.updated,
      variations: result.variations,
      skipped: result.skipped
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Import job ${jobId} failed:`, message);

    if (error instanceof Error) {
      console.error(error.stack);
    }

    // Provide helpful error messages for common issues
    let errorMessage = message;

    if (message.includes('No cards found')) {
      errorMessage = 'No cards found for the provided set code. Please check the set code and try again.';
    } else if (message.includes('game not found')) {
      errorMessage = 'The game is not properly configured in the database. Please contact support.';
    } else if (message.includes('Scryfall API')) {
      errorMessage = 'Failed to fetch data from Scryfall. The service may be temporarily unavailable.';
    }

    importJobTracker.failJob(jobId, errorMessage);
  }
}

/**
 * GET /admin/import/progress/:jobId
 *
 * Server-Sent Events (SSE) endpoint for streaming import progress
 *
 * Response: text/event-stream
 * Event data format:
 * {
 *   jobId: string,
 *   status: 'pending' | 'running' | 'completed' | 'failed',
 *   progress: {
 *     stage: string,
 *     message: string,
 *     percentage: number,
 *     currentCard?: number,
 *     totalCards?: number,
 *     imported?: number,
 *     updated?: number,
 *     skipped?: number
 *   },
 *   result?: object,
 *   error?: string
 * }
 */
router.get('/admin/import/progress/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;

  // Get the job
  const job = importJobTracker.getJob(jobId);
  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
      message: 'The specified import job does not exist or has expired'
    });
  }

  console.log(`📡 SSE client connected for job ${jobId}`);

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Register this client with the job tracker
  importJobTracker.registerSSEClient(jobId, res);

  // Send initial state immediately
  const initialData = {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    result: job.result,
    error: job.error
  };
  res.write(`data: ${JSON.stringify(initialData)}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    console.log(`📡 SSE client disconnected from job ${jobId}`);
    importJobTracker.unregisterSSEClient(jobId, res);
    res.end();
  });
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
