// apps/web/src/features/admin/components/Cards/CardsTab.tsx
/**
 * Unified Cards Tab Component - FIXED VERSION
 * Handles both "All Cards" and "Inventory" views
 * 
 * KEY FIXES:
 * 1. Properly fetches filter options from /api/cards/filters
 * 2. Resolves game/set names to IDs before API calls
 * 3. Shows treatments dropdown with actual data
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, Download, LayoutGrid, List, Package } from 'lucide-react';
import { api, ENDPOINTS } from '@/lib/api';
import CardSearchBar from '@/features/shop/components/Search/SearchBar';
import EmptyState from '@/shared/components/ui/EmptyState';
import CardSkeleton from '@/features/shop/components/CardDisplay/CardSkeleton';
import AddToInventoryModal from './AddToInventoryModal';
import AdminCardGrid from '@/features/shop/components/CardDisplay/CardGrid';
import type { Card, CardVariation } from '@/types';

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

type AddModalData = { 
  card: Card; 
  variation: CardVariation 
};

type AddFormData = {
  quality: string;
  foil_type: string;
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
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalData, setAddModalData] = useState<AddModalData | null>(null);
  const [addFormData, setAddFormData] = useState<AddFormData>({
    quality: 'Near Mint',
    foil_type: 'Regular',
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
  const isInventoryMode = mode === 'inventory';

  // --------------------------------------------------------------------------
  // LOAD FILTER OPTIONS
  // --------------------------------------------------------------------------
  
  useEffect(() => {
    const loadFilters = async () => {
      setFiltersLoading(true);
      try {
        console.log('📊 Fetching filter options from:', ENDPOINTS.FILTERS);
        const data = await api.get<FilterOptions>(ENDPOINTS.FILTERS);
        
        console.log('✅ Filter options loaded:', {
          games: data.games?.length || 0,
          sets: data.sets?.length || 0,
          treatments: data.treatments?.length || 0
        });
        
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

  // --------------------------------------------------------------------------
  // DATA FETCHING
  // --------------------------------------------------------------------------
  
  useEffect(() => {
    // Don't fetch until filters are loaded
    if (filtersLoading) {
      return;
    }
    
    const fetchCards = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        params.set('limit', '1000');
        
        // CRITICAL FIX: Resolve game NAME to game ID
        if (selectedGame && selectedGame !== 'all') {
          const game = filterOptions.games.find(g => g.name === selectedGame);
          if (game?.id) {
            params.set('game_id', String(game.id));
            console.log('🎮 Game filter:', selectedGame, '→ ID:', game.id);
          }
        }
        
        // CRITICAL FIX: Resolve set NAME to set ID
        if (selectedSet && selectedSet !== 'all') {
          const set = filterOptions.sets.find(s => s.name === selectedSet);
          if (set?.id) {
            params.set('set_id', String(set.id));
            console.log('📦 Set filter:', selectedSet, '→ ID:', set.id);
          }
        }
        
        // Add search term
        if (searchTerm?.trim()) {
          params.set('search', searchTerm.trim());
        }
        
        // Add treatment filter
        if (selectedTreatment && selectedTreatment !== 'all') {
          params.set('treatment', selectedTreatment);
        }

        const url = `${ENDPOINTS.CARDS}?${params.toString()}`;
        console.log('🔍 Fetching cards:', url);
        
        const data = await api.get<{ cards?: Card[] }>(url);
        
        console.log('✅ Cards loaded:', data?.cards?.length || 0);
        setCards(data?.cards ?? []);
      } catch (err) {
        console.error('❌ Error fetching cards:', err);
        setCards([]);
        setError(err instanceof Error ? err.message : 'Failed to fetch cards');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCards();
  }, [selectedGame, selectedSet, searchTerm, selectedTreatment, filtersLoading, filterOptions]);

  // --------------------------------------------------------------------------
  // DERIVED DATA
  // --------------------------------------------------------------------------
  
  // Filter cards based on mode
  const filteredCards = useMemo(() => {
    if (!isInventoryMode) return cards;
    // In inventory mode, only show cards with stock
    return cards.filter(c => Boolean(c?.has_inventory) && Number(c?.total_stock) > 0);
  }, [cards, isInventoryMode]);

  // Group cards by card_number and merge variations
  const groupedCards = useMemo(() => {
    const groups = new Map<string, Card[]>();
    
    filteredCards.forEach(card => {
      const key = `${card.set_name}-${card.card_number}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(card);
    });
    
    // Convert to array and merge cards with same card_number
    return Array.from(groups.values()).map(cardGroup => {
      if (cardGroup.length === 1) return cardGroup[0];
      
      // Merge multiple cards into one with combined variations
      const baseCard = cardGroup[0];
      const allVariations = cardGroup.flatMap(c => c.variations || []);
      
      return {
        ...baseCard,
        variations: allVariations,
        variation_count: allVariations.length,
        total_stock: allVariations.reduce((sum, v) => sum + (v.stock || 0), 0),
        has_inventory: allVariations.some(v => (v.stock || 0) > 0),
      };
    });
  }, [filteredCards]);

  // Calculate totals
  const totalStock = useMemo(
    () => groupedCards.reduce((sum, c) => sum + (c.total_stock || 0), 0),
    [groupedCards]
  );
  
  const totalVariations = useMemo(
    () => groupedCards.reduce((sum, c) => sum + (c.variation_count || 0), 0),
    [groupedCards]
  );

  // --------------------------------------------------------------------------
  // ADDITIONAL FILTERS (for SearchBar component)
  // --------------------------------------------------------------------------
  
  const additionalFilters = useMemo(() => (
    <div>
      <label htmlFor="treatment" className="block text-sm font-medium text-slate-700 mb-2">
        Treatment
      </label>
      <select
        id="treatment"
        value={selectedTreatment}
        onChange={(e) => handleTreatmentChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="all">All Treatments</option>
        {filterOptions.treatments.map(treatment => (
          <option key={treatment} value={treatment}>
            {treatment.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </div>
  ), [selectedTreatment, handleTreatmentChange, filterOptions.treatments]);

  // --------------------------------------------------------------------------
  // ACTIONS
  // --------------------------------------------------------------------------
  
  const handleRefresh = useCallback(() => {
    // Force re-fetch by updating a dependency
    setSearchParams(prev => new URLSearchParams(prev));
  }, [setSearchParams]);

  const handleExportCSV = useCallback(() => {
    // TODO: Implement CSV export
    console.log('Export CSV');
  }, []);

  // --------------------------------------------------------------------------
  // MODAL HANDLERS
  // --------------------------------------------------------------------------
  
  const openAddModal = useCallback((card: Card, variation: CardVariation) => {
    setAddModalData({ card, variation });
    setAddFormData({
      quality: 'Near Mint',
      foil_type: variation.finish === 'foil' ? 'Foil' : 'Regular',
      price: String(variation.price || ''),
      stock_quantity: 1,
      language: variation.language || 'English',
    });
    setShowAddModal(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setAddModalData(null);
    setAddFormData({
      quality: 'Near Mint',
      foil_type: 'Regular',
      price: '',
      stock_quantity: 1,
      language: 'English',
    });
  }, []);

  const handleAddToInventory = useCallback(async () => {
    if (!addModalData) return;

    setSaving(true);
    try {
      const inventoryData = {
        card_id: addModalData.card.id,
        quality: addFormData.quality,
        foil_type: addFormData.foil_type,
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
  }, [addModalData, addFormData, closeAddModal, handleRefresh]);

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
            {groupedCards.length} cards • {totalVariations} variations
            {isInventoryMode && ` • ${totalStock} in stock`}
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
        additionalFilters={additionalFilters as unknown as Record<string, any>} //TEMP FIX
        isAdminMode={true}
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
          {groupedCards.length > 0 ? (
            <AdminCardGrid
              cards={groupedCards}
              mode={mode}
              viewMode={viewMode}
              onAddToInventory={isInventoryMode ? undefined : openAddModal}
            />
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
      {showAddModal && addModalData && (
        <AddToInventoryModal
          card={addModalData.card}
          variation={addModalData.variation}
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