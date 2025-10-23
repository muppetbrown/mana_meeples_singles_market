// apps/web/src/features/admin/components/Cards/CardsTab.tsx
/**
 * Unified Cards Tab Component
 * Handles both "All Cards" and "Inventory" views with shared logic
 * 
 * CLEAN VERSION - All fixes applied, no duplication
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, Download, LayoutGrid, List, Package } from 'lucide-react';
import { api } from '@/lib/api';
import { useShopFilters } from '@/features/shop/hooks/useShopFilters';
import CardSearchBar from '@/features/shop/components/Search/SearchBar';
import EmptyState from '@/shared/components/ui/EmptyState';
import CardSkeleton from '@/features/shop/components/CardDisplay/CardSkeleton';
import AddToInventoryModal from './AddToInventoryModal';
import AdminCardGrid from '@/features/shop/components/CardDisplay/CardGrid';
import type { Card, CardVariation } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

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
  const [loading, setLoading] = useState(false);
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
  // HOOKS
  // --------------------------------------------------------------------------
  
  const {
    games,
    sets,
    filterOptions,
    loading: filtersLoading,
    error: filtersError
  } = useShopFilters();

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

  // --------------------------------------------------------------------------
  // DATA FETCHING
  // --------------------------------------------------------------------------
  
  useEffect(() => {
    // Don't fetch if games haven't loaded yet
    if (!games || games.length === 0) {
      return;
    }
    
    const fetchCards = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        params.set('limit', '1000');
        
        // Add game filter
        if (selectedGame && selectedGame !== 'all') {
          const game = games.find(g => g.name === selectedGame);
          if (game?.id) {
            params.set('game_id', String(game.id));
          }
        }
        
        // Add set filter
        if (selectedSet && selectedSet !== 'all') {
          const set = sets.find(s => s.name === selectedSet);
          if (set?.id) {
            params.set('set_id', String(set.id));
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

        const url = `/cards/cards?${params.toString()}`;
        const data = await api.get<{ cards?: Card[] }>(url);
        setCards(data?.cards ?? []);
      } catch (err) {
        console.error('Error fetching cards:', err);
        setCards([]);
        setError(err instanceof Error ? err.message : 'Failed to fetch cards');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCards();
  }, [selectedGame, selectedSet, searchTerm, selectedTreatment, games, sets]);

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
        variation_id: addModalData.variation.inventory_id,
        quality: addFormData.quality,
        foil_type: addFormData.foil_type,
        price: parseFloat(addFormData.price) || 0,
        stock_quantity: addFormData.stock_quantity,
        language: addFormData.language,
      };

      await api.post('/admin/inventory', inventoryData);
      
      closeAddModal();
      
      // Re-fetch cards after successful add
      try {
        const params = new URLSearchParams();
        params.set('limit', '1000');
        
        if (selectedGame && selectedGame !== 'all') {
          const game = games.find(g => g.name === selectedGame);
          if (game?.id) params.set('game_id', String(game.id));
        }
        
        if (selectedSet && selectedSet !== 'all') {
          const set = sets.find(s => s.name === selectedSet);
          if (set?.id) params.set('set_id', String(set.id));
        }
        
        if (searchTerm?.trim()) {
          params.set('search', searchTerm.trim());
        }
        
        if (selectedTreatment && selectedTreatment !== 'all') {
          params.set('treatment', selectedTreatment);
        }

        const url = `/cards/cards?${params.toString()}`;
        const data = await api.get<{ cards?: Card[] }>(url);
        setCards(data?.cards ?? []);
      } catch (fetchErr) {
        console.error('Error refreshing cards:', fetchErr);
      }
      
    } catch (err) {
      console.error('Failed to add to inventory:', err);
      alert('Failed to add to inventory. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [addModalData, addFormData, closeAddModal, selectedGame, selectedSet, searchTerm, selectedTreatment, games, sets]);

  // --------------------------------------------------------------------------
  // OTHER HANDLERS
  // --------------------------------------------------------------------------
  
  const handleRefresh = useCallback(() => {
    // Clear cards to show loading state, then useEffect will refetch
    setCards([]);
  }, []);

  const handleExportCSV = useCallback(() => {
    try {
      const csv = [
        ['Name', 'Set', 'Number', 'Game', 'Rarity', 'Variations', 'Total Stock', 'Variation Count'].join(','),
        ...groupedCards.map(c => [
          `"${c.name}"`,
          `"${c.set_name}"`,
          `"${c.card_number}"`,
          `"${c.game_name}"`,
          `"${c.rarity || ''}"`,
          `"${(c.variations || []).map(v => `${v.quality} ${v.foil_type} (${v.stock})`).join(';')}"`,
          c.total_stock || 0,
          c.variation_count || 0,
        ].join(',')),
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${isInventoryMode ? 'inventory' : 'all-cards'}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export CSV. Please try again.');
    }
  }, [groupedCards, isInventoryMode]);

  // --------------------------------------------------------------------------
  // FILTER CONFIGURATION
  // --------------------------------------------------------------------------
  
  const additionalFilters = useMemo(() => ({
    treatment: {
      value: selectedTreatment,
      onChange: (value: string) => updateParam('treatment', value),
      label: 'Treatment',
      options: filterOptions.treatments.map(t => ({ 
        value: t.value, 
        label: t.label 
      })),
    },
  }), [selectedTreatment, updateParam, filterOptions.treatments]);

  // --------------------------------------------------------------------------
  // RENDER - ERROR STATES
  // --------------------------------------------------------------------------
  
  if (filtersError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 font-medium">Error loading filters</p>
        <p className="text-red-600 text-sm mt-2">{filtersError}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 font-medium">Error loading cards</p>
        <p className="text-red-600 text-sm mt-2">{error}</p>
        <button 
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER - MAIN CONTENT
  // --------------------------------------------------------------------------
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={groupedCards.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Export to CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

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