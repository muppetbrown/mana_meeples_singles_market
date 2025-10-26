import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import CardSearchBar from '../../../shared/components/search/SearchBar';
import { API_BASE } from '@/lib/api';
import { FILTER_CONFIG } from '@/lib/constants';

interface Game {
  id: number;
  name: string;
  code?: string;
}

interface Set {
  id: number;
  name: string;
}

interface AdditionalFilter {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: Array<{
    value: string;
    label: string;
    count: number;
  }>;
}

interface Filters {
  sortBy: string;
  sortOrder: string;
}

interface MobileFilterModalProps {
  showMobileFilters: boolean;
  setShowMobileFilters: (show: boolean) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedGame: string;
  onGameChange: (game: string) => void;
  selectedSet: string;
  onSetChange: (set: string) => void;
  games: Game[];
  sets: Set[];
  additionalFilters: Record<string, AdditionalFilter>;
  filters: Filters;
  handleFilterChange: (key: string, value: string) => void;
}

export const MobileFilterModal: React.FC<MobileFilterModalProps> = ({
  showMobileFilters,
  setShowMobileFilters,
  searchTerm,
  onSearchChange,
  selectedGame,
  onGameChange,
  selectedSet,
  onSetChange,
  games,
  sets,
  additionalFilters,
  filters,
  handleFilterChange
}) => {
  const mobileFiltersRef = useRef<HTMLDivElement>(null);

  // Focus management for mobile filters
  useEffect(() => {
    if (showMobileFilters && mobileFiltersRef.current) {
      const focusableElements = mobileFiltersRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      };

      document.addEventListener('keydown', handleTabKey);
      return () => document.removeEventListener('keydown', handleTabKey);
    }
  }, [showMobileFilters]);

  if (!showMobileFilters) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setShowMobileFilters(false)}>
      <div
        ref={mobileFiltersRef}
        className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl overflow-y-auto"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-filters-title"
      >
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 id="mobile-filters-title" className="text-xl font-bold">Filters</h2>
          <button
            onClick={() => setShowMobileFilters(false)}
            className="text-mm-teal hover:text-mm-darkForest focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none rounded"
            aria-label="Close filters"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <CardSearchBar
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            selectedGame={selectedGame}
            onGameChange={onGameChange}
            selectedSet={selectedSet}
            onSetChange={onSetChange}
            games={games}
            sets={sets}
            additionalFilters={additionalFilters}
            apiUrl={API_BASE}
            debounceMs={FILTER_CONFIG.DEBOUNCE_DELAY}
            minSearchLength={FILTER_CONFIG.MIN_SEARCH_LENGTH}
          />

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-mm-darkForest mb-3">Sort By</h3>
            <div className="flex gap-2">
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="flex-1 px-3 py-2 border border-mm-warmAccent rounded-lg focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none"
                aria-label="Sort by"
              >
                <option value="name">Name</option>
                <option value="set">Set</option>
                <option value="rarity">Rarity</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
              <button
                onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-mm-warmAccent rounded-lg text-sm hover:bg-mm-tealLight focus:ring-4 focus:ring-mm-forest focus:ring-offset-2 focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={`Sort ${filters.sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                title={`Currently sorting ${filters.sortOrder === 'asc' ? 'ascending' : 'descending'}. Click to reverse.`}
              >
                {filters.sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          <button onClick={() => setShowMobileFilters(false)} className="btn-mm-primary w-full mt-6">
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileFilterModal;