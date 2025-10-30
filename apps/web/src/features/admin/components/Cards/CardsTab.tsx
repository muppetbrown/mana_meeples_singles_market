// apps/web/src/features/admin/components/Cards/CardsTab.tsx
/**
 * Unified Cards Tab Component - REFACTORED FOR NEW ARCHITECTURE
 * Handles both "All Cards" and "Inventory" views
 * 
 * NEW ARCHITECTURE:
 * - Variation metadata (treatment, border_color, finish, frame_effect, promo_type) 
 *   is stored directly on the cards table
 * - Each card row represents a unique variation
 * - No more card_variations table or variations array for "All Cards" view
 * - Inventory mode filters cards by has_inventory/total_stock from card_inventory aggregation
 * 
 * FIXES APPLIED (2025-10-30):
 * - Added PriceUpdateResult interface definition
 * - Fixed handleRefreshComplete callback (removed missing showToast/refetchCards)
 * - Moved handleRefreshComplete after handleRefresh (dependency fix)
 * - Fixed JSX structure - PriceRefreshManager now renders as full-width section above header
 * - Removed duplicate PriceRefreshManager rendering
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, Download, LayoutGrid, List, Package } from 'lucide-react';
import { api, ENDPOINTS } from '@/lib/api';
import AddToInventoryModal from './AddToInventoryModal';
import {
  groupCardsForBrowse
} from '@/lib/utils';
import { CardSearchBar } from '@/shared/search';
import { VariationFilter } from '@/shared/search';
import { CardSkeleton } from '@/shared/card';
import { CardList, CardGrid } from '@/shared/layout';
import { EmptyState } from '@/shared/ui';
import { PriceRefreshButtons } from './PriceRefreshButtons';
import type {
  Card,
  CardVariation,
  BrowseBaseCard,
  BrowseVariation
} from '@/types';

// Type for price update results (matches PriceRefreshManager)
interface PriceUpdateResult {
  total: number;
  updated: number;
  skipped: number;
  failed: number;
  details: {
    updated_card_pricing: number;
    updated_inventory: number;
  };
}

// ============================================================================
// TYPES
// ============================================================================

interface FilterOptions {
  games: Array<{ id: number; name: string; code?: string }>;
  sets: Array<{ id: number; name: string; code?: string; game_id: number }>;
  treatments: string[];
  rarities: string[];
  qualities: string[];
  foilTypes: string[];
}

type AddFormData = {
  quality: string;
  // foil_type removed - finish comes from the card variation itself
  price: string;
  stock_quantity: number;
  language: string;
};

interface UnifiedCardsTabProps { 
  mode?: 'all' | 'inventory'; 
}

// ============================================================================
// COMPONENT
// ============================================================================

const UnifiedCardsTab: React.FC<UnifiedCardsTabProps> = ({ mode = 'all' }) => {
  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [cards, setCards] = useState<Card[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    games: [],
    sets: [],
    treatments: [],
    rarities: [],
    qualities: [],
    foilTypes: []
  });
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [totalCardCount, setTotalCardCount] = useState<number>(0);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalCard, setAddModalCard] = useState<BrowseBaseCard | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<BrowseVariation | undefined>();
  const [addFormData, setAddFormData] = useState<AddFormData>({
    quality: 'Near Mint',
    // foil_type removed
    price: '',
    stock_quantity: 1,
    language: 'English',
  });
  const [saving, setSaving] = useState(false);

  // --------------------------------------------------------------------------
  // URL PARAMS
  // --------------------------------------------------------------------------
  
  const searchTerm = searchParams.get('search') || '';
  const selectedGame = searchParams.get('game') || 'all';
  const selectedSet = searchParams.get('set') || 'all';
  const selectedTreatment = searchParams.get('treatment') || 'all';
  const selectedBorderColor = searchParams.get('borderColor') || 'all';
  const selectedFinish = searchParams.get('finish') || 'all';
  const selectedPromoType = searchParams.get('promoType') || 'all';
  const selectedFrameEffect = searchParams.get('frameEffect') || 'all';
  const isInventoryMode = mode === 'inventory';

  // --------------------------------------------------------------------------
  // LOAD FILTER OPTIONS
  // --------------------------------------------------------------------------
  
  useEffect(() => {
    const loadFilters = async () => {
      setFiltersLoading(true);
      try {
        const data = await api.get<FilterOptions>(ENDPOINTS.CARDS.FILTERS);
        
        setFilterOptions({
          games: data.games || [],
          sets: data.sets || [],
          treatments: data.treatments || [],
          rarities: data.rarities || [],
          qualities: data.qualities || [],
          foilTypes: data.foilTypes || []
        });
      } catch (err) {
        console.error('❌ Error loading filters:', err);
        // Don't show error to user, just use empty filters
      } finally {
        setFiltersLoading(false);
      }
    };

    loadFilters();
  }, []);

  // --------------------------------------------------------------------------
  // URL STATE HANDLERS
  // --------------------------------------------------------------------------
  
  const updateParam = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value && value !== 'all') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      return newParams;
    });
  }, [setSearchParams]);

  const handleSearchChange = useCallback((value: string) => {
    updateParam('search', value);
  }, [updateParam]);

  const handleGameChange = useCallback((game: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (game && game !== 'all') {
        newParams.set('game', game);
      } else {
        newParams.delete('game');
      }
      newParams.delete('set'); // Clear set when game changes
      return newParams;
    });
  }, [setSearchParams]);

  const handleSetChange = useCallback((set: string) => {
    updateParam('set', set);
  }, [updateParam]);

  const handleTreatmentChange = useCallback((treatment: string) => {
    updateParam('treatment', treatment);
  }, [updateParam]);

  // Variation filter change handler for DynamicVariationFilter
  const handleVariationFilterChange = useCallback((filterName: string, value: string) => {
    updateParam(filterName, value);
  }, [updateParam]);

  // --------------------------------------------------------------------------
  // DATA FETCHING
  // --------------------------------------------------------------------------

  const fetchCardCount = useCallback(async () => {
    try {
      const params: Record<string, unknown> = {};

      // Apply same filters as main query
      if (selectedGame && selectedGame !== 'all') {
        const game = filterOptions.games.find(g => g.name === selectedGame);
        if (game?.id) {
          params.game_id = game.id;
        }
      }

      if (selectedSet && selectedSet !== 'all') {
        const set = filterOptions.sets.find(s => s.name === selectedSet);
        if (set?.id) {
          params.set_id = set.id;
        }
      }

      if (searchTerm?.trim()) {
        params.search = searchTerm.trim();
      }

      if (selectedTreatment && selectedTreatment !== 'all') {
        params.treatment = selectedTreatment;
      }

      if (selectedBorderColor && selectedBorderColor !== 'all') {
        params.border_color = selectedBorderColor;
      }

      if (selectedFinish && selectedFinish !== 'all') {
        params.finish = selectedFinish;
      }

      if (selectedPromoType && selectedPromoType !== 'all') {
        params.promo_type = selectedPromoType;
      }

      if (selectedFrameEffect && selectedFrameEffect !== 'all') {
        params.frame_effect = selectedFrameEffect;
      }

      // Add inventory filter for inventory mode
      if (isInventoryMode) {
        params.has_inventory = 'true';
      }

      const data = await api.get<{ count: number }>(ENDPOINTS.CARDS.COUNT, params);
      setTotalCardCount(data?.count ?? 0);
    } catch (err) {
      console.error('❌ Error fetching card count:', err);
      setTotalCardCount(0);
    }
  }, [
    selectedGame,
    selectedSet,
    searchTerm,
    selectedTreatment,
    selectedBorderColor,
    selectedFinish,
    selectedPromoType,
    selectedFrameEffect,
    isInventoryMode,
    filterOptions
  ]);

  useEffect(() => {
    // Don't fetch until filters are loaded
    if (filtersLoading || !filterOptions.games.length) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      await Promise.all([
        fetchCards(),
        fetchCardCount()
      ]);
      setLoading(false);
    };

    fetchData();
  }, [
    selectedGame,
    selectedSet,
    searchTerm,
    selectedTreatment,
    selectedBorderColor,
    selectedFinish,
    selectedPromoType,
    selectedFrameEffect,
    filtersLoading,
    filterOptions,
    fetchCardCount
  ]);

  const fetchCards = useCallback(async () => {
    setError(null);

    try {
      const params: Record<string, unknown> = {
        limit: 1000
      };

      // Resolve game NAME to game ID
      if (selectedGame && selectedGame !== 'all') {
        const game = filterOptions.games.find(g => g.name === selectedGame);
        if (game?.id) {
          params.game_id = game.id;
        }
      }

      // Resolve set NAME to set ID
      if (selectedSet && selectedSet !== 'all') {
        const set = filterOptions.sets.find(s => s.name === selectedSet);
        if (set?.id) {
          params.set_id = set.id;
        }
      }

      // Add search term
      if (searchTerm?.trim()) {
        params.search = searchTerm.trim();
      }

      // Add treatment filter
      if (selectedTreatment && selectedTreatment !== 'all') {
        params.treatment = selectedTreatment;
      }

      // Add additional variation filters
      if (selectedBorderColor && selectedBorderColor !== 'all') {
        params.border_color = selectedBorderColor;
      }
      if (selectedFinish && selectedFinish !== 'all') {
        params.finish = selectedFinish;
      }
      if (selectedPromoType && selectedPromoType !== 'all') {
        params.promo_type = selectedPromoType;
      }
      if (selectedFrameEffect && selectedFrameEffect !== 'all') {
        params.frame_effect = selectedFrameEffect;
      }

      const data = await api.get<{ cards?: Card[] }>(ENDPOINTS.CARDS.LIST, params);
      setCards(data?.cards ?? []);
    } catch (err) {
      console.error('❌ Error fetching cards:', err);
      setCards([]);
      setError(err instanceof Error ? err.message : 'Failed to fetch cards');
    }
  }, [
    selectedGame,
    selectedSet,
    searchTerm,
    selectedTreatment,
    selectedBorderColor,
    selectedFinish,
    selectedPromoType,
    selectedFrameEffect,
    filterOptions
  ]);

  // --------------------------------------------------------------------------
  // DERIVED DATA - SIMPLIFIED!
  // --------------------------------------------------------------------------
  
  // Filter cards based on mode
  const displayCards = useMemo(() => {
    if (!isInventoryMode) {
      // "All Cards" mode: Show all cards
      return cards;
    }
    // "Inventory" mode: Only show cards with stock
    return cards.filter(c => Boolean(c?.has_inventory) && (c?.total_stock ?? 0) > 0);
  }, [cards, isInventoryMode]);

  // Calculate totals
  const totalStock = useMemo(
    () => displayCards.reduce((sum, c) => sum + (c.total_stock || 0), 0),
    [displayCards]
  );
  
  const uniqueCards = useMemo(() => {
    // Count unique card_number + set_name combinations
    const unique = new Set(displayCards.map(c => `${c.set_name}-${c.card_number}`));
    return unique.size;
  }, [displayCards]);

  // Use the centralized grouping utility
  const groupedCards: BrowseBaseCard[] = useMemo(() => {
    return groupCardsForBrowse(displayCards);
  }, [displayCards]);

  // --------------------------------------------------------------------------
  // ADDITIONAL FILTERS (for SearchBar component)
  // --------------------------------------------------------------------------
  
  const additionalFilters = useMemo(() => ({
    treatment: {
      value: selectedTreatment,
      onChange: handleTreatmentChange,
      label: 'Treatment',
      options: filterOptions.treatments.map(treatment => ({
        value: treatment,
        label: treatment.replace(/_/g, ' ')
      }))
    }
  }), [selectedTreatment, handleTreatmentChange, filterOptions.treatments]);

  // --------------------------------------------------------------------------
  // ACTIONS
  // --------------------------------------------------------------------------
  
  const handleRefresh = useCallback(() => {
    // Force re-fetch by updating a dependency
    setSearchParams(prev => new URLSearchParams(prev));
  }, [setSearchParams]);

  const handleRefreshComplete = useCallback((result: PriceUpdateResult) => {
    console.log('Price refresh complete:', result);
    // Show success message
    alert(`✅ Price refresh complete!\n\nUpdated: ${result.updated}\nSkipped: ${result.skipped}\nFailed: ${result.failed}`);
    // Refresh cards to show new prices
    handleRefresh();
  }, [handleRefresh]);

  const handleExportCSV = useCallback(async () => {
    if (loading || cards.length === 0) {
      console.warn('No cards available for export');
      return;
    }

    try {
      setLoading(true);

      // For inventory mode, export current displayed cards with inventory data
      // For all cards mode, export all filtered cards
      const exportData = mode === 'inventory'
        ? cards.filter(card => card.has_inventory && (card.total_stock ?? 0) > 0)
        : cards;

      if (exportData.length === 0) {
        console.warn('No inventory data available for export');
        setLoading(false);
        return;
      }

      // Transform Card → InventoryItem before calling formatInventoryForExport
      const inventoryItems = exportData.map(card => ({
        inventory_id: card.id,
        name: card.name,
        set_name: card.set_name,
        card_number: card.card_number ?? '',
        rarity: card.rarity ?? '',
        quality: 'NM', // Default quality for cards being exported
        // foil_type removed - finish info comes from card directly
        language: 'English', // Default language
        price: 0, // Default price
        stock_quantity: card.total_stock ?? 0,
        game_name: card.game_name ?? '',
        updated_at: new Date().toISOString()
      }));

      // Format the data for CSV export using existing utility
      const { formatInventoryForExport, downloadCSV } = await import('@/lib/utils');
      const formattedData = formatInventoryForExport(inventoryItems);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${mode}-export-${timestamp}.csv`;

      // Download the CSV
      downloadCSV(formattedData, filename);

      console.log(`Successfully exported ${formattedData.length} items to ${filename}`);

    } catch (error) {
      console.error('Failed to export CSV:', error);
    } finally {
      setLoading(false);
    }
  }, [cards, loading, mode]);

  // --------------------------------------------------------------------------
  // MODAL HANDLERS - SIMPLIFIED!
  // --------------------------------------------------------------------------
  
  // Adapter to convert BrowseBaseCard to Card format
  const toCard = useCallback((browseCard: BrowseBaseCard): Card => ({
    ...browseCard,
    sku: browseCard.sku ?? String(browseCard.id),
    card_number: browseCard.card_number ?? '',
    set_name: browseCard.set_name ?? '',
    game_name: browseCard.game_name ?? '',
    variations: browseCard.variations.map(v => ({
      inventory_id: v.id,
      card_id: browseCard.id,
      quality: 'NM',
      // foil_type removed - finish info is in v.finish
      language: 'EN',
      price: v.price ?? 0,
      stock: v.in_stock ?? 0,
      variation_key: `${v.treatment || 'Standard'}-${v.finish || 'Regular'}`,
      finish: v.finish,
      treatment: v.treatment
    }))
  }), []);

  const openAddModal = useCallback((card: BrowseBaseCard) => {
    setAddModalCard(card);

    // Auto-select first variation if only one exists
    if (card.variations && card.variations.length === 1) {
      setSelectedVariation(card.variations[0]);
    } else {
      setSelectedVariation(undefined);  // User must select
    }

    setAddFormData({
      quality: 'Near Mint',
      // foil_type removed - finish is already on the card variation
      price: '',
      stock_quantity: 1,
      language: 'English',
    });
    setShowAddModal(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setAddModalCard(null);
    setSelectedVariation(undefined);
    setAddFormData({
      quality: 'Near Mint',
      // foil_type removed
      price: '',
      stock_quantity: 1,
      language: 'English',
    });
  }, []);

  const handleAddToInventory = useCallback(async () => {
    if (!addModalCard) return;

    // Validation: Must have a selected variation
    if (!selectedVariation) {
      alert('Please select a card variation');
      return;
    }

    setSaving(true);
    try {
      const inventoryData = {
        card_id: selectedVariation.id,  // Use the specific variation's card ID
        quality: addFormData.quality,
        // foil_type removed - not needed because card_id identifies the finish
        price: parseFloat(addFormData.price) || 0,
        stock_quantity: addFormData.stock_quantity,
        language: addFormData.language,
      };

      await api.post(ENDPOINTS.ADMIN.INVENTORY, inventoryData);

      closeAddModal();
      handleRefresh();

    } catch (err) {
      console.error('Failed to add to inventory:', err);
      alert('Failed to add to inventory. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [addModalCard, selectedVariation, addFormData, closeAddModal, handleRefresh]);

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Price Refresh Manager (All Cards mode only) */}
      {mode === 'all' && (
        <PriceRefreshButtons  
          cards={cards as Array<Card & { scryfall_id: string | null; finish: string }>}
          onRefreshComplete={handleRefreshComplete}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isInventoryMode ? 'Inventory Management' : 'All Cards Database'}
          </h2>
          <p className="text-slate-600 mt-1">
            <span className="font-semibold text-slate-900">{uniqueCards}</span>
            <span> unique cards</span>
            {' • '}
            <span className="font-semibold text-slate-900">{displayCards.length}</span>
            <span> total variations</span>
            {displayCards.length > uniqueCards && (
              <span className="text-xs text-slate-500 ml-1">
                (~{Math.round(displayCards.length / uniqueCards * 10) / 10} variations per card)
              </span>
            )}
            {!isInventoryMode && totalCardCount > uniqueCards && (
              <span className="text-amber-600 ml-2">
                Showing {uniqueCards} of {Math.ceil(totalCardCount / (displayCards.length / uniqueCards || 1))} cards
                <span className="text-xs block text-amber-500">
                  (all variations included for shown cards)
                </span>
              </span>
            )}
            {isInventoryMode && (
              <span>
                {' • '}
                <span className="font-semibold text-slate-900">{totalStock}</span>
                <span> in stock</span>
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 hidden sm:inline">View:</span>
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            aria-label="Refresh cards"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <CardSearchBar
        searchTerm={searchTerm}
        selectedGame={selectedGame}
        selectedSet={selectedSet}
        games={filterOptions.games}
        sets={filterOptions.sets}
        onSearchChange={handleSearchChange}
        onGameChange={handleGameChange}
        onSetChange={handleSetChange}
        additionalFilters={additionalFilters}
        isAdminMode={true}
      />

      {/* Advanced Variation Filters */}
      {(selectedGame !== 'all' || selectedSet !== 'all') && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Advanced Filters</h3>
          <VariationFilter
            selectedGame={selectedGame !== 'all' ? selectedGame : undefined}
            selectedSet={selectedSet !== 'all' ? selectedSet : undefined}
            filters={(() => {
              const raw = {
                treatment: selectedTreatment !== 'all' ? selectedTreatment : undefined,
                borderColor: selectedBorderColor !== 'all' ? selectedBorderColor : undefined,
                finish: selectedFinish !== 'all' ? selectedFinish : undefined,
                promoType: selectedPromoType !== 'all' ? selectedPromoType : undefined,
                frameEffect: selectedFrameEffect !== 'all' ? selectedFrameEffect : undefined,
              } as const;
              return Object.fromEntries(
                Object.entries(raw).filter(([,v]) => v !== undefined)
              ) as { treatment?: string; borderColor?: string; finish?: string; promoType?: string; frameEffect?: string };
            })()}
            onFilterChange={handleVariationFilterChange}
          />
        </div>
      )}

      {/* Cards Display */}
      {loading || filtersLoading ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {groupedCards.length > 0 ? (
            viewMode === 'list' ? (
              <CardList
                cards={groupedCards}
                mode={mode}
                currency={{ code: 'USD', symbol: '$', rate: 1, label: 'US Dollar' }}
                onAction={(card, variation) => {
                  // In admin mode, open add to inventory modal
                  if (mode === 'all') {
                    openAddModal(card);
                  } else {
                    console.log('Manage inventory for card:', card.name);
                  }
                }}
              />
            ) : (
              <CardGrid
                cards={groupedCards}
                mode={mode}
                viewMode={viewMode}
                {...(!isInventoryMode && { onAddToInventory: (card) => openAddModal(card) })}
              />
            )
          ) : (
            <EmptyState
              icon={Package}
              title={isInventoryMode ? "No inventory items" : "No cards found"}
              message={isInventoryMode
                ? "Start by adding cards to your inventory"
                : "Try adjusting your search filters"}
            />
          )}
        </>
      )}

      {/* Add to Inventory Modal */}
      {showAddModal && addModalCard && selectedVariation && (
        <AddToInventoryModal
          card={addModalCard}
          selectedVariation={selectedVariation}
          onVariationChange={setSelectedVariation}
          formData={addFormData}
          onFormChange={setAddFormData}
          onSave={handleAddToInventory}
          onClose={closeAddModal}
          saving={saving}
        />
      )}
    </div>
  );
};

export default UnifiedCardsTab;