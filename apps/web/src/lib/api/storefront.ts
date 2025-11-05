/**
 * Storefront API Query Builder
 *
 * Shared utilities for building storefront API queries
 * Reduces duplication between frontend query building and backend expectations
 */

interface Game {
  id: number;
  name: string;
}

interface Set {
  id: number;
  name: string;
}

export interface StorefrontQueryParams {
  searchTerm?: string;
  selectedGame?: string;
  selectedSet?: string;
  selectedTreatment?: string;
  selectedFinish?: string;
  selectedRarity?: string;
  selectedQuality?: string;
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Build URLSearchParams for storefront API calls
 * Handles name-to-ID conversion for games and sets
 *
 * This centralizes the query param building logic that was duplicated
 * across multiple components.
 */
export function buildStorefrontQuery(
  params: StorefrontQueryParams,
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
    if (game) {
      queryParams.set('game_id', game.id.toString());
    }
  }

  // Set filter - convert name to ID
  if (params.selectedSet && params.selectedSet !== 'all') {
    const set = sets.find(s => s.name === params.selectedSet);
    if (set) {
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

  // Quality filter
  if (params.selectedQuality && params.selectedQuality !== 'all') {
    queryParams.set('quality', params.selectedQuality);
  }

  // Pagination
  if (params.page) {
    queryParams.set('page', params.page.toString());
  }
  if (params.perPage) {
    queryParams.set('per_page', params.perPage.toString());
  }

  // Sorting
  if (params.sortBy) {
    queryParams.set('sort', params.sortBy);
  }
  if (params.sortOrder) {
    queryParams.set('order', params.sortOrder);
  }

  return queryParams;
}

/**
 * Type-safe wrapper for the backend's expected query parameters
 * This serves as documentation of the API contract
 */
export type StorefrontAPIParams = {
  search?: string;
  game_id?: number;
  set_id?: number;
  treatment?: string;
  finish?: string;
  rarity?: string;
  quality?: string;
  page?: number;
  per_page?: number;
  sort?: 'name' | 'number' | 'rarity' | 'created_at';
  order?: 'asc' | 'desc';
};
