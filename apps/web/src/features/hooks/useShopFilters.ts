/**
 * Shop Filters Hook (UNIFIED)
 *
 * This hook is now a thin wrapper around the unified useFilters hook.
 * It maintains backward compatibility while using the consolidated filter logic.
 *
 * Migration note: This hook now uses useFilters internally, eliminating code duplication.
 */

import { useFilters } from './useFilters';
import type { SearchFilters } from '@/types/filters';

/**
 * Shop-specific filter management hook
 *
 * This is a backward-compatible wrapper around the unified useFilters hook.
 * All shop components can continue using this hook without changes.
 */
export function useShopFilters() {
  // Use the unified filter hook in storefront mode
  const filterHook = useFilters({ mode: 'storefront', autoLoad: true });

  // Return the same API as before for backward compatibility
  return {
    // Current active filters
    filters: filterHook.filters,

    // Filter manipulation
    updateFilters: filterHook.updateFilters,
    clearFilters: filterHook.clearFilters,

    // Filter options data (individual exports for convenience)
    games: filterHook.games,
    sets: filterHook.sets,
    treatments: filterHook.treatments,
    finishes: filterHook.finishes,
    rarities: filterHook.rarities,
    qualities: filterHook.qualities,

    // Full filter options object
    filterOptions: filterHook.filterOptions,

    // Legacy method for backward compatibility
    getFilterOptions: () => filterHook.filterOptions,

    // Loading state
    isLoading: filterHook.isLoading,
    loading: filterHook.loading,
    error: filterHook.error
  };
}