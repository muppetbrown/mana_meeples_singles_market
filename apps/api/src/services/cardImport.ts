/**
 * Card Import Service
 *
 * Handles importing card sets from various sources (Scryfall for MTG, etc.)
 * Separated from routes for reusability and testability
 */

import { db } from '../lib/db.js';
import * as variationService from './variationAnalysis.js';

// Import constants from variation service
const {
  IGNORE_FRAME_EFFECTS,
  VISUAL_TREATMENTS,
  SPECIAL_FOILS,
  BORDER_COLORS
} = variationService;

interface MTGCard {
  id: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  type_line?: string;
  oracle_text?: string;
  image_uris?: {
    large?: string;
    normal?: string;
  };
  card_faces?: Array<{
    oracle_text?: string;
    image_uris?: {
      large?: string;
      normal?: string;
    };
  }>;
  border_color?: string;
  frame_effects?: string[];
  promo_types?: string[];
  finishes?: string[];
  released_at?: string;
  prices?: {
    usd?: string | null;
    usd_foil?: string | null;
    usd_etched?: string | null;
  };
  [key: string]: unknown;
}

interface ImportProgress {
  stage: 'fetching' | 'processing' | 'analyzing' | 'complete' | 'error';
  message: string;
  currentCard?: number;
  totalCards?: number;
  imported?: number;
  updated?: number;
  skipped?: number;
}

/**
 * Calculate treatment code from Scryfall card data
 */
function calculateTreatment(card: MTGCard): string {
  const borderColor = card.border_color || 'black';
  const frameEffects = card.frame_effects || [];
  const promoTypes = card.promo_types || [];

  // Filter frame effects
  const relevantFrameEffects = frameEffects.filter((e: string) =>
    !IGNORE_FRAME_EFFECTS.includes(e)
  );

  // Find special foil type
  const specialFoilType = promoTypes.find((p: string) => SPECIAL_FOILS.includes(p));

  // Helper function
  const has = (effect: string) => relevantFrameEffects.includes(effect);
  const isBorderless = borderColor === 'borderless';

  // PRIORITY ORDER

  // 1. Yellow border (winner cards)
  if (borderColor === 'yellow') {
    return specialFoilType ?
      `WINNER_${specialFoilType.toUpperCase()}` :
      'WINNER';
  }

  // 2. Special foil + white border
  if (specialFoilType && borderColor === 'white') {
    const base = getBaseTreatment(relevantFrameEffects, isBorderless);
    return base ?
      `${base}_${specialFoilType.toUpperCase()}` :
      `WHITE_BORDER_${specialFoilType.toUpperCase()}`;
  }

  // 3. Special foil + borderless
  if (specialFoilType && isBorderless) {
    const base = getBaseTreatment(relevantFrameEffects, isBorderless);
    return base ?
      `${base}_${specialFoilType.toUpperCase()}` :
      `BORDERLESS_${specialFoilType.toUpperCase()}`;
  }

  // 4. Special foil + standard
  if (specialFoilType) {
    const base = getBaseTreatment(relevantFrameEffects, isBorderless);
    return base ?
      `${base}_${specialFoilType.toUpperCase()}` :
      `STANDARD_${specialFoilType.toUpperCase()}`;
  }

  // 5. No special foil - just frame effects
  const base = getBaseTreatment(relevantFrameEffects, isBorderless);
  if (base) return base;

  // 6. Border-only treatments
  if (borderColor === 'white') return 'WHITE_BORDER';
  if (borderColor === 'borderless') return 'BORDERLESS';

  // 7. Standard
  return 'STANDARD';
}

/**
 * Helper: Get base treatment from frame effects
 */
function getBaseTreatment(frameEffects: string[], isBorderless: boolean): string | null {
  const has = (effect: string) => frameEffects.includes(effect);

  // Combinations (order matters!)
  if (has('showcase') && has('inverted') && isBorderless)
    return 'SHOWCASE_INVERTED';
  if (has('showcase') && isBorderless)
    return 'SHOWCASE';
  if (has('wanted') && has('inverted') && isBorderless)
    return 'WANTED_INVERTED';
  if (has('wanted') && isBorderless)
    return 'WANTED';
  if (has('tombstone') && has('inverted') && isBorderless)
    return 'TOMBSTONE_INVERTED';
  if (has('tombstone') && isBorderless)
    return 'TOMBSTONE';
  if (has('inverted') && isBorderless)
    return 'BORDERLESS_INVERTED';
  if (has('fullart') && isBorderless)
    return 'FULLART_BORDERLESS';

  // Single treatments
  if (has('fullart')) return 'FULLART';
  if (has('extendedart')) return 'EXTENDED';
  if (has('showcase')) return 'SHOWCASE_STANDARD';
  if (has('wanted')) return 'WANTED_STANDARD';
  if (has('tombstone')) return 'TOMBSTONE_STANDARD';
  if (has('inverted')) return 'INVERTED_STANDARD';

  return null;
}

