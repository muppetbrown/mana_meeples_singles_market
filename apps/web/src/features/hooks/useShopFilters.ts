/**
 * Shop Filters Hook
 *
 * Convenience wrapper around the unified useFilters hook for storefront use.
 * Provides filter management with handler methods for shop components.
 */

import { useFilters } from './useFilters';
import type { SearchFilters } from '@/types/filters';

/**
 * Shop-specific filter management hook
 * Uses the unified useFilters hook in storefront mode with auto-loading enabled.
 */
export function useShopFilters() {
  const filterHook = useFilters({ mode: 'storefront', autoLoad: true });

  return {
    // Current active filters
    filters: filterHook.filters,

    // Filter manipulation
    updateFilters: filterHook.updateFilters,
    clearFilters: filterHook.clearFilters,

    // Handler methods
    updateParam: filterHook.updateParam,
    handleGameChange: filterHook.handleGameChange,
    handleSetChange: filterHook.handleSetChange,
    handleSearchChange: filterHook.handleSearchChange,
    getAdditionalFilters: filterHook.getAdditionalFilters,

    // Filter options data
    games: filterHook.games,
    sets: filterHook.sets,
    treatments: filterHook.treatments,
    finishes: filterHook.finishes,
    rarities: filterHook.rarities,
    qualities: filterHook.qualities,
    filterOptions: filterHook.filterOptions,
    getFilterOptions: () => filterHook.filterOptions,

    // Loading state
    isLoading: filterHook.isLoading,
    loading: filterHook.isLoading,
    error: filterHook.error
  };
}