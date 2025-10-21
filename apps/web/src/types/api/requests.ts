// 4. types/api/requests.ts - API Request shapes
export interface SearchFilters {
  game?: string;
  set?: string;
  rarity?: string[];
  quality?: string[];
  foilType?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface CardSearchParams extends SearchFilters, PaginationParams {
  search?: string;
  sortBy?: 'name' | 'price' | 'stock';
  sortOrder?: 'asc' | 'desc';
}