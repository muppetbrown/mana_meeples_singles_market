/**
 * Unified Card Query Builder
 *
 * CONSOLIDATED SOLUTION - Single source of truth for building card API queries
 * Used by BOTH admin and storefront to eliminate duplication
 *
 * Replaces:
 * - Duplicate query building in CardsTab.tsx (lines 312-345)
 * - Original buildStorefrontQuery function
 * - Inline param building throughout the codebase
 */

import type { Game, Set } from '@/types/filters';

// Re-export for backward compatibility
export type { Game, Set };

/**
 * Unified parameters for card queries
 * Works for both admin (/api/cards/cards) and storefront (/api/storefront/cards)
 */
export interface CardQueryParams {
  // Filters
  searchTerm?: string | undefined;
  selectedGame?: string | undefined;      // Game name (will be converted to game_id)
  selectedSet?: string | undefined;        // Set name (will be converted to set_id)
  selectedTreatment?: string | undefined;
  selectedFinish?: string | undefined;
  selectedRarity?: string | undefined;
  selectedQuality?: string | undefined;
  hasInventory?: boolean | undefined;      // Admin-only: filter to cards with inventory

  // Pagination
  page?: number | undefined;
  perPage?: number | undefined;
  limit?: number | undefined;              // Admin-only: max results without pagination

  // Sorting
  sortBy?: 'name' | 'number' | 'rarity' | 'created_at' | 'price' | 'set' | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
}

/**
 * Backend API parameters (after name-to-ID conversion)
 * Type-safe representation of what the API actually expects
 */
export interface CardAPIParams {
  search?: string;
  game_id?: number;
  set_id?: number;
  treatment?: string;
  finish?: string;
  rarity?: string;
  quality?: string;
  has_inventory?: string;      // Backend expects 'true'/'false' string

  page?: number;
  per_page?: number;
  limit?: number;

  sort?: 'name' | 'number' | 'rarity' | 'created_at';
  order?: 'asc' | 'desc';
}

/**
 * Unified query builder for card fetching
 *
 * Handles:
 * - Name-to-ID conversion for games and sets
 * - Filter normalization
 * - Pagination parameters
 * - Sorting parameters
 *
 * @param params - Query parameters with user-friendly names
 * @param games - Available games for name-to-ID lookup
 * @param sets - Available sets for name-to-ID lookup
 * @returns URLSearchParams ready for API call
 */
export function buildCardQuery(
  params: CardQueryParams,
  games: Game[],
  sets: Set[]
): URLSearchParams {
  const queryParams = new URLSearchParams();

  // Search term
  if (params.searchTerm?.trim()) {
    queryParams.set('search', params.searchTerm.trim());
  }

  // Game filter - convert name to ID
  if (params.selectedGame && params.selectedGame !== 'all') {
    const game = games.find(g => g.name === params.selectedGame);
    if (game?.id) {
      queryParams.set('game_id', game.id.toString());
    }
  }

  // Set filter - convert name to ID
  if (params.selectedSet && params.selectedSet !== 'all') {
    const set = sets.find(s => s.name === params.selectedSet);
    if (set?.id) {
      queryParams.set('set_id', set.id.toString());
    }
  }

  // Treatment filter
  if (params.selectedTreatment && params.selectedTreatment !== 'all') {
    queryParams.set('treatment', params.selectedTreatment);
  }

  // Finish filter
  if (params.selectedFinish && params.selectedFinish !== 'all') {
    queryParams.set('finish', params.selectedFinish);
  }

  // Rarity filter
  if (params.selectedRarity && params.selectedRarity !== 'all') {
    queryParams.set('rarity', params.selectedRarity);
  }

  // Quality filter (inventory-level)
  if (params.selectedQuality && params.selectedQuality !== 'all') {
    queryParams.set('quality', params.selectedQuality);
  }

  // Inventory filter (admin-only)
  if (params.hasInventory !== undefined) {
    queryParams.set('has_inventory', params.hasInventory ? 'true' : 'false');
  }

  // Pagination
  if (params.page !== undefined) {
    queryParams.set('page', params.page.toString());
  }
  if (params.perPage !== undefined) {
    queryParams.set('per_page', params.perPage.toString());
  }
  if (params.limit !== undefined) {
    queryParams.set('limit', params.limit.toString());
  }

  // Sorting - normalize different sort options
  if (params.sortBy) {
    let sortValue = params.sortBy;
    // Map frontend sort values to backend values
    if (sortValue === 'number') sortValue = 'number';
    else if (sortValue === 'set') sortValue = 'name'; // Sort by name when sorting by set
    else if (sortValue === 'price') sortValue = 'name'; // Price sorting handled client-side

    queryParams.set('sort', sortValue);
  }
  if (params.sortOrder) {
    queryParams.set('order', params.sortOrder);
  }

  return queryParams;
}

/**
 * Helper to convert params object to Record<string, unknown> for api.get()
 * Some components prefer passing params as object instead of URLSearchParams
 */
export function buildCardParams(
  params: CardQueryParams,
  games: Game[],
  sets: Set[]
): Record<string, unknown> {
  const searchParams = buildCardQuery(params, games, sets);
  const result: Record<string, unknown> = {};

  searchParams.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

// Backwards compatibility aliases
export const buildStorefrontQuery = buildCardQuery;
export type StorefrontQueryParams = CardQueryParams;
export type StorefrontAPIParams = CardAPIParams;
