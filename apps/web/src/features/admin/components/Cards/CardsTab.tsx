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
import { api, ENDPOINTS, buildCardParams, type CardQueryParams } from '@/lib/api';
import { useToast } from '@/shared/ui/Toast';
import { useCardFetching } from '@/features/hooks/useCardFetching';
import { useFilters } from '@/features/hooks/useFilters';
import type { Game, Set } from '@/types/filters';
import AddToInventoryModal from './AddToInventoryModal';
import {
  groupCardsForBrowse,
  groupCardsBySort,
  calculateTotalStock,
  countUniqueCards,
  calculateAverageVariations,
  calculateVariationPrice
} from '@/lib/utils';
import type { SortOption, SortOrder } from '@/lib/utils';
import { DEFAULT_QUALITY, DEFAULT_LANGUAGE } from '@/types/enums/inventory';
import { CardSearchBar } from '@/shared/search';
import { CardSkeleton } from '@/shared/card';
import { CardList, CardGrid } from '@/shared/layout';
import { EmptyState, SectionHeader, SortDropdown } from '@/shared/ui';
import type {
  Card,
  BrowseBaseCard,
  BrowseVariation
} from '@/types';

// ============================================================================
// TYPES
// ============================================================================

type AddFormData = {
  quality: string;
  price: string;
  stock_quantity: number;
  language: string;
  useAutomatedPrice: boolean; // Whether to use the automated price from price source
};

interface UnifiedCardsTabProps { 
  mode?: 'all' | 'inventory'; 
}

// ============================================================================
// COMPONENT
// ============================================================================

