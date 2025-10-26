import React from 'react';
import CardSearchBar from '../../../shared/components/search/SearchBar';
import { API_BASE } from '@/lib/api';

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

interface FilterSidebarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedGame: string;
  onGameChange: (game: string) => void;
  selectedSet: string;
  onSetChange: (set: string) => void;
  games: Game[];
  sets: Set[];
  additionalFilters: Record<string, AdditionalFilter>;
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
    <aside className="hidden lg:block w-80 flex-shrink-0">
      <div className="card-mm sticky top-24">
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
          debounceMs={300}
          minSearchLength={2}
        />
      </div>
    </aside>
  );
};

export default FilterSidebar;