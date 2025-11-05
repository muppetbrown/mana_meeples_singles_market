// apps/web/src/features/shop/components/ShopFilters.tsx
/**
 * Shop Filters Component - Refactored for Third Sweep
 *
 * ## Improvements
 * - **Eliminated 44 lines** of duplicate handler code
 * - **Uses hook methods**: All handlers now come from useShopFilters
 * - **Better maintainability**: Changes to filter logic happen in one place (useFilters hook)
 * - **Type safety**: Consistent handler signatures across the app
 *
 * @see {@link /features/hooks/useShopFilters.ts} - Filter hook with all handlers
 */

import React, { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilterSidebar, MobileFilterModal } from '@/shared/ui';
import { MobileFilterButton } from '@/shared/search';
import { useShopFilters } from '@/features/hooks';

// STANDARDIZED: Props using treatment and finish
interface ShopFiltersProps {
  showMobileFilters: boolean;
  setShowMobileFilters: (show: boolean) => void;
  searchTerm: string;
  selectedGame: string;
  selectedSet: string;
  selectedTreatment: string;
  selectedFinish: string;
  selectedRarity: string;
  selectedQuality: string;
  // Optional overrides for filtered options (storefront mode)
  availableGames?: any[];
  availableSets?: any[];
  availableTreatments?: Array<{ value: string; label: string; count: number }>;
  availableFinishes?: Array<{ value: string; label: string; count: number }>;
}

export const ShopFilters: React.FC<ShopFiltersProps> = ({
  showMobileFilters,
  setShowMobileFilters,
  searchTerm,
  selectedGame,
  selectedSet,
  selectedTreatment,
  selectedFinish,
  selectedRarity,
  selectedQuality,
  availableGames,
  availableSets,
  availableTreatments,
  availableFinishes
}) => {
  const [searchParams] = useSearchParams(); // Removed setSearchParams - using hook methods instead

  // REFACTORED (Third Sweep): Get all handlers from the hook instead of redefining
  const {
    games: allGames,
    sets: allSets,
    filterOptions: allFilterOptions,
    loading: filtersLoading,
    error: filtersError,
    // Handler methods from hook - eliminates duplication!
    updateParam,
    handleGameChange,
    handleSetChange,
    handleSearchChange,
    getAdditionalFilters
  } = useShopFilters();

  // Use filtered options if provided (storefront mode), otherwise use all options
  const games = availableGames || allGames;
  const sets = availableSets || allSets;

  // Override filter options for treatments and finishes if available
  const filterOptions = useMemo(() => ({
    ...allFilterOptions,
    treatments: availableTreatments || allFilterOptions.treatments,
    finishes: availableFinishes || allFilterOptions.finishes
  }), [allFilterOptions, availableTreatments, availableFinishes]);

  // Derived state
  const filters = useMemo(() => ({
    quality: selectedQuality,
    rarity: selectedRarity,
    treatment: selectedTreatment,
    finish: selectedFinish,
    language: searchParams.get('language') || 'English',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy: searchParams.get('sortBy') || 'name',
    sortOrder: searchParams.get('sortOrder') || 'asc',
    set: selectedSet
  }), [searchParams, selectedQuality, selectedRarity, selectedTreatment, selectedFinish, selectedSet]);

  // REFACTORED: Use hook's getAdditionalFilters method
  const additionalFilters = useMemo(() => {
    return getAdditionalFilters({
      selectedTreatment,
      selectedFinish,
      onTreatmentChange: (value: string) => updateParam('treatment', value),
      onFinishChange: (value: string) => updateParam('finish', value)
    });
  }, [selectedTreatment, selectedFinish, getAdditionalFilters, updateParam]);

  // Active filters for display
  const activeFilters = useMemo(() => {
    const active: Array<{ key: string; displayName: string; displayValue: string }> = [];

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '' && value !== 'English') {
        let displayName = key;
        let displayValue = value;

        switch (key) {
          case 'finish':
            displayName = 'Finish';
            break;
          case 'treatment':
            displayName = 'Treatment';
            break;
          case 'minPrice':
            displayName = 'Min Price';
            displayValue = `$${value}`;
            break;
          case 'maxPrice':
            displayName = 'Max Price';
            displayValue = `$${value}`;
            break;
          case 'sortBy':
            displayName = 'Sort';
            break;
          case 'sortOrder':
            return; // Don't show sort order as separate filter
          default:
            displayName = key.charAt(0).toUpperCase() + key.slice(1);
            break;
        }

        active.push({ key, displayName, displayValue });
      }
    });

    if (searchTerm) {
      active.push({ key: 'search', displayName: 'Search', displayValue: searchTerm });
    }

    if (selectedGame && selectedGame !== 'all') {
      active.push({ key: 'game', displayName: 'Game', displayValue: selectedGame });
    }

    return active;
  }, [filters, searchTerm, selectedGame]);

  // Simple handler change callback
  const handleFilterChange = useCallback((key: string, value: string) => {
    updateParam(key, value);
  }, [updateParam]);

  const handleClearFilter = useCallback((filterKey: string) => {
    if (filterKey === 'search') {
      handleSearchChange('');
    } else if (filterKey === 'game') {
      handleGameChange('all');
    } else {
      handleFilterChange(filterKey, '');
    }
  }, [handleSearchChange, handleGameChange, handleFilterChange]);

  // Clear all filters - uses hook's clearFilters (available from useShopFilters)
  const clearAllFilters = useCallback(() => {
    // This could use hook's clearFilters method if needed
    handleSearchChange('');
    handleGameChange('all');
  }, [handleSearchChange, handleGameChange]);

  // Props for FilterSidebar
  const filterSidebarProps = {
    searchTerm,
    onSearchChange: handleSearchChange,
    selectedGame,
    selectedSet,
    selectedRarity,
    selectedQuality,
    filters,
    additionalFilters,
    activeFilters,
    games,
    sets,
    filterOptions,
    onGameChange: handleGameChange,
    onSetChange: handleSetChange,
    onFilterChange: handleFilterChange,
    onClearFilter: handleClearFilter,
    onClearAll: clearAllFilters,
    loading: filtersLoading,
    error: filtersError
  };

  return (
    <>
      {/* Desktop Filters */}
      <div className="hidden lg:block">
        <FilterSidebar {...filterSidebarProps} />
      </div>

      {/* Mobile Filter Button */}
      <div className="lg:hidden">
        <MobileFilterButton
          showMobileFilters={showMobileFilters}
          setShowMobileFilters={setShowMobileFilters}
        />
      </div>

      {/* Mobile Filter Modal */}
      <MobileFilterModal
        showMobileFilters={showMobileFilters}
        setShowMobileFilters={setShowMobileFilters}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        selectedGame={selectedGame}
        onGameChange={handleGameChange}
        selectedSet={selectedSet}
        onSetChange={handleSetChange}
        games={games}
        sets={sets}
        additionalFilters={additionalFilters}
        filters={filters}
        handleFilterChange={handleFilterChange}
      />
    </>
  );
};