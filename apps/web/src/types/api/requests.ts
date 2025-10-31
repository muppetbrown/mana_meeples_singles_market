// 4. types/api/requests.ts - API Request shapes
// STANDARDIZED: Single source of truth for filter/search parameters

export interface SearchFilters {
  game?: string | undefined;
  set?: string | undefined;
  treatment?: string | undefined; // Card treatment (STANDARD, BORDERLESS, etc.)
  finish?: string | undefined; // Card finish (Regular, Foil, Etched, etc.)
  rarity?: string[] | undefined;
  quality?: string[] | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  inStockOnly?: boolean | undefined;
}

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