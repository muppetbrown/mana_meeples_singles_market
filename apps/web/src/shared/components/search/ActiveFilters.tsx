import React from 'react';
import type { SearchFilters } from '@/types';

interface ActiveFiltersProps {
  filters: SearchFilters;
  onClearFilter: (updates: Partial<SearchFilters>) => void;
  onClearAll: () => void;
}

export const ActiveFilters: React.FC<ActiveFiltersProps> = (props) => {
  // TODO: Implementation will come later
  // For now, return a simple placeholder
  return (
    <div>
      <p>Active Filters Component - To be implemented</p>
    </div>
  );
};

export default ActiveFilters;