// apps/web/src/shared/search/SearchBar.tsx
/**
 * Card Search Bar - Unified Search Component
 *
 * @module SearchBar
 *
 * ## Improvements (Third Sweep)
 * - **Eliminated 200+ lines** of duplicate JSX between admin and shop layouts
 * - **Unified rendering**: Single JSX structure with conditional CSS classes
 * - **Maintained functionality**: No behavior changes, pure refactoring
 * - **Better maintainability**: Changes happen in one place
 *
 * ## Layout Modes
 * - **Admin (isAdminMode=true)**: Grid layout with visible labels
 * - **Shop (isAdminMode=false)**: Vertical stack with aria-labels
 *
 * Both modes render the same components with different styling.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, RefreshCw, X } from 'lucide-react';
import { FILTER_CONFIG, ANIMATION_CONFIG } from '@/lib/constants';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Optional label component - only renders in admin mode
 */
const FieldLabel: React.FC<{ htmlFor: string; children: React.ReactNode; isAdminMode?: boolean }> = ({
  htmlFor,
  children,
  isAdminMode
}) => {
  if (!isAdminMode) return null;
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1">
      {children}
    </label>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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
  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------

  const [searchSuggestions, setSearchSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);
  const [searchLoading, setSearchLoading] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  const abortControllerRef = useRef<AbortController | null>(null);
  const autocompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // --------------------------------------------------------------------------
  // EFFECTS
  // --------------------------------------------------------------------------

  // Sync local state with prop changes
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

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------

  const handleSearchInput = useCallback(
    (value: string) => {
      setLocalSearchTerm(value);
      onSearchChange(value);

      // Autocomplete logic
      if (!showAutocomplete || !apiUrl) return;

      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }

      if (value.length >= minSearchLength) {
        setSearchLoading(true);
        autocompleteTimeoutRef.current = setTimeout(async () => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }

          abortControllerRef.current = new AbortController();

          try {
            const response = await fetch(`${apiUrl}?search=${encodeURIComponent(value)}&limit=10`, {
              signal: abortControllerRef.current.signal,
            });

            if (!response.ok) throw new Error('Autocomplete fetch failed');

            const data = await response.json();
            setSearchSuggestions(Array.isArray(data) ? data : data.cards || []);
            setShowSuggestions(true);
          } catch (error: any) {
            if (error.name !== 'AbortError') {
              console.error('Autocomplete error:', error);
            }
          } finally {
            setSearchLoading(false);
          }
        }, debounceMs);
      } else {
        setSearchSuggestions([]);
        setShowSuggestions(false);
        setSearchLoading(false);
      }
    },
    [onSearchChange, showAutocomplete, apiUrl, minSearchLength, debounceMs]
  );

  const handleClearSearch = useCallback(() => {
    setLocalSearchTerm('');
    onSearchChange('');
    setSearchSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [onSearchChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
          e.preventDefault();
          if (selectedSuggestionIndex >= 0) {
            const suggestion = searchSuggestions[selectedSuggestionIndex];
            handleSearchInput(suggestion.name);
            setShowSuggestions(false);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          break;
      }
    },
    [showSuggestions, searchSuggestions, selectedSuggestionIndex, handleSearchInput]
  );

  // --------------------------------------------------------------------------
  // RENDER HELPERS
  // --------------------------------------------------------------------------

  /**
   * Unified container class based on mode
   */
  const containerClass = isAdminMode
    ? 'space-y-4 p-4 bg-white rounded-lg border border-slate-200'
    : 'space-y-4';

  /**
   * Unified layout class for filter fields
   */
  const filtersLayoutClass = isAdminMode
    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'
    : 'space-y-4';

  /**
   * Search field wrapper class
   */
  const searchWrapperClass = isAdminMode
    ? 'relative lg:col-span-2'
    : 'relative';

  /**
   * Individual filter field wrapper class
   */
  const filterFieldClass = isAdminMode ? 'flex flex-col' : 'relative';

  // --------------------------------------------------------------------------
  // UNIFIED JSX RENDER
  // --------------------------------------------------------------------------

  return (
    <div className={containerClass}>
      <div className={filtersLayoutClass}>
        {/* ====================================================================
            SEARCH INPUT - Unified for both modes
            ==================================================================== */}
        <div className={searchWrapperClass}>
          <FieldLabel htmlFor="card-search" isAdminMode={isAdminMode}>
            Search Cards
          </FieldLabel>

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

          {/* Autocomplete Suggestions - Same for both modes */}
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

        {/* ====================================================================
            GAME FILTER - Unified for both modes
            ==================================================================== */}
        <div className={filterFieldClass}>
          <FieldLabel htmlFor="game-filter" isAdminMode={isAdminMode}>
            Game
          </FieldLabel>
          <select
            id="game-filter"
            value={selectedGame}
            onChange={(e) => onGameChange(e.target.value)}
            className={`px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
              isAdminMode ? '' : 'w-full truncate'
            }`}
            aria-label={isAdminMode ? undefined : 'Filter by game'}
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

        {/* ====================================================================
            SET FILTER - Unified for both modes
            ==================================================================== */}
        <div className={filterFieldClass}>
          <FieldLabel htmlFor="set-filter" isAdminMode={isAdminMode}>
            Set
          </FieldLabel>
          <select
            id="set-filter"
            value={selectedSet}
            onChange={(e) => onSetChange(e.target.value)}
            disabled={selectedGame === 'all'}
            className={`px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed bg-white ${
              isAdminMode ? '' : 'w-full truncate'
            }`}
            aria-label={isAdminMode ? undefined : 'Filter by set'}
          >
            <option value="all">{selectedGame === 'all' ? 'Select a game first' : 'All Sets'}</option>
            {sets.map((set) => (
              <option key={set.id} value={set.name}>
                {set.name}
                {set.card_count && set.card_count > 0 ? ` (${set.card_count})` : ''}
              </option>
            ))}
          </select>
          {!isAdminMode && selectedGame === 'all' && (
            <p className="text-xs text-slate-500 mt-1">Select a game to filter by set</p>
          )}
        </div>

        {/* ====================================================================
            ADDITIONAL FILTERS - Unified for both modes
            ==================================================================== */}
        {Object.entries(additionalFilters).map(([key, filter]) => (
          <div key={key} className={filterFieldClass}>
            <FieldLabel htmlFor={`filter-${key}`} isAdminMode={isAdminMode}>
              {filter.label || key}
            </FieldLabel>
            <select
              id={`filter-${key}`}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              disabled={filter.disabled}
              className={`px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed bg-white ${
                isAdminMode ? '' : 'w-full truncate'
              }`}
              aria-label={isAdminMode ? undefined : `Filter by ${filter.label || key}`}
            >
              <option value="all">All {filter.label || key}</option>
              {filter.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Clear Filters Button - Only in admin mode */}
      {isAdminMode && onClearFilters && (
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
};

export default CardSearchBar;
