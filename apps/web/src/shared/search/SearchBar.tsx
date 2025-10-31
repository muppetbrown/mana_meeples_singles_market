// apps/web/src/features/shop/components/Search/SearchBar.tsx
// UPDATED with improved admin layout

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
  isAdminMode?: boolean; // NEW: enables admin-specific layout
  onClearFilters?: () => void; // NEW: callback for clearing all filters
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

  const abortControllerRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  /** Debounced search handler */
  const handleSearchInput = useCallback(
    (value: string) => {
      // Cancel previous timeout
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

      // Cancel previous request
      if (abortControllerRef.current) abortControllerRef.current.abort();

      // Only trigger search after debounce delay
      if (value.length >= minSearchLength) {
        setSearchLoading(true);

        searchTimeoutRef.current = setTimeout(async () => {
          // Inform parent (triggers API call in parent)
          onSearchChange(value);

          // Fetch autocomplete suggestions if enabled
          if (showAutocomplete && apiUrl) {
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
          } else {
            setSearchLoading(false);
          }
        }, debounceMs);
      } else {
        // For short queries (less than min length), also use debouncing
        // This prevents triggering searches on every character
        searchTimeoutRef.current = setTimeout(() => {
          onSearchChange(value);
        }, debounceMs);
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
          setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          if (selectedSuggestionIndex >= 0) {
            e.preventDefault();
            const selected = searchSuggestions[selectedSuggestionIndex];
            onSearchChange(selected.name);
            setShowSuggestions(false);
            setSelectedSuggestionIndex(-1);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
          break;
      }
    },
    [showSuggestions, searchSuggestions, selectedSuggestionIndex, onSearchChange]
  );

  /** Clear search */
  const handleClear = useCallback(() => {
    onSearchChange('');
    setSearchSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [onSearchChange]);

  // ============================================================================
  // ADMIN MODE LAYOUT - Full-width search, then horizontal filters below
  // ============================================================================
  
  if (isAdminMode) {
    return (
      <div className="space-y-4 mb-6">
        {/* Search Bar - Full Width */}
        <div className="relative w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(searchSuggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), ANIMATION_CONFIG.DURATION.FAST)}
              placeholder={placeholder}
              className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Search cards"
              aria-autocomplete="list"
              aria-controls="search-suggestions"
              aria-expanded={showSuggestions}
            />
            {(searchTerm || searchLoading) && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
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
                    onSearchChange(suggestion.name);
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

        {/* Filter Dropdowns - Horizontal Row with Clear Button */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Game Filter */}
            <div className="flex flex-col">
              <label htmlFor="filter-game" className="text-sm font-medium text-slate-700 mb-1">
                Game
              </label>
              <select
                id="filter-game"
                value={selectedGame}
                onChange={(e) => onGameChange(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
            </div>

            {/* Set Filter */}
            <div className="flex flex-col">
              <label htmlFor="filter-set" className="text-sm font-medium text-slate-700 mb-1">
                Set
              </label>
              <select
                id="filter-set"
                value={selectedSet}
                onChange={(e) => onSetChange(e.target.value)}
                disabled={selectedGame === 'all'}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed bg-white"
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
                  {/* FIX: Add key prop here */}
                  {filter.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
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
                className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                aria-label="Clear all filters"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // STANDARD LAYOUT - Existing grid layout for shop pages
  // ============================================================================
  
  return (
    <div className="grid gap-4 mb-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {/* Search Bar */}
      <div className="relative lg:col-span-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(searchSuggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), ANIMATION_CONFIG.DURATION.FAST)}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Search cards"
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-expanded={showSuggestions}
          />
          {(searchTerm || searchLoading) && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
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
                  onSearchChange(suggestion.name);
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
        className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
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
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="all">All {filter.label ?? key}</option>
            {/* FIX: Add key prop here */}
            {filter.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
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