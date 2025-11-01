// apps/web/src/lib/utils/sortCards.ts
/**
 * Card Sorting and Grouping Utility
 *
 * Provides sorting and grouping functionality for card displays
 * with section headers based on the sort criteria
 */

import type { BrowseBaseCard } from '@/types';

export type SortOption = 'name' | 'price' | 'set' | 'rarity';
export type SortOrder = 'asc' | 'desc';

export interface CardGroup {
  header: string;
  cards: BrowseBaseCard[];
}

/**
 * Get the price range header for a price value
 */
function getPriceRangeHeader(price: number | null): string {
  if (price === null || price === 0) return '$0.00';

  if (price < 1) return '$0.01 - $0.99';
  if (price < 5) return '$1.00 - $4.99';
  if (price < 10) return '$5.00 - $9.99';
  if (price < 25) return '$10.00 - $24.99';
  if (price < 50) return '$25.00 - $49.99';
  if (price < 100) return '$50.00 - $99.99';
  return '$100.00+';
}

/**
 * Get the alphabetic header for a name
 */
function getAlphabeticHeader(name: string): string {
  const firstChar = name.charAt(0).toUpperCase();
  return /[A-Z]/.test(firstChar) ? firstChar : '#';
}

/**
 * Define rarity order for consistent sorting
 */
const RARITY_ORDER: Record<string, number> = {
  'common': 1,
  'uncommon': 2,
  'rare': 3,
  'mythic': 4,
  'mythic rare': 4,
  'special': 5,
  'bonus': 6,
  'unknown': 99
};

/**
 * Get rarity sort value
 */
function getRarityValue(rarity?: string): number {
  if (!rarity) return RARITY_ORDER['unknown'];
  const lower = rarity.toLowerCase();
  return RARITY_ORDER[lower] ?? RARITY_ORDER['unknown'];
}

/**
 * Sort cards by the specified criteria
 */
export function sortCards(
  cards: BrowseBaseCard[],
  sortBy: SortOption,
  sortOrder: SortOrder
): BrowseBaseCard[] {
  const sorted = [...cards].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;

      case 'price':
        const priceA = a.lowest_price ?? 0;
        const priceB = b.lowest_price ?? 0;
        comparison = priceA - priceB;
        break;

      case 'set':
        comparison = a.set_name.localeCompare(b.set_name);
        // Secondary sort by name within same set
        if (comparison === 0) {
          comparison = a.name.localeCompare(b.name);
        }
        break;

      case 'rarity':
        const rarityA = getRarityValue(a.rarity);
        const rarityB = getRarityValue(b.rarity);
        comparison = rarityA - rarityB;
        // Secondary sort by name within same rarity
        if (comparison === 0) {
          comparison = a.name.localeCompare(b.name);
        }
        break;

      default:
        comparison = 0;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Group sorted cards with section headers
 */
export function groupCardsBySort(
  cards: BrowseBaseCard[],
  sortBy: SortOption,
  sortOrder: SortOrder
): CardGroup[] {
  const sorted = sortCards(cards, sortBy, sortOrder);
  const groups: CardGroup[] = [];
  let currentGroup: CardGroup | null = null;

  for (const card of sorted) {
    let header: string;

    switch (sortBy) {
      case 'name':
        header = getAlphabeticHeader(card.name);
        break;

      case 'price':
        header = getPriceRangeHeader(card.lowest_price);
        break;

      case 'set':
        header = card.set_name;
        break;

      case 'rarity':
        header = (card.rarity || 'Unknown').charAt(0).toUpperCase() + (card.rarity || 'Unknown').slice(1).toLowerCase();
        break;

      default:
        header = 'All Cards';
    }

    // Create new group if header changes or no current group
    if (!currentGroup || currentGroup.header !== header) {
      currentGroup = { header, cards: [] };
      groups.push(currentGroup);
    }

    currentGroup.cards.push(card);
  }

  return groups;
}

/**
 * Get display label for sort option
 */
export function getSortOptionLabel(sortBy: SortOption): string {
  const labels: Record<SortOption, string> = {
    name: 'Name',
    price: 'Price',
    set: 'Set',
    rarity: 'Rarity'
  };
  return labels[sortBy];
}

/**
 * Get all available sort options
 */
export function getSortOptions(): Array<{ value: SortOption; label: string }> {
  return [
    { value: 'name', label: 'Name' },
    { value: 'price', label: 'Price' },
    { value: 'set', label: 'Set' },
    { value: 'rarity', label: 'Rarity' }
  ];
}
