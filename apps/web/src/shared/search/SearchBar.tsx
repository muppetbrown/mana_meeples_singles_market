// apps/web/src/shared/search/SearchBar.tsx
// OPTIMIZED: Works with debounced useCardFetching

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, RefreshCw, X } from 'lucide-react';
import { FILTER_CONFIG, ANIMATION_CONFIG } from '@/lib/constants';

// ----- Types -----
type GameOption = { id: string | number; name: string; card_count?: number };
type SetOption = { id: string | number; name: string; card_count?: number };

type Suggestion = {
  id: string | number;
  name: string;
  set_name?: string | null;
  card_number?: string | number | null;
  image_url?: string | null;
};

type FilterOption = { value: string; label: string };
export type FilterDef = {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  label?: string;
  options?: FilterOption[];
};

export type CardSearchBarProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedGame: string;
  onGameChange: (value: string) => void;
  selectedSet: string;
  onSetChange: (value: string) => void;
  games?: GameOption[];
  sets?: SetOption[];
  additionalFilters?: Record<string, FilterDef>;
  apiUrl?: string;
  showAutocomplete?: boolean;
  debounceMs?: number;
  minSearchLength?: number;
  placeholder?: string;
  isAdminMode?: boolean;
  onClearFilters?: () => void;
};

