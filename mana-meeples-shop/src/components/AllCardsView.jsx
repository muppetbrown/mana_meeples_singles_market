import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Package, Search, Plus, Sparkles, Image as ImageIcon, CheckCircle, AlertTriangle, AlertCircle, Minus, Edit2 } from 'lucide-react';

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

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

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

  // Highlight search terms in text
  const highlightText = (text, search) => {
    if (!search) return text;

    const parts = text.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Get stock health indicator
  const getStockHealthIndicator = (stock) => {
    if (stock >= 10) {
      return {
        icon: CheckCircle,
        colorClass: 'text-green-600',
        textClass: 'text-green-700',
        bgClass: 'bg-green-50',
        status: 'Healthy'
      };
    } else if (stock >= 3) {
      return {
        icon: AlertTriangle,
        colorClass: 'text-amber-600',
        textClass: 'text-amber-700',
        bgClass: 'bg-amber-50',
        status: 'Low'
      };
    } else if (stock > 0) {
      return {
        icon: AlertCircle,
        colorClass: 'text-red-600',
        textClass: 'text-red-700',
        bgClass: 'bg-red-50',
        status: 'Critical'
      };
    } else {
      return {
        icon: Package,
        colorClass: 'text-slate-400',
        textClass: 'text-slate-600',
        bgClass: 'bg-slate-50',
        status: 'Out of Stock'
      };
    }
  };

  // Get smart variation summary
  const getVariationSummary = (card) => {
    const variations = card.variations || [];
    const hasSpecialTreatments = variations.some(v => v.treatment && v.treatment !== 'STANDARD');
    const hasFoil = variations.some(v => v.finish === 'foil');
    const specialTreatmentCount = variations.filter(v => v.treatment && v.treatment !== 'STANDARD').length;

    return {
      hasSpecialTreatments,
      hasFoil,
      specialTreatmentCount,
      totalVariations: variations.length
    };
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
                            {highlightText(card.name, searchTerm)}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                            <span className="font-mono">#{highlightText(card.card_number, searchTerm)}</span>
                            <span>•</span>
                            <span>{highlightText(card.set_name || '', searchTerm)}</span>
                            <span>•</span>
                            <span className="capitalize">{card.rarity}</span>
                          </div>

                          {/* Smart Variation Summary */}
                          <div className="flex items-center gap-2 mt-2 text-xs">
                            {(() => {
                              const summary = getVariationSummary(card);
                              return (
                                <>
                                  {summary.hasSpecialTreatments && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300 font-medium">
                                      <Sparkles className="w-3 h-3" />
                                      {summary.specialTreatmentCount} special
                                    </span>
                                  )}

                                  {summary.hasFoil && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-900 border border-yellow-300 font-medium">
                                      <Sparkles className="w-3 h-3" />
                                      Foil
                                    </span>
                                  )}

                                  <span className="text-slate-600">
                                    {summary.totalVariations} variation{summary.totalVariations !== 1 ? 's' : ''}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Stock Status & Actions */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Stock Health Indicator */}
                          <div className="flex items-center gap-2">
                            {card.total_stock > 0 ? (() => {
                              const health = getStockHealthIndicator(card.total_stock);
                              const Icon = health.icon;
                              return (
                                <>
                                  <Icon className={`w-4 h-4 ${health.colorClass}`} />
                                  <div className="text-right">
                                    <span className={`text-sm font-medium ${health.textClass}`}>
                                      {card.total_stock} in stock
                                    </span>
                                    <div className="text-xs text-slate-500">
                                      {health.status}
                                    </div>
                                  </div>
                                </>
                              );
                            })() : (
                              <div className="text-right">
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Package className="w-3 h-3" />
                                  Not in inventory
                                </span>
                                {/* Quick Add Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Open quick add modal
                                    console.log('Quick add for', card.name);
                                  }}
                                  className="mt-1 flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 rounded border border-green-200 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                  Quick Add
                                </button>
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

                              {/* Enhanced Stock Indicator */}
                              {(() => {
                                const health = getStockHealthIndicator(variation.stock || 0);
                                const Icon = health.icon;
                                return (
                                  <div className="flex items-center gap-1">
                                    <Icon className={`w-3 h-3 ${health.colorClass}`} />
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${health.textClass} ${health.bgClass.replace('bg-', 'bg-').replace('-50', '-100')} border`}>
                                      {variation.stock > 0 ? `${variation.stock} in stock` : 'No stock'}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* SKU */}
                            <div className="text-xs text-slate-500 font-mono mb-2">
                              {variation.sku}
                            </div>

                            {/* Action Buttons */}
                            {variation.stock === 0 ? (
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
                            ) : (
                              <div className="space-y-2">
                                {/* Quick Stock Adjustment */}
                                <div className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                                  <span className="text-xs text-slate-600 font-medium">Quick Adjust:</span>
                                  <div className="flex items-center gap-1">
                                    {/* Quick decrement */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // TODO: Implement quick stock adjustment
                                        console.log('Decrease stock for', variation.sku);
                                      }}
                                      disabled={variation.stock === 0}
                                      className="p-1 hover:bg-red-50 text-red-600 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                      title="Decrease stock by 1"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>

                                    {/* Current value */}
                                    <span className="font-medium text-slate-900 min-w-[40px] text-center text-sm">
                                      {variation.stock}
                                    </span>

                                    {/* Quick increment */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // TODO: Implement quick stock adjustment
                                        console.log('Increase stock for', variation.sku);
                                      }}
                                      className="p-1 hover:bg-green-50 text-green-600 rounded transition-colors"
                                      title="Increase stock by 1"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>

                                    {/* Full edit mode */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // TODO: Open full edit modal
                                        console.log('Full edit for', variation.sku);
                                      }}
                                      className="p-1 hover:bg-blue-50 text-blue-600 rounded transition-colors ml-1"
                                      title="Open full editor"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Manage Stock Button */}
                                <button
                                  onClick={() => {
                                    // TODO: Navigate to inventory management
                                    console.log('Manage inventory for', variation.sku);
                                  }}
                                  className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                                >
                                  Full Management
                                </button>
                              </div>
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