import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Package, Search, RefreshCw, Filter, Sparkles } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AllCardsView = () => {
  const [cards, setCards] = useState([]);
  const [games, setGames] = useState([]);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGame, setFilterGame] = useState('all');
  const [filterSet, setFilterSet] = useState('all');
  const [expandedCards, setExpandedCards] = useState(new Set());

  useEffect(() => {
      fetchCards();
    }, [fetchCards]);

  const fetchGames = async () => {
    try {
      const response = await fetch(`${API_URL}/games`);
      if (!response.ok) throw new Error('Failed to fetch games');
      const data = await response.json();
      setGames(data.games || []);
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };

  const fetchCards = useCallback(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: 1000 });
        if (filterGame !== 'all') params.append('game_id', filterGame);
        if (filterSet !== 'all') params.append('set_id', filterSet);
        if (searchTerm) params.append('search', searchTerm);

        const response = await fetch(`${API_URL}/admin/all-cards?${params}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch cards: ${response.statusText}`);
        }

        const data = await response.json();
        setCards(data.cards || []);
        setError(null);
      } catch (error) {
        console.error('Error fetching cards:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }, [filterGame, filterSet, searchTerm]);

  useEffect(() => {
    if (filterGame !== 'all') {
      fetchSets(filterGame);
    } else {
      setSets([]);
      setFilterSet('all');
    }
  }, [filterGame]);

  const fetchSets = async (gameId) => {
    try {
      const response = await fetch(`${API_URL}/games/${gameId}/sets`);
      if (!response.ok) throw new Error('Failed to fetch sets');
      const data = await response.json();
      setSets(data.sets || []);
    } catch (error) {
      console.error('Error fetching sets:', error);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [filterGame, filterSet]);

  const filteredCards = useMemo(() => {
    if (!searchTerm) return cards;
    const search = searchTerm.toLowerCase();
    return cards.filter(card =>
      card.name.toLowerCase().includes(search) ||
      card.card_number?.toLowerCase().includes(search)
    );
  }, [cards, searchTerm]);

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
      'STANDARD': 'bg-slate-100 text-slate-700',
      'BORDERLESS': 'bg-purple-100 text-purple-700',
      'EXTENDED_ART': 'bg-blue-100 text-blue-700',
      'SHOWCASE': 'bg-pink-100 text-pink-700',
      'PROMO': 'bg-amber-100 text-amber-700'
    };
    return colors[treatment] || 'bg-gray-100 text-gray-700';
  };

  const getFinishColor = (finish) => {
    return finish === 'foil' 
      ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-700 border border-amber-300'
      : 'bg-slate-50 text-slate-600 border border-slate-200';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">All Cards Database</h2>
          <p className="text-slate-600 mt-1">
            {filteredCards.length} cards • {filteredCards.reduce((sum, c) => sum + c.variation_count, 0)} variations
          </p>
        </div>
        <button
          onClick={fetchCards}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-medium">
          <Filter className="w-5 h-5" />
          Filters
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3">
        {filteredCards.map((card) => {
          const cardKey = `${card.name}-${card.card_number}`;
          const isExpanded = expandedCards.has(cardKey);

          return (
            <div key={cardKey} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleCard(cardKey)}
                className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                  {card.image_url ? (
                    <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                </div>

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
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-900">
                          {card.variation_count} {card.variation_count === 1 ? 'variation' : 'variations'}
                        </div>
                        {card.has_inventory && (
                          <div className="text-xs text-green-600 font-medium">
                            {card.total_stock} in stock
                          </div>
                        )}
                      </div>
                      <Sparkles className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-200 bg-slate-50 p-4">
                  <div className="space-y-2">
                    {card.variations.map((variation, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="font-medium text-slate-900">
                            {variation.variation_label}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getTreatmentColor(variation.treatment)}`}>
                              {variation.treatment}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getFinishColor(variation.finish)}`}>
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
                            <span className="text-sm text-slate-500">Not in inventory</span>
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
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg font-medium">No cards found</p>
          <p className="text-slate-400 text-sm mt-2">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
};

export default AllCardsView;