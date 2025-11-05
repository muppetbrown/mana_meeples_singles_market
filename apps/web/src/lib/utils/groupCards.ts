/**
 * Card Grouping Utilities
 *
 * Transforms flat card data (where each row is a treatment/finish variation) into
 * hierarchical BrowseBaseCard structures for unified display across admin and shop pages.
 *
 * @module groupCards
 *
 * ## Purpose
 * The database stores each card variation (treatment/finish combo) as a separate row.
 * This utility groups these rows by (set_id, card_number) and organizes them into
 * a base card with a variations array for consistent UI display.
 *
 * ## Architecture
 * - **Grouping Key**: (set_id, card_number) - matches DB unique constraints
 * - **Variation Identity**: treatment + finish + border_color
 * - **Price Logic**: Automatically selects base_price or foil_price based on finish
 * - **Sorting**: Variations sorted by finish → treatment → border_color
 *
 * ## Key Features
 * - Preserves all variation metadata (treatment, finish, border, frame effects)
 * - Calculates aggregate stats (total_stock, variation_count, lowest_price)
 * - Selects preferred base card (STANDARD/REGULAR + NONFOIL when available)
 * - Consistent ordering for stable UI rendering
 *
 * @example
 * ```ts
 * const cards = [
 *   { set_id: 1, card_number: '123', treatment: 'STANDARD', finish: 'nonfoil', ... },
 *   { set_id: 1, card_number: '123', treatment: 'BORDERLESS', finish: 'foil', ... }
 * ];
 * const grouped = groupCardsForBrowse(cards);
 * // Returns: [BrowseBaseCard with 2 variations]
 * ```
 */
import type {
  Card,
  CardVariation,
  BrowseBaseCard,
  BrowseVariation
} from '@/types';
import {
  formatTreatment,
  formatFinish,
  isFoilCard,
  hasSpecialTreatment
} from '@/types';



const finishRank = (f?: string) => {
  const u = (f || '').toUpperCase();
  if (u.includes('NON')) return 0;          // NONFOIL first
  if (u.includes('FOIL') && !u.includes('ETCH')) return 1; // FOIL
  if (u.includes('ETCH')) return 2;         // ETCHED/other special foils
  return 3;
};

const treatmentRank = (t?: string) => {
  const order = ['STANDARD', 'REGULAR', 'EXTENDED', 'BORDERLESS', 'SHOWCASE', 'FULLART'];
  const i = order.indexOf((t || '').toUpperCase());
  return i === -1 ? order.length : i;
};

const isPreferredBase = (c: Card) =>
  ['STANDARD', 'REGULAR'].includes((c.treatment || '').toUpperCase()) &&
  (c.finish || '').toUpperCase().includes('NON');

/**
 * Group catalog card rows into browseable base cards with variations.
 *
 * Takes an array of Card objects (where each represents a unique variation) and
 * groups them by (set_id, card_number) into BrowseBaseCard objects. Each base card
 * contains an array of its variations with proper price assignment and sorting.
 *
 * ## Grouping Logic
 * 1. Group cards by (set_id, card_number) key
 * 2. For each group, create variation objects with appropriate prices
 * 3. Sort variations: nonfoil → foil → etched, then by treatment
 * 4. Calculate aggregates: total_stock, variation_count, lowest_price
 * 5. Select preferred base card (STANDARD/NONFOIL preferred)
 *
 * ## Price Assignment
 * Each variation gets its price based on finish type:
 * - Nonfoil: uses base_price
 * - Foil/Etched: uses foil_price
 * - Unknown: defaults to base_price
 *
 * @param cards - Array of card rows from database (each row is a variation)
 * @returns Array of grouped BrowseBaseCards ready for display
 *
 * @example
 * ```ts
 * const dbCards = await fetchCards(); // Each row is a variation
 * const browseable = groupCardsForBrowse(dbCards);
 * // Can now display with CardGrid or CardList
 * ```
 */
export function groupCardsForBrowse(cards: Card[]): BrowseBaseCard[] {
  if (!Array.isArray(cards) || cards.length === 0) return [];

  const groups = new Map<string, Card[]>();
  for (const c of cards) {
    const key = `sid:${c.set_id}|num:${c.card_number}`;
    const arr = groups.get(key);
    if (arr) arr.push(c); else groups.set(key, [c]);
  }

  const result: BrowseBaseCard[] = [];
  for (const group of groups.values()) {
    const variations: BrowseVariation[] = group
      .map((c) => {
        // Determine the appropriate price based on finish type
        const finish = (c.finish ?? '').toLowerCase();
        let price: number | null = null;

        // Check for nonfoil first (before checking for 'foil' substring)
        if (finish.includes('non') || finish === 'nonfoil' || finish === '') {
          price = c.base_price ?? null;
        }
        // For foil/etched finishes, use foil_price
        else if (finish.includes('foil') || finish.includes('etched')) {
          price = c.foil_price ?? null;
        }
        // Default to base_price for unknown finishes
        else {
          price = c.base_price ?? null;
        }

        return {
          id: c.id,
          sku: c.sku,
          scryfall_id: c.scryfall_id ?? null,
          treatment: c.treatment ?? '',
          finish: c.finish ?? '',
          border_color: c.border_color ?? null,
          frame_effect: c.frame_effect ?? null,
          promo_type: c.promo_type ?? null,
          image: c.image_url?? null,
          in_stock: Number(c.total_stock ?? 0),
          price, // Set to appropriate price based on finish
          base_price: c.base_price ?? null,
          foil_price: c.foil_price ?? null,
          price_source: c.price_source ?? null,
        };
      })
      .sort((a, b) => {
        const fr = finishRank(a.finish) - finishRank(b.finish);
        if (fr !== 0) return fr;
        const tr = treatmentRank(a.treatment) - treatmentRank(b.treatment);
        if (tr !== 0) return tr;
        return (a.border_color || '').localeCompare(b.border_color || '');
      });

    const total_stock = variations.reduce((s, v) => s + (v.in_stock || 0), 0);
    const variation_count = variations.length;
    const preferred = group.find(isPreferredBase) ?? group[0];

    result.push({
      ...preferred,
      variations,
      variation_count,
      total_stock,
      lowest_price:
        variations
          .filter(v => (v.in_stock ?? 0) > 0 && typeof v.price === 'number')
          .map(v => v.price as number)
          .sort((a, b) => a - b)[0] ?? null,
    });
  }

  // Stable outer ordering
  result.sort((a, b) => {
    const numCmp = String(a.card_number).localeCompare(String(b.card_number), undefined, { numeric: true });
    if (numCmp !== 0) return numCmp;
    return a.name.localeCompare(b.name);
  });

  return result;
}