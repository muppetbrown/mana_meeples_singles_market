// apps/web/src/components/CardSearchBar.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, RefreshCw, X } from 'lucide-react';

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
  debounceMs = 300,
  minSearchLength = 2,
  placeholder = 'Search by name, number, or set...'
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
                setSelectedSuggestionIndex(-1);
              } else {
                setSearchSuggestions([]);
                setShowSuggestions(false);
              }
            } catch (err: unknown) {
              if (!(err instanceof DOMException && err.name === 'AbortError')) {
                // eslint-disable-next-line no-console
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
        // Clear if below minimum length
        if (value.length === 0) onSearchChange('');
        setSearchSuggestions([]);
        setShowSuggestions(false);
        setSearchLoading(false);
      }
    },
    [onSearchChange, apiUrl, showAutocomplete, debounceMs, minSearchLength]
  );

  /** Click a suggestion */
  const handleSuggestionClick = useCallback(
    (suggestion: Suggestion) => {
      onSearchChange(suggestion.name);
      setShowSuggestions(false);
      setSearchSuggestions([]);
      // Refocus the input for continued typing
      inputRef.current?.focus();
    },
    [onSearchChange]
  );

  /** Keyboard navigation for suggestions */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || searchSuggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => (prev < searchSuggestions.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : searchSuggestions.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedSuggestionIndex >= 0) {
            handleSuggestionClick(searchSuggestions[selectedSuggestionIndex]);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          break;
        default:
          break;
      }
    },
    [showSuggestions, searchSuggestions, selectedSuggestionIndex, handleSuggestionClick]
  );

  /** Clear search input */
  const handleClearSearch = useCallback(() => {
    onSearchChange('');
    setSearchSuggestions([]);
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  }, [onSearchChange]);

  const listboxId = 'search-suggestions';

  const highlightMatch = (text: any, query: any) => {
    if (!query || !text) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part: any, idx: any) =>
      regex.test(part) ?
        <mark key={idx} className="bg-yellow-200 font-medium">{part}</mark> :
        part
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Search Input with Autocomplete */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        {searchLoading && (
          <RefreshCw
            className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin"
            aria-hidden="true"
          />
        )}
        {searchTerm && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600 rounded"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          defaultValue={searchTerm}
          onChange={(e) => handleSearchInput(e.target.value)}
          onFocus={() => setShowSuggestions(searchSuggestions.length > 0)}
          onBlur={(e) => {
            // Don't hide suggestions if clicking within the listbox
            const related = e.relatedTarget as HTMLElement | null;
            if (!related || !related.closest(`#${listboxId}`)) {
              setTimeout(() => setShowSuggestions(false), 150);
            }
          }}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-controls={showSuggestions ? listboxId : undefined}
          aria-activedescendant={
            showSuggestions && selectedSuggestionIndex >= 0
              ? `${listboxId}-option-${selectedSuggestionIndex}`
              : undefined
          }
          className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {searchLoading ? 'Loading suggestions' : ''}
        </div>

        {/* Autocomplete Suggestions */}
        {showSuggestions && searchSuggestions.length > 0 && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          >
            {searchSuggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.id}-${index}`}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={index === selectedSuggestionIndex}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-slate-100 last:border-b-0 ${
                  index === selectedSuggestionIndex ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{suggestion.name}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-2">
                      {suggestion.set_name && <span>{suggestion.set_name}</span>}
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

      {/* Set Filter - Dynamic based on selected game */}
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
            disabled={!!filter.disabled}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="all">{filter.label ?? key}</option>
            {filter.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
};

export default CardSearchBar;
