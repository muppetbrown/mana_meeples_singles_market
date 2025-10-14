import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Package, Search, Plus, Sparkles, Image as ImageIcon } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * All Cards View - Shows all cards from database with their variations
 * Does NOT show quality badges - just the actual card variations that exist
 */
const AllCardsView = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGame, setFilterGame] = useState('all');
  const [filterSet, setFilterSet] = useState('all');
  const [filterTreatment, setFilterTreatment] = useState('all');
  const [filterFinish, setFilterFinish] = useState('all');
  const [expandedCards, setExpandedCards] = useState(new Set());

  // Fetch cards from API
  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: 1000 // Adjust based on your needs
      });

      if (filterGame !== 'all') params.append('game_id', filterGame);
      if (filterSet !== 'all') params.append('set_id', filterSet);
      if (filterTreatment !== 'all') params.append('treatment', filterTreatment);
      if (filterFinish !== 'all') params.append('finish', filterFinish);

      const response = await fetch(`${API_URL}/admin/all-cards?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch cards');

      const data = await response.json();
      setCards(data.cards || []);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  }, [filterGame, filterSet, filterTreatment, filterFinish]);

  // Filter cards by search term
  const filteredCards = useMemo(() => {
    if (!searchTerm) return cards;

    const search = searchTerm.toLowerCase();
    return cards.filter(card =>
      card.name.toLowerCase().includes(search) ||
      card.card_number.includes(search) ||
      card.set_name?.toLowerCase().includes(search)
    );
  }, [cards, searchTerm]);

  // Toggle card expansion
  const toggleCard = (cardKey) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardKey)) {
        next.delete(cardKey);
      } else {
        next.add(cardKey);
      }
      return next;
    });
  };

  // Format treatment for display
  const formatTreatment = (treatment) => {
    if (!treatment) return 'Standard';
    return treatment
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  // Get treatment badge color
  const getTreatmentColor = (treatment) => {
    if (!treatment || treatment === 'STANDARD') return 'bg-gray-100 text-gray-800 border-gray-300';
    if (treatment.includes('BORDERLESS')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (treatment.includes('EXTENDED')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (treatment.includes('SURGEFOIL')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (treatment.includes('NEONINK')) return 'bg-pink-100 text-pink-800 border-pink-300';
    return 'bg-indigo-100 text-indigo-800 border-indigo-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600">Loading cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">All Cards</h1>
              <p className="text-sm text-slate-600 mt-1">
                {filteredCards.length} cards • {filteredCards.reduce((sum, c) => sum + c.variation_count, 0)} variations
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredCards.filter(c => c.has_inventory).length}
                </div>
                <div className="text-xs text-slate-600">With Stock</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-400">
                  {filteredCards.filter(c => !c.has_inventory).length}
                </div>
                <div className="text-xs text-slate-600">No Stock</div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by card name, number, or set..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <select
              value={filterGame}
              onChange={(e) => setFilterGame(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Games</option>
              <option value="1">Magic: The Gathering</option>
              <option value="2">Pokémon</option>
            </select>

            <select
              value={filterTreatment}
              onChange={(e) => setFilterTreatment(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Treatments</option>
              <option value="STANDARD">Standard</option>
              <option value="BORDERLESS">Borderless</option>
              <option value="EXTENDED">Extended Art</option>
              <option value="BORDERLESS_INVERTED">Borderless Inverted</option>
            </select>

            <select
              value={filterFinish}
              onChange={(e) => setFilterFinish(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Finishes</option>
              <option value="nonfoil">Nonfoil</option>
              <option value="foil">Foil</option>
            </select>

            <button
              onClick={() => {
                setSearchTerm('');
                setFilterGame('all');
                setFilterSet('all');
                setFilterTreatment('all');
                setFilterFinish('all');
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-200">
            {filteredCards.map((card) => {
              const cardKey = `${card.name}-${card.card_number}`;
              const isExpanded = expandedCards.has(cardKey);

              return (
                <div key={cardKey} className="hover:bg-slate-50 transition-colors">
                  {/* Main Card Row */}
                  <div className="p-4 flex items-center gap-4">
                    {/* Card Image */}
                    <div className="flex-shrink-0">
                      {card.image_url ? (
                        <img
                          src={card.image_url}
                          alt={card.name}
                          className="w-16 h-22 rounded-lg object-cover border border-slate-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-16 h-22 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                          <ImageIcon className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* Card Info */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-grow min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {card.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                            <span className="font-mono">#{card.card_number}</span>
                            <span>•</span>
                            <span>{card.set_name}</span>
                            <span>•</span>
                            <span className="capitalize">{card.rarity}</span>
                          </div>
                        </div>

                        {/* Variation Count & Stock Status */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-medium text-slate-900">
                              {card.variation_count} variation{card.variation_count !== 1 ? 's' : ''}
                            </div>
                            {card.has_inventory && (
                              <div className="text-xs text-green-600 font-medium">
                                {card.total_stock} in stock
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => toggleCard(cardKey)}
                            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            {isExpanded ? 'Hide' : 'Show'} Variations
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Variations */}
                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-200 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {card.variations.map((variation) => (
                          <div
                            key={variation.sku}
                            className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-md transition-shadow"
                          >
                            {/* Variation Header */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex flex-wrap gap-1">
                                {/* Treatment Badge */}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${getTreatmentColor(variation.treatment)}`}>
                                  {formatTreatment(variation.treatment)}
                                </span>

                                {/* Finish Badge */}
                                {variation.finish === 'foil' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                                    <Sparkles className="w-3 h-3" />
                                    Foil
                                  </span>
                                )}
                              </div>

                              {/* Stock Indicator */}
                              {variation.stock > 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  {variation.stock} in stock
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                  No stock
                                </span>
                              )}
                            </div>

                            {/* SKU */}
                            <div className="text-xs text-slate-500 font-mono mb-2">
                              {variation.sku}
                            </div>

                            {/* Add Inventory Button */}
                            {variation.stock === 0 && (
                              <button
                                onClick={() => {
                                  // TODO: Open add inventory modal
                                  console.log('Add inventory for', variation.sku);
                                }}
                                className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                                Add to Inventory
                              </button>
                            )}

                            {variation.stock > 0 && (
                              <button
                                onClick={() => {
                                  // TODO: Navigate to inventory management
                                  console.log('Manage inventory for', variation.sku);
                                }}
                                className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                              >
                                Manage Stock
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Empty State */}
        {filteredCards.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No cards found</h3>
            <p className="text-slate-600">
              {searchTerm
                ? 'Try adjusting your search or filters'
                : 'No cards have been imported yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllCardsView;