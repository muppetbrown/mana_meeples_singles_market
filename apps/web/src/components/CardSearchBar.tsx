import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, RefreshCw, X } from 'lucide-react';

/**
 * Reusable Card Search Component
 * 
 * Features:
 * - Debounced search input (prevents page refresh on single character)
 * - Autocomplete suggestions
 * - Dynamic dropdown filtering based on available data
 * - Keyboard navigation
 * - Request cancellation
 * 
 * @param {Object} props
 * @param {string} props.searchTerm - Current search value
 * @param {Function} props.onSearchChange - Callback when search changes
 * @param {string} props.selectedGame - Current game filter
 * @param {Function} props.onGameChange - Callback when game changes
 * @param {string} props.selectedSet - Current set filter
 * @param {Function} props.onSetChange - Callback when set changes
 * @param {Array} props.games - Available games
 * @param {Array} props.sets - Available sets for selected game
 * @param {Object} props.additionalFilters - Additional filter dropdowns (optional)
 * @param {string} props.apiUrl - API base URL
 * @param {boolean} props.showAutocomplete - Enable autocomplete (default: true)
 * @param {number} props.debounceMs - Debounce delay in ms (default: 300)
 * @param {number} props.minSearchLength - Min chars before search triggers (default: 2)
 */
const CardSearchBar = ({
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
  placeholder = "Search by name, number, or set..."
}: any) => {
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const abortController = useRef(null);
  const searchTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortController.current) {

        abortController.current.abort();
      }
    };
  }, []);

  /**
   * Debounced search handler
   * Only triggers actual search after user stops typing for debounceMs
   */
  const handleSearchInput = useCallback((value: any) => {
    // Cancel previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Cancel previous request
    if (abortController.current) {

      abortController.current.abort();
    }

    // Immediately update local state for responsive UI
    // but DON'T call onSearchChange yet (this prevents page refresh)
    
    // Only trigger actual search after debounce delay
    if (value.length >= minSearchLength) {
      setSearchLoading(true);
      

      searchTimeoutRef.current = setTimeout(async () => {
        // Now update parent component (triggers API call)
        onSearchChange(value);

        // Fetch autocomplete suggestions if enabled
        if (showAutocomplete && apiUrl) {
          try {

            abortController.current = new AbortController();

            const res = await fetch(
              `${apiUrl}/search/autocomplete?q=${encodeURIComponent(value)}`,
              {

                signal: abortController.current.signal,
                credentials: 'include'
              }
            );

            if (res.ok) {
              const data = await res.json();
              setSearchSuggestions(data.suggestions || []);
              setShowSuggestions(true);
              setSelectedSuggestionIndex(-1);
            }
          } catch (err) {

            if (err.name !== 'AbortError') {
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
      // Clear search if below minimum length
      if (value.length === 0) {
        onSearchChange('');
      }
      setSearchSuggestions([]);
      setShowSuggestions(false);
      setSearchLoading(false);
    }
  }, [onSearchChange, apiUrl, showAutocomplete, debounceMs, minSearchLength]);

  /**
   * Handle suggestion selection
   */
  const handleSuggestionClick = useCallback((suggestion: any) => {
    onSearchChange(suggestion.name);
    setShowSuggestions(false);
    setSearchSuggestions([]);
  }, [onSearchChange]);

  /**
   * Keyboard navigation for suggestions
   */
  const handleKeyDown = useCallback((e: any) => {
    if (!showSuggestions || searchSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < searchSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : searchSuggestions.length - 1
        );
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
  }, [showSuggestions, searchSuggestions, selectedSuggestionIndex, handleSuggestionClick]);

  /**
   * Clear search input
   */
  const handleClearSearch = useCallback(() => {
    onSearchChange('');
    setSearchSuggestions([]);
    setShowSuggestions(false);
    if (inputRef.current) {

      inputRef.current.value = '';

      inputRef.current.focus();
    }
  }, [onSearchChange]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Search Input with Autocomplete */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        {searchLoading && (
          <RefreshCw className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
        )}
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
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
            // Don't hide suggestions if clicking on them
            if (!e.relatedTarget?.closest('#search-suggestions')) {
              setTimeout(() => setShowSuggestions(false), 200);
            }
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {/* Autocomplete Suggestions */}
        {showSuggestions && searchSuggestions.length > 0 && (
          <div
            id="search-suggestions"
            className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          >
            {searchSuggestions.map((suggestion, index) => (
              <button

                key={`${suggestion.id}-${index}`}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-slate-100 last:border-b-0 ${
                  index === selectedSuggestionIndex ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      // @ts-expect-error TS(2339): Property 'name' does not exist on type 'never'.
                      {suggestion.name}
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-2">
                      // @ts-expect-error TS(2339): Property 'set_name' does not exist on type 'never'... Remove this comment to see the full error message
                      <span>{suggestion.set_name}</span>
                      // @ts-expect-error TS(2339): Property 'card_number' does not exist on type 'nev... Remove this comment to see the full error message
                      {suggestion.card_number && (
                        <>
                          <span>•</span>
                          // @ts-expect-error TS(2339): Property 'card_number' does not exist on type 'nev... Remove this comment to see the full error message
                          <span>#{suggestion.card_number}</span>
                        </>
                      )}
                    </div>
                  </div>
                  // @ts-expect-error TS(2339): Property 'image_url' does not exist on type 'never... Remove this comment to see the full error message
                  {suggestion.image_url && (
                    <img

                      src={suggestion.image_url}

                      alt={suggestion.name}
                      className="w-12 h-16 object-cover rounded ml-2 flex-shrink-0"
                    />
                  )}
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
      >
        <option value="all">All Games</option>
        // @ts-expect-error TS(7006): Parameter 'game' implicitly has an 'any' type.
        {games.map(game => (
          <option key={game.id} value={game.name}>
            {game.name}
            {game.card_count > 0 && ` (${game.card_count})`}
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
        >
          <option value="all">
            {selectedGame === 'all' ? 'Select a game first' : 'All Sets'}
          </option>
          // @ts-expect-error TS(7006): Parameter 'set' implicitly has an 'any' type.
          {sets.map(set => (
            <option key={set.id} value={set.name}>
              {set.name}
              {set.card_count > 0 && ` (${set.card_count})`}
            </option>
          ))}
        </select>
        {selectedGame === 'all' && (
          <p className="text-xs text-slate-500 mt-1">
            Select a game to filter by set
          </p>
        )}
      </div>

      {/* Additional Filters Slot */}
      {Object.keys(additionalFilters).length > 0 && (
        <>
          {Object.entries(additionalFilters).map(([key, filter]) => (
            <select
              key={key}

              value={filter.value}

              onChange={(e) => filter.onChange(e.target.value)}

              disabled={filter.disabled}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              // @ts-expect-error TS(2571): Object is of type 'unknown'.
              <option value="all">{filter.label || key}</option>
              // @ts-expect-error TS(2571): Object is of type 'unknown'.
              {filter.options?.map((option: any) => <option key={option.value} value={option.value}>
                {option.label}
                {option.count > 0 && ` (${option.count})`}
              </option>)}
            </select>
          ))}
        </>
      )}
    </div>
  );
};

export default CardSearchBar;