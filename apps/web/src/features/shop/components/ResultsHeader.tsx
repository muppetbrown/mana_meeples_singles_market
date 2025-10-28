import React from 'react';
import { X, LayoutGrid, List } from 'lucide-react';
import type { ViewMode } from '../../hooks/useShopViewMode';

interface ActiveFilter {
  key: string;
  displayName: string;
  displayValue: string;
}

interface ResultsHeaderProps {
  searchTerm: string;
  cardCount?: number; // deprecated, use resultsCount
  resultsCount: number;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeFilters: ActiveFilter[];
  onClearFilter: (filterKey: string) => void;
  onClearAllFilters: () => void;
}

export const ResultsHeader: React.FC<ResultsHeaderProps> = ({
  searchTerm,
  cardCount,
  resultsCount,
  viewMode,
  setViewMode,
  activeFilters,
  onClearFilter,
  onClearAllFilters
}) => {
  const count = resultsCount ?? cardCount ?? 0;
  return (
    <>
      {/* Results Count and View Toggle */}
      <div className="flex items-center mb-4">
        <div className="flex-1 pr-4">
          <p className="text-mm-teal" aria-live="polite">
            <span className="font-medium">{count}</span> cards found
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: '140px', width: '140px' }}>
          <span className="text-sm text-mm-teal hidden sm:inline" style={{ width: '36px' }}>View:</span>
          <div className="inline-flex rounded-lg border border-mm-warmAccent bg-white p-0.5" style={{ width: '96px' }}>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-md transition-colors motion-reduce:transition-none ${
                viewMode === 'grid'
                  ? 'bg-mm-gold text-white shadow-sm'
                  : 'text-mm-teal hover:text-mm-darkForest hover:bg-mm-tealLight'
              }`}
              style={{ width: '44px', minWidth: '44px' }}
              aria-pressed={viewMode === 'grid'}
              aria-label="Switch to grid view"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-md transition-colors motion-reduce:transition-none ${
                viewMode === 'list'
                  ? 'bg-mm-gold text-white shadow-sm'
                  : 'text-mm-teal hover:text-mm-darkForest hover:bg-mm-tealLight'
              }`}
              style={{ width: '44px', minWidth: '44px' }}
              aria-pressed={viewMode === 'list'}
              aria-label="Switch to list view"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Badges */}
      {activeFilters.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-mm-teal font-medium">Active filters:</span>
          {activeFilters.map((filter) => (
            <span
              key={filter.key}
              className="inline-flex items-center gap-2 px-3 py-1 bg-mm-tealLight text-mm-tealBright rounded-full text-sm"
            >
              <span>{filter.displayName}: {filter.displayValue}</span>
              <button
                onClick={() => onClearFilter(filter.key)}
                className="ml-1 hover:bg-mm-warmAccent rounded-full w-4 h-4 flex items-center justify-center focus:ring-2 focus:ring-mm-forest focus:outline-none"
                aria-label={`Clear ${filter.displayName} filter`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {activeFilters.length > 1 && (
            <button
              onClick={onClearAllFilters}
              className="px-3 py-1 text-sm text-mm-teal hover:text-mm-darkForest hover:bg-mm-tealLight rounded-full border border-mm-warmAccent focus:ring-2 focus:ring-mm-forest focus:outline-none"
            >
              Clear All
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default ResultsHeader;