import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Search, RefreshCw, Filter, Sparkles, Download, ZoomIn, X, Plus, ChevronDown, ChevronUp } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Unified Cards Component - Clean version without dead code
 * Mode: 'all' shows everything, 'inventory' shows only stocked items
 */
const UnifiedCardsTab = ({ mode = 'all' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cards, setCards] = useState([]);
  const [games, setGames] = useState([]);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Enhanced search states
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [searchLoading, setSearchLoading] = useState(false);

  // Get search term from URL and initialize filter states from URL params - matching TCGshop
  const searchTerm = searchParams.get('search') || '';
  const selectedGame = searchParams.get('game') || 'all';
  const selectedSet = searchParams.get('set') || 'all';
  const [filterTreatment, setFilterTreatment] = useState('all');
  const [availableSets, setAvailableSets] = useState([]);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [imageModalUrl, setImageModalUrl] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalData, setAddModalData] = useState(null);
  const [addFormData, setAddFormData] = useState({
    quality: 'Near Mint',
    foil_type: 'Regular',
    price: '',
    stock_quantity: 1,
    language: 'English'
  });
  const [saving, setSaving] = useState(false);

  // Refs for debouncing and request cancellation
  const abortController = useRef(null);
  const searchTimeoutRef = useRef(null);

  const isInventoryMode = mode === 'inventory';

  // Enhanced search with debouncing and autocomplete - similar to TCGshop.jsx
  const handleSearchChange = useCallback(async (value) => {
    // Update URL immediately for responsiveness
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value) {
        newParams.set('search', value);
      } else {
        newParams.delete('search');
      }
      return newParams;
    });

    // Cancel previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort();
    }

    if (value.length >= 2) {
      setSearchLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          // Create new AbortController for this request
          abortController.current = new AbortController();

          const res = await fetch(
            `${API_URL}/search/autocomplete?q=${encodeURIComponent(value)}`,
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
      }, 300); // 300ms debounce for better UX
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      setSearchLoading(false);
    }
  }, [setSearchParams]);

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

  // Fetch functions
  const fetchGames = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/games`);
      if (!response.ok) throw new Error('Failed to fetch games');
      const data = await response.json();
      setGames(data.games || []);
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  }, []);

  // Helper function to get game ID from name (matching TCGshop)
  const getGameIdFromName = (gameName) => {
    const gameMap = {
      'Magic: The Gathering': 1,
      'Pokemon': 2,
      'Yu-Gi-Oh!': 3
    };
    return gameMap[gameName] || null;
  };

  // Enhanced fetchSets to match TCGshop pattern
  const fetchSets = useCallback(async () => {
    if (selectedGame === 'all') {
      setAvailableSets([]);
      return;
    }

    try {
      const gameId = getGameIdFromName(selectedGame);
      if (!gameId) return;

      // Use the same endpoint pattern as TCGshop
      const response = await fetch(`${API_URL}/sets?game_id=${gameId}`);

      if (response.ok) {
        const sets = await response.json();
        setAvailableSets(sets);
        setSets(sets); // Keep both for backward compatibility
      } else {
        console.error('Failed to fetch sets');
        setAvailableSets([]);
        setSets([]);
      }
    } catch (error) {
      console.error('Error fetching sets:', error);
      setAvailableSets([]);
      setSets([]);
    }
  }, [selectedGame]);

  // Filter change handlers (matching TCGshop pattern) - moved before fetchCards
  const handleFilterChange = useCallback((key, value) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value && value !== 'all' && value !== '') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      return newParams;
    });
  }, [setSearchParams]);

  // Handle game selection (matching TCGshop pattern)
  const handleGameChange = useCallback((game) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (game && game !== 'all') {
        newParams.set('game', game);
      } else {
        newParams.delete('game');
      }
      return newParams;
    });
  }, [setSearchParams]);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 1000 });

      // Use game name-based filtering like TCGshop
      if (selectedGame !== 'all') {
        const gameId = getGameIdFromName(selectedGame);
        if (gameId) {
          params.append('game_id', gameId);
        }
      }

      // Use set name-based filtering like TCGshop
      if (selectedSet !== 'all') {
        params.append('set_name', selectedSet);
      }

      if (filterTreatment !== 'all') params.append('treatment', filterTreatment);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${API_URL}/admin/all-cards?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error(`Failed to fetch cards: ${response.statusText}`);

      const data = await response.json();
      setCards(data.cards || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching cards:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedGame, selectedSet, filterTreatment, searchTerm]);

  useEffect(() => {
    fetchGames();
    fetchCards();
  }, [fetchGames, fetchCards]);

  // Dynamic set fetching when game changes (matching TCGshop)
  useEffect(() => {
    fetchSets();
    // Reset set filter when game changes (matching TCGshop pattern)
    if (selectedSet !== 'all') {
      handleFilterChange('set', 'all');
    }
  }, [selectedGame, fetchSets]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter cards based on mode - search is handled server-side now
  const filteredCards = useMemo(() => {
    let filtered = cards;

    // Apply inventory mode filter (client-side)
    if (isInventoryMode) {
      filtered = filtered.filter(card => card.has_inventory && card.total_stock > 0);
    }

    return filtered;
  }, [cards, isInventoryMode]);

  // Get unique treatments/finishes for a card
  const getUniqueTreatments = (variations) => {
    if (!variations || variations.length === 0) return [];
    return [...new Set(variations.map(v => v.treatment))];
  };

  const getUniqueFinishes = (variations) => {
    if (!variations || variations.length === 0) return [];
    return [...new Set(variations.map(v => v.finish))];
  };

  const toggleCard = (key) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const getTreatmentColor = (treatment) => {
    const colors = {
      'STANDARD': 'bg-slate-100 text-slate-700 border-slate-300',
      'BORDERLESS': 'bg-purple-100 text-purple-700 border-purple-300',
      'EXTENDED_ART': 'bg-blue-100 text-blue-700 border-blue-300',
      'SHOWCASE': 'bg-pink-100 text-pink-700 border-pink-300',
      'PROMO': 'bg-amber-100 text-amber-700 border-amber-300',
      'EXTENDED': 'bg-indigo-100 text-indigo-700 border-indigo-300'
    };
    return colors[treatment] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getFinishBadge = (finish) => {
    if (finish === 'foil') {
      return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800 border-amber-300';
    }
    return 'bg-slate-100 text-slate-600 border-slate-300';
  };

  const openAddModal = (card, variation) => {
    setAddModalData({ card, variation });
    setAddFormData({
      quality: 'Near Mint',
      foil_type: variation.finish === 'foil' ? 'Foil' : 'Regular',
      price: '',
      stock_quantity: 1,
      language: 'English'
    });
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddModalData(null);
    setAddFormData({
      quality: 'Near Mint',
      foil_type: 'Regular',
      price: '',
      stock_quantity: 1,
      language: 'English'
    });
  };

  const handleAddToInventory = async () => {
    if (!addModalData) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/admin/inventory`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          card_id: addModalData.variation.card_id,
          quality: addFormData.quality,
          foil_type: addFormData.foil_type,
          price: parseFloat(addFormData.price) || 0,
          stock_quantity: parseInt(addFormData.stock_quantity) || 0,
          language: addFormData.language
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add to inventory');
      }
   
      // Success - refresh cards to show updated inventory
      await fetchCards();
      closeAddModal();
      
      // Show success message (you could use a toast here)
      alert(`✅ ${addModalData.card.name} added to inventory successfully!`);
      
    } catch (error) {
      console.error('Error adding to inventory:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const exportData = () => {
    const csv = [
      ['Card Name', 'Number', 'Set', 'Rarity', 'Treatments', 'Finishes', 'Stock', 'Variations'].join(','),
      ...filteredCards.map(card => [
        `"${card.name}"`,
        card.card_number,
        card.set_name,
        card.rarity || '',
        getUniqueTreatments(card.variations).join(';'),
        getUniqueFinishes(card.variations).join(';'),
        card.total_stock,
        card.variation_count
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${isInventoryMode ? 'inventory' : 'all-cards'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-slate-600">Loading cards...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 font-medium">Error loading cards</p>
        <p className="text-red-600 text-sm mt-2">{error}</p>
        <button
          onClick={fetchCards}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const totalStock = filteredCards.reduce((sum, card) => sum + card.total_stock, 0);
  const totalVariations = filteredCards.reduce((sum, card) => sum + card.variation_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isInventoryMode ? 'Inventory Management' : 'All Cards Database'}
          </h2>
          <p className="text-slate-600 mt-1">
            {filteredCards.length} cards • {totalVariations} variations
            {isInventoryMode && ` • ${totalStock} in stock`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCards}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-medium">
          <Filter className="w-5 h-5" />
          Filters
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            {searchLoading && (
              <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
            )}
            <input
              type="search"
              placeholder="Search cards..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowSuggestions(searchSuggestions.length > 0)}
              onBlur={(e) => {
                // Don't hide suggestions if clicking on them
                if (!e.relatedTarget?.closest('#search-suggestions')) {
                  setTimeout(() => setShowSuggestions(false), 200);
                }
              }}
              onKeyDown={(e) => {
                if (!showSuggestions) return;

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
                    if (selectedSuggestionIndex >= 0 && searchSuggestions[selectedSuggestionIndex]) {
                      e.preventDefault();
                      const suggestion = searchSuggestions[selectedSuggestionIndex];
                      handleSearchChange(suggestion.name);
                      setShowSuggestions(false);
                      setSelectedSuggestionIndex(-1);
                    }
                    break;
                  case 'Escape':
                    setShowSuggestions(false);
                    setSelectedSuggestionIndex(-1);
                    break;
                  default:
                    break;
                }
              }}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Search for cards by name, set, or number"
              aria-expanded={showSuggestions}
              aria-haspopup="listbox"
              role="combobox"
              autoComplete="off"
            />

            {/* Autocomplete Suggestions */}
            {showSuggestions && (
              <div
                id="search-suggestions"
                className="absolute z-50 w-full bg-white border border-slate-300 rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto"
                role="listbox"
              >
                {searchLoading ? (
                  <div className="px-3 py-2 text-slate-500 text-sm flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Searching...
                  </div>
                ) : searchSuggestions.length > 0 ? (
                  searchSuggestions.map((suggestion, idx) => (
                    <button
                    key={idx}
                    type="button"
                    className={`w-full px-3 py-2 text-left hover:bg-slate-100 focus:bg-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none flex items-center gap-2 border-b last:border-b-0 ${
                      selectedSuggestionIndex === idx ? 'bg-slate-100' : ''
                    }`}
                    onMouseDown={() => {
                      // Use onMouseDown instead of onClick to prevent blur issues
                      handleSearchChange(suggestion.name);
                      setShowSuggestions(false);
                      setSelectedSuggestionIndex(-1);
                    }}
                    onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                    role="option"
                    aria-selected={selectedSuggestionIndex === idx}
                    aria-label={`Select ${suggestion.name} from ${suggestion.set_name}`}
                  >
                    {suggestion.image_url && (
                      <img
                        src={suggestion.image_url}
                        alt={suggestion.name}
                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {suggestion.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {suggestion.set_name} • #{suggestion.card_number}
                      </div>
                    </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-slate-500 text-sm">
                    No cards found matching "{searchTerm}"
                  </div>
                )}
              </div>
            )}
          </div>

          <select
            value={selectedGame}
            onChange={(e) => handleGameChange(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Games</option>
            {games.map(game => (
              <option key={game.id} value={game.name}>{game.name}</option>
            ))}
          </select>

          <select
            value={selectedSet}
            onChange={(e) => handleFilterChange('set', e.target.value)}
            disabled={selectedGame === 'all'}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
          >
            <option value="all">All Sets</option>
            {availableSets.map(set => (
              <option key={set.id} value={set.name}>{set.name}</option>
            ))}
          </select>
          {selectedGame === 'all' && (
            <p className="text-xs text-slate-500 mt-1">Select a game to filter by set</p>
          )}

          {!isInventoryMode && (
            <select
              value={filterTreatment}
              onChange={(e) => setFilterTreatment(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Treatments</option>
              <option value="STANDARD">Standard</option>
              <option value="BORDERLESS">Borderless</option>
              <option value="EXTENDED_ART">Extended Art</option>
              <option value="EXTENDED">Extended</option>
              <option value="SHOWCASE">Showcase</option>
              <option value="PROMO">Promo</option>
            </select>
          )}
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3">
        {filteredCards.map((card) => {
          const cardKey = `${card.name}-${card.card_number}`;
          const isExpanded = expandedCards.has(cardKey);
          const uniqueTreatments = getUniqueTreatments(card.variations);
          const uniqueFinishes = getUniqueFinishes(card.variations);

          return (
            <div key={cardKey} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {/* Card Header */}
              <button
                onClick={() => toggleCard(cardKey)}
                className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
              >
                {/* Card Image with Zoom */}
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 group">
                  {card.image_url ? (
                    <>
                      <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageModalUrl(card.image_url);
                        }}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ZoomIn className="w-6 h-6 text-white" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Card Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{card.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                        <span>#{card.card_number}</span>
                        <span>•</span>
                        <span>{card.set_name}</span>
                        {card.rarity && (
                          <>
                            <span>•</span>
                            <span>{card.rarity}</span>
                          </>
                        )}
                      </div>
                      
                      {/* Unique Variation Badges */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {uniqueTreatments.map(treatment => (
                          <span 
                            key={treatment}
                            className={`px-2 py-0.5 rounded text-xs font-medium border ${getTreatmentColor(treatment)}`}
                          >
                            {treatment}
                          </span>
                        ))}
                        {uniqueFinishes.map(finish => (
                          <span 
                            key={finish}
                            className={`px-2 py-0.5 rounded text-xs font-medium border ${getFinishBadge(finish)}`}
                          >
                            {finish}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Variation Count & Stock */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-900">
                          {card.variation_count} {card.variation_count === 1 ? 'variation' : 'variations'}
                        </div>
                        {card.has_inventory && (
                          <div className={`text-xs font-medium ${card.total_stock <= 3 ? 'text-orange-600' : 'text-green-600'}`}>
                            {card.total_stock} in stock
                          </div>
                        )}
                      </div>
                      <Sparkles className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </div>
              </button>

              {/* Expanded Variations */}
              {isExpanded && (
                <div className="border-t border-slate-200 bg-slate-50 p-4">
                  <div className="space-y-2">
                    {card.variations.map((variation, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="font-medium text-slate-900 min-w-[150px]">
                            {variation.variation_label}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getTreatmentColor(variation.treatment)}`}>
                              {variation.treatment}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getFinishBadge(variation.finish)}`}>
                              {variation.finish}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {variation.inventory_count > 0 ? (
                            <div className="text-sm">
                              <span className="text-green-600 font-medium">{variation.stock} in stock</span>
                              <span className="text-slate-500 ml-2">({variation.inventory_count} entries)</span>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm text-slate-500">Not in inventory</span>
                              {!isInventoryMode && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAddModal(card, variation);
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <Plus className="w-4 h-4" />
                                  Add to Inventory
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredCards.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg font-medium">
            {isInventoryMode ? 'No items in inventory' : 'No cards found'}
          </p>
          <p className="text-slate-400 text-sm mt-2">
            {isInventoryMode 
              ? 'Add items from the All Cards tab' 
              : 'Try adjusting your filters'}
          </p>
        </div>
      )}

      {/* Add to Inventory Modal */}
      {showAddModal && addModalData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Add to Inventory</h2>
              <button
                onClick={closeAddModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Card Info */}
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <div className="font-medium text-slate-900">{addModalData.card.name}</div>
              <div className="text-sm text-slate-600 mt-1">
                {addModalData.variation.variation_label}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getTreatmentColor(addModalData.variation.treatment)}`}>
                  {addModalData.variation.treatment}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getFinishBadge(addModalData.variation.finish)}`}>
                  {addModalData.variation.finish}
                </span>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Quality/Condition
                </label>
                <select
                  value={addFormData.quality}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, quality: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Near Mint">Near Mint</option>
                  <option value="Lightly Played">Lightly Played</option>
                  <option value="Moderately Played">Moderately Played</option>
                  <option value="Heavily Played">Heavily Played</option>
                  <option value="Damaged">Damaged</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Foil Type
                </label>
                <select
                  value={addFormData.foil_type}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, foil_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Regular">Regular (Non-foil)</option>
                  <option value="Foil">Foil</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Price (NZD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={addFormData.price}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Initial Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={addFormData.stock_quantity}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Language
                </label>
                <select
                  value={addFormData.language}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="English">English</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeAddModal}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToInventory}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add to Inventory
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {imageModalUrl && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setImageModalUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setImageModalUrl(null)}
              className="absolute -top-12 right-0 text-white hover:text-slate-300 flex items-center gap-2 px-4 py-2 bg-black/50 rounded-lg"
            >
              <X className="w-5 h-5" />
              Close
            </button>
            <img 
              src={imageModalUrl} 
              alt="Card preview" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      
    </div>
  );
};

export default UnifiedCardsTab;