// 4. types/api/requests.ts - API Request shapes
export interface SearchFilters {
  game?: string | undefined;
  set?: string | undefined;
  rarity?: string[] | undefined;
  quality?: string[] | undefined;
  foilType?: string[] | undefined;
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
  search?: string;
  sortBy?: 'name' | 'price' | 'stock';
  sortOrder?: 'asc' | 'desc';
}