import React from 'react';
import { X, Filter, RotateCcw } from 'lucide-react';
import type { SearchFilters } from '@/types';

interface ActiveFiltersProps {
  filters: SearchFilters;
  onClearFilter: (updates: Partial<SearchFilters>) => void;
  onClearAll: () => void;
}

export const ActiveFilters: React.FC<ActiveFiltersProps> = ({
  filters,
  onClearFilter,
  onClearAll
}) => {
  // Build array of active filters for display
  const activeFilters = [];

  // Game filter
  if (filters.game) {
    activeFilters.push({
      key: 'game',
      label: 'Game',
      value: filters.game,
      onRemove: () => onClearFilter({ game: undefined })
    });
  }

  // Set filter
  if (filters.set) {
    activeFilters.push({
      key: 'set',
      label: 'Set',
      value: filters.set,
      onRemove: () => onClearFilter({ set: undefined })
    });
  }

  // Rarity filters
  if (filters.rarity && filters.rarity.length > 0) {
    filters.rarity.forEach(rarity => {
      activeFilters.push({
        key: `rarity-${rarity}`,
        label: 'Rarity',
        value: rarity,
        onRemove: () => onClearFilter({
          rarity: filters.rarity?.filter(r => r !== rarity)
        })
      });
    });
  }

  // Quality filters
  if (filters.quality && filters.quality.length > 0) {
    filters.quality.forEach(quality => {
      activeFilters.push({
        key: `quality-${quality}`,
        label: 'Quality',
        value: quality,
        onRemove: () => onClearFilter({
          quality: filters.quality?.filter(q => q !== quality)
        })
      });
    });
  }

  // Price range filter
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    let priceLabel = 'Price: ';
    if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
      priceLabel += `$${filters.minPrice} - $${filters.maxPrice}`;
    } else if (filters.minPrice !== undefined) {
      priceLabel += `≥ $${filters.minPrice}`;
    } else if (filters.maxPrice !== undefined) {
      priceLabel += `≤ $${filters.maxPrice}`;
    }

    activeFilters.push({
      key: 'price',
      label: 'Price Range',
      value: priceLabel.replace('Price: ', ''),
      onRemove: () => onClearFilter({ minPrice: undefined, maxPrice: undefined })
    });
  }

  // In stock only filter
  if (filters.inStockOnly) {
    activeFilters.push({
      key: 'inStock',
      label: 'Availability',
      value: 'In Stock Only',
      onRemove: () => onClearFilter({ inStockOnly: false })
    });
  }

  // Don't render if no active filters
  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border">
      {/* Filter icon and label */}
      <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
        <Filter className="w-4 h-4" />
        <span>Active Filters:</span>
      </div>

      {/* Individual filter badges */}
      {activeFilters.map(filter => (
        <div
          key={filter.key}
          className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-md border border-gray-200 text-sm"
        >
          <span className="text-gray-600 font-medium">{filter.label}:</span>
          <span className="text-gray-800">{filter.value}</span>
          <button
            type="button"
            onClick={filter.onRemove}
            className="ml-1 p-0.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
            aria-label={`Remove ${filter.label}: ${filter.value} filter`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {/* Clear all button */}
      {activeFilters.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
          aria-label="Clear all active filters"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Clear All</span>
        </button>
      )}
    </div>
  );
};

export default ActiveFilters;