/**
 * Generate SKU from card data
 */
function generateSKU(card: MTGCard, treatment: string, finish: string): string {
  return [
    card.set.toUpperCase(),
    card.collector_number,
    treatment,
    finish.toUpperCase()
  ].join('-');
}

/**
 * Fetch all cards from Scryfall for a given set code
 */
async function fetchCardsFromScryfall(setCode: string, onProgress?: (progress: ImportProgress) => void): Promise<MTGCard[]> {
  let allCards: MTGCard[] = [];
  let nextPage = `https://api.scryfall.com/cards/search?q=set:${setCode}&unique=prints&order=name`;
  let pageNum = 1;

  // Fetch all pages from Scryfall API
  while (nextPage) {
    if (onProgress) {
      onProgress({
        stage: 'fetching',
        message: `Fetching page ${pageNum} from Scryfall...`,
      });
    }

    const response = await fetch(nextPage);

    if (!response.ok) {
      throw new Error(`Scryfall API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      data?: MTGCard[];
      has_more?: boolean;
      next_page?: string;
    };

    if (!data.data || data.data.length === 0) {
      if (pageNum === 1) {
        throw new Error('No cards found for this set code');
      }
      break;
    }

    allCards = allCards.concat(data.data);

    nextPage = data.has_more ? data.next_page : null;
    pageNum++;

    if (nextPage) {
      // Respect Scryfall's rate limit (100ms between requests)
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return allCards;
}

/**
 * Import MTG set with full variation tracking
 */
export async function importMTGSet(
  setCode: string,
  onProgress?: (progress: ImportProgress) => void
): Promise<{
  imported: number;
  updated: number;
  variations: number;
  skipped: number;
  setId: number;
}> {
  try {
    // Fetch cards from Scryfall
    const allCards = await fetchCardsFromScryfall(setCode, onProgress);

    if (allCards.length === 0) {
      throw new Error('No cards found for this set code');
    }

    if (onProgress) {
      onProgress({
        stage: 'processing',
        message: `Found ${allCards.length} cards. Starting import...`,
        totalCards: allCards.length,
      });
    }

    // Get MTG game ID
    const gameResult = await db.query<{ id: number }>(
      `SELECT id FROM games WHERE code = 'mtg'`
    );

    if (!gameResult || gameResult.length === 0) {
      throw new Error('MTG game not found in database');
    }

    const gameId = gameResult[0].id;

    // Create or get set
    const setInfo = allCards[0].set_name;
    const releaseDate = allCards[0].released_at;

    const setResult = await db.query<{ id: number }>(
      `INSERT INTO card_sets (game_id, name, code, release_date)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (game_id, code) DO UPDATE
       SET name = EXCLUDED.name, release_date = EXCLUDED.release_date, updated_at = NOW()
       RETURNING id`,
      [gameId, setInfo, setCode.toUpperCase(), releaseDate]
    );

    const setId = setResult[0].id;

    // Statistics
    let imported = 0;
    let updated = 0;
    let variations = 0;
    let skipped = 0;

    // Process each card
    for (let i = 0; i < allCards.length; i++) {
      const card = allCards[i];

      try {
        // Get image URL
        let imageUrl = card.image_uris?.large || card.image_uris?.normal;
        if (!imageUrl && card.card_faces?.[0]?.image_uris) {
          imageUrl = card.card_faces[0].image_uris.large ||
                     card.card_faces[0].image_uris.normal;
        }

        // Get oracle text
        let oracleText = card.oracle_text || '';
        if (!oracleText && card.card_faces) {
          oracleText = card.card_faces
            .map((face) => face.oracle_text || '')
            .filter((text) => text)
            .join(' // ');
        }

        // Calculate treatment
        const treatment = calculateTreatment(card);

        // Get finishes
        const finishes = card.finishes || ['nonfoil'];

        // Debug logging for finishes
        if (finishes.length > 1) {
          console.log(`📦 Card "${card.name}" (${card.collector_number}) has ${finishes.length} finishes:`, finishes);
        }

        const specialFoil = card.promo_types?.find((p: string) => SPECIAL_FOILS.includes(p));
        const relevantFrames = card.frame_effects?.filter((e: string) =>
          !IGNORE_FRAME_EFFECTS.includes(e)
        ) || [];

        // Process each finish as a separate card entry
        for (const rawFinish of finishes) {
          // Determine the actual finish to use in the database
          // If this is a foil card and has a special foil type (like surgefoil), use that as the finish
          let finish = rawFinish;
          if (rawFinish === 'foil' && specialFoil) {
            finish = specialFoil;
          }

          // Check if we have a price for this finish type
          const prices = card.prices;
          let hasPrice = false;

          if (prices) {
            if (finish === 'nonfoil' && prices.usd) {
              hasPrice = true;
            } else if (finish === 'etched' && prices.usd_etched) {
              hasPrice = true;
            } else if (finish !== 'nonfoil' && finish !== 'etched') {
              // For foil and special foils (surgefoil, etc.), check foil price
              if (prices.usd_foil) {
                hasPrice = true;
              }
            }
          }

          // Skip this variation if no price exists
          if (!hasPrice) {
            console.log(`  ⏭️  Skipped: ${card.name} (${finish}) - No price available`);
            skipped++;
            continue;
          }

          const sku = generateSKU(card, treatment, finish);

          // Check if card already exists
          const existingCard = await db.query<{ id: number }>(
            `SELECT id FROM cards WHERE sku = $1`,
            [sku]
          );

          if (existingCard && existingCard.length > 0) {
            // Update existing
            await db.query(
              `UPDATE cards
               SET name = $1, rarity = $2, card_type = $3, description = $4,
                   image_url = $5, scryfall_id = $6,
                   border_color = $7, finish = $8, frame_effect = $9,
                   promo_type = $10, treatment = $11, updated_at = NOW()
               WHERE sku = $12`,
              [
                card.name,
                card.rarity,
                card.type_line || '',
                oracleText,
                imageUrl,
                card.id,
                card.border_color,
                finish,
                relevantFrames.join(',') || null,
                specialFoil || null,
                treatment,
                sku
              ]
            );
            updated++;
            console.log(`  ✏️  Updated: ${card.name} (${sku})`);
          } else {
            // Insert new
            await db.query(
              `INSERT INTO cards (
                game_id, set_id, name, card_number, rarity, card_type,
                description, image_url, scryfall_id,
                border_color, finish, frame_effect, promo_type, treatment, sku
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
              [
                gameId,
                setId,
                card.name,
                card.collector_number,
                card.rarity,
                card.type_line || '',
                oracleText,
                imageUrl,
                card.id,
                card.border_color,
                finish,
                relevantFrames.join(',') || null,
                specialFoil || null,
                treatment,
                sku
              ]
            );
            imported++;
            console.log(`  ➕ Inserted: ${card.name} (${sku})`);
          }

          variations++;
        }

        if (onProgress && (i + 1) % 10 === 0) {
          onProgress({
            stage: 'processing',
            message: `Processed ${i + 1} of ${allCards.length} cards...`,
            currentCard: i + 1,
            totalCards: allCards.length,
            imported,
            updated,
            skipped,
          });
        }

      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error processing ${card.name} (#${card.collector_number}): ${message}`);
        if (error instanceof Error && error.stack) {
          console.error('Stack trace:', error.stack);
        }
        skipped++;
      }
    }

    // Analyze and store variation metadata
    if (onProgress) {
      onProgress({
        stage: 'analyzing',
        message: 'Analyzing set variations...',
      });
    }

    await variationService.analyzeSetVariations(setId, gameId);
    await variationService.analyzeGameVariations(gameId);
    await variationService.refreshVariationFilters();

    // Log final summary
    console.log(`\n📊 Import Summary:`);
    console.log(`   Total unique cards processed: ${allCards.length}`);
    console.log(`   Total variations created: ${variations}`);
    console.log(`   New cards inserted: ${imported}`);
    console.log(`   Existing cards updated: ${updated}`);
    console.log(`   Cards skipped (errors): ${skipped}`);
    console.log(`   Average variations per card: ${(variations / allCards.length).toFixed(2)}`);

    if (onProgress) {
      onProgress({
        stage: 'complete',
        message: 'Import complete!',
        imported,
        updated,
        skipped,
      });
    }

    return {
      imported,
      updated,
      variations,
      skipped,
      setId,
    };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    if (onProgress) {
      onProgress({
        stage: 'error',
        message: `Import failed: ${message}`,
      });
    }

    throw error;
  }
}

/**
 * Future: Import from other sources (Pokemon, One Piece, etc.)
 * This is where you would add additional import functions
 */
export async function importPokemonSet(setCode: string): Promise<any> {
  throw new Error('Pokemon import not yet implemented');
}

export async function importOnePieceSet(setCode: string): Promise<any> {
  throw new Error('One Piece import not yet implemented');
}
