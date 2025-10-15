import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Package, Search, RefreshCw, Filter, Sparkles, Edit, Save, X, Download, Plus } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Unified Cards Component - Works for both "All Cards" and "Inventory" modes
 * Mode prop determines filtering: 'all' shows everything, 'inventory' shows only stocked items
 */
const UnifiedCardsTab = ({ mode = 'all' }) => {
  const [cards, setCards] = useState([]);
  const [games, setGames] = useState([]);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGame, setFilterGame] = useState('all');
  const [filterSet, setFilterSet] = useState('all');
  const [filterTreatment, setFilterTreatment] = useState('all');
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [editingVariations, setEditingVariations] = useState(new Map());

  const isInventoryMode = mode === 'inventory';

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

  const fetchSets = useCallback(async (gameId) => {
    try {
      const response = await fetch(`${API_URL}/games/${gameId}/sets`);
      if (!response.ok) throw new Error('Failed to fetch sets');
      const data = await response.json();
      setSets(data.sets || []);
    } catch (error) {
      console.error('Error fetching sets:', error);
    }
  }, []);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 1000 });
      if (filterGame !== 'all') params.append('game_id', filterGame);
      if (filterSet !== 'all') params.append('set_id', filterSet);
      if (filterTreatment !== 'all') params.append('treatment', filterTreatment);
      if (filterFinish !== 'all') params.append('finish', filterFinish);
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
  }, [filterGame, filterSet, filterTreatment, searchTerm]);

  useEffect(() => {
    fetchGames();
    fetchCards();
  }, [fetchGames, fetchCards]);

  useEffect(() => {
    if (filterGame !== 'all') {
      fetchSets(filterGame);
    } else {
      setSets([]);
      setFilterSet('all');
    }
  }, [filterGame, fetchSets]);

  // Filter cards based on mode
  const filteredCards = useMemo(() => {
    let filtered = cards;

    // Apply search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(card =>
        card.name.toLowerCase().includes(search) ||
        card.card_number?.toLowerCase().includes(search)
      );
    }

    // Apply inventory mode filter
    if (isInventoryMode) {
      filtered = filtered.filter(card => card.has_inventory && card.total_stock > 0);
    }

    return filtered;
  }, [cards, searchTerm, isInventoryMode]);

  // Get common treatments across all variations
  const getCommonTreatments = (variations) => {
    if (!variations || variations.length === 0) return [];
    
    // Get unique treatments
    const treatments = [...new Set(variations.map(v => v.treatment))];
    return treatments;
  };

  // Get common finishes across all variations
  const getCommonFinishes = (variations) => {
    if (!variations || variations.length === 0) return [];
    
    // Get unique finishes
    const finishes = [...new Set(variations.map(v => v.finish))];
    return finishes;
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

  const startEditing = (cardId, variationIndex, variation) => {
    const key = `${cardId}-${variationIndex}`;
    setEditingVariations(prev => new Map(prev).set(key, {
      stock: variation.stock,
      price: 0 // Would need to fetch from inventory
    }));
  };

  const cancelEditing = (cardId, variationIndex) => {
    const key = `${cardId}-${variationIndex}`;
    setEditingVariations(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  };

  const saveVariation = async (cardId, variationIndex) => {
    const key = `${cardId}-${variationIndex}`;
    const editData = editingVariations.get(key);
    if (!editData) return;

    // TODO: Implement save to inventory API
    console.log('Save variation:', cardId, editData);
    cancelEditing(cardId, variationIndex);
  };

  const exportData = () => {
    const csv = [
      ['Card Name', 'Number', 'Set', 'Rarity', 'Treatment', 'Finish', 'Stock', 'Variations'].join(','),
      ...filteredCards.map(card => [
        `"${card.name}"`,
        card.card_number,
        card.set_name,
        card.rarity || '',
        getCommonTreatments(card.variations).join(';'),
        getCommonFinishes(card.variations).join(';'),
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
            <input
              type="text"
              placeholder="Search cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterGame}
            onChange={(e) => setFilterGame(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Games</option>
            {games.map(game => (
              <option key={game.id} value={game.id}>{game.name}</option>
            ))}
          </select>

          <select
            value={filterSet}
            onChange={(e) => setFilterSet(e.target.value)}
            disabled={filterGame === 'all'}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
          >
            <option value="all">All Sets</option>
            {sets.map(set => (
              <option key={set.id} value={set.id}>{set.name}</option>
            ))}
          </select>

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
          const commonTreatments = getCommonTreatments(card.variations);
          const commonFinishes = getCommonFinishes(card.variations);

          return (
            <div key={cardKey} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {/* Card Header */}
              <button
                onClick={() => toggleCard(cardKey)}
                className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
              >
                {/* Card Image */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                  {card.image_url ? (
                    <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
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
                      
                      {/* Common Variation Badges */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {commonTreatments.map(treatment => (
                          <span 
                            key={treatment}
                            className={`px-2 py-0.5 rounded text-xs font-medium border ${getTreatmentColor(treatment)}`}
                          >
                            {treatment}
                          </span>
                        ))}
                        {commonFinishes.map(finish => (
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
                    {card.variations.map((variation, idx) => {
                      const editKey = `${card.name}-${idx}`;
                      const isEditing = editingVariations.has(editKey);
                      const editData = editingVariations.get(editKey);

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="font-medium text-slate-900">
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
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={editData.stock}
                                    onChange={(e) => {
                                      const newMap = new Map(editingVariations);
                                      newMap.set(editKey, { ...editData, stock: parseInt(e.target.value) || 0 });
                                      setEditingVariations(newMap);
                                    }}
                                    className="w-20 px-2 py-1 border rounded text-right"
                                  />
                                ) : (
                                  <>
                                    <span className="text-green-600 font-medium">{variation.stock} in stock</span>
                                    <span className="text-slate-500 ml-2">({variation.inventory_count} entries)</span>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-500">Not in inventory</span>
                            )}

                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => saveVariation(card.name, idx)}
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => cancelEditing(card.name, idx)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  {variation.inventory_count > 0 && (
                                    <button
                                      onClick={() => startEditing(card.name, idx, variation)}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                  )}
                                  {variation.inventory_count === 0 && (
                                    <button
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
                        </div>
                      );
                    })}
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
    </div>
  );
};

export default UnifiedCardsTab;