const UnifiedCardsTab: React.FC<UnifiedCardsTabProps> = ({ mode = 'all' }) => {
  // --------------------------------------------------------------------------
  // HOOKS
  // --------------------------------------------------------------------------

  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // UNIFIED: Use the unified filter hook for admin mode
  const {
    filterOptions,
    games,
    sets,
    treatments,
    finishes,
    isLoading: filtersLoading,
    updateParam,
    handleGameChange: filterHandleGameChange,
    handleSetChange: filterHandleSetChange,
    handleSearchChange: filterHandleSearchChange,
    clearFilters: filterClearFilters,
    getAdditionalFilters
  } = useFilters({ mode: 'admin', autoLoad: true });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [totalCardCount, setTotalCardCount] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalCard, setAddModalCard] = useState<BrowseBaseCard | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<BrowseVariation | undefined>();
  const [addFormData, setAddFormData] = useState<AddFormData>({
    quality: DEFAULT_QUALITY,
    price: '',
    stock_quantity: 1,
    language: DEFAULT_LANGUAGE,
    useAutomatedPrice: false,
  });
  const [saving, setSaving] = useState(false);

  // --------------------------------------------------------------------------
  // URL PARAMS
  // --------------------------------------------------------------------------
  
  const searchTerm = searchParams.get('search') || '';
  const selectedGame = searchParams.get('game') || 'all';
  const selectedSet = searchParams.get('set') || 'all';
  const selectedTreatment = searchParams.get('treatment') || 'all';
  const selectedFinish = searchParams.get('finish') || 'all';
  const sortBy = (searchParams.get('sortBy') as SortOption) || 'name';
  const sortOrder = (searchParams.get('sortOrder') as SortOrder) || 'asc';
  const isInventoryMode = mode === 'inventory';

  // --------------------------------------------------------------------------
  // UNIFIED CARD FETCHING
  // --------------------------------------------------------------------------

  // UNIFIED: Use shared hook for card fetching (eliminates duplicate query building)
  const {
    cards,
    loading,
    error,
    refetch: refetchCards
  } = useCardFetching({
    searchTerm,
    selectedGame,
    selectedSet,
    selectedTreatment,
    selectedFinish,
    games,
    sets,
    mode: 'admin',
    limit: 1000, // Admin uses limit instead of pagination
    hasInventory: isInventoryMode ? true : undefined
  });

  // Auto-populate price when variation changes
  useEffect(() => {
    if (selectedVariation && showAddModal) {
      const automatedPrice = getAutomatedPrice(selectedVariation); // number | null
      const hasAutomatedPrice =
        automatedPrice !== null && Boolean(selectedVariation.price_source); // ✅ boolean

      // Only update if useAutomatedPrice is true or if it's the first time setting up
      if (addFormData.useAutomatedPrice || !addFormData.price) {
        setAddFormData(prev => ({
          ...prev,
          price: hasAutomatedPrice ? String(automatedPrice) : '',
          useAutomatedPrice: hasAutomatedPrice, // ✅ boolean
        }));
      }
    }
  }, [selectedVariation, showAddModal]);

  // --------------------------------------------------------------------------
  // URL STATE HANDLERS (using unified hook + local handlers for sort)
  // --------------------------------------------------------------------------

  // Use filter hook handlers directly
  const handleSearchChange = filterHandleSearchChange;
  const handleGameChange = filterHandleGameChange;
  const handleSetChange = filterHandleSetChange;
  const handleClearFilters = filterClearFilters;

  // Local handlers for treatment, finish, and sorting (not in unified hook)
  const handleTreatmentChange = useCallback((treatment: string) => {
    updateParam('treatment', treatment);
  }, [updateParam]);

  const handleFinishChange = useCallback((finish: string) => {
    updateParam('finish', finish);
  }, [updateParam]);

  const handleSortByChange = useCallback((newSortBy: SortOption) => {
    updateParam('sortBy', newSortBy);
  }, [updateParam]);

  const handleSortOrderChange = useCallback((newSortOrder: SortOrder) => {
    updateParam('sortOrder', newSortOrder);
  }, [updateParam]);

  // --------------------------------------------------------------------------
  // CARD COUNT FETCHING
  // --------------------------------------------------------------------------

  const fetchCardCount = useCallback(async () => {
    try {
      // UNIFIED: Use shared query builder for count endpoint
      const queryParams: CardQueryParams = {
        searchTerm,
        selectedGame,
        selectedSet,
        selectedTreatment,
        selectedFinish,
        hasInventory: isInventoryMode ? true : undefined
      };

      const params = buildCardParams(queryParams, games, sets);

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
    selectedFinish,
    isInventoryMode,
    filterOptions
  ]);

  // Fetch card count when filters change
  useEffect(() => {
    // Don't fetch until filters are loaded
    if (filtersLoading || !games.length) {
      return;
    }

    fetchCardCount();
  }, [
    selectedGame,
    selectedSet,
    searchTerm,
    selectedTreatment,
    selectedFinish,
    filtersLoading,
    games,
    fetchCardCount
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

  /**
   * Calculate display statistics using centralized utilities.
   * These memoized values are used for the header stats display.
   */
  const totalStock = useMemo(() => calculateTotalStock(displayCards), [displayCards]);
  const uniqueCards = useMemo(() => countUniqueCards(displayCards), [displayCards]);
  const averageVariations = useMemo(() => calculateAverageVariations(displayCards), [displayCards]);

  // Use the centralized grouping utility
  const baseGroupedCards: BrowseBaseCard[] = useMemo(() => {
    return groupCardsForBrowse(displayCards);
  }, [displayCards]);

  // Apply sorting and grouping with section headers
  const sortedAndGroupedCards = useMemo(() => {
    return groupCardsBySort(baseGroupedCards, sortBy, sortOrder);
  }, [baseGroupedCards, sortBy, sortOrder]);

  // --------------------------------------------------------------------------
  // ADDITIONAL FILTERS (using unified hook)
  // --------------------------------------------------------------------------

  const additionalFilters = useMemo(() => {
    return getAdditionalFilters({
      selectedTreatment,
      selectedFinish,
      onTreatmentChange: handleTreatmentChange,
      onFinishChange: handleFinishChange
    });
  }, [selectedTreatment, selectedFinish, handleTreatmentChange, handleFinishChange, getAdditionalFilters]);

  // --------------------------------------------------------------------------
  // ACTIONS
  // --------------------------------------------------------------------------

  const handleRefresh = useCallback(() => {
    // UNIFIED: Use the refetch function from the hook
    refetchCards();
    fetchCardCount();
  }, [refetchCards, fetchCardCount]);

  const handleExportCSV = useCallback(async () => {
    if (loading || cards.length === 0 || isExporting) {
      console.warn('No cards available for export');
      return;
    }

    try {
      setIsExporting(true);

      // For inventory mode, export current displayed cards with inventory data
      // For all cards mode, export all filtered cards
      const exportData = mode === 'inventory'
        ? cards.filter(card => card.has_inventory && (card.total_stock ?? 0) > 0)
        : cards;

      if (exportData.length === 0) {
        console.warn('No inventory data available for export');
        setIsExporting(false);
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
      setIsExporting(false);
    }
  }, [cards, loading, mode, isExporting]);

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
      language: 'EN',
      price: v.price ?? 0,
      stock: v.in_stock ?? 0,
      variation_key: `${v.treatment || 'Standard'}-${v.finish || 'Regular'}`,
      finish: v.finish,
      treatment: v.treatment
    }))
  }), []);

  /**
   * Get the automated price for a variation based on finish type.
   * Uses centralized price calculation logic for consistency.
   */
  const getAutomatedPrice = useCallback((variation?: BrowseVariation): number | null => {
    if (!variation) return null;
    return calculateVariationPrice(variation);
  }, []);

  const openAddModal = useCallback((card: BrowseBaseCard) => {
    setAddModalCard(card);

    // Auto-select a variation (prefer non-foil, otherwise first)
    let selectedVar: BrowseVariation | undefined;
    if (card.variations && card.variations.length > 0) {
      const nonfoilVariation = card.variations.find(v => {
        const finish = (v.finish ?? '').toLowerCase();
        return finish === 'nonfoil' || finish.includes('non'); // adjust if you want stricter match
      });
      selectedVar = nonfoilVariation ?? card.variations[0];
      setSelectedVariation(selectedVar);
    } else {
      setSelectedVariation(undefined);
    }

    // Automated price (number | null)
    const automatedPrice = selectedVar ? getAutomatedPrice(selectedVar) : null;
    const hasAutomatedPrice = automatedPrice !== null && Boolean(selectedVar?.price_source); // ✅ boolean

    setAddFormData({
      quality: DEFAULT_QUALITY,
      price: hasAutomatedPrice ? String(automatedPrice) : '',
      stock_quantity: 1,
      language: DEFAULT_LANGUAGE,
      useAutomatedPrice: hasAutomatedPrice, // ✅ boolean
    });

    setShowAddModal(true);
  }, [getAutomatedPrice]);


  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setAddModalCard(null);
    setSelectedVariation(undefined);
    setAddFormData({
      quality: DEFAULT_QUALITY,
      price: '',
      stock_quantity: 1,
      language: DEFAULT_LANGUAGE,
      useAutomatedPrice: false,
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
      card_id: addModalCard.id,                         // ✅ card id, not variation id
      quality: addFormData.quality,
      language: addFormData.language || 'English',
      price: Number.isFinite(parseFloat(addFormData.price))
        ? parseFloat(addFormData.price)
        : 0,
      stock_quantity: Number(addFormData.stock_quantity) || 0,

      // Optional but useful:
      auto_price_enabled: !!addFormData.useAutomatedPrice,
      price_source: selectedVariation?.price_source ?? undefined,
      // cost: ..., markup_percentage: ..., low_stock_threshold: ...
    } as const;

    // UNIFIED: Use api client instead of direct fetch()
    await api.post(ENDPOINTS.ADMIN.INVENTORY, inventoryData);

    // success
    closeAddModal();
    handleRefresh();

    // Show success toast notification
    toast.success(`Successfully added ${addModalCard.name} to inventory! (Qty: ${addFormData.stock_quantity}, Price: $${addFormData.price})`, 4000);
  } catch (err) {
    console.error('Failed to add to inventory:', err);
    alert(err instanceof Error ? err.message : 'Failed to add to inventory. Please try again.');
  } finally {
    setSaving(false);
  }
}, [addModalCard, selectedVariation, addFormData, closeAddModal, handleRefresh]);

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  return (
    <div className="space-y-6">
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
            {displayCards.length > uniqueCards && averageVariations > 1 && (
              <span className="text-xs text-slate-500 ml-1">
                (~{averageVariations} variations per card)
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

        <div className="flex items-center gap-3 flex-wrap">
          {/* Sort Dropdown */}
          <SortDropdown
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortByChange={handleSortByChange}
            onSortOrderChange={handleSortOrderChange}
            showLabel={true}
          />

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
        games={games}
        sets={sets}
        onSearchChange={handleSearchChange}
        onGameChange={handleGameChange}
        onSetChange={handleSetChange}
        additionalFilters={additionalFilters}
        isAdminMode={true}
        onClearFilters={handleClearFilters}
      />

      {/* Cards Display */}
      {loading || filtersLoading ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {sortedAndGroupedCards.length > 0 ? (
            viewMode === 'list' ? (
              /* List View with Section Headers */
              <div>
                {sortedAndGroupedCards.map((group, groupIndex) => (
                  <div key={groupIndex} className="mb-8">
                    <SectionHeader title={group.header} count={group.cards.length} isGrid={false} />
                    <CardList
                      cards={group.cards}
                      mode={mode}
                      currency={{ code: 'USD', symbol: '$', rate: 1, label: 'US Dollar' }}
                      onAction={(card, variation) => {
                        // Open add/edit inventory modal for both modes
                        // In inventory mode, this allows editing existing inventory
                        // In all cards mode, this allows adding new inventory
                        openAddModal(card);
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              /* Grid View with Section Headers */
              <div>
                {sortedAndGroupedCards.map((group, groupIndex) => (
                  <div key={groupIndex} className="mb-8">
                    <SectionHeader title={group.header} count={group.cards.length} isGrid={true} />
                    <CardGrid
                      cards={group.cards}
                      mode={mode}
                      viewMode={viewMode}
                      onAddToInventory={(card) => openAddModal(card)}
                      onManage={(card) => openAddModal(card)}
                    />
                  </div>
                ))}
              </div>
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

      {showAddModal && addModalCard && (
        <AddToInventoryModal
          key={addModalCard.id}
          card={addModalCard}
          {...(selectedVariation ? { selectedVariation } : {})}   // 👈 only pass when defined
          onVariationChange={(v) => setSelectedVariation(v)}       // keep signature simple
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