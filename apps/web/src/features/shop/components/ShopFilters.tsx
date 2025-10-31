// apps/web/src/features/shop/components/ShopFilters.tsx
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
  selectedQuality
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    games,
    sets,
    filterOptions,
    loading: filtersLoading,
    error: filtersError
  } = useShopFilters();

  // URL parameter handlers
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

  const handleSetChange = useCallback((set: string) => {
    updateParam('set', set);
  }, [updateParam]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value && value !== 'all' && value !== '') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      return newParams;
    });
  }, [setSearchParams]);

  const clearAllFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

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

  // STANDARDIZED: Additional filters config
  const additionalFilters = useMemo(() => ({
    treatment: {
      value: selectedTreatment,
      onChange: (value: string) => updateParam('treatment', value),
      label: 'Treatment',
      options: filterOptions.treatments.map(t => ({
        value: t.value,
        label: t.label,
        count: t.count
      }))
    },
    finish: {
      value: selectedFinish,
      onChange: (value: string) => updateParam('finish', value),
      label: 'Finish',
      options: filterOptions.finishes.map(f => ({
        value: f.value,
        label: f.label,
        count: f.count
      }))
    }
  }), [selectedTreatment, selectedFinish, filterOptions, updateParam]);

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

  const handleSearchChange = useCallback((value: string) => {
    updateParam('search', value);
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