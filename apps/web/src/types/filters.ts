/**
 * Shared Filter Types
 * Single source of truth for all filter-related type definitions
 * Used by both admin and storefront filtering
 */

// ============================================================================
// BASE TYPES
// ============================================================================

export interface Game {
  id: number;
  name: string;
  code?: string;
  card_count?: number;
}

export interface Set {
  id: number;
  name: string;
  code?: string;
  game_id?: number;
  card_count?: number;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number | undefined;
}

// ============================================================================
// FILTER OPTIONS
// ============================================================================

/**
 * Available filter options loaded from API
 * Used to populate dropdowns and filter controls
 */
export interface FilterOptions {
  games: Game[];
  sets: Set[];
  treatments: FilterOption[];
  finishes: FilterOption[];
  rarities: FilterOption[];
  qualities: FilterOption[];
}

export const EMPTY_FILTER_OPTIONS: FilterOptions = {
  games: [],
  sets: [],
  treatments: [],
  finishes: [],
  rarities: [],
  qualities: []
};

// ============================================================================
// SEARCH FILTERS
// ============================================================================

/**
 * Active filter values from URL params
 * Represents the current filter state
 */
export interface SearchFilters {
  game?: string | undefined;
  set?: string | undefined;
  treatment?: string | undefined;
  finish?: string | undefined;
  rarity?: string[] | undefined;
  quality?: string[] | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  inStockOnly?: boolean | undefined;
  search?: string | undefined;
}

// ============================================================================
// ADDITIONAL FILTERS CONFIG
// ============================================================================

/**
 * Configuration for additional filter controls
 * Used by CardSearchBar component
 */
export interface AdditionalFilter {
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  options?: FilterOption[];
}

export type AdditionalFiltersConfig = Record<string, AdditionalFilter>;

// ============================================================================
// FILTER HOOK RETURN TYPE
// ============================================================================

/**
 * Return type for unified filter hooks
 * Provides consistent API for filter management
 */
export interface FilterHookResult {
  // Current filter values
  filters: SearchFilters;

  // Filter options
  filterOptions: FilterOptions;
  games: Game[];
  sets: Set[];
  treatments: FilterOption[];
  finishes: FilterOption[];
  rarities: FilterOption[];
  qualities: FilterOption[];

  // Filter manipulation
  updateFilters: (updates: Partial<SearchFilters>) => void;
  updateParam: (key: string, value: string) => void;
  handleGameChange: (game: string) => void;
  handleSetChange: (set: string) => void;
  handleSearchChange: (search: string) => void;
  clearFilters: () => void;

  // Additional filters config (for CardSearchBar)
  getAdditionalFilters: (config: {
    selectedTreatment: string;
    selectedFinish: string;
    onTreatmentChange: (value: string) => void;
    onFinishChange: (value: string) => void;
  }) => AdditionalFiltersConfig;

  // Loading state
  isLoading: boolean;
  loading: boolean; // Alias
  error: string | null;
}
