// File: apps/web/src/lib/utils/groupCards.ts
// Purpose: Catalog-only grouping of "cards" (each DB row is a variation) into base cards for browsing.
// Notes:
// - This intentionally avoids inventory-specific fields (quality, language).
// - Finish/foil and treatment are first-class in the variation identity and ordering.
// - Groups are keyed by (set_id, card_number) to align with DB uniqueness.
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
 * Group catalog rows into browseable base cards.
 * Each input row is itself a variation; we synthesize `variations` from grouped rows.
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
      .map((c) => ({
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
        price: null, // Individual variation price (not used in browse view)
        base_price: c.base_price ?? null,
        foil_price: c.foil_price ?? null,
        price_source: c.price_source ?? null,
      }))
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