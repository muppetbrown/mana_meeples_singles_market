import React from 'react';
import {
  CardSearchBar
} from '@/shared/search';
import { API_BASE } from '@/lib/api';
import { FILTER_CONFIG } from '@/lib/constants';
import type { Game, Set, AdditionalFiltersConfig } from '@/types/filters';

interface FilterSidebarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedGame: string;
  onGameChange: (game: string) => void;
  selectedSet: string;
  onSetChange: (set: string) => void;
  games: Game[];
  sets: Set[];
  additionalFilters: AdditionalFiltersConfig;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  searchTerm,
  onSearchChange,
  selectedGame,
  onGameChange,
  selectedSet,
  onSetChange,
  games,
  sets,
  additionalFilters
}) => {
  return (
    <div className="w-full overflow-hidden">
      <div className="card-mm">
        <h2 className="text-lg font-semibold text-mm-darkForest mb-4">Search & Filters</h2>
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
      </div>
    </div>
  );
};

export default FilterSidebar;