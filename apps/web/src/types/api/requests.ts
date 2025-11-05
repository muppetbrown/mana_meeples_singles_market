// 4. types/api/requests.ts - API Request shapes
// STANDARDIZED: Single source of truth for filter/search parameters

// Import SearchFilters from unified filters module
import type { SearchFilters } from '../filters';

// Re-export for backward compatibility
export type { SearchFilters };

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface CardSearchParams extends SearchFilters, PaginationParams {
  search?: string; // Searches: card name, card number, set name, treatment
  sortBy?: 'name' | 'number' | 'rarity' | 'price' | 'stock' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}