const CardSearchBar: React.FC<CardSearchBarProps> = ({
  searchTerm,
  onSearchChange,
  selectedGame,
  onGameChange,
  selectedSet,
  onSetChange,
  games = [],
  sets = [],
  additionalFilters = {},
  apiUrl,
  showAutocomplete = true,
  debounceMs = FILTER_CONFIG.DEBOUNCE_DELAY,
  minSearchLength = FILTER_CONFIG.MIN_SEARCH_LENGTH,
  placeholder = 'Search by name, number, or set...',
  isAdminMode = false,
  onClearFilters
}) => {
  const [searchSuggestions, setSearchSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // 🔥 NEW: Local input state for immediate UI feedback
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  const abortControllerRef = useRef<AbortController | null>(null);
  const autocompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 🔥 NEW: Sync local state with prop changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autocompleteTimeoutRef.current) clearTimeout(autocompleteTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  /** 🔥 OPTIMIZED: Immediate input handler for UI responsiveness */
  const handleSearchInput = useCallback(
    (value: string) => {
      // Update local state IMMEDIATELY for responsive UI
      setLocalSearchTerm(value);
      
      // Update parent state IMMEDIATELY (no debounce here)
      // The debouncing happens in useCardFetching hook
      onSearchChange(value);

      // Cancel previous autocomplete timeout
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }

      // Cancel previous autocomplete request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Only fetch autocomplete suggestions if enabled and query is long enough
      if (showAutocomplete && apiUrl && value.length >= minSearchLength) {
        setSearchLoading(true);

        // Debounce ONLY the autocomplete suggestions (not the actual search)
        autocompleteTimeoutRef.current = setTimeout(async () => {
          try {
            abortControllerRef.current = new AbortController();
            const res = await fetch(
              `${apiUrl}/search/autocomplete?q=${encodeURIComponent(value)}`,
              { signal: abortControllerRef.current.signal, credentials: 'include' }
            );

            if (res.ok) {
              const data = (await res.json()) as { suggestions?: Suggestion[] };
              setSearchSuggestions(data.suggestions ?? []);
              setShowSuggestions((data.suggestions?.length ?? 0) > 0);
            }
          } catch (err: unknown) {
            if (err instanceof Error && err.name !== 'AbortError') {
              console.error('Autocomplete error:', err);
            }
          } finally {
            setSearchLoading(false);
          }
        }, debounceMs);
      } else {
        // Clear suggestions for short queries
        setSearchSuggestions([]);
        setShowSuggestions(false);
        setSearchLoading(false);
      }
    },
    [onSearchChange, showAutocomplete, apiUrl, debounceMs, minSearchLength]
  );

  /** Handle keyboard navigation */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || searchSuggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev < searchSuggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedSuggestionIndex >= 0) {
            const suggestion = searchSuggestions[selectedSuggestionIndex];
            if (suggestion) {
              handleSearchInput(suggestion.name);
              setShowSuggestions(false);
            }
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
          break;
      }
    },
    [showSuggestions, searchSuggestions, selectedSuggestionIndex, handleSearchInput]
  );

  /** Clear search input */
  const handleClearSearch = useCallback(() => {
    setLocalSearchTerm('');
    onSearchChange('');
    setSearchSuggestions([]);
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [onSearchChange]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Render different layouts based on admin mode
  if (isAdminMode) {
    return (
      <div className="space-y-4 p-4 bg-white rounded-lg border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <label htmlFor="card-search" className="block text-sm font-medium text-slate-700 mb-1">
              Search Cards
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                ref={inputRef}
                id="card-search"
                type="text"
                value={localSearchTerm}
                onChange={(e) => handleSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="block w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Search for cards"
                aria-autocomplete="list"
                aria-controls={showSuggestions ? 'search-suggestions' : undefined}
                aria-activedescendant={
                  selectedSuggestionIndex >= 0
                    ? `suggestion-${selectedSuggestionIndex}`
                    : undefined
                }
              />
              {localSearchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Clear search"
                  type="button"
                >
                  {searchLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <X className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>

            {/* Autocomplete Suggestions */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div
                id="search-suggestions"
                role="listbox"
                className="absolute z-50 w-full mt-2 bg-white border border-slate-300 rounded-lg shadow-lg max-h-96 overflow-y-auto"
              >
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    id={`suggestion-${index}`}
                    role="option"
                    aria-selected={index === selectedSuggestionIndex}
                    onClick={() => {
                      handleSearchInput(suggestion.name);
                      setShowSuggestions(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors ${
                      index === selectedSuggestionIndex ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{suggestion.name}</div>
                        <div className="text-sm text-slate-500 flex items-center gap-2">
                          {suggestion.set_name}
                          {suggestion.card_number ? (
                            <>
                              <span aria-hidden>•</span>
                              <span>#{String(suggestion.card_number)}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      {suggestion.image_url ? (
                        <img
                          src={suggestion.image_url}
                          alt={suggestion.name}
                          className="w-12 h-16 object-cover rounded ml-2 flex-shrink-0"
                          onError={(e) => {
                            const img = e.currentTarget;
                            img.alt = '';
                            img.style.display = 'none';
                          }}
                        />
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Game Filter */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 mb-1" htmlFor="game-filter">
              Game
            </label>
            <select
              id="game-filter"
              value={selectedGame}
              onChange={(e) => onGameChange(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Games</option>
              {games.map((game) => (
                <option key={game.id} value={game.name}>
                  {game.name}
                  {game.card_count && game.card_count > 0 ? ` (${game.card_count})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Set Filter */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 mb-1" htmlFor="set-filter">
              Set
            </label>
            <select
              id="set-filter"
              value={selectedSet}
              onChange={(e) => onSetChange(e.target.value)}
              disabled={selectedGame === 'all'}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed bg-white"
            >
              <option value="all">{selectedGame === 'all' ? 'Select a game first' : 'All Sets'}</option>
              {sets.map((set) => (
                <option key={set.id} value={set.name}>
                  {set.name}
                  {set.card_count && set.card_count > 0 ? ` (${set.card_count})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Filters */}
          {Object.entries(additionalFilters).map(([key, filter]) => (
            <div key={key} className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 mb-1" htmlFor={`filter-${key}`}>
                {filter.label ?? key}
              </label>
              <select
                id={`filter-${key}`}
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                disabled={filter.disabled}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed bg-white"
              >
                <option value="all">All {filter.label ?? key}</option>
                {filter.options?.map((opt, index) => (
                  <option key={`${key}-${opt.value}-${index}`} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Clear Filters Button */}
        {onClearFilters && (
          <div className="flex justify-end">
            <button
              onClick={onClearFilters}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              type="button"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    );
  }

  // Standard shop layout
  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            ref={inputRef}
            id="card-search"
            type="text"
            value={localSearchTerm}
            onChange={(e) => handleSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="block w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Search for cards"
            aria-autocomplete="list"
            aria-controls={showSuggestions ? 'search-suggestions' : undefined}
            aria-activedescendant={
              selectedSuggestionIndex >= 0
                ? `suggestion-${selectedSuggestionIndex}`
                : undefined
            }
          />
          {localSearchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Clear search"
              type="button"
            >
              {searchLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {/* Autocomplete Suggestions */}
        {showSuggestions && searchSuggestions.length > 0 && (
          <div
            id="search-suggestions"
            role="listbox"
            className="absolute z-50 w-full mt-2 bg-white border border-slate-300 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          >
            {searchSuggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                role="option"
                aria-selected={index === selectedSuggestionIndex}
                onClick={() => {
                  handleSearchInput(suggestion.name);
                  setShowSuggestions(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors ${
                  index === selectedSuggestionIndex ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{suggestion.name}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-2">
                      {suggestion.set_name}
                      {suggestion.card_number ? (
                        <>
                          <span aria-hidden>•</span>
                          <span>#{String(suggestion.card_number)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {suggestion.image_url ? (
                    <img
                      src={suggestion.image_url}
                      alt={suggestion.name}
                      className="w-12 h-16 object-cover rounded ml-2 flex-shrink-0"
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.alt = '';
                        img.style.display = 'none';
                      }}
                    />
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Game Filter */}
      <select
        value={selectedGame}
        onChange={(e) => onGameChange(e.target.value)}
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent truncate"
        aria-label="Filter by game"
      >
        <option value="all">All Games</option>
        {games.map((game) => (
          <option key={game.id} value={game.name}>
            {game.name}
            {game.card_count && game.card_count > 0 ? ` (${game.card_count})` : ''}
          </option>
        ))}
      </select>

      {/* Set Filter */}
      <div className="relative">
        <select
          value={selectedSet}
          onChange={(e) => onSetChange(e.target.value)}
          disabled={selectedGame === 'all'}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed truncate"
          aria-label="Filter by set"
        >
          <option value="all">{selectedGame === 'all' ? 'Select a game first' : 'All Sets'}</option>
          {sets.map((set) => (
            <option key={set.id} value={set.name}>
              {set.name}
              {set.card_count && set.card_count > 0 ? ` (${set.card_count})` : ''}
            </option>
          ))}
        </select>
        {selectedGame === 'all' && (
          <p className="text-xs text-slate-500 mt-1">Select a game to filter by set</p>
        )}
      </div>

      {/* Additional Filters Slot */}
      {Object.entries(additionalFilters).map(([key, filter]) => (
        <div key={key} className="flex flex-col">
          <label className="text-sm font-medium text-slate-700 mb-1" htmlFor={`filter-${key}`}>
            {filter.label ?? key}
          </label>
          <select
            id={`filter-${key}`}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            disabled={filter.disabled}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed truncate"
          >
            <option value="all">All {filter.label ?? key}</option>
            {filter.options?.map((opt, index) => (
              <option key={`${key}-${opt.value}-${index}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
};

export default CardSearchBar;