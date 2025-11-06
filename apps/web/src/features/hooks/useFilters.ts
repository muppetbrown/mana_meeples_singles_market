/**
 * Unified Filter Management Hook
 *
 * Consolidates all filter-related logic for both admin and storefront.
 * Eliminates duplication between useShopFilters and CardsTab filter management.
 *
 * Features:
 * - URL param parsing and management
 * - Filter options loading from API
 * - Consistent filter state updates
 * - Additional filters configuration
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ENDPOINTS } from '@/lib/api';
import { useErrorHandler } from '@/services/error/handler';
import { formatTreatment, formatFinish } from '@/types/models/card';
import type {
  SearchFilters,
  FilterOptions,
  FilterHookResult,
  AdditionalFiltersConfig,
  FilterOptionsApiResponse
} from '@/types/filters';

// Import empty filter options
const EMPTY_OPTIONS: FilterOptions = {
  games: [],
  sets: [],
  treatments: [],
  finishes: [],
  rarities: [],
  qualities: []
};

// ============================================================================
// CONSTANTS
// ============================================================================

const BOOLEAN_TRUE = 'true';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse URL search params into typed SearchFilters object
 */
function parseFiltersFromParams(searchParams: URLSearchParams): SearchFilters {
  return {
    game: searchParams.get('game') || undefined,
    set: searchParams.get('set') || undefined,
    treatment: searchParams.get('treatment') || undefined,
    finish: searchParams.get('finish') || undefined,
    rarity: searchParams.getAll('rarity'),
    quality: searchParams.getAll('quality'),
    minPrice: parseOptionalNumber(searchParams.get('minPrice')),
    maxPrice: parseOptionalNumber(searchParams.get('maxPrice')),
    inStockOnly: searchParams.get('inStockOnly') === BOOLEAN_TRUE,
    search: searchParams.get('search') || undefined
  };
}

/**
 * Parse string to number, returning undefined if invalid
 */
function parseOptionalNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Convert filter value to URL parameter format
 */
function serializeFilterValue(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return String(value);
}

// ============================================================================
// HOOK
// ============================================================================

export interface UseFiltersOptions {
  /**
   * Mode determines which endpoint to use for filter options
   * Both modes use the same /api/cards/filters endpoint
   */
  mode?: 'admin' | 'storefront';

  /**
   * Auto-load filter options on mount
   * @default true
   */
  autoLoad?: boolean;
}

