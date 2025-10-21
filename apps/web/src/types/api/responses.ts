// 5. types/api/responses.ts - API Response shapes
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface FilterCounts {
  games: Array<{ name: string; count: number }>;
  sets: Array<{ name: string; count: number }>;
  rarities: Array<{ rarity: string; count: number }>;
  qualities: Array<{ quality: string; count: number }>;
}
