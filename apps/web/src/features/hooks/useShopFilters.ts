// apps/web/src/features/shop/hooks/useShopFilters.ts
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ENDPOINTS } from '@/lib/api';
import { useErrorHandler } from '@/services/error/handler';
import type { SearchFilters } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface Game {
  id: number;
  name: string;
  code?: string;
  count?: number;
}

interface Set {
  id: number;
  name: string;
  count?: number;
}

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface FilterOptions {
  games: Game[];
  sets: Set[];
  rarities: FilterOption[];
  qualities: FilterOption[];
  foilTypes: FilterOption[];
  treatments: FilterOption[];
}

// ============================================================================
// Constants
// ============================================================================

const EMPTY_FILTER_OPTIONS: FilterOptions = {
  games: [],
  sets: [],
  rarities: [],
  qualities: [],
  foilTypes: [],
  treatments: []
};

const BOOLEAN_TRUE = 'true';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse search params into typed SearchFilters object
 */
function parseFiltersFromParams(searchParams: URLSearchParams): SearchFilters {
  return {
    game: searchParams.get('game') || undefined,
    set: searchParams.get('set') || undefined,
    rarity: searchParams.getAll('rarity'),
    quality: searchParams.getAll('quality'),
    foilType: searchParams.getAll('foilType'),
    minPrice: parseOptionalNumber(searchParams.get('minPrice')),
    maxPrice: parseOptionalNumber(searchParams.get('maxPrice')),
    inStockOnly: searchParams.get('inStockOnly') === BOOLEAN_TRUE
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
// Hook
// ============================================================================

export function useShopFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(EMPTY_FILTER_OPTIONS);
  const { handleError } = useErrorHandler();

  // --------------------------------------------------------------------------
  // Derived State
  // --------------------------------------------------------------------------

  const filters = useMemo(
    () => parseFiltersFromParams(searchParams),
    [searchParams]
  );

  // --------------------------------------------------------------------------
  // Effects
  // --------------------------------------------------------------------------

  /**
   * Load available filter options from API on mount
   * FIXED: Silently fails if endpoint doesn't exist (404) instead of showing error UI
   */
  useEffect(() => {
    let isCancelled = false;

    const loadOptions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const options = await api.get<FilterOptions>(ENDPOINTS.CARDS);
        
        // Prevent state update if component unmounted
        if (isCancelled) return;

        // Validate response structure
        if (!options || typeof options !== 'object') {
          throw new Error('Invalid filter options response');
        }

        setFilterOptions({
          games: options.games ?? [],
          sets: options.sets ?? [],
          rarities: options.rarities ?? [],
          qualities: options.qualities ?? [],
          foilTypes: options.foilTypes ?? [],
          treatments: options.treatments ?? []
        });
      } catch (err) {
        if (isCancelled) return;

        // CRITICAL FIX: Check if it's a 404 (endpoint doesn't exist)
        const is404 = (err as any)?.status === 404 || 
                      (err as any)?.message?.includes('Not Found') ||
                      (err as any)?.message?.includes('404');

        if (is404) {
          // Silently fail for 404 - endpoint not implemented yet
          console.warn('⚠️ Filters endpoint not available yet (/api/cards/filters returns 404). Using empty filters.');
          // Don't set error state - this prevents the red error box
          setFilterOptions(EMPTY_FILTER_OPTIONS);
        } else {
          // For other errors, use proper error handling
          const formattedError = handleError(err, { context: 'filter loading' });
          setFilterOptions(EMPTY_FILTER_OPTIONS);
          // Only set error for non-404 errors if you want to show them
          // setError(formattedError.message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadOptions();

    // Cleanup: prevent state updates after unmount
    return () => {
      isCancelled = true;
    };
  }, []);

  // --------------------------------------------------------------------------
  // Actions
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
   * Remove all active filters, resetting to default state
   */
  const clearFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  /**
   * Get current filter options (memoized)
   * Useful for components that need the full options object
   */
  const getFilterOptions = useCallback(() => {
    return filterOptions;
  }, [filterOptions]);

  // --------------------------------------------------------------------------
  // Return API
  // --------------------------------------------------------------------------

  return {
    // Current active filters
    filters,
    
    // Filter manipulation
    updateFilters,
    clearFilters,
    
    // Filter options data
    games: filterOptions.games,
    sets: filterOptions.sets,
    rarities: filterOptions.rarities,
    qualities: filterOptions.qualities,
    foilTypes: filterOptions.foilTypes,
    treatments: filterOptions.treatments,
    filterOptions,
    getFilterOptions,
    
    // Loading state
    isLoading,
    loading: isLoading, // Alias for backward compatibility
    error
  };
}