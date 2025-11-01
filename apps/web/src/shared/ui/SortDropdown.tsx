// apps/web/src/shared/ui/SortDropdown.tsx
/**
 * Sort Dropdown Component
 *
 * Reusable dropdown for sorting cards with ascending/descending toggle
 * Supports section headers based on sort criteria
 */

import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { SortOption, SortOrder } from '@/lib/utils';

interface SortDropdownProps {
  sortBy: SortOption;
  sortOrder: SortOrder;
  onSortByChange: (sortBy: SortOption) => void;
  onSortOrderChange: (sortOrder: SortOrder) => void;
  className?: string;
  showLabel?: boolean;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
  className = '',
  showLabel = true
}) => {
  const options: Array<{ value: SortOption; label: string }> = [
    { value: 'name', label: 'Name' },
    { value: 'price', label: 'Price' },
    { value: 'set', label: 'Set' },
    { value: 'rarity', label: 'Rarity' }
  ];

  const toggleSortOrder = () => {
    onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-sm text-mm-teal font-medium hidden sm:inline">Sort by:</span>
      )}

      <div className="flex items-center gap-1">
        {/* Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortOption)}
          className="px-3 py-2 border border-mm-warmAccent rounded-l-lg bg-white text-mm-teal hover:bg-mm-tealLight focus:outline-none focus:ring-2 focus:ring-mm-forest transition-colors"
          aria-label="Sort by"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Sort Order Toggle Button */}
        <button
          onClick={toggleSortOrder}
          className="px-3 py-2 border border-l-0 border-mm-warmAccent rounded-r-lg bg-white text-mm-teal hover:bg-mm-tealLight focus:outline-none focus:ring-2 focus:ring-mm-forest transition-colors"
          aria-label={`Sort order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
          title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        >
          {sortOrder === 'asc' ? (
            <ArrowUp className="w-4 h-4" />
          ) : (
            <ArrowDown className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default SortDropdown;