export function useFilters(options: UseFiltersOptions = {}): FilterHookResult {
  const { mode = 'storefront', autoLoad = true } = options;

  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(EMPTY_OPTIONS);
  const { handleError } = useErrorHandler();

  // --------------------------------------------------------------------------
  // DERIVED STATE
  // --------------------------------------------------------------------------

  const filters = useMemo(
    () => parseFiltersFromParams(searchParams),
    [searchParams]
  );

  // --------------------------------------------------------------------------
  // LOAD FILTER OPTIONS
  // --------------------------------------------------------------------------

  const loadFilterOptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.get<FilterOptionsApiResponse>(ENDPOINTS.CARDS.FILTERS);

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid filter options response');
      }

      setFilterOptions({
        games: data.games ?? [],
        sets: data.sets ?? [],
        treatments: data.treatments?.map((t) => ({
          value: t.value,
          label: t.label, // Use label from API (includes overrides)
          count: 0
        })) ?? [],
        finishes: (data.finishes ?? []).map((f) => ({
          value: f,
          label: formatFinish(f),
          count: 0
        })),
        rarities: data.rarities?.map((r) => ({
          value: r,
          label: r,
          count: 0
        })) ?? [],
        qualities: data.qualities?.map((q) => ({
          value: q,
          label: q,
          count: 0
        })) ?? []
      });
    } catch (err) {
      // Check if it's a 404 (endpoint doesn't exist)
      const is404Error = (error: unknown): boolean => {
        if (!error || typeof error !== 'object') return false;
        if ('status' in error && typeof error.status === 'number' && error.status === 404) {
          return true;
        }
        if ('message' in error && typeof error.message === 'string') {
          return error.message.includes('Not Found') || error.message.includes('404');
        }
        return false;
      };

      const is404 = is404Error(err);

      if (is404) {
        // Silently fail for 404 - endpoint not implemented yet
        console.warn('⚠️ Filters endpoint not available yet (/api/cards/filters returns 404). Using empty filters.');
        setFilterOptions(EMPTY_OPTIONS);
      } else {
        // For other errors, use proper error handling
        const formattedError = handleError(err, { context: 'filter loading' });
        setFilterOptions(EMPTY_OPTIONS);
        setError(formattedError.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadFilterOptions();
    }
  }, []); // Only run once on mount

  // --------------------------------------------------------------------------
  // URL PARAMETER HANDLERS
  // --------------------------------------------------------------------------

  /**
   * Update one or more filters in the URL
   * Preserves existing filters not included in updates
   */
  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);

      Object.entries(updates).forEach(([key, value]) => {
        // Remove existing values for this key
        next.delete(key);

        // Add new value(s) if present
        if (Array.isArray(value)) {
          // Handle multi-select filters (rarity, quality, etc.)
          value.forEach(v => {
            const serialized = serializeFilterValue(v);
            if (serialized !== null) {
              next.append(key, serialized);
            }
          });
        } else {
          // Handle single-value filters
          const serialized = serializeFilterValue(value);
          if (serialized !== null) {
            next.set(key, serialized);
          }
        }
      });

      return next;
    });
  }, [setSearchParams]);

  /**
   * Update a single URL parameter
   */
  const updateParam = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value && value !== 'all') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      return newParams;
    });
  }, [setSearchParams]);

  /**
   * Handle game change - clears set when game changes
   */
  const handleGameChange = useCallback((game: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (game && game !== 'all') {
        newParams.set('game', game);
      } else {
        newParams.delete('game');
      }
      newParams.delete('set'); // Clear set when game changes
      return newParams;
    });
  }, [setSearchParams]);

  /**
   * Handle set change
   */
  const handleSetChange = useCallback((set: string) => {
    updateParam('set', set);
  }, [updateParam]);

  /**
   * Handle search change
   */
  const handleSearchChange = useCallback((search: string) => {
    updateParam('search', search);
  }, [updateParam]);

  /**
   * Remove all active filters, resetting to default state
   */
  const clearFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  // --------------------------------------------------------------------------
  // ADDITIONAL FILTERS CONFIGURATION
  // --------------------------------------------------------------------------

  /**
   * Generate additional filters config for CardSearchBar
   */
  const getAdditionalFilters = useCallback((config: {
    selectedTreatment: string;
    selectedFinish: string;
    onTreatmentChange: (value: string) => void;
    onFinishChange: (value: string) => void;
  }): AdditionalFiltersConfig => {
    return {
      treatment: {
        value: config.selectedTreatment,
        onChange: config.onTreatmentChange,
        label: 'Treatment',
        options: filterOptions.treatments
      },
      finish: {
        value: config.selectedFinish,
        onChange: config.onFinishChange,
        label: 'Finish',
        options: filterOptions.finishes
      }
    };
  }, [filterOptions]);

  // --------------------------------------------------------------------------
  // RETURN API
  // --------------------------------------------------------------------------

  return {
    // Current active filters
    filters,

    // Filter options data
    filterOptions,
    games: filterOptions.games,
    sets: filterOptions.sets,
    treatments: filterOptions.treatments,
    finishes: filterOptions.finishes,
    rarities: filterOptions.rarities,
    qualities: filterOptions.qualities,

    // Filter manipulation
    updateFilters,
    updateParam,
    handleGameChange,
    handleSetChange,
    handleSearchChange,
    clearFilters,

    // Additional filters config
    getAdditionalFilters,

    // Loading state
    isLoading,
    loading: isLoading,
    error
  };
}
